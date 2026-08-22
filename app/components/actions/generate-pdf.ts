import { type AnnotationData } from '~/types/annotations';
import { auditService } from '~/services/audit';
import type { User } from 'firebase/auth';
import { fetchPdfApi } from '~/utils/api';
import type { ToastType } from '~/components/toast/toast';

interface GeneratePDFParams {
	user: User;
	selectedImage: string | undefined;
	sourceImageId?: string;
	selectedFilename: string | undefined;
	userCompany: string;
	userFirstName: string;
	userLastName: string;
	userBadgeId: string;
	currentCase: string;
	annotationData: AnnotationData | null;
	activeAnnotations: Set<string>;
	setIsGeneratingPDF: (isGenerating: boolean) => void;
	setToastType: (type: ToastType) => void;
	setToastMessage: (message: string) => void;
	setShowToast: (show: boolean) => void;
	setToastDuration?: (duration: number) => void;
}

const CLEAR_IMAGE_SENTINEL = '/clear.jpg';

const blobToDataUrl = async (blob: Blob): Promise<string> => {
	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			if (typeof reader.result === 'string') {
				resolve(reader.result);
				return;
			}

			reject(new Error('Failed to read image blob as data URL'));
		};
		reader.onerror = () => reject(new Error('Failed to convert image for PDF rendering'));
		reader.readAsDataURL(blob);
	});
};

const resolvePdfImageUrl = async (selectedImage: string | undefined): Promise<string | undefined> => {
	if (!selectedImage || selectedImage === CLEAR_IMAGE_SENTINEL) {
		return selectedImage;
	}

	if (selectedImage.startsWith('/')) {
		return new URL(selectedImage, window.location.origin).toString();
	}

	if (selectedImage.startsWith('data:')) {
		return selectedImage;
	}

	if (selectedImage.startsWith('blob:')) {
		const imageResponse = await fetch(selectedImage);
		if (!imageResponse.ok) {
			throw new Error('Failed to load selected image for PDF generation');
		}

		const imageBlob = await imageResponse.blob();
		return await blobToDataUrl(imageBlob);
	}

	// Signed image URLs routed through the Pages proxy contain a ?st= token.
	// Pre-fetch the image client-side and embed as a data URL so the PDF worker's
	// Puppeteer context doesn't need to make outbound requests for the image.
	if (selectedImage.startsWith('http://') || selectedImage.startsWith('https://')) {
		let parsedUrl: URL;
		try {
			parsedUrl = new URL(selectedImage);
		} catch {
			return selectedImage;
		}

		if (parsedUrl.searchParams.has('st')) {
			const imageResponse = await fetch(selectedImage);
			if (!imageResponse.ok) {
				throw new Error('Failed to load selected image for PDF generation');
			}

			const imageBlob = await imageResponse.blob();
			return await blobToDataUrl(imageBlob);
		}
	}

	return selectedImage;
};

