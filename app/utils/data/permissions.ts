import type { User } from 'firebase/auth';
import type { UserData, ExtendedUserData, UserLimits, ReadOnlyCaseMetadata } from '~/types';
import paths from '~/config/config.json';
import { fetchDataApi, fetchUserApi } from '../api';

const MAX_CASES_DEMO = paths.max_cases_demo;
const MAX_FILES_PER_CASE_DEMO = paths.max_files_per_case_demo;

export interface UserUsage {
	currentCases: number;
	currentFiles: number;
}

export interface UserSessionValidation {
	valid: boolean;
	reason?: string;
}

export interface PermissionResult {
	allowed: boolean;
	reason?: string;
}

export interface CaseMetadata {
	caseNumber: string;
	createdAt: string;
}

/**
 * Result for notes viewing permissions
 * Determines if notes can be viewed and in what mode (edit or view-only)
 */
export interface NotesViewPermission {
	canOpen: boolean; // Can the notes panel be opened
	isReadOnly: boolean; // Are notes in read-only mode (can view but not edit)
	reason?: string; // Reason if notes cannot be opened
}

const USER_DATA_CACHE_TTL_MS = 30_000;

interface UserDataCacheEntry {
	data: UserData | null;
	expiresAt: number;
}

const userDataCache = new Map<string, UserDataCacheEntry>();

function invalidateUserDataCache(uid: string): void {
	userDataCache.delete(uid);
}

/**
 * Get user data from KV store, with a 30-second in-memory cache to avoid
 * redundant round-trips across the many callers within a single case-load sequence.
 */
export const getUserData = async (user: User): Promise<UserData | null> => {
	const cached = userDataCache.get(user.uid);
	if (cached && Date.now() < cached.expiresAt) {
		return cached.data;
	}

	try {
		const response = await fetchUserApi(user, `/${encodeURIComponent(user.uid)}`, {
			method: 'GET',
		});

		if (response.ok) {
			const data = (await response.json()) as UserData;
			userDataCache.set(user.uid, { data, expiresAt: Date.now() + USER_DATA_CACHE_TTL_MS });
			return data;
		}

		if (response.status === 404) {
			userDataCache.set(user.uid, { data: null, expiresAt: Date.now() + USER_DATA_CACHE_TTL_MS });
			return null;
		}

		const responseBody = await response.text().catch(() => '');
		const detail = responseBody ? `: ${responseBody}` : '';
		throw new Error(`Failed to fetch user data (${response.status} ${response.statusText})${detail}`);
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
			maxFilesPerCase: Infinity, // No limit for permitted users
		};
	} else {
		return {
			maxCases: MAX_CASES_DEMO, // Use config value for demo users
			maxFilesPerCase: MAX_FILES_PER_CASE_DEMO, // Use config value for demo users
		};
	}
};

/**
 * Get current usage counts for a user
 */
export const getUserUsage = async (user: User): Promise<UserUsage> => {
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
			currentFiles,
		};
	} catch (error) {
		console.error('Error getting user usage:', error);
		return { currentCases: 0, currentFiles: 0 };
	}
};

/**
 * Create a new user in the KV store
 */
