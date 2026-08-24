// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { redirect, type LoaderFunctionArgs } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const requestUrl = new URL(request.url);
	throw redirect(`/${requestUrl.search}`);
};

export { Login as default } from './login';
