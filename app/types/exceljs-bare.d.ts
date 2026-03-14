import type * as ExcelJSModule from 'exceljs';

declare global {
  interface Window {
    ExcelJS?: typeof ExcelJSModule;
  }
}

export {};
