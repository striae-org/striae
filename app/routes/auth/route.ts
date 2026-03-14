import { redirect } from 'react-router';

export const loader = async () => {
	throw redirect('/');
};

export { Login as default, meta } from './login';