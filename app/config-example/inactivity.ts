// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

export const INACTIVITY_CONFIG = {
	TIMEOUT_MINUTES: 30,
	WARNING_MINUTES: 5,
	TRACKED_ACTIVITIES: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown'] as const,
};
