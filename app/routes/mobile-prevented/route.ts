import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';

export const loader = async (_args: LoaderFunctionArgs) => {
  throw redirect('/');
};

export default function MobilePreventedRouteRedirect() {
  return null;
}
