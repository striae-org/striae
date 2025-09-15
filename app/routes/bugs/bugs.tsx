/* eslint-disable @typescript-eslint/no-explicit-any */
import { baseMeta } from '~/utils/meta';
import { Turnstile } from '~/components/turnstile/turnstile';
import { verifyTurnstileToken } from '~/utils/turnstile';
import { Form, useActionData, useNavigation, Link } from '@remix-run/react';
import { json } from '@remix-run/cloudflare';
import styles from './bugs.module.css';

const MAX_NAME_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ActionData {
    success?: boolean;
    errors?: {
      name?: string;
      email?: string;
      description?: string;
      steps?: string;
      expected?: string;
      actual?: string;
    };
}

export const meta = () => {
  return baseMeta({
    title: 'Submit a Bug Report - Striae',
    description:
      'Report an issue or bug you encountered while using Striae',
  });
};

export async function action({ request, context }: { request: Request, context: any }) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const description = formData.get('description') as string;
  const steps = formData.get('steps') as string;
  const expected = formData.get('expected') as string;
  const actual = formData.get('actual') as string;
  const errors: { name?: string; email?: string; description?: string; steps?: string; expected?: string; actual?: string; } = {};

  
  if (!name || name.length > MAX_NAME_LENGTH) {
    errors.name = 'Please enter a valid name';
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Please enter a valid email address';
  }
  if (!description || description.length < 10) {
    errors.description = 'Please provide a detailed description';
  }
  if (!steps || steps.length < 10) {
    errors.steps = 'Please provide detailed steps to reproduce the issue';
  }
  if (!expected || expected.length < 10) {
    errors.expected = 'Please provide the expected behavior';
  }
  if (!actual || actual.length < 10) {
    errors.actual = 'Please provide the actual behavior';
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
          "name": "Striae Bug Report",
          "email": "no-reply@striae.org"
        },
        "to": [
          {
            "name": "Striae",
            "email": "info@striae.org"
          }
        ],
        "subject": "New Striae Bug Report",
        "ContentType": "HTML",
        "HTMLContent": `<html><body>
          <h2>New Striae Bug Report</h2>
          <p><strong>Reported By:</strong> ${name} (${email})</p>
          <p><strong>Description:</strong> ${description}</p>
          <p><strong>Steps to Reproduce:</strong> ${steps}</p>
          <p><strong>Expected Behavior:</strong> ${expected}</p>
          <p><strong>Actual Behavior:</strong> ${actual}</p>
        </body></html>`,
        "PlainContent": `New Striae Bug Report:

          Reported By: ${name} (${email})
          Description: ${description}
          Steps to Reproduce: ${steps}
          Expected Behavior: ${expected}
          Actual Behavior: ${actual}`,
        "Tags": [
          "bug-report"          
        ],
        "Headers": {
          "X-Mailer": "striae.org"          
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return json({ errors: { email: 'Failed to submit. Please try again.' } }, { status: 500 });
  }
}


export const Bugs = () => {  
  const actionData = useActionData<ActionData>();
  const { state } = useNavigation();
  const sending = state === 'submitting';    

  return (
    <div id="top" className={styles.container}>
      <Link 
        viewTransition
        prefetch="intent"
        to="/#top" 
        className={styles.logoLink}>
        <div className={styles.logo} />
      </Link>      
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Report a Bug</h1>
        <p className={styles.subtitle}>Help us improve Striae by reporting issues you encounter
          <br />
          To avoid redundancy, please check the <a href="https://github.com/striae-org/striae/issues" target="_blank" rel="noopener noreferrer">current list of issues</a> first
        </p>

        <Form method="post" className={styles.form}>
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            autoComplete="name"
            className={styles.input}            
          />
          {actionData?.errors?.name && (
            <p className={styles.error}>{actionData.errors.name}</p>
          )}          
          <input
            type="email"
            name="email"
            placeholder="Your Email"
            autoComplete="email"
            className={styles.input}          
          />          
          {actionData?.errors?.email && (
            <p className={styles.error}>{actionData.errors.email}</p>
          )}
          <textarea
            name="description"
            placeholder="Describe the bug in detail"
            className={styles.textarea}            
          />
          {actionData?.errors?.description && (
            <p className={styles.error}>{actionData.errors.description}</p>
          )}
          <textarea
            name="steps"
            placeholder="Steps to reproduce the bug"
            className={styles.textarea}            
          />
          {actionData?.errors?.steps && (
            <p className={styles.error}>{actionData.errors.steps}</p>
          )}
          <textarea
            name="expected"
            placeholder="What did you expect to happen?"
            className={styles.textarea}            
          />
          {actionData?.errors?.expected && (
            <p className={styles.error}>{actionData.errors.expected}</p>
          )}
          <textarea
            name="actual"
            placeholder="What actually happened?"
            className={styles.textarea}            
          />
          {actionData?.errors?.actual && (
            <p className={styles.error}>{actionData.errors.actual}</p>
          )}
          <Turnstile
            className={styles.turnstile}            
          />
          
          <button 
            type="submit" 
            className={styles.button}
            disabled={sending}
          >
            {sending ? 'Submitting...' : 'Submit Bug Report'}
          </button>
        </Form>
        
        {actionData?.success && (
          <div className={styles.success}>
            <p>Thank you for your report!</p>
            <p>We&apos;ll investigate and get back to you if we need more information.</p>
          </div>
        )}
      </div>
    </div>
  );
}