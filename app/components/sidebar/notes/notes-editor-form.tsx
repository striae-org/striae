import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import type { User } from 'firebase/auth';
import { ColorSelector } from '~/components/colors/colors';
import { AddlNotesModal } from './addl-notes-modal';
import { ItemDetailsModal } from './item-details/item-details-modal';
import { buildItemDetailsSummary } from './item-details/item-details-shared';
import { getNotes, saveNotes } from '~/components/actions/notes-manage';
import { type AnnotationData, type BulletAnnotationData, type CartridgeCaseAnnotationData, type ShotshellAnnotationData, type ItemType, type SupportLevel, type IndexType } from '~/types/annotations';
import { resolveEarliestAnnotationTimestamp } from '~/utils/ui';
import { auditService } from '~/services/audit';
import styles from './notes.module.css';

interface NotesEditorFormProps {
  currentCase: string;
  user: User;
  imageId: string;
  onAnnotationRefresh?: () => void;
  originalFileName?: string;
  isUploading?: boolean;
  isReadOnly?: boolean;
  showNotification?: (message: string, type: 'success' | 'error' | 'warning') => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onRegisterSaveHandler?: (saveHandler: (() => Promise<boolean>) | null) => void;
}

interface NotesFormSnapshot {
  leftCase: string;
  rightCase: string;
  leftItem: string;
  rightItem: string;
  leftMagnification: string;
  rightMagnification: string;
  caseFontColor: string;
  // Left item class characteristics
  leftItemType: ItemType | '';
  leftCustomClass: string;
  leftClassNote: string;
  leftHasSubclass: boolean;
  leftBulletData: BulletAnnotationData | undefined;
  leftCartridgeCaseData: CartridgeCaseAnnotationData | undefined;
  leftShotshellData: ShotshellAnnotationData | undefined;
  // Right item class characteristics
  rightItemType: ItemType | '';
  rightCustomClass: string;
  rightClassNote: string;
  rightHasSubclass: boolean;
  rightBulletData: BulletAnnotationData | undefined;
  rightCartridgeCaseData: CartridgeCaseAnnotationData | undefined;
  rightShotshellData: ShotshellAnnotationData | undefined;
  indexType: IndexType;
  indexNumber: string;
  indexColor: string;
  supportLevel: SupportLevel | '';
  includeConfirmation: boolean;
  leftAdditionalNotes: string;
  rightAdditionalNotes: string;
  additionalNotes: string;
}

const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(hasMeaningfulValue);
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasMeaningfulValue);
  }

  return true;
};

const normalizeNestedAnnotationData = <T extends object>(data: T | undefined): T | undefined => {
  if (data === undefined || data === null) {
    return undefined;
  }

  return hasMeaningfulValue(data) ? data : undefined;
};

const normalizeNotesSnapshot = (snapshot: NotesFormSnapshot): NotesFormSnapshot => ({
  ...snapshot,
  leftBulletData: normalizeNestedAnnotationData(snapshot.leftBulletData),
  leftCartridgeCaseData: normalizeNestedAnnotationData(snapshot.leftCartridgeCaseData),
  leftShotshellData: normalizeNestedAnnotationData(snapshot.leftShotshellData),
  rightBulletData: normalizeNestedAnnotationData(snapshot.rightBulletData),
  rightCartridgeCaseData: normalizeNestedAnnotationData(snapshot.rightCartridgeCaseData),
  rightShotshellData: normalizeNestedAnnotationData(snapshot.rightShotshellData),
});

