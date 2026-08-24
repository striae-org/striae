// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

/**
 * Helper function to format timestamp for filename using user's local timezone
 */
export function formatDateForFilename(date: Date): string {
	// Generate timestamp in local timezone: YYYYMMDD-HHMMSS
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
