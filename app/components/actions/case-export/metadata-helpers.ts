import type { User } from 'firebase/auth';
import { getUserData } from '~/utils/data';

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
				exportedByCompany: userData.company,
				...(userData.badgeId ? { exportedByBadgeId: userData.badgeId } : {}),
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
		exportedByCompany: 'N/A',
	};
}

/**
 * Add data protection warning to content
 */
export function addForensicDataWarning(content: string): string {
	const warning = `/* CASE DATA WARNING
 * This file contains evidence data for forensic examination.
 * Any modification may compromise the integrity of the evidence.
 * Handle according to your organization's chain of custody procedures.
 * 
 * File generated: ${new Date().toISOString()}
 */\n\n`;

	return warning + content;
}