export const createUser = async (
	user: User,
	firstName: string,
	lastName: string,
	company: string,
	permitted: boolean = false,
	badgeId: string = '',
): Promise<UserData> => {
	try {
		const userData: UserData = {
			uid: user.uid,
			email: user.email,
			firstName,
			lastName,
			company,
			badgeId,
			permitted,
			cases: [],
			readOnlyCases: [],
			createdAt: new Date().toISOString(),
		};

		const response = await fetchUserApi(user, `/${encodeURIComponent(user.uid)}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(userData),
		});

		if (!response.ok) {
			throw new Error(`Failed to create user data: ${response.status} ${response.statusText}`);
		}

		invalidateUserDataCache(user.uid);
		return userData;
	} catch (error) {
		console.error('Error creating user data:', error);
		throw error;
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
				reason: `Demo account only: Maximum of ${limits.maxCases} case${limits.maxCases === 1 ? '' : 's'} reached`,
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
export const canUploadFile = async (user: User, currentFileCount: number): Promise<{ canUpload: boolean; reason?: string }> => {
	try {
		const userData = await getUserData(user);
		if (!userData) {
			return { canUpload: false, reason: 'User data not found.' };
		}

		const limits = getUserLimits(userData);

		if (currentFileCount >= limits.maxFilesPerCase) {
			return {
				canUpload: false,
				reason: `Demo account only: Maximum of ${limits.maxFilesPerCase} file${limits.maxFilesPerCase === 1 ? '' : 's'} per case reached`,
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
			return `Account limits: ${MAX_CASES_DEMO} case${MAX_CASES_DEMO === 1 ? '' : 's'}, ${MAX_FILES_PER_CASE_DEMO} file${MAX_FILES_PER_CASE_DEMO === 1 ? '' : 's'} per case`;
		}

		if (userData.permitted) {
			return '';
		} else {
			return `Demo account only: ${MAX_CASES_DEMO} case${MAX_CASES_DEMO === 1 ? '' : 's'}, ${MAX_FILES_PER_CASE_DEMO} file${MAX_FILES_PER_CASE_DEMO === 1 ? '' : 's'} per case`;
		}
	} catch (error) {
		console.error('Error getting limits description:', error);
		return 'Unable to determine account limits';
	}
};

// ============================================================================
// ENHANCED CENTRALIZED FUNCTIONS
// ============================================================================

/**
 * Validate user session with comprehensive checks
 * Ensures user exists, has valid authentication, and passes basic security checks
 */
export const validateUserSession = async (user: User): Promise<UserSessionValidation> => {
	try {
		// Basic user object validation
		if (!user || !user.uid) {
			return { valid: false, reason: 'Invalid user session: No user ID' };
		}

		if (!user.email) {
			return { valid: false, reason: 'Invalid user session: No email address' };
		}

		// Check if user data exists in the system
		const userData = await getUserData(user);
		if (!userData) {
			return { valid: false, reason: 'User not found in system database' };
		}

		// Verify email consistency
		if (userData.email !== user.email) {
			return { valid: false, reason: 'Email mismatch between session and database' };
		}

		return { valid: true };
	} catch (error) {
		console.error('Error validating user session:', error);
		return { valid: false, reason: 'Session validation failed due to system error' };
	}
};

/**
 * Centralized user data update with built-in API key management and validation
 * Handles all user data modifications through a single secure interface
 */
export const updateUserData = async (user: User, updates: Partial<UserData>): Promise<UserData> => {
	try {
		// Validate user session first
		const sessionValidation = await validateUserSession(user);
		if (!sessionValidation.valid) {
			throw new Error(`Session validation failed: ${sessionValidation.reason}`);
		}

		// Get current user data
		const currentUserData = await getUserData(user);
		if (!currentUserData) {
			throw new Error('Cannot update user data: User not found');
		}

		// Merge updates with current data
		const updatedUserData = {
			...currentUserData,
			...updates,
			updatedAt: new Date().toISOString(),
		};

		// Perform the update with API key management
		const response = await fetchUserApi(user, `/${encodeURIComponent(user.uid)}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(updatedUserData),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to update user data: ${response.status} - ${errorText}`);
		}

		const result = (await response.json()) as UserData;
		invalidateUserDataCache(user.uid);
		return result;
	} catch (error) {
		console.error('Error updating user data:', error);
		throw error;
	}
};

/**
 * Get user's cases with centralized error handling and API key management
 */
export const getUserCases = async (user: User): Promise<CaseMetadata[]> => {
	try {
		const userData = await getUserData(user);
		if (!userData || !userData.cases) {
			return [];
		}

		return userData.cases;
	} catch (error) {
		console.error('Error fetching user cases:', error);
		return [];
	}
};

/**
 * Get user's read-only cases with centralized error handling
 */
export const getUserReadOnlyCases = async (user: User): Promise<ReadOnlyCaseMetadata[]> => {
	try {
		const userData = (await getUserData(user)) as ExtendedUserData;
		if (!userData || !userData.readOnlyCases) {
			return [];
		}

		return userData.readOnlyCases;
	} catch (error) {
		console.error('Error fetching user read-only cases:', error);
		return [];
	}
};

/**
 * Check if user has permitted status with caching and error handling
 */
export const isUserPermitted = async (user: User): Promise<boolean> => {
	try {
		const userData = await getUserData(user);
		return userData?.permitted || false;
	} catch (error) {
		console.error('Error checking user permitted status:', error);
		return false; // Fail closed for security
	}
};

/**
 * Check if user can access a specific case (either owned or read-only)
 */
export const canAccessCase = async (user: User, caseNumber: string): Promise<PermissionResult> => {
	try {
		// Validate inputs
		if (!caseNumber || typeof caseNumber !== 'string') {
			return { allowed: false, reason: 'Invalid case number provided' };
		}

		// Validate user session
		const sessionValidation = await validateUserSession(user);
		if (!sessionValidation.valid) {
			return { allowed: false, reason: sessionValidation.reason };
		}

		const userData = await getUserData(user);
		if (!userData) {
			return { allowed: false, reason: 'User data not found' };
		}

		// Check owned cases
		if (userData.cases && userData.cases.some((c) => c.caseNumber === caseNumber)) {
			return { allowed: true };
		}

		// Check read-only cases
		const extendedUserData = userData as ExtendedUserData;
		if (extendedUserData.readOnlyCases && extendedUserData.readOnlyCases.some((c) => c.caseNumber === caseNumber)) {
			return { allowed: true };
		}

		return { allowed: false, reason: 'Case not found in user access list' };
	} catch (error) {
		console.error('Error checking case access permission:', error);
		return { allowed: false, reason: 'Permission check failed due to system error' };
	}
};

/**
 * Check if user can modify a specific case
 * - Regular users (permitted=true) can modify their owned cases
 * - Demo users (permitted=false) can modify their owned cases
 * - Both permitted and demo users can modify read-only cases for review
 * - Nobody can modify cases marked as archived in the case data itself
 */
export const canModifyCase = async (user: User, caseNumber: string): Promise<PermissionResult> => {
	try {
		// Validate inputs
		if (!caseNumber || typeof caseNumber !== 'string') {
			return { allowed: false, reason: 'Invalid case number provided' };
		}

		const userData = (await getUserData(user)) as ExtendedUserData;
		if (!userData) {
			return { allowed: false, reason: 'User data not found' };
		}

		const archiveCheckResponse = await fetchDataApi(user, `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/data.json`, {
			method: 'GET',
		});

		if (archiveCheckResponse.ok) {
			const caseData = (await archiveCheckResponse.json()) as { archived?: boolean };
			if (caseData.archived) {
				return { allowed: false, reason: 'Archived cases are immutable and read-only' };
			}
		} else if (archiveCheckResponse.status !== 404) {
			// Fail closed: if archive status can't be verified (worker error/timeout),
			// block modification rather than risk mutating an archived case
			return { allowed: false, reason: 'Unable to verify case archive status' };
		}

		// Check if user owns the case (regular cases)
		if (userData.cases && userData.cases.some((c) => c.caseNumber === caseNumber)) {
			// Both permitted and demo users can modify their owned cases
			return { allowed: true };
		}

		// Check if it's a read-only case that user can review
		if (userData.readOnlyCases && userData.readOnlyCases.some((c) => c.caseNumber === caseNumber)) {
			// For read-only cases, both permitted and demo users can modify for review
			// The actual read-only restrictions should be enforced at the case data level, not user level
			return { allowed: true };
		}

		return { allowed: false, reason: 'Case not found in user access list' };
	} catch (error) {
		console.error('Error checking case modification permission:', error);
		return { allowed: false, reason: 'Permission check failed due to system error' };
	}
};

/**
 * Higher-order function for consistent error handling in user data operations
 * Wraps operations with session validation and standardized error patterns
 */
export const withUserDataOperation =
	<T>(operation: (userData: UserData, user: User) => Promise<T>) =>
	async (user: User): Promise<T> => {
		try {
			// Validate user session
			const sessionValidation = await validateUserSession(user);
			if (!sessionValidation.valid) {
				throw new Error(`Operation failed: ${sessionValidation.reason}`);
			}

			// Get user data
			const userData = await getUserData(user);
			if (!userData) {
				throw new Error('Operation failed: User data not found');
			}

			// Execute the operation
			return await operation(userData, user);
		} catch (error) {
			console.error('User data operation failed:', error);
			throw error;
		}
	};

/**
 * Add a case to user's case list with validation and conflict checking
 */
export const addUserCase = async (user: User, caseData: CaseMetadata): Promise<void> => {
	try {
		// Validate user session
		const sessionValidation = await validateUserSession(user);
		if (!sessionValidation.valid) {
			throw new Error(`Session validation failed: ${sessionValidation.reason}`);
		}

		// Get current user data to check for duplicates
		const userData = await getUserData(user);
		if (!userData) {
			throw new Error('Cannot add case: User data not found');
		}

		// Check for duplicate case numbers
		const existingCases = userData.cases || [];
		const existingCase = existingCases.find((c) => c.caseNumber === caseData.caseNumber);
		if (existingCase) {
			throw new Error(`Case ${caseData.caseNumber} already exists`);
		}

		// Use the dedicated /cases endpoint to add the case
		const response = await fetchUserApi(user, `/${encodeURIComponent(user.uid)}/cases`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				cases: [caseData],
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to add case to user: ${response.status} - ${errorText}`);
		}

		invalidateUserDataCache(user.uid);
	} catch (error) {
		console.error('Error adding case to user:', error);
		throw error;
	}
};

