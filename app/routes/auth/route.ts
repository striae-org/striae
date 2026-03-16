import { redirect, type LoaderFunctionArgs } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const requestUrl = new URL(request.url);
	throw redirect(`/${requestUrl.search}`);
};

export { Login as default, meta } from './login';