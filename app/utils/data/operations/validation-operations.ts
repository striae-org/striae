import type { User } from 'firebase/auth';

import { canAccessCase, validateUserSession } from '../permissions';
import type { DataAccessResult, DataOperation } from './types';

/**
 * Validate data access permissions for a user and case.
 */
export const validateDataAccess = async (
  user: User,
  caseNumber: string
): Promise<DataAccessResult> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      return { allowed: false, reason: sessionValidation.reason };
    }

    const accessCheck = await canAccessCase(user, caseNumber);
    if (!accessCheck.allowed) {
      return { allowed: false, reason: accessCheck.reason };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error validating data access:', error);
    return { allowed: false, reason: 'Access validation failed' };
  }
};

/**
 * Higher-order function for consistent data operation patterns.
 */
export const withDataOperation = <T>(
  operation: DataOperation<T>
) => async (user: User, ...args: unknown[]): Promise<T> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Operation failed: ${sessionValidation.reason}`);
    }

    return await operation(user, ...args);
  } catch (error) {
    console.error('Data operation failed:', error);
    throw error;
  }
};