export const generatePDF = async ({
	user,
	selectedImage,
	sourceImageId,
	selectedFilename,
	userCompany,
	userFirstName,
	userLastName,
	userBadgeId,
	currentCase,
	annotationData,
	activeAnnotations,
	setIsGeneratingPDF,
	setToastType,
	setToastMessage,
	setShowToast,
	setToastDuration,
}: GeneratePDFParams) => {
	setIsGeneratingPDF(true);

	// Track processing time for audit logging
	const startTime = Date.now();

	// Show generating toast immediately with duration 0 (stays until manually closed or completion)
	setToastType('loading');
	setToastMessage('Generating PDF report... This may take up to a minute.');
	if (setToastDuration) setToastDuration(0);
	setShowToast(true);

	try {
		// Format current date in user's timezone
		const now = new Date();
		const currentDate = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;

		// Format notes updated date in user's timezone if it exists
		let notesUpdatedFormatted = '';
		if (annotationData?.updatedAt) {
			const updatedDate = new Date(annotationData.updatedAt);
			notesUpdatedFormatted = `${(updatedDate.getMonth() + 1).toString().padStart(2, '0')}/${updatedDate.getDate().toString().padStart(2, '0')}/${updatedDate.getFullYear()}`;
		}

		const resolvedImageUrl = await resolvePdfImageUrl(selectedImage);

		const pdfData = {
			imageUrl: resolvedImageUrl,
			filename: selectedFilename,
			userCompany: userCompany,
			firstName: userFirstName,
			userFirstName: userFirstName,
			userLastName: userLastName,
			userBadgeId: userBadgeId || undefined,
			caseNumber: currentCase,
			annotationData,
			activeAnnotations: Array.from(activeAnnotations), // Convert Set to Array
			currentDate, // Pass formatted current date
			notesUpdatedFormatted, // Pass formatted notes updated date
		};

		// reportFormat is resolved server-side in the Pages Function based on the
		// user's verified email address, so it is intentionally omitted here.
		const pdfRequest = {
			data: pdfData,
		};

		const response = await fetchPdfApi(user, '/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(pdfRequest),
		});

		if (response.ok) {
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;

			// Generate filename based on annotation data
			let filename = 'striae-report';

			if (annotationData) {
				const { leftCase, leftItem, rightCase, rightItem } = annotationData;

				// Build left and right parts
				const leftPart = [leftCase, leftItem].filter(Boolean).join('-');
				const rightPart = [rightCase, rightItem].filter(Boolean).join('-');

				if (leftPart && rightPart) {
					filename = `striae-report-${leftPart}--${rightPart}`;
				} else if (leftPart) {
					filename = `striae-report-${leftPart}`;
				} else if (rightPart) {
					filename = `striae-report-${rightPart}`;
				}
			}

			// Fallback to case number if no annotation data
			if (filename === 'striae-report' && currentCase) {
				filename = `striae-report-${currentCase}`;
			}

			// Final fallback to timestamp
			if (filename === 'striae-report') {
				filename = `striae-report-${Date.now()}`;
			}

			// Sanitize filename and ensure .pdf extension
			filename = filename.replace(/[<>:"/\\|?*]/g, '-') + '.pdf';

			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			// Log successful PDF generation audit
			try {
				const processingTime = Date.now() - startTime;
				await auditService.logPDFGeneration(
					user,
					filename,
					currentCase || 'unknown-case',
					'success',
					processingTime,
					blob.size,
					[],
					sourceImageId, // Source file ID
					selectedFilename, // Source original filename
				);
			} catch (auditError) {
				console.error('Failed to log PDF generation audit:', auditError);
				// Continue with success flow even if audit logging fails
			}

			// Show success toast
			setToastType('success');
			setToastMessage('PDF generated successfully!');
			if (setToastDuration) setToastDuration(4000); // Reset to default duration for success message
			setShowToast(true);
		} else {
			const errorText = await response.text();
			console.error('PDF generation failed:', errorText);

			// Log failed PDF generation audit
			try {
				const processingTime = Date.now() - startTime;
				await auditService.logPDFGeneration(
					user,
					`failed-pdf-${Date.now()}.pdf`,
					currentCase || 'unknown-case',
					'failure',
					processingTime,
					0, // No file size for failed generation
					[errorText || 'PDF generation failed'],
					sourceImageId, // Source file ID
					selectedFilename, // Source original filename
				);
			} catch (auditError) {
				console.error('Failed to log PDF generation failure audit:', auditError);
				// Continue with error flow even if audit logging fails
			}

			setToastType('error');
			setToastMessage('Failed to generate PDF report');
			if (setToastDuration) setToastDuration(4000); // Reset to default duration for error message
			setShowToast(true);
		}
	} catch (error) {
		console.error('Error generating PDF:', error);

		// Log error PDF generation audit
		try {
			const processingTime = Date.now() - startTime;
			await auditService.logPDFGeneration(
				user,
				`error-pdf-${Date.now()}.pdf`,
				currentCase || 'unknown-case',
				'failure',
				processingTime,
				0, // No file size for failed generation
				[error instanceof Error ? error.message : 'Unknown error generating PDF'],
				sourceImageId, // Source file ID
				selectedFilename, // Source original filename
			);
		} catch (auditError) {
			console.error('Failed to log PDF generation error audit:', auditError);
			// Continue with error flow even if audit logging fails
		}

		setToastType('error');
		setToastMessage('Error generating PDF report');
		if (setToastDuration) setToastDuration(4000); // Reset to default duration for error message
		setShowToast(true);
	} finally {
		setIsGeneratingPDF(false);
	}
};
