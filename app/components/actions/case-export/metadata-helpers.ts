import { User } from 'firebase/auth';
import { getUserData } from '~/utils/permissions';

/**
 * Helper function to get user export metadata
 */
export async function getUserExportMetadata(user: User) {
  try {
    const userData = await getUserData(user);
    if (userData) {
      return {
        exportedBy: user.email,
        exportedByUid: userData.uid,
        exportedByName: `${userData.firstName} ${userData.lastName}`.trim(),
        exportedByCompany: userData.company
      };
    }
  } catch (error) {
    console.warn('Failed to fetch user data for export metadata:', error);
  }
  
  // Fallback to basic user data if getUserData fails
  return {
    exportedBy: user.email,
    exportedByUid: user.uid,
    exportedByName: user.displayName || 'N/A',
    exportedByCompany: 'N/A'
  };
}

/**
 * Add data protection warning to content
 */
export function addForensicDataWarning(content: string, format: 'csv' | 'json'): string {
  const warning = format === 'csv' 
    ? `"CASE DATA WARNING: This file contains evidence data for forensic examination. Any modification may compromise the integrity of the evidence. Handle according to your organization's chain of custody procedures."\n\n`
    : `/* CASE DATA WARNING
 * This file contains evidence data for forensic examination.
 * Any modification may compromise the integrity of the evidence.
 * Handle according to your organization's chain of custody procedures.
 * 
 * File generated: ${new Date().toISOString()}
 */\n\n`;
  
  return warning + content;
}

/**
 * Generate a secure random password for Excel protection
 */
export function generateRandomPassword(): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const length = 16;
  let password = '';
  
  // Ensure we have at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special char
  
  // Fill remaining length with random characters
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password to randomize character positions
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Protect Excel worksheet from editing
 */
export function protectExcelWorksheet(worksheet: Record<string, unknown>, sheetPassword?: string): string {
  // Generate random password if none provided
  const password = sheetPassword || generateRandomPassword();
  
  // Set worksheet protection
  worksheet['!protect'] = {
    password: password,
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
    objects: false,
    scenarios: false
  };
  
  // Lock all cells by default
  if (!worksheet['!cols']) worksheet['!cols'] = [];
  if (!worksheet['!rows']) worksheet['!rows'] = [];
  
  // Add protection metadata
  worksheet['!margins'] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };
  
  // Return the password for inclusion in metadata
  return password;
}