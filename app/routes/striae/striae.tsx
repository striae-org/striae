import type { User } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { SidebarContainer } from '~/components/sidebar/sidebar-container';
import { Navbar } from '~/components/navbar/navbar';
import { RenameCaseModal } from '~/components/navbar/rename-case-modal';
import { Toolbar } from '~/components/toolbar/toolbar';
import { Canvas } from '~/components/canvas/canvas';
import { Toast } from '~/components/toast/toast';
import { getImageUrl } from '~/components/actions/image-manage';
import { getNotes, saveNotes } from '~/components/actions/notes-manage';
import { generatePDF } from '~/components/actions/generate-pdf';
import { CaseExport, type ExportFormat } from '~/components/sidebar/case-export/case-export';
import { UserAuditViewer } from '~/components/audit/user-audit-viewer';
import { fetchUserApi } from '~/utils/api';
import { resolveEarliestAnnotationTimestamp } from '~/utils/ui';
import { type AnnotationData, type FileData } from '~/types';
import type * as CaseExportActions from '~/components/actions/case-export';
import { checkCaseIsReadOnly, validateCaseNumber, renameCase, deleteCase } from '~/components/actions/case-manage';
import { checkReadOnlyCaseExists } from '~/components/actions/case-review';
import styles from './striae.module.css';

interface StriaePage {
  user: User;
}

type CaseExportActionsModule = typeof CaseExportActions;

let caseExportActionsPromise: Promise<CaseExportActionsModule> | null = null;

