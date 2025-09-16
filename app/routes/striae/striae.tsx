import { User } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { SidebarContainer } from '~/components/sidebar/sidebar-container';
import { Toolbar } from '~/components/toolbar/toolbar';
import { Canvas } from '~/components/canvas/canvas';
import { BoxAnnotation } from '~/components/canvas/box-annotations/box-annotations';
import { Toast } from '~/components/toast/toast';
import { getImageUrl } from '~/components/actions/image-manage';
import { getNotes, saveNotes } from '~/components/actions/notes-manage';
import { generatePDF } from '~/components/actions/generate-pdf';
import { getUserApiKey } from '~/utils/auth';
import { AnnotationData, FileData } from '~/types';
import paths from '~/config/config.json';
import styles from './striae.module.css';

interface StriaePage {
  user: User;
}

export const Striae = ({ user }: StriaePage) => {
  // Image and error states
  const [selectedImage, setSelectedImage] = useState<string>();
  const [selectedFilename, setSelectedFilename] = useState<string>();
  const [imageId, setImageId] = useState<string>();
  const [error, setError] = useState<string>();
  const [imageLoaded, setImageLoaded] = useState(false);

  // User states
  const [userCompany, setUserCompany] = useState<string>('');
  const [userFirstName, setUserFirstName] = useState<string>('');

  // Case management states - All managed here
  const [currentCase, setCurrentCase] = useState<string>('');
  const [files, setFiles] = useState<FileData[]>([]);
  const [caseNumber, setCaseNumber] = useState('');
  const [successAction, setSuccessAction] = useState<'loaded' | 'created' | 'deleted' | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  // Annotation states
  const [activeAnnotations, setActiveAnnotations] = useState<Set<string>>(new Set());
  const [annotationData, setAnnotationData] = useState<AnnotationData | null>(null);
  const [annotationRefreshTrigger, setAnnotationRefreshTrigger] = useState(0);

  // Box annotation states
  const [isBoxAnnotationMode, setIsBoxAnnotationMode] = useState(false);
  const [boxAnnotationColor, setBoxAnnotationColor] = useState('#ff0000');

  // PDF generation states
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');


   useEffect(() => {
    // Set clear.jpg when case changes or is cleared
    setSelectedImage('/clear.jpg');
    setSelectedFilename(undefined);
    setImageId(undefined);
    setAnnotationData(null);    
    setError(undefined);
    setImageLoaded(false);
  }, [currentCase]);

  // Fetch user company data when component mounts
  useEffect(() => {
    const fetchUserCompany = async () => {
      try {
        const apiKey = await getUserApiKey();
        const response = await fetch(`${paths.user_worker_url}/${user.uid}`, {
          headers: {
            'X-Custom-Auth-Key': apiKey
          }
        });
        
        if (response.ok) {
          const userData = await response.json() as { company?: string; firstName?: string };
          setUserCompany(userData.company || '');
          setUserFirstName(userData.firstName || '');
        }
      } catch (err) {
        console.error('Failed to load user company:', err);
      }
    };
    
    if (user?.uid) {
      fetchUserCompany();
    }
  }, [user?.uid]);

  const handleCaseChange = (caseNumber: string) => {
    setCurrentCase(caseNumber);
    setAnnotationData(null);
    setSelectedFilename(undefined);
    setImageId(undefined);    
  };

  // Handler for toolbar annotation selection
  const handleToolSelect = (toolId: string, active: boolean) => {
    setActiveAnnotations(prev => {
      const next = new Set(prev);
      if (active) {
        next.add(toolId);
      } else {
        next.delete(toolId);
      }
      return next;
    });

    // Handle box annotation mode
    if (toolId === 'box') {
      setIsBoxAnnotationMode(active);
    }
  };

  // Handler for color change from toolbar color selector
  const handleColorChange = (color: string) => {
    setBoxAnnotationColor(color);
  };  

  // Generate PDF function
  const handleGeneratePDF = async () => {
    await generatePDF({
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
      setShowToast
    });
  };

  // Close toast notification
  const closeToast = () => {
    setShowToast(false);
  };

  // Function to refresh annotation data (called when notes are saved)
  const refreshAnnotationData = () => {
    setAnnotationRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    // Cleanup function to clear image when component unmounts
    return () => {
      setSelectedImage(undefined);
      setSelectedFilename(undefined);
      setError(undefined);
      setImageLoaded(false);
      setAnnotationData(null);
    };
  }, []); // Empty dependency array means this runs only on mount/unmount

  // Load annotation data when imageId changes
  useEffect(() => {
    const loadAnnotationData = async () => {
      if (!imageId || !currentCase) {
        setAnnotationData(null);
        return;
      }

      try {
        const notes = await getNotes(user, currentCase, imageId);
        if (notes) {
          setAnnotationData({
            leftCase: notes.leftCase || '',
            rightCase: notes.rightCase || '',
            leftItem: notes.leftItem || '',
            rightItem: notes.rightItem || '',
            caseFontColor: notes.caseFontColor || '#FFDE21',
            classType: notes.classType || 'Other',
            customClass: notes.customClass,
            classNote: notes.classNote, // Optional - pass as-is
            indexType: notes.indexType || 'number',
            indexNumber: notes.indexNumber,
            indexColor: notes.indexColor,
            supportLevel: notes.supportLevel || 'Inconclusive',
            hasSubclass: notes.hasSubclass,
            includeConfirmation: notes.includeConfirmation ?? false, // Required
            additionalNotes: notes.additionalNotes, // Optional - pass as-is
            boxAnnotations: notes.boxAnnotations || [],
            updatedAt: notes.updatedAt || new Date().toISOString()
          });
        } else {
          setAnnotationData(null);
        }
      } catch (error) {
        console.error('Failed to load annotation data:', error);
        setAnnotationData(null);
      }
    };

    loadAnnotationData();
  }, [imageId, currentCase, user, annotationRefreshTrigger]);


  const handleImageSelect = async (file: FileData) => {  
  if (file?.id === 'clear') {
    setSelectedImage('/clear.jpg');
    setSelectedFilename(undefined);
    setImageId(undefined);
    setImageLoaded(false);
    setAnnotationData(null);
    setError(undefined);
    return;
  }

  if (!file?.id) {
    setError('Invalid file selected');
    return;
  }

  try {
      setError(undefined);
      setSelectedImage(undefined);
      setSelectedFilename(undefined);
      setImageLoaded(false);
    
    const signedUrl = await getImageUrl(file);
    if (!signedUrl) throw new Error('No URL returned');

    setSelectedImage(signedUrl);
      setSelectedFilename(file.originalFilename);
      setImageId(file.id); 
      setImageLoaded(true);

  } catch (err) {
    setError('Failed to load image. Please try again.');
    console.error('Image selection error:', err);
    setSelectedImage(undefined);
    setSelectedFilename(undefined);
  }
};

  // Automatic save handler for annotation updates
  const handleAnnotationUpdate = async (data: AnnotationData) => {
    // Update local state immediately
    setAnnotationData(data);
    
    // Auto-save to server if we have required data
    if (user && currentCase && imageId) {
      try {
        // Ensure required fields have default values before saving
        const dataToSave: AnnotationData = {
          ...data,
          includeConfirmation: data.includeConfirmation ?? false, // Required field
        };
        
        await saveNotes(user, currentCase, imageId, dataToSave);
      } catch (saveError) {
        console.error('Failed to auto-save annotations:', saveError);
        // Still show the annotations locally even if save fails
      }
    }
  };

  return (
    <div className={styles.appContainer}>
     <SidebarContainer 
        user={user} 
        onImageSelect={handleImageSelect}
        imageId={imageId}
        onCaseChange={handleCaseChange}
        currentCase={currentCase}
        setCurrentCase={setCurrentCase}
        imageLoaded={imageLoaded}
        setImageLoaded={setImageLoaded}
        files={files}
        setFiles={setFiles}
        caseNumber={caseNumber}
        setCaseNumber={setCaseNumber}
        error={error ?? ''}
        setError={setError}
        successAction={successAction}
        setSuccessAction={setSuccessAction}
        showNotes={showNotes}
        setShowNotes={setShowNotes}
        onAnnotationRefresh={refreshAnnotationData}
      />
      <main className={styles.mainContent}>
        <div className={styles.canvasArea}>
          <div className={styles.toolbarWrapper}>
            <Toolbar 
              onToolSelect={handleToolSelect}
              onGeneratePDF={handleGeneratePDF}
              canGeneratePDF={!!(selectedImage && selectedImage !== '/clear.jpg')}
              isGeneratingPDF={isGeneratingPDF}
              onColorChange={handleColorChange}
              selectedColor={boxAnnotationColor}
            />
          </div>
          <Canvas 
            imageUrl={selectedImage} 
            filename={selectedFilename}
            company={userCompany}
            firstName={userFirstName}
            error={error ?? ''}
            activeAnnotations={activeAnnotations}
            annotationData={annotationData}
            isBoxAnnotationMode={isBoxAnnotationMode}
            boxAnnotationColor={boxAnnotationColor}
            onAnnotationUpdate={handleAnnotationUpdate}
          />
        </div>
      </main>
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={closeToast}
      />
    </div>
  );
};