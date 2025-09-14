import puppeteer from "@cloudflare/puppeteer";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.striae.org',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const generateDocument = (data) => {
  const { imageUrl, caseNumber, annotationData, activeAnnotations, currentDate, notesUpdatedFormatted, userCompany } = data;
  const annotationsSet = new Set(activeAnnotations);
  
  // Use passed currentDate or generate fallback
  const displayDate = currentDate || (() => {
    const now = new Date();
    return `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;
  })();
  
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        font-family: Arial, sans-serif;
        background-color: white;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .header {
        display: flex;
        align-items: center;
        margin-bottom: 15px;
        border-bottom: 2px solid #333;
        padding-bottom: 8px;
        position: relative;
      }
      .header-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .date {
        font-size: 16px;
        font-weight: bold;
      }
      .case-number {
        font-size: 16px;
        font-weight: bold;
        color: #333;
        text-align: right;
      }      
      .image-container {
        width: 100%;
        margin: 10px 0;
        position: relative;
      }
      .image-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        position: relative;
      }
      .image-container img {
        width: 100%;
        max-height: 65vh;
        height: auto;
        display: block;
        box-sizing: border-box;
        object-fit: contain;
      }
      .image-with-border {
        max-width: calc(100% - 10px);
        max-height: calc(100% - 10px);
        margin: 0 auto;
      }
      .annotations-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
      }
      .left-annotation,
      .right-annotation {
        position: absolute;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 6px;
        backdrop-filter: blur(4px);
        border: 2px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      .left-annotation {
        top: 2%;
        left: 4%;
      }
      .right-annotation {
        top: 2%;
        right: 4%;
      }
      .case-text {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 18px;
        font-weight: 700;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        white-space: nowrap;
        letter-spacing: 0.5px;
      }
      .below-image-annotations {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        width: 100%;
        margin-top: 12px;
        min-height: 50px;
      }
      .support-level-annotation {
        flex: 1;
        display: flex;
        justify-content: flex-start;
      }
      .class-annotation {
        flex: 1;
        display: flex;
        justify-content: center;
      }
      .subclass-annotation {
        flex: 1;
        display: flex;
        justify-content: flex-end;
      }
      .support-level-text {
        padding: 10px 20px;
        background: rgba(240, 240, 240, 0.95);
        border-radius: 6px;
        backdrop-filter: blur(6px);
        border: 2px solid rgba(200, 200, 200, 0.6);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        font-family: 'Inter', Arial, sans-serif;
        font-size: 14px;
        font-weight: 700;
        text-align: center;
        letter-spacing: 0.5px;
        text-shadow: none;
        white-space: nowrap;
      }
      .class-text-annotation {
        padding: 10px 20px;
        background: rgba(0, 0, 0, 0.8);
        color: #ffffff;
        border-radius: 6px;
        backdrop-filter: blur(6px);
        border: 2px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        font-family: 'Inter', Arial, sans-serif;
        font-size: 14px;
        font-weight: 600;
        text-align: center;
        letter-spacing: 0.5px;
        text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
        white-space: nowrap;
      }
      .subclass-text {
        padding: 12px 24px;
        background: rgba(220, 53, 69, 0.9);
        color: #ffffff;
        border-radius: 8px;
        backdrop-filter: blur(6px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 4px 16px rgba(220, 53, 69, 0.4);
        font-family: 'Inter', Arial, sans-serif;
        font-size: 14px;
        font-weight: 700;
        text-align: center;
        letter-spacing: 0.5px;
        text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
        white-space: nowrap;
      }
      .confirmation-section {
        margin-top: 20px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .confirmation-box {
        background: #ffffff;
        border: 2px solid #333;
        border-radius: 6px;
        padding: 15px;
        width: 280px;
        font-family: 'Inter', Arial, sans-serif;
      }
      .confirmation-label {
        font-size: 14px;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
      }
      .confirmation-line {
        border-bottom: 1px solid #333;
        height: 18px;
        margin-bottom: 15px;
        width: 100%;
      }
      .confirmation-date-label {
        font-size: 14px;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
        margin-top: 10px;
      }
      .additional-notes-section {
        max-width: 400px;
        font-family: 'Inter', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
        white-space: pre-wrap;
        word-wrap: break-word;
        text-indent: 0 !important;
        padding: 0;
        margin: 0;
        margin-left: 20px;
        flex-shrink: 0;
        text-align: left;
        display: block;
      }
      .footer {
        margin-top: auto;
        padding-top: 15px;
        border-top: 1px solid #ccc;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: 'Inter', Arial, sans-serif;
        font-size: 11px;
        color: #666;
      }
      .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .content-wrapper {
        flex-grow: 0;
        flex-shrink: 0;
      }
      .footer-left {
        font-weight: 500;
        flex: 1;
        text-align: left;
      }
      .footer-center {
        font-weight: 600;
        flex: 1;
        text-align: center;
        color: #333;
      }
      .footer-right {
        font-style: italic;
        flex: 1;
        text-align: right;
      }
      .index-section {
        text-align: center;
        margin: 15px 0 8px 0;
        font-family: 'Inter', Arial, sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }
    </style>
  </head>
  <body>
    <div class="main-content">
    <div class="content-wrapper">
    <div class="header">
      <div class="header-content">
        <div class="date">${displayDate}</div>
        ${caseNumber ? `<div class="case-number">${caseNumber}</div>` : '<div class="case-number"></div>'}
      </div>
    </div>
    
    ${imageUrl && imageUrl !== '/clear.jpg' ? `
    ${annotationData && annotationsSet?.has('index') && annotationData.indexType === 'number' && annotationData.indexNumber ? `
    <div class="index-section">
      Index: ${annotationData.indexNumber}
    </div>
    ` : ''}
    
    <div class="image-container">
      <div class="image-wrapper">
        <img src="${imageUrl}" alt="Comparison Image" ${annotationData && annotationsSet?.has('index') && annotationData.indexType === 'color' && annotationData.indexColor ? `class="image-with-border" style="border: 5px solid ${annotationData.indexColor};"` : ''} />

        ${annotationData && annotationsSet?.has('number') ? `
        <div class="annotations-overlay">
          <div class="left-annotation" style="${(annotationData.caseFontColor === '#000000' || annotationData.caseFontColor === 'black' || annotationData.caseFontColor === '#000') ? 'background: rgba(255, 255, 255, 0.9); border: 2px solid rgba(0, 0, 0, 0.2); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);' : ''}">
            <div class="case-text" style="color: ${annotationData.caseFontColor || '#FFDE21'};">
              ${annotationData.leftCase}${annotationData.leftItem ? ` ${annotationData.leftItem}` : ''}
            </div>
          </div>
          <div class="right-annotation" style="${(annotationData.caseFontColor === '#000000' || annotationData.caseFontColor === 'black' || annotationData.caseFontColor === '#000') ? 'background: rgba(255, 255, 255, 0.9); border: 2px solid rgba(0, 0, 0, 0.2); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);' : ''}">
            <div class="case-text" style="color: ${annotationData.caseFontColor || '#FFDE21'};">
              ${annotationData.rightCase}${annotationData.rightItem ? ` ${annotationData.rightItem}` : ''}
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
      
    <div class="below-image-annotations">
        ${annotationData && annotationsSet?.has('id') ? `
        <div class="support-level-annotation">
          <div class="support-level-text" style="color: ${annotationData.supportLevel === 'ID' ? '#28a745' : annotationData.supportLevel === 'Exclusion' ? '#dc3545' : '#ffc107'}; background: ${annotationData.supportLevel === 'Inconclusive' ? 'rgba(120, 120, 120, 0.95)' : 'rgba(240, 240, 240, 0.95)'};">
            ${annotationData.supportLevel === 'ID' ? 'Identification' : annotationData.supportLevel}
          </div>
        </div>
        ` : '<div class="support-level-annotation"></div>'}
        
        ${annotationData && annotationsSet?.has('class') ? `
        <div class="class-annotation">
          <div class="class-text-annotation">
            ${annotationData.customClass || annotationData.classType}${annotationData.classNote ? ` (${annotationData.classNote})` : ''}
          </div>
        </div>
        ` : '<div class="class-annotation"></div>'}
        
        ${annotationData && annotationsSet?.has('class') && annotationData.hasSubclass ? `
        <div class="subclass-annotation">
          <div class="subclass-text">
            POTENTIAL SUBCLASS
          </div>
        </div>
        ` : '<div class="subclass-annotation"></div>'}
      </div>
    </div>
    ` : ''}
    
    ${annotationData && ((annotationData.includeConfirmation === true) || annotationData.additionalNotes) ? `
    <div class="confirmation-section">
      ${annotationData && (annotationData.includeConfirmation === true) ? `
      <div class="confirmation-box">
        <div class="confirmation-label">Confirmation by:</div>
        <div class="confirmation-line"></div>
        <div class="confirmation-date-label">Date:</div>
        <div class="confirmation-line"></div>
      </div>
      ` : '<div></div>'}

      ${annotationData && annotationsSet?.has('notes') && annotationData.additionalNotes && annotationData.additionalNotes.trim() ? `
      <div class="additional-notes-section">${annotationData.additionalNotes.trim()}</div>
      ` : '<div></div>'}
    </div>
    ` : ''}
    
    </div>
    </div>
    
    <div class="footer">
      <div class="footer-left">Notes formatted by Striae©</div>
      <div class="footer-center">
        ${userCompany ? userCompany : ''}
      </div>
      <div class="footer-right">
        ${notesUpdatedFormatted ? `Notes updated ${notesUpdatedFormatted}` : ''}
      </div>
    </div>
  </body>
</html>
`;
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'POST') {
      try {
        const data = await request.json();
        
        const browser = await puppeteer.launch(env.BROWSER);
        const page = await browser.newPage();

        // Generate HTML document with canvas data
        const document = generateDocument(data);
        await page.setContent(document);

        // Generate PDF
        const pdf = await page.pdf({ 
          printBackground: true,
          format: 'letter',
          margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }
        });

        await browser.close();

        return new Response(pdf, {
          headers: {
            ...corsHeaders,
            "content-type": "application/pdf"
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  },
};