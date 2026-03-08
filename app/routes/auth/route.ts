import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const requestUrl = new URL(request.url);
	const search = requestUrl.search ?? '';
	throw redirect(`/${search}`);
};

export { Login as default, meta } from './login';