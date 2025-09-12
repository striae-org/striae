import paths from '~/config/config.json';

interface AnnotationData {
  leftCase: string;
  rightCase: string;
  leftItem: string;
  rightItem: string;
  caseFontColor: string;
  classType: 'Bullet' | 'Cartridge Case' | 'Other';
  customClass?: string;
  classNote: string;
  indexType: 'number' | 'color';
  indexNumber?: string;
  indexColor?: string;
  supportLevel: 'ID' | 'Exclusion' | 'Inconclusive';
  hasSubclass?: boolean;
  includeConfirmation: boolean;
  additionalNotes: string;
  updatedAt?: string;
}

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
  setShowToast
}: GeneratePDFParams) => {
  setIsGeneratingPDF(true);
  
  // Show generating toast immediately
  setToastType('success');
  setToastMessage('Generating PDF report... This may take up to a minute.');
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
      company: userCompany,
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
      setShowToast(true);
    } else {
      const errorText = await response.text();
      console.error('PDF generation failed:', errorText);
      setToastType('error');
      setToastMessage('Failed to generate PDF report');
      setShowToast(true);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    setToastType('error');
    setToastMessage('Error generating PDF report');
    setShowToast(true);
  } finally {
    setIsGeneratingPDF(false);
  }
};