const loadCaseExportActions = (): Promise<CaseExportActionsModule> => {
  if (!caseExportActionsPromise) {
    caseExportActionsPromise = import('~/components/actions/case-export');
  }

  return caseExportActionsPromise;
};

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
  const [userLastName, setUserLastName] = useState<string>('');
  const [userBadgeId, setUserBadgeId] = useState<string>('');

  // Case management states - All managed here
  const [currentCase, setCurrentCase] = useState<string>('');
  const [files, setFiles] = useState<FileData[]>([]);
  const [caseNumber, setCaseNumber] = useState('');
  const [successAction, setSuccessAction] = useState<'loaded' | 'created' | 'deleted' | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReadOnlyCase, setIsReadOnlyCase] = useState(false);

  // Annotation states
  const [activeAnnotations, setActiveAnnotations] = useState<Set<string>>(new Set());
  const [annotationData, setAnnotationData] = useState<AnnotationData | null>(null);
  const [annotationRefreshTrigger, setAnnotationRefreshTrigger] = useState(0);
  const [confirmationSaveVersion, setConfirmationSaveVersion] = useState(0);

  // Box annotation states
  const [isBoxAnnotationMode, setIsBoxAnnotationMode] = useState(false);
  const [boxAnnotationColor, setBoxAnnotationColor] = useState('#ff0000');

  // PDF generation states
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isCaseExportModalOpen, setIsCaseExportModalOpen] = useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [isRenameCaseModalOpen, setIsRenameCaseModalOpen] = useState(false);
  const [isRenamingCase, setIsRenamingCase] = useState(false);
  const [isDeletingCase, setIsDeletingCase] = useState(false);


   useEffect(() => {
    // Set clear.jpg when case changes or is cleared
    setSelectedImage('/clear.jpg');
    setSelectedFilename(undefined);
    setImageId(undefined);
    setAnnotationData(null);    
    setError(undefined);
    setImageLoaded(false);
    
    // Reset annotation and UI states when case is cleared
    if (!currentCase) {
      setActiveAnnotations(new Set());
      setIsBoxAnnotationMode(false);
      setIsReadOnlyCase(false);
    }
  }, [currentCase]);

  // Fetch user company data when component mounts
  useEffect(() => {
    const fetchUserCompany = async () => {
      try {
        const response = await fetchUserApi(user, `/${encodeURIComponent(user.uid)}`, {
          method: 'GET'
        });
        
        if (response.ok) {
          const userData = await response.json() as { company?: string; firstName?: string; lastName?: string; badgeId?: string };
          setUserCompany(userData.company || '');
          setUserFirstName(userData.firstName || '');
          setUserLastName(userData.lastName || '');
          setUserBadgeId(userData.badgeId || '');
        }
      } catch (err) {
        console.error('Failed to load user company:', err);
      }
    };
    
    if (user?.uid) {
      fetchUserCompany();
    }
  }, [user]);

  const handleCaseChange = (caseNumber: string) => {
    setCurrentCase(caseNumber);
    setCaseNumber(caseNumber);
    setAnnotationData(null);
    setSelectedFilename(undefined);
    setImageId(undefined);    
  };

  // Check if current case is read-only when case changes
  useEffect(() => {
    const checkReadOnlyStatus = async () => {
      if (!currentCase || !user?.uid) {
        setIsReadOnlyCase(false);
        return;
      }

      try {
        // Check if the case data itself has isReadOnly: true
        const isReadOnly = await checkCaseIsReadOnly(user, currentCase);
        setIsReadOnlyCase(isReadOnly);
      } catch (error) {
        console.error('Error checking read-only status:', error);
        setIsReadOnlyCase(false);
      }
    };

    checkReadOnlyStatus();
  }, [currentCase, user]);

  // Disable box annotation mode when notes sidebar is opened
  useEffect(() => {
    if (showNotes && isBoxAnnotationMode) {
      setIsBoxAnnotationMode(false);
    }
  }, [showNotes, isBoxAnnotationMode]);

  // Handler for toolbar annotation selection
  const handleToolSelect = (toolId: string, active: boolean) => {
    // Always allow visibility toggles (including for read-only cases)
    setActiveAnnotations(prev => {
      const next = new Set(prev);
      if (active) {
        next.add(toolId);
      } else {
        next.delete(toolId);
      }
      return next;
    });

    // Handle box annotation mode (prevent when notes are open, read-only, or confirmed)
    if (toolId === 'box') {
      setIsBoxAnnotationMode(active && !showNotes && !isReadOnlyCase && !annotationData?.confirmationData);
    }
  };

  // Handler for color change from toolbar color selector
  const handleColorChange = (color: string) => {
    setBoxAnnotationColor(color);
  };  

  // Generate PDF function
  const handleGeneratePDF = async () => {
    // Prevent PDF generation for read-only cases
    if (isReadOnlyCase) {
      return;
    }
    
    await generatePDF({
      user,
      selectedImage,
      selectedFilename,
      userCompany,
      userFirstName,
      userLastName,
      userBadgeId,
      currentCase,
      annotationData,
      activeAnnotations,
      setIsGeneratingPDF,
      setToastType,
      setToastMessage,
      setShowToast
    });
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
  };

  // Close toast notification
  const closeToast = () => {
    setShowToast(false);
  };

  const handleExport = async (
    exportCaseNumber: string,
    format: ExportFormat,
    includeImages?: boolean,
    onProgress?: (progress: number, label: string) => void
  ) => {
    const caseExportActions = await loadCaseExportActions();

    if (includeImages) {
      await caseExportActions.downloadCaseAsZip(user, exportCaseNumber, format, (progress) => {
        const label = progress < 30 ? 'Loading case data'
          : progress < 50 ? 'Preparing archive'
          : progress < 80 ? 'Adding images'
          : progress < 96 ? 'Finalizing'
          : 'Downloading';
        onProgress?.(Math.round(progress), label);
      });
      showNotification(`Case ${exportCaseNumber} exported successfully.`, 'success');
      return;
    }

    onProgress?.(5, 'Loading case data');
    const exportData = await caseExportActions.exportCaseData(
      user,
      exportCaseNumber,
      { includeMetadata: true },
      (current, total, label) => {
        const progress = total > 0 ? Math.round(10 + (current / total) * 60) : 10;
        onProgress?.(progress, label);
      }
    );

    onProgress?.(75, 'Preparing download');
    if (format === 'json') {
      await caseExportActions.downloadCaseAsJSON(user, exportData);
    } else {
      await caseExportActions.downloadCaseAsCSV(user, exportData);
    }
    onProgress?.(100, 'Complete');
    showNotification(`Case ${exportCaseNumber} exported successfully.`, 'success');
  };

  const handleExportAll = async (
    onProgress: (current: number, total: number, caseName: string) => void,
    format: ExportFormat
  ) => {
    const caseExportActions = await loadCaseExportActions();
    const exportData = await caseExportActions.exportAllCases(
      user,
      { includeMetadata: true },
      onProgress
    );

    if (format === 'json') {
      await caseExportActions.downloadAllCasesAsJSON(user, exportData);
    } else {
      await caseExportActions.downloadAllCasesAsCSV(user, exportData);
    }

    showNotification('All cases exported successfully.', 'success');
  };

  const handleRenameCaseSubmit = async (newCaseName: string) => {
    if (!currentCase) {
      showNotification('Select a case before renaming.', 'error');
      return;
    }

    if (!validateCaseNumber(newCaseName)) {
      showNotification('Invalid case number format.', 'error');
      return;
    }

    setIsRenamingCase(true);
    try {
      const existingReadOnlyCase = await checkReadOnlyCaseExists(user, newCaseName);
      if (existingReadOnlyCase) {
        showNotification(`Case "${newCaseName}" already exists as a read-only review case.`, 'error');
        return;
      }

      await renameCase(user, currentCase, newCaseName);
      setCurrentCase(newCaseName);
      setCaseNumber(newCaseName);
      setShowNotes(false);
      setIsRenameCaseModalOpen(false);
      showNotification(`Case renamed to ${newCaseName}.`, 'success');
    } catch (renameError) {
      showNotification(renameError instanceof Error ? renameError.message : 'Failed to rename case.', 'error');
    } finally {
      setIsRenamingCase(false);
    }
  };

  const handleDeleteCaseAction = async () => {
    if (!currentCase) {
      showNotification('Select a case before deleting.', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete case ${currentCase}? This will permanently delete all associated files and cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingCase(true);
    try {
      await deleteCase(user, currentCase);
      setCurrentCase('');
      setCaseNumber('');
      setFiles([]);
      setShowNotes(false);
      setIsAuditTrailOpen(false);
      setIsRenameCaseModalOpen(false);
      showNotification('Case deleted successfully.', 'success');
    } catch (deleteError) {
      showNotification(deleteError instanceof Error ? deleteError.message : 'Failed to delete case.', 'error');
    } finally {
      setIsDeletingCase(false);
    }
  };

  // Function to refresh annotation data (called when notes are saved)
  const refreshAnnotationData = () => {
    setAnnotationRefreshTrigger(prev => prev + 1);
  };

  // Handle import/clear read-only case
  const handleImportComplete = (result: { success: boolean; caseNumber?: string; isReadOnly?: boolean }) => {
    if (result.success) {
      if (result.caseNumber && result.isReadOnly) {
        // Successful read-only case import - load the case
        handleCaseChange(result.caseNumber);
      } else if (!result.caseNumber && !result.isReadOnly) {
        // Read-only case cleared - reset all UI state
        setCurrentCase('');
        setCaseNumber('');
        setFiles([]);
        handleImageSelect({ id: 'clear', originalFilename: '/clear.jpg', uploadedAt: '' });
        setShowNotes(false);
      }
    }
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
            confirmationData: notes.confirmationData, // Add imported confirmation data
            additionalNotes: notes.additionalNotes, // Optional - pass as-is
            boxAnnotations: notes.boxAnnotations || [],
            earliestAnnotationTimestamp: notes.earliestAnnotationTimestamp,
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
    
    const signedUrl = await getImageUrl(user, file, currentCase);
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
    if (annotationData?.confirmationData) {
      console.warn('Blocked annotation update for confirmed image');
      return;
    }

    const now = new Date().toISOString();
    const dataWithEarliestTimestamp: AnnotationData = {
      ...data,
      earliestAnnotationTimestamp: resolveEarliestAnnotationTimestamp(
        data.earliestAnnotationTimestamp,
        annotationData?.earliestAnnotationTimestamp,
        now
      ),
    };

    const confirmationChanged =
      !!annotationData?.confirmationData !== !!data.confirmationData ||
      !!annotationData?.includeConfirmation !== !!data.includeConfirmation;

    // Update local state immediately
    setAnnotationData(dataWithEarliestTimestamp);
    
    // For read-only cases, only save if it's confirmation data
    if (isReadOnlyCase) {
      // Save confirmation data to server even in read-only cases
      if (data.confirmationData && user && currentCase && imageId) {
        try {
          await saveNotes(user, currentCase, imageId, dataWithEarliestTimestamp);
          if (confirmationChanged) {
            setConfirmationSaveVersion(prev => prev + 1);
          }
          console.log('Confirmation data saved to server in read-only case');
        } catch (saveError) {
          console.error('Failed to save confirmation data:', saveError);
        }
      } else {
        console.log('Read-only case: non-confirmation annotation data updated locally but not saved to server');
      }
      return;
    }
    
    // Auto-save to server if we have required data
    if (user && currentCase && imageId) {
      try {
        // Ensure required fields have default values before saving
        const dataToSave: AnnotationData = {
          ...dataWithEarliestTimestamp,
          includeConfirmation: data.includeConfirmation ?? false, // Required field
        };
        
        await saveNotes(user, currentCase, imageId, dataToSave);
        if (confirmationChanged) {
          setConfirmationSaveVersion(prev => prev + 1);
        }
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
        isReadOnly={isReadOnlyCase}
        isConfirmed={!!annotationData?.confirmationData}
        confirmationSaveVersion={confirmationSaveVersion}
        isUploading={isUploading}
        onUploadStatusChange={setIsUploading}
      />
      <main className={styles.mainContent}>
        <Navbar
          isUploading={isUploading}
          company={userCompany}
          isReadOnly={isReadOnlyCase}
          currentCase={currentCase}
          hasLoadedCase={!!currentCase}
          hasLoadedImage={!!(selectedImage && selectedImage !== '/clear.jpg' && imageLoaded)}
          activeSection={showNotes ? 'image-notes' : 'case-management'}
          onImportComplete={handleImportComplete}
          onOpenCaseExport={() => setIsCaseExportModalOpen(true)}
          onOpenAuditTrail={() => setIsAuditTrailOpen(true)}
          onOpenRenameCase={() => setIsRenameCaseModalOpen(true)}
          onDeleteCase={() => {
            void handleDeleteCaseAction();
          }}
        />
        <div className={styles.canvasArea}>
          <div className={styles.toolbarWrapper}>
            <Toolbar 
              onToolSelect={handleToolSelect}
              onGeneratePDF={handleGeneratePDF}
              canGeneratePDF={!!(selectedImage && selectedImage !== '/clear.jpg')}
              isGeneratingPDF={isGeneratingPDF}
              onColorChange={handleColorChange}
              selectedColor={boxAnnotationColor}
              isReadOnly={isReadOnlyCase}
              isConfirmed={!!annotationData?.confirmationData}
              isNotesOpen={showNotes}
            />
          </div>
          <Canvas 
            imageUrl={selectedImage} 
            filename={selectedFilename}
            company={userCompany}
            badgeId={userBadgeId}
            firstName={userFirstName}
            error={error ?? ''}
            activeAnnotations={activeAnnotations}
            annotationData={annotationData}
            isBoxAnnotationMode={isBoxAnnotationMode}
            boxAnnotationColor={boxAnnotationColor}
            onAnnotationUpdate={handleAnnotationUpdate}
            isReadOnly={isReadOnlyCase}
            caseNumber={currentCase}
            currentImageId={imageId}
          />
        </div>
      </main>
      <CaseExport
        isOpen={isCaseExportModalOpen}
        onClose={() => setIsCaseExportModalOpen(false)}
        onExport={handleExport}
        onExportAll={handleExportAll}
        currentCaseNumber={currentCase}
        isReadOnly={isReadOnlyCase}
      />
      <UserAuditViewer
        caseNumber={currentCase || ''}
        isOpen={isAuditTrailOpen}
        onClose={() => setIsAuditTrailOpen(false)}
        title={`Audit Trail - Case ${currentCase}`}
      />
      <RenameCaseModal
        isOpen={isRenameCaseModalOpen}
        currentCase={currentCase}
        isSubmitting={isRenamingCase || isDeletingCase}
        onClose={() => setIsRenameCaseModalOpen(false)}
        onSubmit={handleRenameCaseSubmit}
      />
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={closeToast}
      />
    </div>
  );
};