import { useState } from 'react';
import { baseMeta } from '~/utils/meta';
import { Turnstile } from '~/components/turnstile/turnstile';
import { Notice } from '~/components/notice/notice';
import NoticeText from './NoticeText';
import freeEmailDomains from 'free-email-domains';
import { verifyTurnstileToken } from '~/utils/turnstile';
import { useActionData, useNavigation, Link } from '@remix-run/react';
import { json } from '@remix-run/cloudflare';
import { BaseForm, FormField, FormButton, FormMessage, FormToggle } from '~/components/form';
import { escapeHtml } from '~/utils/html-sanitizer';
import styles from './signup.module.css';

const MAX_NAME_LENGTH = 128;

interface ActionData {
    success?: boolean;
    message?: string;
    errors?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      company?: string;
      agencyDomain?: string;
      emailConsent?: string;
      agencyConsent?: string;
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

  // Agency domain validation
  const validateAgencyDomain = (domain: string): boolean => {
    // Domain should start with @ and have valid format
    const domainRegex = /^@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  };

  // Check if email matches agency domain
  const emailMatchesDomain = (email: string, agencyDomain: string): boolean => {
    const emailDomain = email.toLowerCase().split('@')[1];
    const expectedDomain = agencyDomain.toLowerCase().substring(1); // Remove @ prefix
    return emailDomain === expectedDomain;
  };

export const meta = () => {
  return baseMeta({
    title: 'Register Agency for Striae Access',
    description:
      'Complete the form to register your agency for Striae access.',
  });
};

export async function action({ request, context }: { request: Request, context: any }) {
  const formData = await request.formData();
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const company = formData.get('company') as string;
  const agencyDomain = formData.get('agencyDomain') as string;
  const emailConsent = formData.get('emailConsent') === 'on';
  const agencyConsent = formData.get('agencyConsent') === 'on';
  const errors: { firstName?: string; lastName?: string; email?: string; company?: string; agencyDomain?: string; emailConsent?: string; agencyConsent?: string; } = {};

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

  if (!agencyDomain || !validateAgencyDomain(agencyDomain)) {
    errors.agencyDomain = 'Please enter a valid agency domain (e.g., @agency.gov)';
  }

  if (email && agencyDomain && !errors.email && !errors.agencyDomain && !emailMatchesDomain(email, agencyDomain)) {
    errors.email = 'Email address must match the agency domain';
  }

  if (!emailConsent) {
    errors.emailConsent = 'You must agree to receive email communications';
  }

  if (!agencyConsent) {
    errors.agencyConsent = 'You must confirm that you represent this agency';
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
          "name": "Striae Agency Registration",
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
        "subject": "Striae Agency Registration Request",
        "ContentType": "HTML",
        "HTMLContent": `<html><body>
          <h2>New Striae Agency Registration Request</h2>
          <p><strong>Representative Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Agency Name:</strong> ${escapeHtml(company)}</p>
          <p><strong>Agency Domain:</strong> ${escapeHtml(agencyDomain)}</p>
          <p><strong>Email Consent:</strong> ${emailConsent}</p>
          <p><strong>Agency Representation Confirmed:</strong> ${agencyConsent}</p>
          
          <hr style="margin: 20px 0; border: 1px solid #ccc;">
          
          <h3>Agency Registration Request Received</h3>
          <p>Your agency registration request has been received and is being processed. Once approved, all users with email addresses from the ${escapeHtml(agencyDomain)} domain will be able to access Striae. You will receive an email notification once your agency domain has been added to the access list.</p>
                             
          <p><strong>Important:</strong> After approval, users from your agency will require a one-time access code that will be emailed to them to access the login screen. This code will be valid for one month from the date of issuance.</p>
          
          <p>Thank you for your interest in registering your agency with Striae!</p>
        </body></html>`,
        "PlainContent": `Striae Agency Registration Request:

        Representative Name: ${firstName} ${lastName}
        Email: ${email}
        Agency Name: ${company}
        Agency Domain: ${agencyDomain}
        Email Consent: ${emailConsent}
        Agency Representation Confirmed: ${agencyConsent}
        
        ==========================================
        
        Agency Registration Request Received

        Your agency registration request has been received and is being processed. Once approved, all users with email addresses from the ${agencyDomain} domain will be able to access Striae. You will receive an email notification once your agency domain has been added to the access list.
       
        Important: After approval, users from your agency will require a one-time access code that will be emailed to them to access the login screen. This code will be valid for one month from the date of issuance.
        
        Thank you for your interest in registering your agency with Striae!`,
        "Tags": [
          "agency-registration"
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
      message: 'Your agency registration has been submitted successfully! Please look for a confirmation email once your agency has been registered for access.'
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
    title: 'Before You Register',
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
        <h1 className="route-form-title">Register Agency for Striae Access</h1>
         <button 
          type="button"
          onClick={() => setIsNoticeOpen(true)}
          className={styles.noticeButton}
        >
          Read before registering
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
            placeholder="Email Address (must match agency domain)"
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
            component="input"
            type="text"
            name="agencyDomain"
            placeholder="Agency Domain (e.g., @agency.gov)"
            error={actionData?.errors?.agencyDomain}
            disabled={sending}
          />
          
          <FormToggle
            name="emailConsent"
            label="I agree to receive emails from striae.org"
            required
            disabled={sending}
          />

          <FormToggle
            name="agencyConsent"
            label="I warrant that I represent this agency and want to register my agency's domain for Striae access"
            required
            disabled={sending}
            error={actionData?.errors?.agencyConsent}
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
            {!hasReadNotice ? 'Please read the notice first' : 'Register Agency'}
          </FormButton>
        </BaseForm>
      )}
      </div>
    </div>
  );
}