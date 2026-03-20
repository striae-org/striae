import { useEffect, useState, useRef, useContext, useCallback } from 'react';
import { BoxAnnotations } from './box-annotations/box-annotations';
import { ConfirmationModal } from './confirmation/confirmation';
import { type AnnotationData, type BoxAnnotation, type ConfirmationData } from '~/types/annotations';
import { AuthContext } from '~/contexts/auth.context';
import { storeConfirmation } from '~/components/actions/confirm-export';
import styles from './canvas.module.css';

interface CanvasProps {
  imageUrl?: string;
  filename?: string;
  company?: string;
  badgeId?: string;
  firstName?: string;
  error?: string;
  activeAnnotations?: Set<string>;
  annotationData?: AnnotationData | null;
  onAnnotationUpdate?: (annotationData: AnnotationData) => void;
  isBoxAnnotationMode?: boolean;
  boxAnnotationColor?: string;
  isReadOnly?: boolean;
  // Confirmation data for storing case-level confirmations
  caseNumber: string; // Required for audit logging
  currentImageId?: string;
}

type ImageLoadError = {
  type: 'load' | 'network' | 'invalid';
  message: string;
}

export const Canvas = ({ 
  imageUrl, 
  filename, 
  company,
  badgeId,
  firstName, 
  error, 
  activeAnnotations, 
  annotationData,
  onAnnotationUpdate,
  isBoxAnnotationMode = false,
  boxAnnotationColor = '#FF0000',
  isReadOnly = false,
  caseNumber,
  currentImageId
}: CanvasProps) => {
  const { user } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<ImageLoadError | undefined>();
  const [isFlashing, setIsFlashing] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const resetImageLoadState = useCallback(() => {
    setLoadError(undefined);
    setIsLoading(false);
  }, []);

  const clearFlashingState = useCallback(() => {
    setIsFlashing(false);
  }, []);

  // Handle box annotation changes
  const handleBoxAnnotationsChange = (boxAnnotations: BoxAnnotation[]) => {
    if (!onAnnotationUpdate || !annotationData || isReadOnly || annotationData.confirmationData) return;
    
    const updatedAnnotationData: AnnotationData = {
      ...annotationData,
      boxAnnotations
    };
    
    onAnnotationUpdate(updatedAnnotationData);
  };

  // Handle annotation data changes (for additional notes updates)
  const handleAnnotationDataChange = (data: { additionalNotes?: string; boxAnnotations?: BoxAnnotation[]; earliestAnnotationTimestamp?: string }) => {
    if (!onAnnotationUpdate || !annotationData || isReadOnly || annotationData.confirmationData) return;
    
    const updatedAnnotationData: AnnotationData = {
      ...annotationData,
      ...data
    };
    
    onAnnotationUpdate(updatedAnnotationData);
  };

  // Handle confirmation
  const handleConfirmation = async (confirmationData: ConfirmationData) => {
    if (!onAnnotationUpdate || !annotationData) return;
    
    // Store in annotation data
    const updatedAnnotationData: AnnotationData = {
      ...annotationData,
      confirmationData
    };
    
    onAnnotationUpdate(updatedAnnotationData);
    console.log('Confirmation data saved to annotation:', confirmationData);

    // Store at case level for original analyst tracking
    if (user && caseNumber && currentImageId) {
      const success = await storeConfirmation(
        user,
        caseNumber,
        currentImageId,
        confirmationData,
        filename
      );
      
      if (success) {
        console.log('Confirmation stored at case level for original image tracking');
      } else {
        console.error('Failed to store confirmation at case level');
      }
    } else {
      console.warn('Missing required data for case-level confirmation storage:', {
        hasUser: !!user,
        caseNumber,
        currentImageId
      });
    }
  };

  useEffect(() => {
    if (!imageUrl) {
      const resetTimer = window.setTimeout(() => {
        resetImageLoadState();
      }, 0);

      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    
    const startLoadingTimer = window.setTimeout(() => {
      setIsLoading(true);
      setLoadError(undefined);
    }, 0);

    const img = new Image();
    
    img.onload = () => {
      setIsLoading(false);
      setLoadError(undefined);
    };
    
    img.onerror = () => {
      setLoadError({
        type: 'load',
        message: 'Failed to load image: Unknown error'
      });
      setIsLoading(false);
    };

    img.src = imageUrl;
    
    return () => {
      window.clearTimeout(startLoadingTimer);
      img.onload = null;
      img.onerror = null;
      resetImageLoadState();
    };
  }, [imageUrl, resetImageLoadState]);
  
  useEffect(() => {
    if (!activeAnnotations?.has('class') || !annotationData?.hasSubclass) {
      const flashResetTimer = window.setTimeout(() => {
        clearFlashingState();
      }, 0);

      return () => {
        window.clearTimeout(flashResetTimer);
      };
    }

    const flashInterval = setInterval(() => {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);
      setTimeout(() => {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 200);
      }, 300);
    }, 60000);

    return () => clearInterval(flashInterval);
  }, [activeAnnotations, annotationData?.hasSubclass, clearFlashingState]);

  const getErrorMessage = () => {
    if (error) return error;
    if (loadError) return loadError.message;
    return 'An error occurred';
  };

  // Programmatically determine if a color is dark and needs a light background
  const needsLightBackground = (color: string) => {
    if (!color) return false;
    
    // Handle named colors
    const namedColors: { [key: string]: string } = {
      'black': '#000000',
      'white': '#ffffff',
      'red': '#ff0000',
      'green': '#008000',
      'blue': '#0000ff',
      'yellow': '#ffff00',
      'cyan': '#00ffff',
      'magenta': '#ff00ff',
      'silver': '#c0c0c0',
      'gray': '#808080',
      'maroon': '#800000',
      'olive': '#808000',
      'lime': '#00ff00',
      'aqua': '#00ffff',
      'teal': '#008080',
      'navy': '#000080',
      'fuchsia': '#ff00ff',
      'purple': '#800080'
    };
    
    let hexColor = color.toLowerCase().trim();
    
    // Convert named color to hex
    if (namedColors[hexColor]) {
      hexColor = namedColors[hexColor];
    }
    
    // Remove # if present
    hexColor = hexColor.replace('#', '');
    
    // Handle 3-digit hex codes
    if (hexColor.length === 3) {
      hexColor = hexColor.split('').map(char => char + char).join('');
    }
    
    // Validate hex color
    if (!/^[0-9a-f]{6}$/i.test(hexColor)) {
      return false; // Invalid color, don't apply background
    }
    
    // Convert to RGB
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    // Calculate relative luminance using WCAG formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Colors with luminance < 0.5 are considered dark
    return luminance < 0.5;
  };

  return (    
    <div className={styles.canvasContainer}>
      {/* Filename & Connfirmation Field Display - Upper Left */}
      {filename && (
        <div className={styles.filenameDisplay}>
          File: {filename}
          {annotationData?.includeConfirmation && (
            <>
              {/* Show confirmation status based on whether confirmation data exists */}
              {annotationData?.confirmationData ? (
                <div className={styles.confirmationRow}>
                  <div className={styles.confirmationConfirmed}>
                    Identification Confirmed
                  </div>
                  <button 
                    className={styles.viewConfirmationButton}
                    onClick={() => setIsConfirmationModalOpen(true)}
                  >
                    View Confirmation Data
                  </button>
                </div>
              ) : (
                <div className={styles.confirmationRow}>
                  <div className={styles.confirmationIncluded}>
                    {isReadOnly ? 'Confirmation Requested' : 'Confirmation Field Included'}
                  </div>
                  {isReadOnly && (
                    <button 
                      className={styles.confirmButton}
                      onClick={() => setIsConfirmationModalOpen(true)}
                    >
                      Confirm
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {(loadError || error) ? (
        <p className={styles.error}>{getErrorMessage()}</p>
      ) : isLoading ? (
        <p className={styles.loading}>Loading image...</p>
      ) : imageUrl && imageUrl !== '/clear.jpg' ? (
        <div className={styles.imageAndNotesContainer}>
          <div className={styles.imageContainer}>
            {/* Class Characteristics - Above Image */}
            {activeAnnotations?.has('class') && annotationData && (annotationData.customClass || annotationData.classType) && (
              <div className={styles.classCharacteristics}>
                <div className={styles.classText}>
                  {annotationData.customClass || annotationData.classType}
                  {annotationData.classNote && ` (${annotationData.classNote})`}
                </div>
              </div>
            )}
            
            <img 
            ref={imageRef}
            src={imageUrl}
            alt="Case evidence"
            className={styles.image}
            style={{
              border: activeAnnotations?.has('index') && annotationData?.indexType === 'color' && annotationData?.indexColor
                ? `6px solid ${annotationData.indexColor}`
                : undefined,
              userSelect: 'none'
            }}
            onError={() => setLoadError({
              type: 'network',
              message: 'Failed to load image from network'
            })}
            draggable={false}
          />
          
          {/* Box Annotations Component - Show when box tool is active for visibility */}
          {activeAnnotations?.has('box') && (
            <BoxAnnotations
              imageRef={imageRef}
              annotations={annotationData?.boxAnnotations || []}
              onAnnotationsChange={handleBoxAnnotationsChange}
              isAnnotationMode={isBoxAnnotationMode && !annotationData?.confirmationData}
              annotationColor={boxAnnotationColor}
              annotationData={annotationData ? { additionalNotes: annotationData.additionalNotes, earliestAnnotationTimestamp: annotationData.earliestAnnotationTimestamp } : undefined}
              onAnnotationDataChange={handleAnnotationDataChange}
              isReadOnly={isReadOnly || !!annotationData?.confirmationData}
              caseNumber={caseNumber}
              imageFileId={currentImageId}
              originalImageFileName={filename}
            />
          )}
          
          {/* Annotations Overlay */}
          {activeAnnotations?.has('number') && annotationData && (
            <div className={styles.annotationsOverlay}>
              {/* Left side case and item numbers */}
              <div 
                className={styles.leftAnnotation}
                style={{ 
                  color: annotationData.caseFontColor || '#FFDE21',
                  backgroundColor: needsLightBackground(annotationData.caseFontColor || '#FFDE21')
                    ? 'rgba(255, 255, 255, 0.9)' : undefined
                }}
              >
                <div className={styles.caseText}>
                  {annotationData.leftCase}
                  {annotationData.leftItem && ` ${annotationData.leftItem}`}
                </div>
              </div>
              
              {/* Right side case and item numbers */}
              <div 
                className={styles.rightAnnotation}
                style={{ 
                  color: annotationData.caseFontColor || '#FFDE21',
                  backgroundColor: needsLightBackground(annotationData.caseFontColor || '#FFDE21')
                    ? 'rgba(255, 255, 255, 0.9)' : undefined
                }}
              >
                <div className={styles.caseText}>
                  {annotationData.rightCase}
                  {annotationData.rightItem && ` ${annotationData.rightItem}`}
                </div>
              </div>
            </div>
          )}
          
          {/* Index Number Overlay */}
          {activeAnnotations?.has('index') && annotationData?.indexType === 'number' && annotationData?.indexNumber && (
            <div className={styles.annotationsOverlay}>
              <div 
                className={styles.indexAnnotation}
                style={{ 
                  color: annotationData.caseFontColor || '#FFDE21',
                  backgroundColor: needsLightBackground(annotationData.caseFontColor || '#FFDE21')
                    ? 'rgba(255, 255, 255, 0.9)' : undefined
                }}
              >
                <div className={styles.caseText}>
                  Index: {annotationData.indexNumber}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Additional Notes - Below Image */}
        {activeAnnotations?.has('notes') && annotationData?.additionalNotes && (
          <div className={styles.additionalNotesContainer}>
            <div className={styles.additionalNotesBox}>
              {annotationData.additionalNotes}
            </div>
          </div>
        )}
        </div>
      ) : (
        <p 
          className={styles.placeholder}
          dangerouslySetInnerHTML={{
            __html: firstName 
              ? `Hello, ${firstName}<br>Upload or select an image to get started`
              : 'Upload or select an image to get started'
          }}
        />
      )}
      
      {/* Support Level - Bottom Left of Canvas */}
      {activeAnnotations?.has('id') && annotationData && annotationData.supportLevel && (
        <div className={styles.supportLevelAnnotation}>
          <div 
            className={styles.supportLevelText}
            style={{ 
              color: annotationData.supportLevel === 'ID' ? '#28a745' : 
                     annotationData.supportLevel === 'Exclusion' ? '#dc3545' : 
                     '#ffc107' 
            }}
          >
            {annotationData.supportLevel === 'ID' ? 'Identification' : annotationData.supportLevel}
          </div>
        </div>
      )}
      
      {/* Subclass Warning - Bottom Right of Canvas */}
      {activeAnnotations?.has('class') && annotationData?.hasSubclass && (
        <div className={`${styles.subclassWarning} ${isFlashing ? styles.flashing : ''}`}>
          <div className={styles.subclassText}>
            POTENTIAL SUBCLASS
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        onConfirm={handleConfirmation}
        company={company}
        defaultBadgeId={badgeId}
        existingConfirmation={annotationData?.confirmationData || null}
      />
    </div>    
  );
};