const serializeNotesSnapshot = (snapshot: NotesFormSnapshot): string => JSON.stringify(normalizeNotesSnapshot(snapshot));
const DIRTY_CHECK_DEBOUNCE_MS = 180;
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const NotesEditorForm = ({ currentCase, user, imageId, onAnnotationRefresh, originalFileName, isUploading = false, isReadOnly = false, showNotification: externalShowNotification, onDirtyChange, onRegisterSaveHandler }: NotesEditorFormProps) => {
  // Loading/Saving Notes States
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [isConfirmedImage, setIsConfirmedImage] = useState(false);
  // Case numbers state
  const [leftCase, setLeftCase] = useState('');
  const [rightCase, setRightCase] = useState('');
  const [leftItem, setLeftItem] = useState('');
  const [rightItem, setRightItem] = useState('');
  const [leftMagnification, setLeftMagnification] = useState('');
  const [rightMagnification, setRightMagnification] = useState('');
  const [useCurrentCaseLeft, setUseCurrentCaseLeft] = useState(false);
  const [useCurrentCaseRight, setUseCurrentCaseRight] = useState(false);
  const [caseFontColor, setCaseFontColor] = useState('');

  // Class characteristics state - selected item indicator
  const [selectedItem, setSelectedItem] = useState<'left' | 'right'>('left');

  // Left item class characteristics state
  const [leftItemType, setLeftItemType] = useState<ItemType | ''>('');
  const [leftCustomClass, setLeftCustomClass] = useState('');
  const [leftClassNote, setLeftClassNote] = useState('');
  const [leftHasSubclass, setLeftHasSubclass] = useState(false);
  const [leftBulletData, setLeftBulletData] = useState<BulletAnnotationData | undefined>(undefined);
  const [leftCartridgeCaseData, setLeftCartridgeCaseData] = useState<CartridgeCaseAnnotationData | undefined>(undefined);
  const [leftShotshellData, setLeftShotshellData] = useState<ShotshellAnnotationData | undefined>(undefined);

  // Right item class characteristics state
  const [rightItemType, setRightItemType] = useState<ItemType | ''>('');
  const [rightCustomClass, setRightCustomClass] = useState('');
  const [rightClassNote, setRightClassNote] = useState('');
  const [rightHasSubclass, setRightHasSubclass] = useState(false);
  const [rightBulletData, setRightBulletData] = useState<BulletAnnotationData | undefined>(undefined);
  const [rightCartridgeCaseData, setRightCartridgeCaseData] = useState<CartridgeCaseAnnotationData | undefined>(undefined);
  const [rightShotshellData, setRightShotshellData] = useState<ShotshellAnnotationData | undefined>(undefined);

  const [isClassDetailsOpen, setIsClassDetailsOpen] = useState(false);

  // Index state
  const [indexType, setIndexType] = useState<IndexType>('color');
  const [indexNumber, setIndexNumber] = useState('');
  const [indexColor, setIndexColor] = useState('');

  // Support level and confirmation
  const [supportLevel, setSupportLevel] = useState<SupportLevel | ''>('');
  const [includeConfirmation, setIncludeConfirmation] = useState(false);

  // Additional Notes Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leftAdditionalNotes, setLeftAdditionalNotes] = useState('');
  const [rightAdditionalNotes, setRightAdditionalNotes] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isCaseInfoOpen, setIsCaseInfoOpen] = useState(true);
  const [isClassOpen, setIsClassOpen] = useState(true);
  const [isIndexOpen, setIsIndexOpen] = useState(true);
  const [isSupportOpen, setIsSupportOpen] = useState(true);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [hasLoadedSnapshot, setHasLoadedSnapshot] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const areEditsDisabled = isUploading || isReadOnly || isConfirmedImage;
  const isReadOnlyMode = isConfirmedImage || isReadOnly;
  const canOpenModals = !isUploading;

  const notificationHandler = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (externalShowNotification) {
      externalShowNotification(message, type);
    }
  }, [externalShowNotification]);

  // Helper functions for selected item data access
  const getSelectedItemData = useCallback(() => {
    if (selectedItem === 'left') {
      return {
        itemType: leftItemType,
        customClass: leftCustomClass,
        classNote: leftClassNote,
        hasSubclass: leftHasSubclass,
        bulletData: leftBulletData,
        cartridgeCaseData: leftCartridgeCaseData,
        shotshellData: leftShotshellData,
      };
    }
    return {
      itemType: rightItemType,
      customClass: rightCustomClass,
      classNote: rightClassNote,
      hasSubclass: rightHasSubclass,
      bulletData: rightBulletData,
      cartridgeCaseData: rightCartridgeCaseData,
      shotshellData: rightShotshellData,
    };
  }, [selectedItem, leftItemType, leftCustomClass, leftClassNote, leftHasSubclass, leftBulletData, leftCartridgeCaseData, leftShotshellData, rightItemType, rightCustomClass, rightClassNote, rightHasSubclass, rightBulletData, rightCartridgeCaseData, rightShotshellData]);

  const setSelectedItemData = useCallback((newData: {
    itemType?: ItemType | '';
    customClass?: string;
    classNote?: string;
    hasSubclass?: boolean;
    bulletData?: BulletAnnotationData;
    cartridgeCaseData?: CartridgeCaseAnnotationData;
    shotshellData?: ShotshellAnnotationData;
  }) => {
    if (selectedItem === 'left') {
      if (newData.itemType !== undefined) setLeftItemType(newData.itemType);
      if (newData.customClass !== undefined) setLeftCustomClass(newData.customClass);
      if (newData.classNote !== undefined) setLeftClassNote(newData.classNote);
      if (newData.hasSubclass !== undefined) setLeftHasSubclass(newData.hasSubclass);
      if (newData.bulletData !== undefined) setLeftBulletData(newData.bulletData);
      if (newData.cartridgeCaseData !== undefined) setLeftCartridgeCaseData(newData.cartridgeCaseData);
      if (newData.shotshellData !== undefined) setLeftShotshellData(newData.shotshellData);
    } else {
      if (newData.itemType !== undefined) setRightItemType(newData.itemType);
      if (newData.customClass !== undefined) setRightCustomClass(newData.customClass);
      if (newData.classNote !== undefined) setRightClassNote(newData.classNote);
      if (newData.hasSubclass !== undefined) setRightHasSubclass(newData.hasSubclass);
      if (newData.bulletData !== undefined) setRightBulletData(newData.bulletData);
      if (newData.cartridgeCaseData !== undefined) setRightCartridgeCaseData(newData.cartridgeCaseData);
      if (newData.shotshellData !== undefined) setRightShotshellData(newData.shotshellData);
    }
  }, [selectedItem]);

  useEffect(() => {
    if (!hasLoadedSnapshot) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const nextSnapshot = serializeNotesSnapshot({
        leftCase,
        rightCase,
        leftItem,
        rightItem,
        leftMagnification,
        rightMagnification,
        caseFontColor,
        leftItemType,
        leftCustomClass,
        leftClassNote,
        leftHasSubclass,
        leftBulletData,
        leftCartridgeCaseData,
        leftShotshellData,
        rightItemType,
        rightCustomClass,
        rightClassNote,
        rightHasSubclass,
        rightBulletData,
        rightCartridgeCaseData,
        rightShotshellData,
        indexType,
        indexNumber,
        indexColor,
        supportLevel,
        includeConfirmation,
        leftAdditionalNotes,
        rightAdditionalNotes,
        additionalNotes,
      });

      setIsDirty(nextSnapshot !== savedSnapshot);
    }, DIRTY_CHECK_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    additionalNotes,
    hasLoadedSnapshot,
    includeConfirmation,
    indexColor,
    indexNumber,
    indexType,
    leftBulletData,
    leftCartridgeCaseData,
    leftCase,
    leftClassNote,
    leftCustomClass,
    leftHasSubclass,
    leftItemType,
    leftItem,
    leftMagnification,
    leftShotshellData,
    rightBulletData,
    rightCartridgeCaseData,
    rightCase,
    rightClassNote,
    rightCustomClass,
    rightHasSubclass,
    rightItemType,
    rightItem,
    rightMagnification,
    rightShotshellData,
    caseFontColor,
    savedSnapshot,
    leftAdditionalNotes,
    rightAdditionalNotes,
    supportLevel,
  ]);

  useEffect(() => {
    const loadExistingNotes = async () => {
      if (!imageId || !currentCase) return;
      
      setIsLoading(true);
      setLoadError(undefined);
      setIsConfirmedImage(false);
      setHasLoadedSnapshot(false);
      setIsDirty(false);
      onDirtyChange?.(false);
      
      try {
        const existingNotes = await getNotes(user, currentCase, imageId);
        
        if (existingNotes) {
          const hasExistingConfirmation = !!existingNotes.confirmationData;
          setIsConfirmedImage(hasExistingConfirmation);

          // Update all form fields with existing data
          setLeftCase(existingNotes.leftCase);
          setRightCase(existingNotes.rightCase);
          setLeftItem(existingNotes.leftItem);
          setRightItem(existingNotes.rightItem);
          setLeftMagnification(existingNotes.leftMagnification || '');
          setRightMagnification(existingNotes.rightMagnification || '');
          setCaseFontColor(existingNotes.caseFontColor || '');
          
          const migratedLeftItemType = existingNotes.leftItemType || '';
          const migratedLeftCustomClass = existingNotes.leftCustomClass || '';
          const migratedLeftClassNote = existingNotes.leftClassNote || '';
          const migratedLeftHasSubclass = existingNotes.leftHasSubclass ?? false;
          const migratedLeftBulletData = existingNotes.leftBulletData;
          const migratedLeftCartridgeCaseData = existingNotes.leftCartridgeCaseData;
          const migratedLeftShotshellData = existingNotes.leftShotshellData;
          
          setLeftItemType(migratedLeftItemType);
          setLeftCustomClass(migratedLeftCustomClass);
          setLeftClassNote(migratedLeftClassNote);
          setLeftHasSubclass(migratedLeftHasSubclass);
          setLeftBulletData(migratedLeftBulletData);
          setLeftCartridgeCaseData(migratedLeftCartridgeCaseData);
          setLeftShotshellData(migratedLeftShotshellData);
          
          // Set right item fields
          setRightItemType(existingNotes.rightItemType || '');
          setRightCustomClass(existingNotes.rightCustomClass || '');
          setRightClassNote(existingNotes.rightClassNote || '');
          setRightHasSubclass(existingNotes.rightHasSubclass ?? false);
          setRightBulletData(existingNotes.rightBulletData);
          setRightCartridgeCaseData(existingNotes.rightCartridgeCaseData);
          setRightShotshellData(existingNotes.rightShotshellData);
          
          setIndexType(existingNotes.indexType || 'color');
          setIndexNumber(existingNotes.indexNumber || '');
          setIndexColor(existingNotes.indexColor || '');
          setSupportLevel(existingNotes.supportLevel || '');
          setIncludeConfirmation(existingNotes.includeConfirmation);
          setLeftAdditionalNotes(existingNotes.leftAdditionalNotes || '');
          setRightAdditionalNotes(existingNotes.rightAdditionalNotes || '');
          setAdditionalNotes(existingNotes.additionalNotes || '');
          setSelectedItem('left'); // Always default to left item

          setSavedSnapshot(serializeNotesSnapshot({
            leftCase: existingNotes.leftCase || '',
            rightCase: existingNotes.rightCase || '',
            leftItem: existingNotes.leftItem || '',
            rightItem: existingNotes.rightItem || '',
            leftMagnification: existingNotes.leftMagnification || '',
            rightMagnification: existingNotes.rightMagnification || '',
            caseFontColor: existingNotes.caseFontColor || '',
            leftItemType: migratedLeftItemType,
            leftCustomClass: migratedLeftCustomClass,
            leftClassNote: migratedLeftClassNote,
            leftHasSubclass: migratedLeftHasSubclass,
            leftBulletData: migratedLeftBulletData,
            leftCartridgeCaseData: migratedLeftCartridgeCaseData,
            leftShotshellData: migratedLeftShotshellData,
            rightItemType: existingNotes.rightItemType || '',
            rightCustomClass: existingNotes.rightCustomClass || '',
            rightClassNote: existingNotes.rightClassNote || '',
            rightHasSubclass: existingNotes.rightHasSubclass ?? false,
            rightBulletData: existingNotes.rightBulletData,
            rightCartridgeCaseData: existingNotes.rightCartridgeCaseData,
            rightShotshellData: existingNotes.rightShotshellData,
            indexType: existingNotes.indexType || 'color',
            indexNumber: existingNotes.indexNumber || '',
            indexColor: existingNotes.indexColor || '',
            supportLevel: existingNotes.supportLevel || '',
            includeConfirmation: existingNotes.includeConfirmation,
            leftAdditionalNotes: existingNotes.leftAdditionalNotes || '',
            rightAdditionalNotes: existingNotes.rightAdditionalNotes || '',
            additionalNotes: existingNotes.additionalNotes || ''
          }));
        } else {
          setIsConfirmedImage(false);

          setSavedSnapshot(serializeNotesSnapshot({
            leftCase: '',
            rightCase: '',
            leftItem: '',
            rightItem: '',
            leftMagnification: '',
            rightMagnification: '',
            caseFontColor: '',
            leftItemType: '',
            leftCustomClass: '',
            leftClassNote: '',
            leftHasSubclass: false,
            leftBulletData: undefined,
            leftCartridgeCaseData: undefined,
            leftShotshellData: undefined,
            rightItemType: '',
            rightCustomClass: '',
            rightClassNote: '',
            rightHasSubclass: false,
            rightBulletData: undefined,
            rightCartridgeCaseData: undefined,
            rightShotshellData: undefined,
            indexType: 'color',
            indexNumber: '',
            indexColor: '',
            supportLevel: '',
            includeConfirmation: false,
            leftAdditionalNotes: '',
            rightAdditionalNotes: '',
            additionalNotes: ''
          }));
        }
      } catch (error) {
        setLoadError('Failed to load existing notes');
        console.error('Error loading notes:', error);
      } finally {
        setIsLoading(false);
        setHasLoadedSnapshot(true);
      }
    };

    loadExistingNotes();
  }, [imageId, currentCase, onDirtyChange, user]);

  useIsomorphicLayoutEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

 useEffect(() => {
    if (useCurrentCaseLeft) {
      setLeftCase(currentCase);
    }
    if (useCurrentCaseRight) {
      setRightCase(currentCase);
    }
  }, [useCurrentCaseLeft, useCurrentCaseRight, currentCase]);

  const handleSave = useCallback(async (): Promise<boolean> => {

    if (!imageId) {
      console.error('No image selected');
      return false;
    }

    if (isReadOnly) {
      notificationHandler('This case is read-only. Notes cannot be modified.', 'error');
      return false;
    }

    let existingData: AnnotationData | null = null;
    
    try {
      // First, get existing annotation data to preserve box annotations
      existingData = await getNotes(user, currentCase, imageId);

      if (existingData?.confirmationData) {
        setIsConfirmedImage(true);
        notificationHandler('This image is confirmed. Notes cannot be modified.', 'error');
        return false;
      }

      const normalizedLeftBulletData = normalizeNestedAnnotationData(leftBulletData);
      const normalizedLeftCartridgeCaseData = normalizeNestedAnnotationData(leftCartridgeCaseData);
      const normalizedLeftShotshellData = normalizeNestedAnnotationData(leftShotshellData);
      const normalizedRightBulletData = normalizeNestedAnnotationData(rightBulletData);
      const normalizedRightCartridgeCaseData = normalizeNestedAnnotationData(rightCartridgeCaseData);
      const normalizedRightShotshellData = normalizeNestedAnnotationData(rightShotshellData);
      
      // Create updated annotation data, preserving box annotations and earliest timestamp
      const now = new Date().toISOString();
      const annotationData: AnnotationData = {
        // Case Information
        leftCase: leftCase || '',
        rightCase: rightCase || '',
        leftItem: leftItem || '',
        rightItem: rightItem || '',
        leftMagnification: leftMagnification || undefined,
        rightMagnification: rightMagnification || undefined,
        caseFontColor: caseFontColor || undefined,
        
        // Left item class characteristics
        leftItemType: leftItemType as ItemType || undefined,
        leftCustomClass: leftCustomClass,
        leftClassNote: leftClassNote || undefined,
        leftHasSubclass: leftHasSubclass,
        leftBulletData: normalizedLeftBulletData,
        leftCartridgeCaseData: normalizedLeftCartridgeCaseData,
        leftShotshellData: normalizedLeftShotshellData,
        
        // Right item class characteristics
        rightItemType: rightItemType as ItemType || undefined,
        rightCustomClass: rightCustomClass,
        rightClassNote: rightClassNote || undefined,
        rightHasSubclass: rightHasSubclass,
        rightBulletData: normalizedRightBulletData,
        rightCartridgeCaseData: normalizedRightCartridgeCaseData,
        rightShotshellData: normalizedRightShotshellData,
        
        // Index Information
        indexType: indexType,
        indexNumber: indexNumber,
        indexColor: indexColor || undefined,

        // Support Level & Confirmation
        supportLevel: supportLevel as SupportLevel || undefined,
        includeConfirmation: includeConfirmation,
        
        // Additional Notes
        leftAdditionalNotes: leftAdditionalNotes || undefined,
        rightAdditionalNotes: rightAdditionalNotes || undefined,
        additionalNotes: additionalNotes || undefined, // General notes (including box-annotation notes)
        
        // Preserve existing box annotations
        boxAnnotations: existingData?.boxAnnotations || [],
        
        // Metadata
        updatedAt: now,
        // Set earliest annotation timestamp on first save (don't overwrite if already exists)
        earliestAnnotationTimestamp: resolveEarliestAnnotationTimestamp(
          undefined,
          existingData?.earliestAnnotationTimestamp,
          now
        )
      };

      await saveNotes(user, currentCase, imageId, annotationData);
      
      // Comprehensive audit logging for annotation save
      await auditService.logAnnotationEdit(
        user,
        `${currentCase}-${imageId}`,
        existingData,
        annotationData,
        currentCase,
        'notes-editor-form',
        imageId,
        originalFileName
      );
      
      notificationHandler('Notes saved successfully.', 'success');

      setSavedSnapshot(serializeNotesSnapshot({
        leftCase,
        rightCase,
        leftItem,
        rightItem,
        leftMagnification,
        rightMagnification,
        caseFontColor,
        leftItemType,
        leftCustomClass,
        leftClassNote,
        leftHasSubclass,
        leftBulletData,
        leftCartridgeCaseData,
        leftShotshellData,
        rightItemType,
        rightCustomClass,
        rightClassNote,
        rightHasSubclass,
        rightBulletData,
        rightCartridgeCaseData,
        rightShotshellData,
        indexType,
        indexNumber,
        indexColor,
        supportLevel,
        includeConfirmation,
        leftAdditionalNotes,
        rightAdditionalNotes,
        additionalNotes,
      }));
      setIsDirty(false);
      onDirtyChange?.(false);
      
      // Refresh annotation data after saving notes
      if (onAnnotationRefresh) {
        onAnnotationRefresh();
      }

      return true;
    } catch (error) {
      console.error('Failed to save notes:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.toLowerCase().includes('confirmed image')) {
        setIsConfirmedImage(true);
        notificationHandler('This image is confirmed. Notes cannot be modified.', 'error');
      } else {
        notificationHandler('Failed to save notes. Please try again.', 'error');
      }
      
      // Audit logging for failed annotation save
      try {
        await auditService.logAnnotationEdit(
          user,
          `${currentCase}-${imageId}`,
          existingData,
          null, // Failed save, no new value
          currentCase,
          'notes-editor-form',
          imageId,
          originalFileName
        );
      } catch (auditError) {
        console.error('Failed to log annotation edit audit:', auditError);
      }

      return false;
    }
  }, [
    additionalNotes,
    leftBulletData,
    leftCartridgeCaseData,
    caseFontColor,
    leftClassNote,
    leftItemType,
    currentCase,
    leftCustomClass,
    leftHasSubclass,
    imageId,
    includeConfirmation,
    indexColor,
    indexNumber,
    indexType,
    isReadOnly,
    leftCase,
    leftItem,
    leftMagnification,
    notificationHandler,
    onAnnotationRefresh,
    onDirtyChange,
    originalFileName,
    rightBulletData,
    rightCartridgeCaseData,
    rightCase,
    rightClassNote,
    rightCustomClass,
    rightHasSubclass,
    rightItemType,
    rightItem,
    rightMagnification,
    rightShotshellData,
    leftShotshellData,
    leftAdditionalNotes,
    rightAdditionalNotes,
    supportLevel,
    user,
  ]);

  useEffect(() => {
    onRegisterSaveHandler?.(handleSave);

    return () => {
      onRegisterSaveHandler?.(null);
    };
  }, [handleSave, onRegisterSaveHandler]);

  return (
    <div className={`${styles.notesEditorForm} ${styles.editorLayout}`}>
      {isLoading ? (
        <div className={styles.loading}>Loading notes...</div>
      ) : loadError ? (
        <div className={styles.error}>{loadError}</div>
      ) : (
        <>
      {isConfirmedImage && (
        <div className={styles.immutableNotice}>
          This image is confirmed. Notes are read-only.
        </div>
      )}

      <div className={styles.section}>
        <button
          type="button"
          className={styles.sectionToggle}
          onClick={() => setIsCaseInfoOpen((prev) => !prev)}
          aria-expanded={isCaseInfoOpen}
        >
          <span className={styles.sectionTitle}>Case Information</span>
          <span className={styles.sectionToggleIcon}>{isCaseInfoOpen ? '−' : '+'}</span>
        </button>
        {isCaseInfoOpen && (
          <>
        <hr />
        <div className={styles.caseNumbers}>
          {/* Left side inputs */}
          <div className={styles.inputGroup}>
            <div className={styles.caseInput}>
              <label htmlFor="leftCase">Left Side Case #</label>
              <input
                id="leftCase"
                type="text"
                value={leftCase}
                onChange={(e) => setLeftCase(e.target.value)}
                disabled={useCurrentCaseLeft || areEditsDisabled}                
              />
            </div>
            <label className={`${styles.checkboxLabel} mb-4`}>
              <input
                type="checkbox"
                checked={useCurrentCaseLeft}
                onChange={(e) => setUseCurrentCaseLeft(e.target.checked)}
                className={styles.checkbox}
                disabled={areEditsDisabled}
              />
              <span>Use current case number</span>
            </label>            
            <div className={styles.caseInput}>
              <label htmlFor="leftItem">Left Side Item #</label>
              <input
                id="leftItem"
                type="text"
                value={leftItem}
                onChange={(e) => setLeftItem(e.target.value)}
                disabled={areEditsDisabled}
              />
            </div>
            <div className={styles.caseInput}>
              <label htmlFor="leftMagnification">Left Side Magnification</label>
              <input
                id="leftMagnification"
                type="text"
                value={leftMagnification}
                onChange={(e) => setLeftMagnification(e.target.value)}
                disabled={areEditsDisabled}
              />
            </div>
          </div>
          {/* Right side inputs */}
          <div className={styles.inputGroup}>
            <div className={styles.caseInput}>
              <label htmlFor="rightCase">Right Side Case #</label>
              <input
                id="rightCase"
                type="text"
                value={rightCase}
                onChange={(e) => setRightCase(e.target.value)}
                disabled={useCurrentCaseRight || areEditsDisabled}                
              />
            </div>
            <label className={`${styles.checkboxLabel} mb-4`}>
              <input
                type="checkbox"
                checked={useCurrentCaseRight}
                onChange={(e) => setUseCurrentCaseRight(e.target.checked)}
                className={styles.checkbox}
                disabled={areEditsDisabled}
              />
              <span>Use current case number</span>
            </label>
            <div className={styles.caseInput}>
              <label htmlFor="rightItem">Right Side Item #</label>
              <input
                id="rightItem"
                type="text"
                value={rightItem}
                onChange={(e) => setRightItem(e.target.value)}
                disabled={areEditsDisabled}
              />
            </div>
            <div className={styles.caseInput}>
              <label htmlFor="rightMagnification">Right Side Magnification</label>
              <input
                id="rightMagnification"
                type="text"
                value={rightMagnification}
                onChange={(e) => setRightMagnification(e.target.value)}
                disabled={areEditsDisabled}
              />
            </div>            
          </div>
        </div>
        <hr />
        <div className={styles.fontColorRow}>
          <label htmlFor="colorSelect">Case & Item Font Color</label>
          <ColorSelector
            selectedColor={caseFontColor}
            onColorSelect={setCaseFontColor}
            disabled={areEditsDisabled}
          />
        </div>
          </>
        )}
      </div>

      <div className={styles.compactSectionGrid}>
      <div className={`${styles.section} ${styles.compactFullSection}`}>
        <button
          type="button"
          className={styles.sectionToggle}
          onClick={() => setIsClassOpen((prev) => !prev)}
          aria-expanded={isClassOpen}
        >
          <span className={styles.sectionTitle}>Class Characteristics & GRC</span>
          <span className={styles.sectionToggleIcon}>{isClassOpen ? '−' : '+'}</span>
        </button>
        {isClassOpen && (
          <>
            <hr />
            <div className={styles.itemSelectorRow}>
              <label htmlFor="itemSelector">Select Item</label>
              <select
                id="itemSelector"
                aria-label="Select item to edit"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value as 'left' | 'right')}
                className={styles.select}
              >
                <option value="left">{`Case: ${leftCase || '—'} Item: ${leftItem || '—'}`}</option>
                <option value="right" disabled={!rightItem && !rightCase}>
                  {`Case: ${rightCase || '—'} Item: ${rightItem || '—'}`}
                </option>
              </select>
            </div>
            <div className={styles.classCharacteristicsColumns}>
              <div className={styles.classCharacteristicsMain}>
                <div className={styles.classCharacteristics}>
                  <select
                    id="itemType"
                    aria-label="Item Type"
                    value={getSelectedItemData().itemType}
                    onChange={(e) => setSelectedItemData({ itemType: e.target.value as ItemType })}
                    className={styles.select}
                    disabled={areEditsDisabled}
                  >
                    <option value="">Select item type...</option>
                    <option value="Bullet">Bullet</option>
                    <option value="Cartridge Case">Cartridge Case</option>
                    <option value="Shotshell">Shotshell</option>
                    <option value="Other">Other</option>
                  </select>

                  {getSelectedItemData().itemType === 'Other' && (
                    <input
                      type="text"
                      value={getSelectedItemData().customClass}
                      onChange={(e) => setSelectedItemData({ customClass: e.target.value })}
                      placeholder="Specify object type"
                      disabled={areEditsDisabled}
                    />
                  )}

                  <textarea
                    value={getSelectedItemData().classNote}
                    onChange={(e) => setSelectedItemData({ classNote: e.target.value })}
                    placeholder="Enter item details..."
                    className={styles.textarea}
                    disabled={areEditsDisabled}
                  />
                </div>
            </div>

              <div className={styles.itemDetailsPanel}>
                <button
                  type="button"
                  onClick={() => setIsClassDetailsOpen(true)}
                  className={styles.itemDetailsButton}
                >
                  Class Characteristics & GRC
                </button>
                <label className={`${styles.checkboxLabel} mb-4`}>
                  <input
                    type="checkbox"
                    checked={getSelectedItemData().hasSubclass}
                    onChange={(e) => setSelectedItemData({ hasSubclass: e.target.checked })}
                    className={styles.checkbox}
                    disabled={areEditsDisabled}
                  />
                  <span>Potential subclass?</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      <div className={`${styles.section} ${styles.compactHalfSection}`}>
        <button
          type="button"
          className={styles.sectionToggle}
          onClick={() => setIsIndexOpen((prev) => !prev)}
          aria-expanded={isIndexOpen}
        >
          <span className={styles.sectionTitle}>Index Type</span>
          <span className={styles.sectionToggleIcon}>{isIndexOpen ? '−' : '+'}</span>
        </button>
        {isIndexOpen && (
          <div className={styles.indexing}>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                checked={indexType === 'color'}
                onChange={() => setIndexType('color')}
                disabled={areEditsDisabled}
              />
              <span>Color</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                checked={indexType === 'number'}
                onChange={() => setIndexType('number')}
                disabled={areEditsDisabled}
              />
              <span>Number/Letter</span>
            </label>
          </div>

          {indexType === 'number' ? (
            <input
              type="text"
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value)}
              placeholder="Enter index number"
              disabled={areEditsDisabled}
            />
          ) : indexType === 'color' ? (            
            <ColorSelector
              selectedColor={indexColor}
              onColorSelect={setIndexColor}
              disabled={areEditsDisabled}
            />            
          ) : null}
        </div>
        )}
      </div>

      <div className={`${styles.section} ${styles.compactHalfSection}`}>
        <button
          type="button"
          className={styles.sectionToggle}
          onClick={() => setIsSupportOpen((prev) => !prev)}
          aria-expanded={isSupportOpen}
        >
          <span className={styles.sectionTitle}>Support Level</span>
          <span className={styles.sectionToggleIcon}>{isSupportOpen ? '−' : '+'}</span>
        </button>
        {isSupportOpen && (
          <>
            <div className={styles.support}>
              <select
                id="supportLevel"
                aria-label="Support Level"
                value={supportLevel}
                onChange={(e) => {
                  const newSupportLevel = e.target.value as SupportLevel;
                  setSupportLevel(newSupportLevel);
                  
                  // Automatically check confirmation field when ID is selected
                  if (newSupportLevel === 'ID') {
                    setIncludeConfirmation(true);
                  }
                }}
                className={styles.select}
                disabled={areEditsDisabled}
              >
                <option value="">Select support level...</option>
                <option value="ID">Identification</option>
                <option value="Exclusion">Exclusion</option>
                <option value="Inconclusive">Inconclusive</option>
              </select>
              <label className={`${styles.checkboxLabel} mb-4`}>
                <input
                  type="checkbox"
                  checked={includeConfirmation}
                  onChange={(e) => setIncludeConfirmation(e.target.checked)}
                  className={styles.checkbox}
                  disabled={areEditsDisabled}
                />
                <span>Include confirmation field</span>
              </label>
            </div>
          </>
        )}
      </div>            
      </div>

        <div className={styles.additionalNotesRow}>
          <button 
            onClick={() => setIsModalOpen(true)}
            className={styles.notesButton}
            disabled={!canOpenModals}
            title={isUploading ? "Cannot open notes while uploading" : undefined}
          >
            Additional Notes
          </button>
        </div>

        <div className={`${styles.notesActionBar} ${styles.notesActionBarSticky}`}>
          <button 
              onClick={handleSave}
              className={styles.saveButton}
              disabled={areEditsDisabled}
              title={isConfirmedImage ? "Cannot save notes - image is confirmed" : isUploading ? "Cannot save notes while uploading" : isReadOnly ? "Cannot save notes - case is read-only" : undefined}
            >
              Save Notes
            </button>
        </div>
      <AddlNotesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        notes={additionalNotes}
        onSave={(notes) => {
          if (areEditsDisabled) {
            return;
          }

          setAdditionalNotes(notes);
        }}
        isReadOnly={isReadOnlyMode}
        showNotification={notificationHandler}
      />
      <ItemDetailsModal
        isOpen={isClassDetailsOpen}
        onClose={() => setIsClassDetailsOpen(false)}
        itemType={getSelectedItemData().itemType}
        bulletData={getSelectedItemData().bulletData}
        cartridgeCaseData={getSelectedItemData().cartridgeCaseData}
        shotshellData={getSelectedItemData().shotshellData}
        onSave={(b, c, s) => {
          if (areEditsDisabled) {
            return;
          }

          setSelectedItemData({
            bulletData: b,
            cartridgeCaseData: c,
            shotshellData: s,
          });
          const summary = buildItemDetailsSummary(b, c, s, getSelectedItemData().itemType);
          if (summary) {
            if (selectedItem === 'left') {
              setLeftAdditionalNotes((prev) => (prev ? `${prev}\n${summary}` : summary));
            } else {
              setRightAdditionalNotes((prev) => (prev ? `${prev}\n${summary}` : summary));
            }
          }
        }}
        showNotification={notificationHandler}
        isReadOnly={isReadOnlyMode}
      />
      </>
        )}
    </div>
  );
};