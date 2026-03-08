import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { isMobileOrTabletUserAgent } from '~/utils/device-detection';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const requestUrl = new URL(request.url);
	const search = requestUrl.search ?? '';
	const userAgent = request.headers.get('user-agent') ?? '';

	if (isMobileOrTabletUserAgent(userAgent)) {
		throw redirect(`/mobile-prevented${search}`);
	}

	return null;
};

export { Login as default, meta } from './auth/login';