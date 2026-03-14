import paths from '~/config/config.json';
import { type AnnotationData } from '~/types/annotations';
import { auditService } from '~/services/audit';
import { getPdfApiKey } from '~/utils/auth';
import type { User } from 'firebase/auth';

interface GeneratePDFParams {
  user: User;
  selectedImage: string | undefined;
  selectedFilename: string | undefined;
  userCompany: string;
  userFirstName: string;
  currentCase: string;
  annotationData: AnnotationData | null;
  activeAnnotations: Set<string>;
  setIsGeneratingPDF: (isGenerating: boolean) => void;
  setToastType: (type: 'success' | 'error') => void;
  setToastMessage: (message: string) => void;
  setShowToast: (show: boolean) => void;
  setToastDuration?: (duration: number) => void;
}

export const generatePDF = async ({
  user,
  selectedImage,
  selectedFilename,
  userCompany,
  userFirstName,
  currentCase,
  annotationData,
  activeAnnotations,
  setIsGeneratingPDF,
  setToastType,
  setToastMessage,
  setShowToast,
  setToastDuration
}: GeneratePDFParams) => {
  setIsGeneratingPDF(true);
  
  // Track processing time for audit logging
  const startTime = Date.now();
  
  // Show generating toast immediately with duration 0 (stays until manually closed or completion)
  setToastType('success');
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

    const pdfData = {
      imageUrl: selectedImage,
      filename: selectedFilename,
      userCompany: userCompany,
      firstName: userFirstName,
      caseNumber: currentCase,
      annotationData,
      activeAnnotations: Array.from(activeAnnotations), // Convert Set to Array
      currentDate, // Pass formatted current date
      notesUpdatedFormatted // Pass formatted notes updated date
    };

    const pdfRequest = {
      reportFormat: 'striae',
      data: pdfData,
    };

    const pdfAuthKey = await getPdfApiKey();

    const response = await fetch(paths.pdf_worker_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Auth-Key': pdfAuthKey,
      },
      body: JSON.stringify(pdfRequest)
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
          selectedImage, // Source file ID
          selectedFilename // Source original filename
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
          selectedImage, // Source file ID
          selectedFilename // Source original filename
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
        selectedImage, // Source file ID
        selectedFilename // Source original filename
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
