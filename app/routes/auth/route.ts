import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { isMobileOrTabletUserAgent } from '~/utils/device-detection';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userAgent = request.headers.get('user-agent') ?? '';
	if (isMobileOrTabletUserAgent(userAgent)) {
		throw redirect('/mobile-prevented');
	}

	return null;
};

export { Login as default, meta } from './login';