/**
 * Remove a case from user's case list with validation
 */
export const removeUserCase = async (user: User, caseNumber: string): Promise<void> => {
	try {
		// Validate user session
		const sessionValidation = await validateUserSession(user);
		if (!sessionValidation.valid) {
			throw new Error(`Session validation failed: ${sessionValidation.reason}`);
		}

		// Get current user data to check if case exists
		const userData = await getUserData(user);
		if (!userData || !userData.cases) {
			throw new Error('Cannot remove case: No cases found');
		}

		// Check if the case exists
		const existingCase = userData.cases.find((c) => c.caseNumber === caseNumber);
		if (!existingCase) {
			throw new Error(`Case ${caseNumber} not found`);
		}

		// Use the dedicated /cases DELETE endpoint to remove the case
		const response = await fetchUserApi(user, `/${encodeURIComponent(user.uid)}/cases`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				casesToDelete: [caseNumber],
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to remove case from user: ${response.status} - ${errorText}`);
		}

		invalidateUserDataCache(user.uid);
	} catch (error) {
		console.error('Error removing case from user:', error);
		throw error;
	}
};

// ============================================================================
// NOTES VIEW PERMISSIONS
// ============================================================================

/**
 * Determine if notes can be opened and viewed, and whether they should be in read-only mode
 *
 * Notes can be viewed in the following scenarios:
 * - Normal active case with unconfirmed image: Can edit and save
 * - Active case with confirmed image: Can view only (read-only)
 * - Read-only case (review/confirmation case): Can view only (read-only)
 * - Archived case: Can view only (read-only)
 *
 * Notes cannot be opened when:
 * - Files are uploading
 * - Confirmation status is still being checked
 * - No image is loaded
 *
 * @param config Configuration object with state flags
 * @returns NotesViewPermission object indicating if notes can be opened and if they're read-only
 */
export const getNotesViewPermission = (config: {
	imageLoaded: boolean;
	isUploading: boolean;
	isCheckingConfirmation: boolean;
	isReadOnlyCase?: boolean;
	isArchivedCase?: boolean;
	isConfirmedImage?: boolean;
}): NotesViewPermission => {
	const {
		imageLoaded,
		isUploading,
		isCheckingConfirmation,
		isReadOnlyCase = false,
		isArchivedCase = false,
		isConfirmedImage = false,
	} = config;

	// Cannot open if uploading files
	if (isUploading) {
		return {
			canOpen: false,
			isReadOnly: false,
			reason: 'Cannot open notes while uploading',
		};
	}

	// Cannot open if checking confirmation status
	if (isCheckingConfirmation) {
		return {
			canOpen: false,
			isReadOnly: false,
			reason: 'Checking confirmation status...',
		};
	}

	// Cannot open if no image is loaded
	if (!imageLoaded) {
		return {
			canOpen: false,
			isReadOnly: false,
			reason: 'Select an image first',
		};
	}

	// Can open, determine if read-only
	const isReadOnly = isConfirmedImage || isReadOnlyCase || isArchivedCase;

	return {
		canOpen: true,
		isReadOnly,
	};
};

/**
 * Get a user-friendly tooltip message for the Image Notes button
 *
 * This centralizes all the tooltip logic that appears in the navbar and sidebar
 *
 * @param permission NotesViewPermission object from getNotesViewPermission
 * @param additionalContext Optional context for more specific messages
 * @returns Tooltip string, or undefined if button has no specific tooltip
 */
export const getNotesButtonTooltip = (
	permission: NotesViewPermission,
	additionalContext?: {
		isReadOnlyCase?: boolean;
		isArchivedCase?: boolean;
		isConfirmedImage?: boolean;
	},
): string | undefined => {
	// If cannot open, return the reason
	if (!permission.canOpen) {
		return permission.reason;
	}

	// Can open - provide context-specific read-only messages
	if (permission.isReadOnly && additionalContext) {
		if (additionalContext.isConfirmedImage) {
			return 'Image notes: viewing only (image is confirmed)';
		}
		if (additionalContext.isReadOnlyCase) {
			return 'Image notes: viewing only (case is read-only)';
		}
		if (additionalContext.isArchivedCase) {
			return 'Image notes: viewing only (case is archived)';
		}
	}

	// No tooltip needed for normal edit mode
	return undefined;
};
