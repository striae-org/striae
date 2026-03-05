import { useSearchParams } from '@remix-run/react';
import { EmailActionHandler } from '~/routes/auth/emailActionHandler';
import { baseMeta } from '~/utils/meta';

export const meta = () => {
  return baseMeta({
    title: 'Striae Account Action',
    description: 'Complete account verification and password reset actions.',
  });
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
