import { baseMeta } from '~/utils/meta';
import { Turnstile } from '~/components/turnstile/turnstile';
import { verifyTurnstileToken } from '~/utils/turnstile';
import { Form, useActionData, useNavigation, Link } from '@remix-run/react';
import { json } from '@remix-run/cloudflare';
import freeEmailDomains from 'free-email-domains';
import styles from './demo.module.css';

const MAX_EMAIL_LENGTH = 512;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ActionData {
    success?: boolean;
    errors?: {
      email?: string;
    };
}

export const meta = () => {
  return baseMeta({
    title: 'Access the Striae Demo Account',
    description:
      'Complete the form to access the Striae demo account.',
  });
};

export async function action({ request, context }: { request: Request, context: any }) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const errors: { email?: string; } = {};

  if (!email || !EMAIL_PATTERN.test(email) || email.length > MAX_EMAIL_LENGTH) {
    errors.email = 'Please enter a valid work email address';
  } else {    
    const emailDomain = email.toLowerCase().split('@')[1];
    if (freeEmailDomains.includes(emailDomain)) {
      errors.email = 'Please use a work email address. Personal email providers (Gmail, Yahoo, etc.) are not allowed';
    }
  }

  if (Object.keys(errors).length > 0) {
    return json<ActionData>({ errors }, { status: 400 });
  }

  try {
    const token = formData.get('cf-turnstile-response') as string;
    const verificationResult = await verifyTurnstileToken(token);
    
    if ('success' in verificationResult && !verificationResult.success) {
      return json<ActionData>(
        { errors: { email: 'CAPTCHA verification failed. Please try again.' } },
        { status: 400 }
      );
    }

    const response = await fetch('https://console.sendlayer.com/api/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.cloudflare.env.SL_API_KEY}`,
      },
      body: JSON.stringify({
        "from": {
          "name": "Striae Demo Access",
          "email": "no-reply@striae.org"
        },
        "to": [          
          {
            "name": "Striae Demo User",
            "email": email
          }
        ],        
        "subject": "Striae Demo Access",
        "ContentType": "HTML",
        "HTMLContent": `<html><body>
          <h2>Striae Demo Access Credentials</h2>
          <p><strong>Email:</strong> ${context.cloudflare.env.DEMO_EMAIL}</p>
          <p><strong>Password:</strong> ${context.cloudflare.env.DEMO_PASS}</p>
          <p><strong>MFA Code:</strong> ${context.cloudflare.env.DEMO_MFA}</p>
        </body></html>`,
        "PlainContent": `Striae Demo Access Credentials:

        Email: ${context.cloudflare.env.DEMO_EMAIL}
        Access Password: ${context.cloudflare.env.DEMO_PASS}
        MFA Code: ${context.cloudflare.env.DEMO_MFA}`,
        "Tags": [
          "striae-demo-access"
        ],
        "Headers": {
          "X-Mailer": "striae.org"
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return json<ActionData>({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return json({ errors: { email: 'Failed to submit. Please try again.' } }, { status: 500 });
  }
}

export const Demo = () => {  
  const actionData = useActionData<ActionData>();
  const { state } = useNavigation();
  const sending = state === 'submitting';

  return (
    <div className={styles.container}>
      <Link 
        viewTransition
        prefetch="intent"
        to="/" 
        className={styles.logoLink}>
        <div className={styles.logo} />
      </Link>      
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Access the Striae Demo Account</h1>
        {actionData?.success ? (
          <div className={styles.successMessage}>
            <p>The demo account credentials have been sent to your email!</p>
          </div>
        ) : (            
        <Form method="post" className={styles.form}>
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            autoComplete="email"
            className={styles.input}            
            disabled={sending}
          />
          {actionData?.errors?.email && (
            <p className={styles.error}>{actionData.errors.email}</p>
          )}

          <Turnstile
            className={styles.turnstile}
            theme="light"
          />
          <button 
          type="submit"                     
          className={styles.button}          
          disabled={sending}          
        >
          {sending ? 'Submitting...' : 'Access Demo'}
        </button>
        </Form>
        )}
      </div>
    </div>
  );
}