/**
 * Utility functions for generating unique identifiers
 */

/**
 * Generate a unique alphanumeric ID
 * @param length - Length of the ID (default: 10)
 * @returns Unique alphanumeric string
 */
export function generateUniqueId(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a confirmation ID with specific format
 * @returns Confirmation ID in format: CONF-XXXXXXXXXX
 */
export function generateConfirmationId(): string {
  return `CONF-${generateUniqueId(10)}`;
}

/**
 * Generate a workflow ID for audit trails
 * @param caseNumber - Case number to include in workflow ID
 * @returns Workflow ID in format: caseNumber-timestamp-random
 */
export function generateWorkflowId(caseNumber: string): string {
  const timestamp = Date.now().toString(36);
  const random = generateUniqueId(8);
  return `${caseNumber}-${timestamp}-${random}`;
}