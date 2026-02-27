import { baseMeta } from '~/utils/meta';
import { Turnstile } from '~/components/turnstile/turnstile';
import { verifyTurnstileToken } from '~/utils/turnstile';
import { useActionData, useNavigation, Link } from '@remix-run/react';
import { json } from '@remix-run/cloudflare';
import { BaseForm, FormField, FormButton, FormMessage } from '~/components/form';
import { escapeHtml } from '~/utils/html-sanitizer';
import styles from './support.module.css';
import Footer from '~/components/footer/footer';

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
      category?: string;
      description?: string;
      steps?: string;
      expected?: string;      
    };
}

export const meta = () => {
  return baseMeta({
    title: 'User Support - Striae',
    description:
      'Submit a support ticket for assistance with Striae',
  });
};

export async function action({ request, context }: { request: Request, context: any }) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const category = formData.get('category') as string;
  const description = formData.get('description') as string;
  const steps = formData.get('steps') as string;
  const expected = formData.get('expected') as string;
  const errors: { name?: string; email?: string; category?: string; description?: string; } = {};

  if (!name || name.length > MAX_NAME_LENGTH) {
    errors.name = 'Please enter a valid name';
  }
  if (!email || !validateEmailDomain(email)) {
    errors.email = 'Please enter a valid email address';
  }
  if (!category || category.length < 3) {
    errors.category = 'Please provide a valid category';
  }
  if (!description || description.length < 10) {
    errors.description = 'Please provide a detailed description';
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
          "name": "Striae Support Ticket",
          "email": "info@striae.org"
        },
        "to": [
          {
            "name": "Striae",
            "email": "info@striae.org"
          }
        ],
        "subject": "New Striae Support Ticket",
        "ContentType": "HTML",
        "HTMLContent": `<html><body>
          <h2>New Support Ticket</h2>
          <p><strong>Requested By:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
          <p><strong>Category:</strong> ${escapeHtml(category)}</p>
          <p><strong>Description of Issue:</strong> ${escapeHtml(description)}</p>
          <p><strong>Steps Previously Taken:</strong> ${escapeHtml(steps)}</p>
          <p><strong>Expected Results:</strong> ${escapeHtml(expected)}</p>          
        </body></html>`,
        "PlainContent": `New Striae Support Ticket:

          Requested By: ${name} (${email})
          Category: ${category}
          Description of Issue: ${description}
          Steps Previously Taken: ${steps}
          Expected Results: ${expected}`,          
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


export const Support = () => {  
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
          <h1 className="route-form-title">Contact Striae Support</h1>
          <p className="route-form-subtitle">Need help with Striae? Submit a ticket and we&apos;ll assist you.</p>
          
          {actionData?.success ? (
            <FormMessage
              type="success"
              title="Support Ticket Submitted!"
              message="Thank you for contacting support! We'll review your ticket and respond as soon as possible."
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
                error={actionData?.errors?.email && !actionData.errors.email.includes('CAPTCHA') ? actionData.errors.email : undefined}
                disabled={sending}
              />
              
              <FormField
                component="select"
                name="category"
                error={actionData?.errors?.category}
                disabled={sending}
              >
                <option value="">Select Issue Category</option>
                <option value="technical">Technical Issue</option>
                <option value="account">Account Issue</option>
                <option value="feature">Feature Request</option>
                <option value="other">Other</option>
              </FormField>
              
              <FormField
                component="textarea"
                name="description"
                placeholder="Describe what you need help with or a feature request"
                error={actionData?.errors?.description}
                disabled={sending}
              />
              
              <FormField
                component="textarea"
                name="steps"
                placeholder="What have you tried so far? (Optional)"
                disabled={sending}
              />
              
              <FormField
                component="textarea"
                name="expected"
                placeholder="What are you trying to accomplish? (Optional)"
                disabled={sending}
              />
              
              <Turnstile
                className="route-turnstile"
              />
              
              {actionData?.errors?.email && actionData.errors.email.includes('CAPTCHA') && (
                <p className="route-captcha-error">{actionData.errors.email}</p>
              )}
              
              <FormButton
                type="submit"
                isLoading={sending}
                loadingText="Submitting..."
              >
                Submit Support Ticket
              </FormButton>
            </BaseForm>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}