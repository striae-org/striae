import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { ColorSelector } from '~/components/colors/colors';
import { NotesModal } from './notes-modal';
import { getNotes, saveNotes } from '~/components/actions/notes-manage';
import { AnnotationData } from '~/types/annotations';
import { resolveEarliestAnnotationTimestamp } from '~/utils/annotation-timestamp';
import { auditService } from '~/services/audit.service';
import styles from './notes.module.css';

interface NotesSidebarProps {
  currentCase: string;
  onReturn: () => void;
  user: User;
  imageId: string;
  onAnnotationRefresh?: () => void;
  originalFileName?: string;
  isUploading?: boolean;
}

type SupportLevel = 'ID' | 'Exclusion' | 'Inconclusive';
type ClassType = 'Bullet' | 'Cartridge Case' | 'Other';
type IndexType = 'number' | 'color';

export const NotesSidebar = ({ currentCase, onReturn, user, imageId, onAnnotationRefresh, originalFileName, isUploading = false }: NotesSidebarProps) => {
  // Loading/Saving Notes States
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Case numbers state
  const [leftCase, setLeftCase] = useState('');
  const [rightCase, setRightCase] = useState('');
  const [leftItem, setLeftItem] = useState('');
  const [rightItem, setRightItem] = useState('');
  const [useCurrentCaseLeft, setUseCurrentCaseLeft] = useState(false);
  const [useCurrentCaseRight, setUseCurrentCaseRight] = useState(false);
  const [caseFontColor, setCaseFontColor] = useState('');

  // Class characteristics state
  const [classType, setClassType] = useState<ClassType | ''>('');
  const [customClass, setCustomClass] = useState('');
  const [classNote, setClassNote] = useState('');
  const [hasSubclass, setHasSubclass] = useState(false);

  // Index state
  const [indexType, setIndexType] = useState<IndexType>('color');
  const [indexNumber, setIndexNumber] = useState('');
  const [indexColor, setIndexColor] = useState('');

  // Support level and confirmation
  const [supportLevel, setSupportLevel] = useState<SupportLevel | ''>('');
  const [includeConfirmation, setIncludeConfirmation] = useState(false);

  // Additional Notes Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');

  useEffect(() => {
    const loadExistingNotes = async () => {
      if (!imageId || !currentCase) return;
      
      setIsLoading(true);
      setLoadError(undefined);
      
      try {
        const existingNotes = await getNotes(user, currentCase, imageId);
        
        if (existingNotes) {
          // Update all form fields with existing data
          setLeftCase(existingNotes.leftCase);
          setRightCase(existingNotes.rightCase);
          setLeftItem(existingNotes.leftItem);
          setRightItem(existingNotes.rightItem);
          setCaseFontColor(existingNotes.caseFontColor || '');
          setClassType(existingNotes.classType || '');
          setCustomClass(existingNotes.customClass || '');
          setClassNote(existingNotes.classNote || '');
          setHasSubclass(existingNotes.hasSubclass ?? false);
          setIndexType(existingNotes.indexType || 'color');
          setIndexNumber(existingNotes.indexNumber || '');
          setIndexColor(existingNotes.indexColor || '');
          setSupportLevel(existingNotes.supportLevel || '');
          setIncludeConfirmation(existingNotes.includeConfirmation);
          setAdditionalNotes(existingNotes.additionalNotes || '');
        }
      } catch (error) {
        setLoadError('Failed to load existing notes');
        console.error('Error loading notes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingNotes();
  }, [imageId, currentCase, user]);

 useEffect(() => {
    if (useCurrentCaseLeft) {
      setLeftCase(currentCase);
    }
    if (useCurrentCaseRight) {
      setRightCase(currentCase);
    }
  }, [useCurrentCaseLeft, useCurrentCaseRight, currentCase]);

  const handleSave = async () => {

    if (!imageId) {
      console.error('No image selected');
      return;
    }

    let existingData: AnnotationData | null = null;
    
    try {
      // First, get existing annotation data to preserve box annotations
      existingData = await getNotes(user, currentCase, imageId);
      
      // Create updated annotation data, preserving box annotations and earliest timestamp
      const now = new Date().toISOString();
      const annotationData: AnnotationData = {
        // Case Information
        leftCase: leftCase || '',
        rightCase: rightCase || '',
        leftItem: leftItem || '',
        rightItem: rightItem || '',
        caseFontColor: caseFontColor || undefined,
        
        // Class Characteristics
        classType: classType as ClassType || undefined,
        customClass: customClass,
        classNote: classNote || undefined,
        hasSubclass: hasSubclass,
        
        // Index Information
        indexType: indexType,
        indexNumber: indexNumber,
        indexColor: indexColor || undefined,

        // Support Level & Confirmation
        supportLevel: supportLevel as SupportLevel || undefined,
        includeConfirmation: includeConfirmation,
        
        // Additional Notes
        additionalNotes: additionalNotes || undefined, // Keep as optional
        
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
        'notes-sidebar',
        imageId,
        originalFileName
      );
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Refresh annotation data after saving notes
      if (onAnnotationRefresh) {
        onAnnotationRefresh();
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
      
      // Audit logging for failed annotation save
      try {
        await auditService.logAnnotationEdit(
          user,
          `${currentCase}-${imageId}`,
          existingData,
          null, // Failed save, no new value
          currentCase,
          'notes-sidebar',
          imageId,
          originalFileName
        );
      } catch (auditError) {
        console.error('Failed to log annotation edit audit:', auditError);
      }
    }
  };

  return (
    <div className={styles.notesSidebar}>
      {isLoading ? (
        <div className={styles.loading}>Loading notes...</div>
      ) : loadError ? (
        <div className={styles.error}>{loadError}</div>
      ) : (
        <>
      <div className={styles.section}>
        <h5 className={styles.sectionTitle}>Case Information</h5>
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
                disabled={useCurrentCaseLeft || isUploading}                
              />
            </div>
            <label className={`${styles.checkboxLabel} mb-4`}>
              <input
                type="checkbox"
                checked={useCurrentCaseLeft}
                onChange={(e) => setUseCurrentCaseLeft(e.target.checked)}
                className={styles.checkbox}
                disabled={isUploading}
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
                disabled={isUploading}
              />
            </div>            
          </div>
          <hr />
          {/* Right side inputs */}
          <div className={styles.inputGroup}>
            <div className={styles.caseInput}>
              <label htmlFor="rightCase">Right Side Case #</label>
              <input
                id="rightCase"
                type="text"
                value={rightCase}
                onChange={(e) => setRightCase(e.target.value)}
                disabled={useCurrentCaseRight || isUploading}                
              />
            </div>
            <label className={`${styles.checkboxLabel} mb-4`}>
              <input
                type="checkbox"
                checked={useCurrentCaseRight}
                onChange={(e) => setUseCurrentCaseRight(e.target.checked)}
                className={styles.checkbox}
                disabled={isUploading}
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
                disabled={isUploading}
              />
            </div>            
          </div>
        </div>
         <label htmlFor="colorSelect">Font</label>                  
          <ColorSelector            
            selectedColor={caseFontColor}
            onColorSelect={setCaseFontColor}
          />        
      </div>

      <div className={styles.section}>
        <h5 className={styles.sectionTitle}>Class Characteristics</h5>
        <div className={styles.classCharacteristics}>
          <select
            id="classType"
            aria-label="Class Type"
            value={classType}
            onChange={(e) => setClassType(e.target.value as ClassType)}
            className={styles.select}
            disabled={isUploading}
          >
            <option value="">Select class type...</option>
            <option value="Bullet">Bullet</option>
            <option value="Cartridge Case">Cartridge Case</option>
            <option value="Other">Other</option>
          </select>

          {classType === 'Other' && (
            <input
              type="text"
              value={customClass}
              onChange={(e) => setCustomClass(e.target.value)}
              placeholder="Specify object type"
              disabled={isUploading}
            />
          )}

          <textarea
            value={classNote}
            onChange={(e) => setClassNote(e.target.value)}
            placeholder="Enter class characteristic details..."
            className={styles.textarea}
            disabled={isUploading}
          />          
        </div>
        <label className={`${styles.checkboxLabel} mb-4`}>
          <input
            type="checkbox"
            checked={hasSubclass}
            onChange={(e) => setHasSubclass(e.target.checked)}
            className={styles.checkbox}
            disabled={isUploading}
          />
          <span>Potential subclass?</span>
        </label>
      </div>

      <div className={styles.section}>
        <h5 className={styles.sectionTitle}>Index Type</h5>
        <div className={styles.indexing}>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                checked={indexType === 'color'}
                onChange={() => setIndexType('color')}
                disabled={isUploading}
              />
              <span>Color</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                checked={indexType === 'number'}
                onChange={() => setIndexType('number')}
                disabled={isUploading}
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
              disabled={isUploading}
            />
          ) : indexType === 'color' ? (            
            <ColorSelector
              selectedColor={indexColor}
              onColorSelect={setIndexColor}
            />            
          ) : null}
        </div>
      </div>

      <div className={styles.section}>
        <h5 className={styles.sectionTitle}>Support Level</h5>
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
            disabled={isUploading}
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
            disabled={isUploading}
          />
          <span>Include confirmation field</span>
        </label>
        </div>
        <button 
        onClick={() => setIsModalOpen(true)}
        className={styles.notesButton}
        disabled={isUploading}
        title={isUploading ? "Cannot add notes while uploading" : undefined}
      >
        Additional Notes
      </button>
      </div>            
        <button 
            onClick={handleSave}
            className={styles.saveButton}
            disabled={isUploading}
            title={isUploading ? "Cannot save notes while uploading" : undefined}
          >
            Save Notes
          </button>
          
          {saveSuccess && (
            <div className={styles.successMessage}>
              Notes saved successfully!
            </div>
          )}

        <button 
          onClick={onReturn}
          className={styles.returnButton}
          disabled={isUploading}
          title={isUploading ? "Cannot return while uploading" : undefined}
        >
          Return to Case Management
        </button>            
      <NotesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        notes={additionalNotes}
        onSave={setAdditionalNotes}
      />
      </>
        )}
    </div>
  );
};