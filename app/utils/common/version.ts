// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import packageJson from '../../../package.json';

export const getAppVersion = () => {
	return packageJson.version;
};
