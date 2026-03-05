import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useSearchParams } from '@remix-run/react';
import { EmailActionHandler } from '~/routes/auth/emailActionHandler';
import { isMobileOrTabletUserAgent } from '~/utils/device-detection';
import { baseMeta } from '~/utils/meta';

export const meta = () => {
  return baseMeta({
    title: 'Striae Account Action',
    description: 'Complete account verification and password reset actions.',
  });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userAgent = request.headers.get('user-agent') ?? '';
  if (isMobileOrTabletUserAgent(userAgent)) {
    throw redirect('/mobile-prevented');
  }

  return null;
};

export default function AuthActionRoute() {
  const [searchParams] = useSearchParams();

  return (
    <EmailActionHandler
      mode={searchParams.get('mode')}
      oobCode={searchParams.get('oobCode')}
      continueUrl={searchParams.get('continueUrl')}
      lang={searchParams.get('lang')}
    />
  );
}
