declare global {
  interface Window {
    ExcelJS?: typeof import('exceljs');
  }
}

export {};
