import type { IndexType, SupportLevel } from '../../../shared/types/annotation-literals';

export interface BoxAnnotation {
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
}

export interface ConfirmationData {
	fullName: string;
	badgeId: string;
	confirmedByCompany?: string;
	timestamp: string;
	confirmationId: string;
}

export interface AnnotationData {
	// Index annotations
	indexType?: IndexType;
	indexNumber?: string;
	indexColor?: string;

	// Case/number annotations
	caseFontColor?: string;
	leftCase?: string;
	leftItem?: string;
	rightCase?: string;
	rightItem?: string;
	leftMagnification?: string;
	rightMagnification?: string;

	// Box annotations
	boxAnnotations?: BoxAnnotation[];

	// ID/Support level annotations
	supportLevel?: SupportLevel;

	// Class annotations (left/right per-item)
	leftItemType?: string;
	leftCustomClass?: string;
	leftClassNote?: string;
	leftHasSubclass?: boolean;
	rightItemType?: string;
	rightCustomClass?: string;
	rightClassNote?: string;
	rightHasSubclass?: boolean;

	// Confirmation annotations
	includeConfirmation?: boolean;
	confirmationData?: ConfirmationData;

	// Notes
	leftAdditionalNotes?: string;
	rightAdditionalNotes?: string;
	additionalNotes?: string;
}

export interface PDFGenerationData {
	imageUrl?: string;
	caseNumber?: string;
	annotationData?: AnnotationData;
	activeAnnotations?: string[];
	currentDate: string;
	notesUpdatedFormatted?: string;
	userCompany?: string;
	userFirstName?: string;
	userLastName?: string;
	userBadgeId?: string;
	reportMode?: 'audit-trail';
	auditTrailReport?: AuditTrailReportPayload;
	userTimezone?: string;
}

export interface AuditTrailReportPayload {
	caseNumber: string;
	exportedAt: string;
	exportRangeStart: string;
	exportRangeEnd: string;
	chunkIndex: number;
	totalChunks: number;
	totalEntries: number;
	includeRawJsonAppendix: boolean;
	entries: unknown[];
}

export interface PDFGenerationRequest {
	reportFormat: string;
	data: PDFGenerationData;
}

export interface PDFMarginOptions {
	top: string;
	bottom: string;
	left: string;
	right: string;
}

export interface ReportPdfOptions {
	printBackground?: boolean;
	format?: string;
	margin?: Partial<PDFMarginOptions>;
	displayHeaderFooter?: boolean;
	headerTemplate?: string;
	footerTemplate?: string;
	preferCSSPageSize?: boolean;
}

export type ReportRenderer = (data: PDFGenerationData) => string;

export type ReportPdfOptionsBuilder = (data: PDFGenerationData) => Partial<ReportPdfOptions>;

export interface ReportModule {
	renderReport: ReportRenderer;
	getPdfOptions?: ReportPdfOptionsBuilder;
}
