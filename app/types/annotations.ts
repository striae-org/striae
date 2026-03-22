// Annotation-related types and interfaces

export interface BoxAnnotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label?: string;
  timestamp: string;
}

export interface ConfirmationData {
  fullName: string;           // Confirming examiner's full name
  badgeId: string;            // Badge/ID number of confirming examiner  
  timestamp: string;          // Human-readable confirmation timestamp
  confirmationId: string;     // Unique ID generated at confirmation time
  confirmedBy: string;        // User UID of the confirming examiner
  confirmedByEmail: string;   // Email of the confirming examiner
  confirmedByCompany: string; // Company/Lab of the confirming examiner
  confirmedAt: string;        // ISO timestamp of confirmation
}

export interface BulletAnnotationData {
  caliber?: string;
  mass?: string;
  radius?: string;
  lgNumber?: number;
  lgDirection?: string;
  // Width arrays should align with lgNumber:
  // L1..Ln stored in order at lWidths[0..n-1], G1..Gn at gWidths[0..n-1].
  lWidths?: string[];
  gWidths?: string[];
  jacketMetal?: string;
  coreMetal?: string;
  bulletType?: string;
}

export interface CartridgeCaseAnnotationData {
  caliber?: string;
  brand?: string;
  metal?: string;
  primerType?: string;
  fpiShape?: string;
  apertureShape?: string;
  hasFpDrag?: boolean;
  hasExtractorMarks?: boolean;
  hasEjectorMarks?: boolean;
  hasChamberMarks?: boolean;
  hasMagazineLipMarks?: boolean;
  hasPrimerShear?: boolean;
  hasEjectionPortMarks?: boolean;
}

export interface ShotshellAnnotationData {
  gauge?: string;
  shotSize?: string;
  metal?: string;
  brand?: string;
  fpiShape?: string;
  hasExtractorMarks?: boolean;
  hasEjectorMarks?: boolean;
  hasChamberMarks?: boolean;
}

export interface AnnotationData {
  leftCase: string;
  rightCase: string;
  leftItem: string;
  rightItem: string;
  caseFontColor?: string;
  classType?: 'Bullet' | 'Cartridge Case' | 'Shotshell' | 'Other';
  customClass?: string;
  classNote?: string;
  indexType?: 'number' | 'color';
  indexNumber?: string;
  indexColor?: string;
  supportLevel?: 'ID' | 'Exclusion' | 'Inconclusive';
  bulletData?: BulletAnnotationData;
  cartridgeCaseData?: CartridgeCaseAnnotationData;
  shotshellData?: ShotshellAnnotationData;
  hasSubclass?: boolean;
  includeConfirmation: boolean;
  confirmationData?: ConfirmationData;
  additionalNotes?: string;
  boxAnnotations?: BoxAnnotation[];
  updatedAt: string;
  earliestAnnotationTimestamp?: string; // ISO timestamp of first annotation created (notes or box)
}