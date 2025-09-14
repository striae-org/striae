import { User } from 'firebase/auth';
import paths from '~/config/config.json';
import { getUserApiKey } from './auth';

const USER_WORKER_URL = paths.user_worker_url;
const MAX_CASES_FREE = paths.max_cases_free;
const MAX_FILES_PER_CASE_FREE = paths.max_files_per_case_free;

export interface UserData {
  uid: string;
  email: string | null;
  firstName: string;
  lastName: string;
  company: string;
  permitted: boolean;
  cases: Array<{
    caseNumber: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface UserLimits {
  maxCases: number;
  maxFilesPerCase: number;
}

export interface UserUsage {
  currentCases: number;
  currentFiles: number;
}

/**
 * Get user data from KV store
 */
export const getUserData = async (user: User): Promise<UserData | null> => {
  try {
    const apiKey = await getUserApiKey();
    const response = await fetch(`${USER_WORKER_URL}/${user.uid}`, {
      method: 'GET',
      headers: {
        'X-Custom-Auth-Key': apiKey
      }
    });

    if (response.ok) {
      return await response.json() as UserData;
    }
    
    if (response.status === 404) {
      return null; // User not found
    }
    
    throw new Error('Failed to fetch user data');
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

/**
 * Get user limits based on their permission status
 */
export const getUserLimits = (userData: UserData): UserLimits => {
  if (userData.permitted) {
    return {
      maxCases: Infinity, // No limit for permitted users
      maxFilesPerCase: Infinity // No limit for permitted users
    };
  } else {
    return {
      maxCases: MAX_CASES_FREE, // Use config value for free users
      maxFilesPerCase: MAX_FILES_PER_CASE_FREE // Use config value for free users
    };
  }
};

/**
 * Get current usage counts for a user
 */
export const getUserUsage = async (user: User, caseNumber?: string): Promise<UserUsage> => {
  try {
    const userData = await getUserData(user);
    if (!userData) {
      return { currentCases: 0, currentFiles: 0 };
    }

    const currentCases = userData.cases?.length || 0;
    
    // If we need file count for a specific case, we'd need to fetch that from the data worker
    // For now, we'll return 0 as we'll check this in the specific upload function
    const currentFiles = 0;

    return {
      currentCases,
      currentFiles
    };
  } catch (error) {
    console.error('Error getting user usage:', error);
    return { currentCases: 0, currentFiles: 0 };
  }
};

/**
 * Check if user can create a new case
 */
export const canCreateCase = async (user: User): Promise<{ canCreate: boolean; reason?: string }> => {
  try {
    const userData = await getUserData(user);
    if (!userData) {
      return { canCreate: true }; // New users can create their first case
    }

    const limits = getUserLimits(userData);
    const usage = await getUserUsage(user);

    if (usage.currentCases >= limits.maxCases) {
      return {
        canCreate: false,
        reason: `You have reached the maximum number of cases (${limits.maxCases}). Please contact support to upgrade your account.`
      };
    }

    return { canCreate: true };
  } catch (error) {
    console.error('Error checking case creation permission:', error);
    return { canCreate: false, reason: 'Unable to verify permissions. Please try again.' };
  }
};

/**
 * Check if user can upload a file to a case
 */
export const canUploadFile = async (user: User, caseNumber: string, currentFileCount: number): Promise<{ canUpload: boolean; reason?: string }> => {
  try {
    const userData = await getUserData(user);
    if (!userData) {
      return { canUpload: false, reason: 'User data not found.' };
    }

    const limits = getUserLimits(userData);

    if (currentFileCount >= limits.maxFilesPerCase) {
      return {
        canUpload: false,
        reason: `You have reached the maximum number of files per case (${limits.maxFilesPerCase}). Please contact support to upgrade your account.`
      };
    }

    return { canUpload: true };
  } catch (error) {
    console.error('Error checking file upload permission:', error);
    return { canUpload: false, reason: 'Unable to verify permissions. Please try again.' };
  }
};

/**
 * Get a user-friendly description of their current limits
 */
export const getLimitsDescription = async (user: User): Promise<string> => {
  try {
    const userData = await getUserData(user);
    if (!userData) {
      return `Account limits: ${MAX_CASES_FREE} case, ${MAX_FILES_PER_CASE_FREE} files per case`;
    }

    const limits = getUserLimits(userData);
    
    if (userData.permitted) {
      return 'Full access account - no limits';
    } else {
      return `Trial account limits: ${limits.maxCases} case, ${limits.maxFilesPerCase} files per case`;
    }
  } catch (error) {
    console.error('Error getting limits description:', error);
    return 'Unable to determine account limits';
  }
};