import { redirect } from '@remix-run/cloudflare';

export const loader = async () => {
	throw redirect('/');
};

export { Login as default, meta } from './login';