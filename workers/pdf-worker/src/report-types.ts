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
  indexType?: 'number' | 'color';
  indexNumber?: string;
  indexColor?: string;

  // Case/number annotations
  caseFontColor?: string;
  leftCase?: string;
  leftItem?: string;
  rightCase?: string;
  rightItem?: string;

  // Box annotations
  boxAnnotations?: BoxAnnotation[];

  // ID/Support level annotations
  supportLevel?: 'ID' | 'Exclusion' | 'Inconclusive';

  // Class annotations
  classType?: string;
  customClass?: string;
  classNote?: string;
  hasSubclass?: boolean;

  // Confirmation annotations
  includeConfirmation?: boolean;
  confirmationData?: ConfirmationData;

  // Notes
  additionalNotes?: string;
}

export interface PDFGenerationData {
  imageUrl?: string;
  caseNumber?: string;
  annotationData?: AnnotationData;
  activeAnnotations?: string[];
  currentDate?: string;
  notesUpdatedFormatted?: string;
  userCompany?: string;
  userFirstName?: string;
  userLastName?: string;
  userBadgeId?: string;
}

export interface PDFGenerationRequest {
  reportFormat?: string;
  data?: PDFGenerationData;
}

export type ReportRenderer = (data: PDFGenerationData) => string;

export interface ReportModule {
  renderReport: ReportRenderer;
}
