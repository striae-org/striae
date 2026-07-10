import type { User } from 'firebase/auth';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SidebarContainer } from '~/components/sidebar/sidebar-container';
import { Navbar } from '~/components/navbar/navbar';
import { RenameCaseModal } from '~/components/navbar/case-modals/rename-case-modal';
import { ArchiveCaseModal } from '~/components/navbar/case-modals/archive-case-modal';
import { OpenCaseModal } from '~/components/navbar/case-modals/open-case-modal';
import { ExportCaseModal } from '~/components/navbar/case-modals/export-case-modal';
import { ExportConfirmationsModal } from '~/components/navbar/case-modals/export-confirmations-modal';
import { Toolbar } from '~/components/toolbar/toolbar';
import { Canvas } from '~/components/canvas/canvas';
import { Toast, type ToastType } from '~/components/toast/toast';
import { getImageUrl, deleteFile } from '~/components/actions/image-manage';
import { getNotes, saveNotes } from '~/components/actions/notes-manage';
import { generatePDF } from '~/components/actions/generate-pdf';
import { exportConfirmationData } from '~/components/actions/confirm-export';
import { CasesModal } from '~/components/navbar/case-modals/all-cases-modal';
import { FilesModal } from '~/components/sidebar/files/files-modal';
import { NotesEditorModal } from '~/components/sidebar/notes/notes-editor-modal';
import { UserAuditViewer } from '~/components/audit/user-audit-viewer';
import { fetchUserApi } from '~/utils/api';
import { type AnnotationData, type FileData, type ExportOptions } from '~/types';
import { validateCaseNumber, renameCase, deleteCase, checkExistingCase, createNewCase, archiveCase, deriveCaseArchiveDetails } from '~/components/actions/case-manage';
import { checkReadOnlyCaseExists, deleteReadOnlyCase } from '~/components/actions/case-review';
import { canCreateCase, ensureCaseConfirmationSummary, getCaseData, getConfirmationSummaryDocument, type UserConfirmationSummaryDocument } from '~/utils/data';
import {
  resolveEarliestAnnotationTimestamp,
  CREATE_READ_ONLY_CASE_EXISTS_ERROR,
  CLEAR_READ_ONLY_CASE_PARTIAL_FAILURE,
  DELETE_CASE_CONFIRMATION,
  DELETE_FILE_CONFIRMATION,
  DELETE_CASE_FAILED,
  DELETE_FILE_FAILED,
  RENAME_CASE_FAILED
} from '~/utils/ui';
import { useStriaeResetHelpers } from './hooks/use-striae-reset-helpers';
import { getExportProgressLabel, loadCaseExportActions } from './utils/case-export';
import { resolveOpenCaseHelperText } from './utils/open-case-helper';
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
  const currentRevokeRef = useRef<(() => void) | null>(null);

  // User states
  const [userCompany, setUserCompany] = useState<string>('');
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [userLastName, setUserLastName] = useState<string>('');
  const [userBadgeId, setUserBadgeId] = useState<string>('');

  // Case management states - All managed here
  const [currentCase, setCurrentCase] = useState<string>('');
  const [files, setFiles] = useState<FileData[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReadOnlyCase, setIsReadOnlyCase] = useState(false);
  const [isReviewOnlyCase, setIsReviewOnlyCase] = useState(false);
  const [initialConfirmationSummary, setInitialConfirmationSummary] = useState<UserConfirmationSummaryDocument | undefined>(undefined);

  // Annotation states
  const [activeAnnotations, setActiveAnnotations] = useState<Set<string>>(() => new Set());
  const [annotationData, setAnnotationData] = useState<AnnotationData | null>(null);
  const [annotationRefreshTrigger, setAnnotationRefreshTrigger] = useState(0);
  const [confirmationSaveVersion, setConfirmationSaveVersion] = useState(0);

  // Box annotation states
  const [isBoxAnnotationMode, setIsBoxAnnotationMode] = useState(false);
  const [boxAnnotationColor, setBoxAnnotationColor] = useState('#ff0000');

  // PDF generation states
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Toast notification states
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [toastDuration, setToastDuration] = useState(4000);

  // Modal and sidebar states
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [isRenameCaseModalOpen, setIsRenameCaseModalOpen] = useState(false);
  const [isOpenCaseModalOpen, setIsOpenCaseModalOpen] = useState(false);
  const [isListCasesModalOpen, setIsListCasesModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);

  // Case management action states
  const [isRenamingCase, setIsRenamingCase] = useState(false);
  const [isDeletingCase, setIsDeletingCase] = useState(false);
  const [isArchivingCase, setIsArchivingCase] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [isOpeningCase, setIsOpeningCase] = useState(false);
  const [openCaseHelperText, setOpenCaseHelperText] = useState('');
  const [isArchiveCaseModalOpen, setIsArchiveCaseModalOpen] = useState(false);

  // Export states
  const [isExportCaseModalOpen, setIsExportCaseModalOpen] = useState(false);
  const [isExportingCase, setIsExportingCase] = useState(false);
  const [isExportConfirmationsModalOpen, setIsExportConfirmationsModalOpen] = useState(false);
  const [isExportingConfirmations, setIsExportingConfirmations] = useState(false);
  const [exportConfirmationStats, setExportConfirmationStats] = useState<{
    confirmedCount: number;
    unconfirmedCount: number;
  } | null>(null);
  const [archiveDetails, setArchiveDetails] = useState<{
    archived: boolean;
    archivedAt?: string;
    archivedBy?: string;
    archivedByDisplay?: string;
    archiveReason?: string;
  }>({ archived: false });

  const handleRevokeImage = useCallback(() => {
    currentRevokeRef.current?.();
    currentRevokeRef.current = null;
  }, []);

  const {
    clearSelectedImageState,
    clearCaseContextState,
    clearLoadedCaseState,
  } = useStriaeResetHelpers({
    setSelectedImage,
    setSelectedFilename,
    setImageId,
    setAnnotationData,
    setError,
    setImageLoaded,
    setCurrentCase,
    setFiles,
    setActiveAnnotations,
    setIsBoxAnnotationMode,
    setIsReadOnlyCase,
    setIsReviewOnlyCase,
    setArchiveDetails,
    setShowNotes,
    setIsAuditTrailOpen,
    setIsRenameCaseModalOpen,
    onRevokeImage: handleRevokeImage,
  });


   useEffect(() => {
    // Set clear.jpg when case changes or is cleared
    clearSelectedImageState();
    
    // Reset annotation and UI states when case is cleared
    if (!currentCase) {
      clearCaseContextState();
    }
  }, [currentCase, clearSelectedImageState, clearCaseContextState]);

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
    setAnnotationData(null);
    setSelectedFilename(undefined);
    setImageId(undefined);    
  };

  const showNotification = (
    message: string,
    type: ToastType = 'success',
    duration = 4000
  ) => {
    setToastType(type);
    setToastMessage(message);
    setToastDuration(duration);
    setShowToast(true);
  };

  const closeToast = () => {
    setShowToast(false);
  };

  // Tracks whether the current case load was triggered by loadCaseIntoWorkspace.
  // A ref (not state) so it can be read inside the metadata effect without
  // becoming a dependency that would re-trigger the fetch on status changes.
  const loadInitiatedRef = useRef(false);

  // On case change: load case data, read-only status, archive details, and
  // pre-fetch the confirmation summary — all in a single parallel batch to
  // avoid redundant round-trips to the user and data workers.
  useEffect(() => {
    let isCancelled = false;

    const loadCaseMetadata = async () => {
      if (!currentCase || !user?.uid) {
        setIsReadOnlyCase(false);
        setIsReviewOnlyCase(false);
        setArchiveDetails({ archived: false });
        setFiles([]);
        setInitialConfirmationSummary(undefined);
        return;
      }

      try {
        // Imported review cases are tracked in the user's read-only case list.
        // This includes archived ZIP imports and distinguishes them from manually archived regular cases.
        // Individual .catch(() => null) guards prevent a single failing call from aborting the batch.
        const [readOnlyCaseEntry, caseData, summaryDoc] = await Promise.all([
          checkReadOnlyCaseExists(user, currentCase).catch(() => null),
          getCaseData(user, currentCase, { skipValidation: true }).catch(() => null),
          getConfirmationSummaryDocument(user).catch(() => null),
        ]);

        if (isCancelled) return;

        const reviewOnly = Boolean(readOnlyCaseEntry);
        const details = deriveCaseArchiveDetails(caseData);
        setIsReviewOnlyCase(reviewOnly);
        setIsReadOnlyCase(reviewOnly || details.archived);
        setArchiveDetails(details);
        setFiles(caseData?.files ?? []);
        setInitialConfirmationSummary(summaryDoc ?? undefined);
        // Only show toast for loads triggered via loadCaseIntoWorkspace.
        // Direct setCurrentCase calls (e.g. case creation) handle their own notifications.
        if (loadInitiatedRef.current) {
          showNotification(`Case ${currentCase} loaded successfully.`, 'success');
          loadInitiatedRef.current = false;
        }
      } catch (error) {
        if (isCancelled) return;
        console.error('Error loading case metadata:', error);
        setIsReadOnlyCase(false);
        setIsReviewOnlyCase(false);
        setArchiveDetails({ archived: false });
        setFiles([]);
        setInitialConfirmationSummary(undefined);
        if (loadInitiatedRef.current) {
          showNotification(`Failed to load case ${currentCase}. Please try again.`, 'error');
          loadInitiatedRef.current = false;
        }
      }
    };

    void loadCaseMetadata();
    return () => {
      isCancelled = true;
    };
  }, [currentCase, user]);

  // Derived early so downstream handlers (handleToolSelect) can reference them.
  const hasLoadedImage = !!(selectedImage && selectedImage !== '/clear.jpg' && imageLoaded);
  const isCurrentImageConfirmed = hasLoadedImage && !!annotationData?.confirmationData;
  // Derive the effective notes open state — notes can only be open when an image is loaded.
  const effectiveShowNotes = showNotes && hasLoadedImage;
  // Box annotation mode is mutually exclusive with the notes panel being open.
  const effectiveIsBoxAnnotationMode = isBoxAnnotationMode && !effectiveShowNotes;

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
      setIsBoxAnnotationMode(active && !effectiveShowNotes && !isReadOnlyCase && !annotationData?.confirmationData);
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
      sourceImageId: imageId,
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
      setShowToast,
      setToastDuration
    });
  };

  const handleExport = async (
    exportCaseNumber: string,
    designatedReviewerEmail?: string,
    onProgress?: (progress: number, label: string) => void,
    exportOptions?: ExportOptions
  ) => {
    if (!exportCaseNumber) {
      showNotification('Select a case before exporting.', 'error');
      return;
    }

    showNotification(`Exporting case ${exportCaseNumber}...`, 'loading', 0);

    try {
      const caseExportActions = await loadCaseExportActions();

      await caseExportActions.downloadCaseAsZip(
        user,
        exportCaseNumber,
        (progress) => {
          const roundedProgress = Math.round(progress);
          const label = getExportProgressLabel(progress);
          setToastType('loading');
          setToastMessage(`Exporting case ${exportCaseNumber}... ${label} (${roundedProgress}%)`);
          setToastDuration(0);
          setShowToast(true);
          onProgress?.(roundedProgress, label);
        },
        { ...exportOptions, designatedReviewerEmail }
      );

      showNotification(`Case ${exportCaseNumber} exported successfully.`, 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Export failed. Please try again.', 'error');
    }
  };

  const handleExportCaseModalSubmit = async (designatedReviewerEmail: string | undefined) => {
    setIsExportingCase(true);
    setIsExportCaseModalOpen(false);
    try {
      await handleExport(currentCase || '', designatedReviewerEmail);
    } finally {
      setIsExportingCase(false);
    }
  };

  const handleOpenExportConfirmationsModal = async () => {
    if (!currentCase || !user) return;

    try {
      const summary = await ensureCaseConfirmationSummary(user, currentCase, files, {
        forceRefresh: true,
      });
      const filesById = summary?.filesById ?? {};
      const values = Object.values(filesById);
      const confirmedCount = values.filter((f) => f.includeConfirmation && f.isConfirmed).length;
      const unconfirmedCount = values.filter((f) => f.includeConfirmation && !f.isConfirmed).length;
      setExportConfirmationStats({ confirmedCount, unconfirmedCount });
    } catch {
      setExportConfirmationStats({ confirmedCount: 0, unconfirmedCount: 0 });
    }

    setIsExportConfirmationsModalOpen(true);
  };

  const handleExportConfirmations = async () => {
    if (!currentCase || !user) return;

    setIsExportingConfirmations(true);
    showNotification(`Exporting confirmations for case ${currentCase}...`, 'loading', 0);

    try {
      await exportConfirmationData(user, currentCase);
      setIsExportConfirmationsModalOpen(false);
      showNotification(`Confirmations for case ${currentCase} exported successfully.`, 'success');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'Confirmation export failed. Please try again.', 'error');
    } finally {
      setIsExportingConfirmations(false);
    }
  };

  const handleOpenCaseExport = () => {
    if (!currentCase) {
      return;
    }

    if (isReadOnlyCase) {
      if (isReviewOnlyCase) {
        void handleOpenExportConfirmationsModal();
        return;
      }

      if (archiveDetails.archived) {
        void handleExport(currentCase, undefined, undefined, {
          archivePackageMode: true,
        });
        return;
      }
    }

    setIsExportCaseModalOpen(true);
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
        showNotification(CREATE_READ_ONLY_CASE_EXISTS_ERROR(newCaseName), 'error');
        return;
      }

      await renameCase(user, currentCase, newCaseName);
      setCurrentCase(newCaseName);
      setShowNotes(false);
      setIsRenameCaseModalOpen(false);
      showNotification(`Case renamed to ${newCaseName}.`, 'success');
    } catch (renameError) {
      showNotification(renameError instanceof Error ? renameError.message : RENAME_CASE_FAILED, 'error');
    } finally {
      setIsRenamingCase(false);
    }
  };

  const handleDeleteCaseAction = async () => {
    if (!currentCase) {
      showNotification('Select a case before deleting.', 'error');
      return;
    }

    const confirmed = window.confirm(DELETE_CASE_CONFIRMATION(currentCase));

    if (!confirmed) {
      return;
    }

    setIsDeletingCase(true);
    showNotification(`Deleting case ${currentCase}...`, 'loading', 0);

    try {
      const deleteResult = await deleteCase(user, currentCase);
      clearLoadedCaseState();
      if (deleteResult.missingImages.length > 0) {
        showNotification(
          `Case deleted. ${deleteResult.missingImages.length} image(s) were not found and were skipped during deletion.`,
          'warning'
        );
      } else {
        showNotification('Case deleted successfully.', 'success');
      }
    } catch (deleteError) {
      showNotification(deleteError instanceof Error ? deleteError.message : DELETE_CASE_FAILED, 'error');
    } finally {
      setIsDeletingCase(false);
    }
  };

  const handleDeleteCurrentFileAction = async () => {
    if (!currentCase || !imageId) {
      showNotification('Load an image before deleting a file.', 'error');
      return;
    }

    if (isReadOnlyCase) {
      showNotification('Cannot delete files for read-only cases.', 'error');
      return;
    }

    const selectedFile = files.find((file) => file.id === imageId);
    const selectedFileName = selectedFile?.originalFilename || imageId;
    const confirmed = window.confirm(DELETE_FILE_CONFIRMATION(selectedFileName));

    if (!confirmed) {
      return;
    }

    setIsDeletingFile(true);
    try {
      const deleteResult = await deleteFile(user, currentCase, imageId, 'User-requested deletion via navbar file management');
      const updatedFiles = files.filter((file) => file.id !== imageId);
      setFiles(updatedFiles);
      clearSelectedImageState();
      setShowNotes(false);
      if (deleteResult.imageMissing) {
        showNotification(
          `File record deleted. Image asset "${deleteResult.fileName}" was not found and was skipped.`,
          'warning'
        );
      } else {
        showNotification('File deleted successfully.', 'success');
      }
    } catch (deleteError) {
      showNotification(deleteError instanceof Error ? deleteError.message : DELETE_FILE_FAILED, 'error');
    } finally {
      setIsDeletingFile(false);
    }
  };

  const handleClearROCase = async () => {
    if (!isReviewOnlyCase) {
      showNotification('Only imported review cases can be cleared from workspace.', 'error');
      return;
    }

    if (!currentCase) {
      showNotification('No read-only case is currently loaded.', 'error');
      return;
    }

    const caseToRemove = currentCase;
    const confirmed = window.confirm(
      `Clear the read-only case "${caseToRemove}" from the workspace? This will remove the imported review data. The original exported case is not affected.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const success = await deleteReadOnlyCase(user, caseToRemove);
      if (!success) {
        showNotification(CLEAR_READ_ONLY_CASE_PARTIAL_FAILURE(caseToRemove), 'error');
        return;
      }
      clearLoadedCaseState();
      showNotification(`Read-only case "${caseToRemove}" cleared.`, 'success');
    } catch (clearError) {
      showNotification(clearError instanceof Error ? clearError.message : 'Failed to clear read-only case.', 'error');
    }
  };

  const handleArchiveCaseSubmit = async (archiveReason: string) => {
    if (!currentCase) {
      showNotification('Select a case before archiving.', 'error');
      return;
    }

    if (isReadOnlyCase) {
      showNotification('This case is already read-only and cannot be archived again.', 'error');
      return;
    }

    setIsArchivingCase(true);
    showNotification(`Archiving case ${currentCase}... Preparing archive package.`, 'loading', 0);

    try {
      await archiveCase(user, currentCase, archiveReason);
      setIsReadOnlyCase(true);
      setIsReviewOnlyCase(false);
      setArchiveDetails({
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: user.uid,
        archivedByDisplay: [
          [userFirstName.trim(), userLastName.trim()].filter(Boolean).join(' ').trim(),
          userBadgeId.trim(),
        ].filter(Boolean).join(', ') || user.uid,
        archiveReason: archiveReason.trim() || undefined,
      });
      setShowNotes(false);
      setIsArchiveCaseModalOpen(false);
      showNotification('Case archived successfully. The archive package download has started.', 'success');
    } catch (archiveError) {
      showNotification(archiveError instanceof Error ? archiveError.message : 'Failed to archive case.', 'error');
    } finally {
      setIsArchivingCase(false);
    }
  };

  const loadCaseIntoWorkspace = async (caseToLoad: string) => {
    if (caseToLoad === currentCase) {
      showNotification(`Case ${caseToLoad} is already loaded.`, 'success');
      return;
    }
    loadInitiatedRef.current = true;
    setCurrentCase(caseToLoad);
    setShowNotes(false);
    showNotification(`Loading case ${caseToLoad}...`, 'loading', 0);
  };

  const handleOpenCaseSubmit = async (nextCaseNumber: string) => {
    if (!validateCaseNumber(nextCaseNumber)) {
      showNotification('Invalid case number format.', 'error');
      return;
    }

    setIsOpeningCase(true);
    try {
      const existingCase = await checkExistingCase(user, nextCaseNumber);
      if (existingCase) {
        await loadCaseIntoWorkspace(nextCaseNumber);
        setIsOpenCaseModalOpen(false);
        return;
      }

      const existingReadOnlyCase = await checkReadOnlyCaseExists(user, nextCaseNumber);
      if (existingReadOnlyCase) {
        showNotification(CREATE_READ_ONLY_CASE_EXISTS_ERROR(nextCaseNumber), 'error');
        return;
      }

      const permission = await canCreateCase(user);
      if (!permission.canCreate) {
        showNotification(permission.reason || 'You cannot create more cases.', 'error');
        return;
      }

      const newCase = await createNewCase(user, nextCaseNumber);
      setCurrentCase(newCase.caseNumber);
      setFiles([]);
      setShowNotes(false);
      setIsOpenCaseModalOpen(false);
      showNotification(`Case ${newCase.caseNumber} created successfully.`, 'success');
    } catch (openCaseError) {
      showNotification(openCaseError instanceof Error ? openCaseError.message : 'Failed to load/create case.', 'error');
    } finally {
      setIsOpeningCase(false);
    }
  };

  const handleOpenCaseModal = async () => {
    setIsOpenCaseModalOpen(true);
    const helperText = await resolveOpenCaseHelperText(user);
    setOpenCaseHelperText(helperText);
  };

  // Function to refresh annotation data (called when notes are saved)
  const refreshAnnotationData = () => {
    setAnnotationRefreshTrigger(prev => prev + 1);
    setConfirmationSaveVersion(prev => prev + 1);
  };

  // Handle import/clear read-only case
  const handleImportComplete = (result: { success: boolean; caseNumber?: string; isReadOnly?: boolean }) => {
    if (result.success) {
      if (result.caseNumber && result.isReadOnly) {
        // Successful read-only case import - load the case
        handleCaseChange(result.caseNumber);
      } else if (result.caseNumber) {
        if (result.caseNumber === currentCase) {
          // Current case updated - refresh annotations (also bumps confirmationSaveVersion)
          refreshAnnotationData();
        } else {
          // Different case's confirmations updated - bump confirmation version only
          setConfirmationSaveVersion(prev => prev + 1);
        }
      } else if (!result.caseNumber && !result.isReadOnly) {
        // Read-only case cleared - reset all UI state
        clearLoadedCaseState();
      }
    }
  };

  useEffect(() => {
    // Cleanup function to clear image when component unmounts
    return () => {
      currentRevokeRef.current?.();
      currentRevokeRef.current = null;
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
            ...notes,
            leftCase: notes.leftCase || '',
            rightCase: notes.rightCase || '',
            leftItem: notes.leftItem || '',
            rightItem: notes.rightItem || '',
            caseFontColor: notes.caseFontColor || '#FFDE21',
            indexType: notes.indexType || 'number',
            supportLevel: notes.supportLevel || 'Inconclusive',
            includeConfirmation: notes.includeConfirmation ?? false,
            boxAnnotations: notes.boxAnnotations || [],
            updatedAt: notes.updatedAt || ''
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
      currentRevokeRef.current?.();
      currentRevokeRef.current = null;
      setSelectedImage(undefined);
      setSelectedFilename(undefined);
      setImageLoaded(false);
    
    const { url, revoke } = await getImageUrl(user, file, currentCase);
    currentRevokeRef.current = revoke;

    setSelectedImage(url);
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
      updatedAt: now,
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
      <Navbar
        isUploading={isUploading}
        company={userCompany}
        isReadOnly={isReadOnlyCase}
        isReviewOnlyCase={isReviewOnlyCase}
        currentCase={currentCase}
        currentFileName={selectedFilename}
        isCurrentImageConfirmed={isCurrentImageConfirmed}
        hasLoadedCase={!!currentCase}
        hasLoadedImage={hasLoadedImage}
        archiveDetails={archiveDetails}
        onImportComplete={handleImportComplete}
        onOpenCase={() => {
          void handleOpenCaseModal();
        }}
        onOpenListAllCases={() => setIsListCasesModalOpen(true)}
        onOpenCaseExport={handleOpenCaseExport}
        onOpenAuditTrail={() => setIsAuditTrailOpen(true)}
        onOpenRenameCase={() => setIsRenameCaseModalOpen(true)}
        onDeleteCase={() => {
          void handleDeleteCaseAction();
        }}
        onArchiveCase={() => setIsArchiveCaseModalOpen(true)}
        onClearROCase={() => {
          void handleClearROCase();
        }}
        onOpenViewAllFiles={() => setIsFilesModalOpen(true)}
        onDeleteCurrentFile={() => {
          void handleDeleteCurrentFileAction();
        }}
        onOpenImageNotes={() => setShowNotes(true)}
      />
      <div className={styles.contentRow}>
        <SidebarContainer 
          user={user} 
          onImageSelect={handleImageSelect}
          onOpenCase={() => {
            void handleOpenCaseModal();
          }}
          onOpenCaseExport={handleOpenCaseExport}
          imageId={imageId}
          currentCase={currentCase}
          imageLoaded={imageLoaded}
          setImageLoaded={setImageLoaded}
          files={files}
          setFiles={setFiles}
          showNotes={showNotes}
          setShowNotes={setShowNotes}
          onAnnotationRefresh={refreshAnnotationData}
          isReadOnly={isReadOnlyCase}
          isReviewOnlyCase={isReviewOnlyCase}
          isArchivedCase={archiveDetails.archived}
          confirmationSaveVersion={confirmationSaveVersion}
          isUploading={isUploading}
          onUploadStatusChange={setIsUploading}
          initialConfirmationSummary={initialConfirmationSummary}
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
            isBoxAnnotationMode={effectiveIsBoxAnnotationMode}
            boxAnnotationColor={boxAnnotationColor}
            onAnnotationUpdate={handleAnnotationUpdate}
            isReadOnly={isReadOnlyCase}
            isArchivedCase={archiveDetails.archived}
            caseNumber={currentCase}
            currentImageId={imageId}
          />
        </div>
        </main>
      </div>
      <OpenCaseModal
        isOpen={isOpenCaseModalOpen}
        isSubmitting={isOpeningCase}
        helperText={openCaseHelperText}
        onClose={() => setIsOpenCaseModalOpen(false)}
        onSubmit={handleOpenCaseSubmit}
      />
      <CasesModal
        isOpen={isListCasesModalOpen}
        onClose={() => setIsListCasesModalOpen(false)}
        onSelectCase={(selectedCase) => {
          void loadCaseIntoWorkspace(selectedCase);
        }}
        onCurrentCaseDeleted={clearLoadedCaseState}
        currentCase={currentCase || ''}
        user={user}
        confirmationSaveVersion={confirmationSaveVersion}
        initialConfirmationSummary={initialConfirmationSummary}
      />
      <FilesModal
        isOpen={isFilesModalOpen}
        onClose={() => setIsFilesModalOpen(false)}
        onFileSelect={(file) => {
          void handleImageSelect(file);
        }}
        currentCase={currentCase || null}
        files={files}
        setFiles={setFiles}
        isReadOnly={isReadOnlyCase}
        selectedFileId={imageId}
        confirmationSaveVersion={confirmationSaveVersion}
        initialConfirmationSummary={initialConfirmationSummary}
      />
      <NotesEditorModal
        isOpen={effectiveShowNotes}
        onClose={() => setShowNotes(false)}
        currentCase={currentCase}
        user={user}
        imageId={imageId || ''}
        onAnnotationRefresh={refreshAnnotationData}
        originalFileName={files.find(file => file.id === imageId)?.originalFilename}
        isUploading={isUploading}
        isReadOnly={isReadOnlyCase}
        showNotification={showNotification}
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
        isSubmitting={isRenamingCase || isDeletingCase || isDeletingFile || isArchivingCase}
        onClose={() => setIsRenameCaseModalOpen(false)}
        onSubmit={handleRenameCaseSubmit}
      />
      <ArchiveCaseModal
        isOpen={isArchiveCaseModalOpen}
        currentCase={currentCase}
        isSubmitting={isArchivingCase}
        onClose={() => setIsArchiveCaseModalOpen(false)}
        onSubmit={handleArchiveCaseSubmit}
      />
      <ExportCaseModal
        isOpen={isExportCaseModalOpen}
        caseNumber={currentCase || ''}
        currentUserEmail={user.email ?? undefined}
        isSubmitting={isExportingCase}
        onClose={() => setIsExportCaseModalOpen(false)}
        onSubmit={handleExportCaseModalSubmit}
      />
      <ExportConfirmationsModal
        isOpen={isExportConfirmationsModalOpen}
        caseNumber={currentCase || ''}
        confirmedCount={exportConfirmationStats?.confirmedCount ?? 0}
        unconfirmedCount={exportConfirmationStats?.unconfirmedCount ?? 0}
        isSubmitting={isExportingConfirmations}
        onClose={() => setIsExportConfirmationsModalOpen(false)}
        onConfirm={() => void handleExportConfirmations()}
      />
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={closeToast}
        duration={toastDuration}
      />
    </div>
  );
};