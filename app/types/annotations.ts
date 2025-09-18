// Annotation-related types and interfaces

export interface BoxAnnotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  timestamp: string;
}

export interface AnnotationData {
  leftCase: string;
  rightCase: string;
  leftItem: string;
  rightItem: string;
  caseFontColor: string;
  classType: 'Bullet' | 'Cartridge Case' | 'Other';
  customClass?: string;
  classNote?: string;
  indexType: 'number' | 'color';
  indexNumber?: string;
  indexColor?: string;
  supportLevel: 'ID' | 'Exclusion' | 'Inconclusive';
  hasSubclass?: boolean;
  includeConfirmation: boolean;
  additionalNotes?: string;
  boxAnnotations?: BoxAnnotation[];
  updatedAt: string;
}