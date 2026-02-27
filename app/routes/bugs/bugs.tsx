import { baseMeta } from '~/utils/meta';
import { Turnstile } from '~/components/turnstile/turnstile';
import { verifyTurnstileToken } from '~/utils/turnstile';
import { useActionData, useNavigation, Link } from '@remix-run/react';
import { json } from '@remix-run/cloudflare';
import { BaseForm, FormField, FormMessage, FormButton } from '~/components/form';
import { escapeHtml } from '~/utils/html-sanitizer';
import Footer from '~/components/footer/footer';
import styles from './bugs.module.css';

const MAX_NAME_LENGTH = 128;

// Email validation with regex
const validateEmailDomain = (email: string): boolean => {
  // Email regex pattern for basic validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // First check if email format is valid
  if (!emailRegex.test(email)) {
    return false;
  }
  
  return true;
};

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
  if (!email || !validateEmailDomain(email)) {
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
          "email": "info@striae.org"
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
          <p><strong>Reported By:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
          <p><strong>Description:</strong> ${escapeHtml(description)}</p>
          <p><strong>Steps to Reproduce:</strong> ${escapeHtml(steps)}</p>
          <p><strong>Expected Behavior:</strong> ${escapeHtml(expected)}</p>
          <p><strong>Actual Behavior:</strong> ${escapeHtml(actual)}</p>
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
    <>
      <div id="top" className={`route-centered-container ${styles.container}`}>
        <Link 
          viewTransition
          prefetch="intent"
          to="/" 
          className="route-brand-logo-link">
          <div className={`route-brand-logo ${styles.logo}`} />
        </Link>
        <Link
          viewTransition
          prefetch="intent"
          to="/"
          className={`route-brand-return-link ${styles.returnLink}`}
          aria-label="Return to Striae"
        />
        <div className={`route-form-wrapper ${styles.formWrapper}`}>
          <h1 className="route-form-title">Report a Bug</h1>
          <p className="route-form-subtitle">Help us improve Striae by reporting issues you encounter
            <br />
            To avoid redundancy, please check the <a href="https://github.com/striae-org/striae/issues" target="_blank" rel="noopener noreferrer">current list of issues</a> first
          </p>

          {actionData?.success ? (
            <FormMessage 
              type="success"
              title="Bug Report Submitted!"
              message="Thank you for your report! We'll investigate and get back to you if we need more information."
            />
          ) : (
          <BaseForm>
            <FormField
              component="input"
              type="text"
              name="name"
              placeholder="Your Name"
              autoComplete="name"
              error={actionData?.errors?.name}
              disabled={sending}
            />
            
            <FormField
              component="input"
              type="email"
              name="email"
              placeholder="Your Email"
              autoComplete="email"
              error={actionData?.errors?.email}
              disabled={sending}
            />
            
            <FormField
              component="textarea"
              name="description"
              placeholder="Describe the bug in detail"
              error={actionData?.errors?.description}
              disabled={sending}
            />
            
            <FormField
              component="textarea"
              name="steps"
              placeholder="Steps to reproduce the bug"
              error={actionData?.errors?.steps}
              disabled={sending}
            />
            
            <FormField
              component="textarea"
              name="expected"
              placeholder="What did you expect to happen?"
              error={actionData?.errors?.expected}
              disabled={sending}
            />
            
            <FormField
              component="textarea"
              name="actual"
              placeholder="What actually happened?"
              error={actionData?.errors?.actual}
              disabled={sending}
            />
            
            <Turnstile className="route-turnstile" />
            
            <FormButton 
              type="submit"
              isLoading={sending}
              loadingText="Submitting..."
            >
              Submit Bug Report
            </FormButton>
          </BaseForm>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}