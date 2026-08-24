// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { createContext } from 'react';
import type { User } from 'firebase/auth';

interface AuthContextType {
	user: User | null;
	setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
	user: null,
	setUser: () => {},
});
