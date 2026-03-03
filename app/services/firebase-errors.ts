import { FirebaseError } from 'firebase/app';

export const ERROR_MESSAGES = {
  // Auth Errors
  INVALID_EMAIL: 'Invalid email address',
  INVALID_PASSWORD: 'Invalid password',
  INVALID_CREDENTIALS: 'Invalid credentials',
  USER_NOT_FOUND: 'No account found with this email',
  EMAIL_IN_USE: 'An account with this email already exists',
  ACTION_RESTRICTED: 'Operation not allowed',
  PASSWORDS_MISMATCH: 'Passwords do not match',
  WEAK_PASSWORD: 'Password does not meet strength requirements',
  REQUIRES_RECENT_LOGIN: 'Please sign in again to complete this action',
  USER_DISABLED: 'This account has been disabled',
  
  // Reset/Verify Errors
  RESET_EMAIL_SENT: 'Password reset email sent! Check your inbox',
  
  // MFA Errors
  MFA_REQUIRED: 'Multi-factor authentication required',
  MFA_INVALID_CODE: 'Invalid verification code. Please check your code and try again.',
  MFA_CODE_EXPIRED: 'Verification code has expired. Please request a new code.',
  MFA_TOO_MANY_REQUESTS: 'Too many requests. Please try again later',
  MFA_INVALID_PHONE: 'Please enter a valid phone number',
  MFA_NO_VERIFICATION_ID: 'No verification ID found. Please request a new code.',
  MFA_RECAPTCHA_EXPIRED: 'reCAPTCHA expired. Please send another code.',
  MFA_RECAPTCHA_ERROR: 'reCAPTCHA needs to be reset. Please send another code.',
  MFA_CODE_REQUIRED: 'Please enter the verification code',
  
  // General
  GENERAL_ERROR: 'Something went wrong. Please contact support.',
  NO_USER: 'No user found',
  PROFILE_UPDATED: 'Profile updated successfully'
};

interface AuthErrorData {
  code: string;
  message: string;
}

export const handleAuthError = (err: unknown): { message: string; data?: AuthErrorData } => {
  if (err instanceof FirebaseError) {
    const errorData: AuthErrorData = {
      code: err.code,
      message: err.message
    };
    
    switch (err.code) {
      // Standard Auth Errors
      case 'auth/invalid-credential':
        return { message: ERROR_MESSAGES.INVALID_CREDENTIALS, data: errorData };
      case 'auth/wrong-password':
        return { message: ERROR_MESSAGES.INVALID_PASSWORD, data: errorData };
      case 'auth/user-not-found':
        return { message: ERROR_MESSAGES.USER_NOT_FOUND, data: errorData };
      case 'auth/email-already-in-use':
        return { message: ERROR_MESSAGES.EMAIL_IN_USE, data: errorData };
      case 'auth/invalid-email':
        return { message: ERROR_MESSAGES.INVALID_EMAIL, data: errorData };
      case 'auth/weak-password':
        return { message: ERROR_MESSAGES.WEAK_PASSWORD, data: errorData };
      case 'auth/requires-recent-login':
        return { message: ERROR_MESSAGES.REQUIRES_RECENT_LOGIN, data: errorData };
      case 'auth/user-disabled':
        return { message: ERROR_MESSAGES.USER_DISABLED, data: errorData };
      
      // MFA Errors
      case 'auth/multi-factor-auth-required':
        return { message: ERROR_MESSAGES.MFA_REQUIRED, data: errorData };
      case 'auth/invalid-verification-code':
        return { message: ERROR_MESSAGES.MFA_INVALID_CODE, data: errorData };
      case 'auth/code-expired':
        return { message: ERROR_MESSAGES.MFA_CODE_EXPIRED, data: errorData };
      case 'auth/too-many-requests':
        return { message: ERROR_MESSAGES.MFA_TOO_MANY_REQUESTS, data: errorData };
      
      // Operation Errors
      case 'auth/operation-not-allowed':
      case 'auth/admin-restricted-operation':
        return { message: ERROR_MESSAGES.ACTION_RESTRICTED, data: errorData };
      
      default:
        console.error('Firebase Auth Error:', errorData);
        return { message: ERROR_MESSAGES.GENERAL_ERROR, data: errorData };
    }
  }
  
  console.error('Unknown Error:', err);
  return { message: ERROR_MESSAGES.GENERAL_ERROR };
};

// Helper function to get validation error messages
export const getValidationError = (type: keyof typeof ERROR_MESSAGES): string => {
  return ERROR_MESSAGES[type];
};