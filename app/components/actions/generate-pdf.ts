import paths from '~/config/config.json';
import { AnnotationData } from '~/types/annotations';

interface GeneratePDFParams {
  selectedImage: string | undefined;
  selectedFilename: string | undefined;
  userCompany: string;
  userFirstName: string;
  currentCase: string;
  annotationData: AnnotationData | null;
  activeAnnotations: Set<string>;
  setIsGeneratingPDF: (isGenerating: boolean) => void;
  setToastType: (type: 'success' | 'error') => void;
  setToastMessage: (message: string) => void;
  setShowToast: (show: boolean) => void;
  setToastDuration?: (duration: number) => void;
}

export const generatePDF = async ({
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
  setShowToast,
  setToastDuration
}: GeneratePDFParams) => {
  setIsGeneratingPDF(true);
  
  // Show generating toast immediately with duration 0 (stays until manually closed or completion)
  setToastType('success');
  setToastMessage('Generating PDF report... This may take up to a minute.');
  if (setToastDuration) setToastDuration(0);
  setShowToast(true);
  
  try {
    // Format current date in user's timezone
    const now = new Date();
    const currentDate = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;
    
    // Format notes updated date in user's timezone if it exists
    let notesUpdatedFormatted = '';
    if (annotationData?.updatedAt) {
      const updatedDate = new Date(annotationData.updatedAt);
      notesUpdatedFormatted = `${(updatedDate.getMonth() + 1).toString().padStart(2, '0')}/${updatedDate.getDate().toString().padStart(2, '0')}/${updatedDate.getFullYear()}`;
    }

    const pdfData = {
      imageUrl: selectedImage,
      filename: selectedFilename,
      userCompany: userCompany,
      firstName: userFirstName,
      caseNumber: currentCase,
      annotationData,
      activeAnnotations: Array.from(activeAnnotations), // Convert Set to Array
      currentDate, // Pass formatted current date
      notesUpdatedFormatted // Pass formatted notes updated date
    };

    const response = await fetch(paths.pdf_worker_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pdfData)
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename based on annotation data
      let filename = 'striae-report';
      
      if (annotationData) {
        const { leftCase, leftItem, rightCase, rightItem } = annotationData;
        
        // Build left and right parts
        const leftPart = [leftCase, leftItem].filter(Boolean).join('-');
        const rightPart = [rightCase, rightItem].filter(Boolean).join('-');
        
        if (leftPart && rightPart) {
          filename = `striae-report-${leftPart}--${rightPart}`;
        } else if (leftPart) {
          filename = `striae-report-${leftPart}`;
        } else if (rightPart) {
          filename = `striae-report-${rightPart}`;
        }
      }
      
      // Fallback to case number if no annotation data
      if (filename === 'striae-report' && currentCase) {
        filename = `striae-report-${currentCase}`;
      }
      
      // Final fallback to timestamp
      if (filename === 'striae-report') {
        filename = `striae-report-${Date.now()}`;
      }
      
      // Sanitize filename and ensure .pdf extension
      filename = filename.replace(/[<>:"/\\|?*]/g, '-') + '.pdf';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success toast
      setToastType('success');
      setToastMessage('PDF generated successfully!');
      if (setToastDuration) setToastDuration(4000); // Reset to default duration for success message
      setShowToast(true);
    } else {
      const errorText = await response.text();
      console.error('PDF generation failed:', errorText);
      setToastType('error');
      setToastMessage('Failed to generate PDF report');
      if (setToastDuration) setToastDuration(4000); // Reset to default duration for error message
      setShowToast(true);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastType('error');
    setToastMessage('Error generating PDF report');
    if (setToastDuration) setToastDuration(4000); // Reset to default duration for error message
    setShowToast(true);
  } finally {
    setIsGeneratingPDF(false);
  }
};
