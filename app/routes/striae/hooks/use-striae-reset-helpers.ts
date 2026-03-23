import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { type AnnotationData, type FileData } from '~/types';

interface ArchiveDetailsState {
  archived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedByDisplay?: string;
  archiveReason?: string;
}

interface UseStriaeResetHelpersProps {
  setSelectedImage: Dispatch<SetStateAction<string | undefined>>;
  setSelectedFilename: Dispatch<SetStateAction<string | undefined>>;
  setImageId: Dispatch<SetStateAction<string | undefined>>;
  setAnnotationData: Dispatch<SetStateAction<AnnotationData | null>>;
  setError: Dispatch<SetStateAction<string | undefined>>;
  setImageLoaded: Dispatch<SetStateAction<boolean>>;
  setCurrentCase: Dispatch<SetStateAction<string>>;
  setFiles: Dispatch<SetStateAction<FileData[]>>;
  setActiveAnnotations: Dispatch<SetStateAction<Set<string>>>;
  setIsBoxAnnotationMode: Dispatch<SetStateAction<boolean>>;
  setIsReadOnlyCase: Dispatch<SetStateAction<boolean>>;
  setArchiveDetails: Dispatch<SetStateAction<ArchiveDetailsState>>;
  setShowNotes: Dispatch<SetStateAction<boolean>>;
  setIsAuditTrailOpen: Dispatch<SetStateAction<boolean>>;
  setIsRenameCaseModalOpen: Dispatch<SetStateAction<boolean>>;
}

export const useStriaeResetHelpers = ({
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
  setArchiveDetails,
  setShowNotes,
  setIsAuditTrailOpen,
  setIsRenameCaseModalOpen,
}: UseStriaeResetHelpersProps) => {
  const clearSelectedImageState = useCallback(() => {
    setSelectedImage('/clear.jpg');
    setSelectedFilename(undefined);
    setImageId(undefined);
    setAnnotationData(null);
    setError(undefined);
    setImageLoaded(false);
  }, [
    setSelectedImage,
    setSelectedFilename,
    setImageId,
    setAnnotationData,
    setError,
    setImageLoaded,
  ]);

  const clearCaseContextState = useCallback(() => {
    setActiveAnnotations(new Set());
    setIsBoxAnnotationMode(false);
    setIsReadOnlyCase(false);
    setArchiveDetails({ archived: false });
  }, [
    setActiveAnnotations,
    setIsBoxAnnotationMode,
    setIsReadOnlyCase,
    setArchiveDetails,
  ]);

  const clearLoadedCaseState = useCallback(() => {
    setCurrentCase('');
    setFiles([]);
    clearCaseContextState();
    clearSelectedImageState();
    setShowNotes(false);
    setIsAuditTrailOpen(false);
    setIsRenameCaseModalOpen(false);
  }, [
    setCurrentCase,
    setFiles,
    clearCaseContextState,
    clearSelectedImageState,
    setShowNotes,
    setIsAuditTrailOpen,
    setIsRenameCaseModalOpen,
  ]);

  return {
    clearSelectedImageState,
    clearCaseContextState,
    clearLoadedCaseState,
  };
};
