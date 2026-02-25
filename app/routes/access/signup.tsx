import { useState } from 'react';
import { baseMeta } from '~/utils/meta';
import { Turnstile } from '~/components/turnstile/turnstile';
import { Notice } from '~/components/notice/notice';
import NoticeText from './NoticeText';
import freeEmailDomains from 'free-email-domains';
import { verifyTurnstileToken } from '~/utils/turnstile';
import { useActionData, useNavigation, Link } from '@remix-run/react';
import { json } from '@remix-run/cloudflare';
import { BaseForm, FormField, FormButton, FormMessage } from '~/components/form';
import { escapeHtml } from '~/utils/html-sanitizer';
import styles from './signup.module.css';

const MAX_NAME_LENGTH = 128;
const MAX_COMMENTS_LENGTH = 5000;

interface ActionData {
    success?: boolean;
    message?: string;
    errors?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      company?: string;
      comments?: string;
    };
}

// Email validation with regex and domain checking
  const validateEmailDomain = (email: string): boolean => {
    // Email regex pattern for basic validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // First check if email format is valid
    if (!emailRegex.test(email)) {
      return false;
    }
    
    const emailDomain = email.toLowerCase().split('@')[1];
    return !!emailDomain && !freeEmailDomains.includes(emailDomain);
  };

export const meta = () => {
  return baseMeta({
    title: 'Apply for Striae Deployment',
    description:
      'Complete the form to apply for Striae deployment.',
  });
};

export async function action({ request, context }: { request: Request, context: any }) {
  const formData = await request.formData();
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const company = formData.get('company') as string;
  const comments = (formData.get('comments') as string | null)?.trim() || '';
  const errors: { firstName?: string; lastName?: string; email?: string; company?: string; comments?: string; } = {};

  if (!firstName || firstName.length > MAX_NAME_LENGTH) {
    errors.firstName = 'Please enter your first name';
  }

  if (!lastName || lastName.length > MAX_NAME_LENGTH) {
    errors.lastName = 'Please enter your last name';
  }

  if (!email || !validateEmailDomain(email)) {
    errors.email = 'Please use a work email address. Personal email providers (Gmail, Yahoo, etc.) are not allowed';
  }

  if (!company || company.length > MAX_NAME_LENGTH) {
    errors.company = 'Please enter your agency name';
  }

  if (comments.length > MAX_COMMENTS_LENGTH) {
    errors.comments = `Please keep comments under ${MAX_COMMENTS_LENGTH} characters`;
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
          "name": "Striae Deployment Application",
          "email": "info@striae.org"
        },
        "to": [          
          {
            "name": `${firstName} ${lastName}`,
            "email": email
          }
        ],
        "cc": [
          {
            "name": "Striae Admin",
            "email": "info@striae.org"
          }
        ],
        "subject": "Striae Deployment Application Request",
        "ContentType": "HTML",
        "HTMLContent": `<html><body>
          <h2>New Striae Deployment Application</h2>
          <p><strong>Representative Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Agency Name:</strong> ${escapeHtml(company)}</p>
          <p><strong>Comments / Questions / Customization Requests:</strong><br />${escapeHtml(comments) || 'None provided'}</p>
          
          <hr style="margin: 20px 0; border: 1px solid #ccc;">
          
          <h3>Deployment Application Received</h3>
          <p>Your deployment application has been received and is being processed. The Striae team will follow up with next steps.</p>
          
          <p>Thank you for your interest in deploying Striae!</p>
        </body></html>`,
        "PlainContent": `Striae Deployment Application Request:

        Representative Name: ${firstName} ${lastName}
        Email: ${email}
        Agency Name: ${company}
        Comments / Questions / Customization Requests: ${comments || 'None provided'}
        
        ==========================================
        
        Deployment Application Received

        Your deployment application has been received and is being processed. The Striae team will follow up with next steps.
        
        Thank you for your interest in deploying Striae!`,
        "Tags": [
          "deployment-application"
        ],
        "Headers": {
          "X-Mailer": "striae.org"
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return json<ActionData>({
      success: true,
      message: 'Your deployment application has been submitted successfully! Please look for a confirmation email from the Striae team.'
    });
  } catch (error) {
    console.error('Error:', error);
    return json({ errors: { email: 'Failed to submit. Please try again.' } }, { status: 500 });
  }
}


export const Signup = () => {
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [hasReadNotice, setHasReadNotice] = useState(false);
  const actionData = useActionData<ActionData>();
  const { state } = useNavigation();
  const sending = state === 'submitting';

  const handleNoticeClose = () => {
    setHasReadNotice(true);
    setIsNoticeOpen(false);
  };

  const signupNotice = {
    title: 'Before You Apply',
    content: <NoticeText />,
    buttonText: 'I Have Read and Understand'
  };

  return (
    <div id="top" className={`route-centered-container ${styles.container}`}>
      <Link 
        to="/#top"
        viewTransition
        className="route-brand-logo-link">
          <div className={`route-brand-logo ${styles.logo}`} />
      </Link>
      <Link
        viewTransition
        prefetch="intent"
        to="/#top"
        className={`route-brand-return-link ${styles.returnLink}`}
        aria-label="Return to Striae"
      />
      <div className={`route-form-wrapper ${styles.formWrapper}`}>
        <h1 className="route-form-title">Apply for Striae Deployment</h1>
         <button 
          type="button"
          onClick={() => setIsNoticeOpen(true)}
          className={styles.noticeButton}
        >
          Read before applying
        </button>
        <Notice 
        isOpen={isNoticeOpen} 
        onClose={handleNoticeClose}
        notice={signupNotice}
      />
      {actionData?.success ? (
        <FormMessage
          type="success"
          title="Registration Submitted!"
          message={actionData.message || 'Your agency registration has been submitted successfully!'}
        />
      ) : (
        <BaseForm>
          <FormField
            component="input"
            type="text"
            name="firstName"
            placeholder="First Name"
            autoComplete="given-name"
            error={actionData?.errors?.firstName}
            disabled={sending}
          />
          
          <FormField
            component="input"
            type="text"
            name="lastName"
            placeholder="Last Name"
            autoComplete="family-name"
            error={actionData?.errors?.lastName}
            disabled={sending}
          />
          
          <FormField
            component="input"
            type="email"
            name="email"
            placeholder="Work Email Address"
            autoComplete="email"
            error={actionData?.errors?.email && !actionData.errors.email.includes('CAPTCHA') ? actionData.errors.email : undefined}
            disabled={sending}
          />
          
          <FormField
            component="input"
            type="text"
            name="company"
            placeholder="Agency Name"
            autoComplete="organization"
            error={actionData?.errors?.company}
            disabled={sending}
          />
          
          <FormField
            component="textarea"
            name="comments"            
            placeholder="Tell us about your deployment needs, questions, or any custom requirements."
            maxLength={MAX_COMMENTS_LENGTH}
            error={actionData?.errors?.comments}
            disabled={sending}
          />

          <Turnstile
            className="route-turnstile"
            theme="light"
          />
          
          {actionData?.errors?.email && actionData.errors.email.includes('CAPTCHA') && (
            <p className="route-captcha-error">{actionData.errors.email}</p>
          )}
          
          <FormButton
            type="submit"
            isLoading={sending}
            loadingText="Submitting..."
            disabled={!hasReadNotice}
            title={!hasReadNotice ? 'Please read the notice first' : undefined}
          >
            {!hasReadNotice ? 'Please read the notice first' : 'Submit Application'}
          </FormButton>
        </BaseForm>
      )}
      </div>
    </div>
  );
}