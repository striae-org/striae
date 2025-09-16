import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { ColorSelector } from '~/components/colors/colors';
import { NotesModal } from './notes-modal';
import { getNotes, saveNotes } from '~/components/actions/notes-manage';
import { AnnotationData } from '~/types/annotations';
import styles from './notes.module.css';

interface NotesSidebarProps {
  currentCase: string;
  onReturn: () => void;
  user: User;
  imageId: string;
  onAnnotationRefresh?: () => void;
}

type SupportLevel = 'ID' | 'Exclusion' | 'Inconclusive';
type ClassType = 'Bullet' | 'Cartridge Case' | 'Other';
type IndexType = 'number' | 'color';

export const NotesSidebar = ({ currentCase, onReturn, user, imageId, onAnnotationRefresh }: NotesSidebarProps) => {
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
  const [caseFontColor, setCaseFontColor] = useState('#FFDE21');

  // Class characteristics state
  const [classType, setClassType] = useState<ClassType>('Bullet');
  const [customClass, setCustomClass] = useState('');
  const [classNote, setClassNote] = useState('');
  const [hasSubclass, setHasSubclass] = useState(false);

  // Index state
  const [indexType, setIndexType] = useState<IndexType>('color');
  const [indexNumber, setIndexNumber] = useState('');
  const [indexColor, setIndexColor] = useState('#000000');

  // Support level and confirmation
  const [supportLevel, setSupportLevel] = useState<SupportLevel>('ID');
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
          setCaseFontColor(existingNotes.caseFontColor || '#FFDE21');
          setClassType(existingNotes.classType || 'Bullet');
          setCustomClass(existingNotes.customClass || '');
          setClassNote(existingNotes.classNote || '');
          setHasSubclass(existingNotes.hasSubclass ?? false);
          setIndexType(existingNotes.indexType);
          setIndexNumber(existingNotes.indexNumber || '');
          setIndexColor(existingNotes.indexColor || '#000000');
          setSupportLevel(existingNotes.supportLevel || 'ID');
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

  // Automatically set includeConfirmation to true when Identification is selected
  useEffect(() => {
    if (supportLevel === 'ID') {
      setIncludeConfirmation(true);
    }
  }, [supportLevel]);

  const handleSave = async () => {

    if (!imageId) {
      console.error('No image selected');
      return;
    }

    try {
      // First, get existing annotation data to preserve box annotations
      const existingData = await getNotes(user, currentCase, imageId);
      
      // Create updated annotation data, preserving box annotations
      const annotationData: AnnotationData = {
        // Case Information
        leftCase: leftCase || '',
        rightCase: rightCase || '',
        leftItem: leftItem || '',
        rightItem: rightItem || '',
        caseFontColor: caseFontColor || '#FFDE21',
        
        // Class Characteristics
        classType: classType || 'Bullet',
        customClass: customClass,
        classNote: classNote || undefined, // Keep as optional
        hasSubclass: hasSubclass,
        
        // Index Information
        indexType: indexType,
        indexNumber: indexNumber,
        indexColor: indexColor || '#000000',

        // Support Level & Confirmation
        supportLevel: supportLevel || 'ID',
        includeConfirmation: includeConfirmation,
        
        // Additional Notes
        additionalNotes: additionalNotes || undefined, // Keep as optional
        
        // Preserve existing box annotations
        boxAnnotations: existingData?.boxAnnotations || [],
        
        // Metadata
        updatedAt: new Date().toISOString()
      };

      await saveNotes(user, currentCase, imageId, annotationData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Refresh annotation data after saving notes
      if (onAnnotationRefresh) {
        onAnnotationRefresh();
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
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
                disabled={useCurrentCaseLeft}                
              />
            </div>
            <label className={`${styles.checkboxLabel} mb-4`}>
              <input
                type="checkbox"
                checked={useCurrentCaseLeft}
                onChange={(e) => setUseCurrentCaseLeft(e.target.checked)}
                className={styles.checkbox}
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
                disabled={useCurrentCaseRight}                
              />
            </div>
            <label className={`${styles.checkboxLabel} mb-4`}>
              <input
                type="checkbox"
                checked={useCurrentCaseRight}
                onChange={(e) => setUseCurrentCaseRight(e.target.checked)}
                className={styles.checkbox}
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
          >
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
            />
          )}

          <textarea
            value={classNote}
            onChange={(e) => setClassNote(e.target.value)}
            placeholder="Enter class characteristic details..."
            className={styles.textarea}
          />          
        </div>
        <label className={`${styles.checkboxLabel} mb-4`}>
          <input
            type="checkbox"
            checked={hasSubclass}
            onChange={(e) => setHasSubclass(e.target.checked)}
            className={styles.checkbox}
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
              />
              <span>Color</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                checked={indexType === 'number'}
                onChange={() => setIndexType('number')}
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
            />
          ) : (            
            <ColorSelector
              selectedColor={indexColor}
              onColorSelect={setIndexColor}
            />            
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h5 className={styles.sectionTitle}>Support Level</h5>
        <div className={styles.support}>
          <select
            id="supportLevel"
            aria-label="Support Level"
            value={supportLevel}
            onChange={(e) => setSupportLevel(e.target.value as SupportLevel)}
            className={styles.select}
          >
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
          />
          <span>Include confirmation field</span>
        </label>
        </div>
        <button 
        onClick={() => setIsModalOpen(true)}
        className={styles.notesButton}
      >
        Additional Notes
      </button>
      </div>            
        <button 
            onClick={handleSave}
            className={styles.saveButton}
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