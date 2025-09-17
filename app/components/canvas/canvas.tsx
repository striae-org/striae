import { useEffect, useState, useRef } from 'react';
import { BoxAnnotations } from './box-annotations/box-annotations';
import { AnnotationData, BoxAnnotation } from '~/types/annotations';
import styles from './canvas.module.css';

interface CanvasProps {
  imageUrl?: string;
  filename?: string;
  company?: string;
  firstName?: string;
  error?: string;
  activeAnnotations?: Set<string>;
  annotationData?: AnnotationData | null;
  onAnnotationUpdate?: (annotationData: AnnotationData) => void;
  isBoxAnnotationMode?: boolean;
  boxAnnotationColor?: string;
}

type ImageLoadError = {
  type: 'load' | 'network' | 'invalid';
  message: string;
}

export const Canvas = ({ 
  imageUrl, 
  filename, 
  company, 
  firstName, 
  error, 
  activeAnnotations, 
  annotationData,
  onAnnotationUpdate,
  isBoxAnnotationMode = false,
  boxAnnotationColor = '#ff0000'
}: CanvasProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<ImageLoadError | undefined>();
  const [isFlashing, setIsFlashing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle box annotation changes
  const handleBoxAnnotationsChange = (boxAnnotations: BoxAnnotation[]) => {
    if (!onAnnotationUpdate || !annotationData) return;
    
    const updatedAnnotationData: AnnotationData = {
      ...annotationData,
      boxAnnotations
    };
    
    onAnnotationUpdate(updatedAnnotationData);
  };

  useEffect(() => {
    if (!imageUrl) {
      setLoadError(undefined);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setLoadError(undefined);

    const img = new Image();
    
    img.onload = () => {
      setIsLoading(false);
      setLoadError(undefined);
    };
    
    img.onerror = (e) => {
      setLoadError({
        type: 'load',
        message: `Failed to load image: ${e instanceof Error ? e.message : 'Unknown error'}`
      });
      setIsLoading(false);
    };

    try {
      img.src = imageUrl;
    } catch (e) {
      setLoadError({
        type: 'invalid',
        message: 'Invalid image URL provided'
      });
      setIsLoading(false);
    }
    
    return () => {
      img.onload = null;
      img.onerror = null;
      setLoadError(undefined);
      setIsLoading(false);
    };
  }, [imageUrl]);
  
  useEffect(() => {
    if (!activeAnnotations?.has('class') || !annotationData?.hasSubclass) {
      setIsFlashing(false);
      return;
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
  }, [activeAnnotations, annotationData?.hasSubclass]);

  const getErrorMessage = () => {
    if (error) return error;
    if (loadError) return loadError.message;
    return 'An error occurred';
  };
  
  const isBlackColor = (color: string) => {
    return color.toLowerCase() === '#000000' || color.toLowerCase() === 'black' || color.toLowerCase() === '#000';
  };

  return (    
    <div className={styles.canvasContainer}>
      {/* Filename & Connfirmation Field Display - Upper Left */}
      {filename && (
        <div className={styles.filenameDisplay}>
          File: {filename}
          {annotationData?.includeConfirmation && (
            <div className={styles.confirmationIncluded}>
              Confirmation Field Included
            </div>
          )}
        </div>
      )}
      
      {/* Company Display - Upper Right */}
      {company && (
        <div className={styles.companyDisplay}>
          {company}
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
            {activeAnnotations?.has('class') && annotationData && (
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
          
          {/* Box Annotations Component */}
          <BoxAnnotations
            imageRef={imageRef}
            annotations={annotationData?.boxAnnotations || []}
            onAnnotationsChange={handleBoxAnnotationsChange}
            isAnnotationMode={isBoxAnnotationMode}
            annotationColor={boxAnnotationColor}
          />
          
          {/* Annotations Overlay */}
          {activeAnnotations?.has('number') && annotationData && (
            <div className={styles.annotationsOverlay}>
              {/* Left side case and item numbers */}
              <div 
                className={styles.leftAnnotation}
                style={{ 
                  color: annotationData.caseFontColor,
                  backgroundColor: isBlackColor(annotationData.caseFontColor)
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
                  color: annotationData.caseFontColor,
                  backgroundColor: isBlackColor(annotationData.caseFontColor)
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
                  color: annotationData.caseFontColor,
                  backgroundColor: isBlackColor(annotationData.caseFontColor)
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
      {activeAnnotations?.has('id') && annotationData && (
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
    </div>    
  );
};