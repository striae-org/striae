# Error Handling Guide

## Overview

This guide provides comprehensive documentation for error handling in the Striae application, covering patterns, services, best practices, and implementation details for both frontend and backend error management.

## Table of Contents

1. [Error Handling Philosophy](#error-handling-philosophy)
2. [Centralized Error Service](#centralized-error-service)
3. [Frontend Error Patterns](#frontend-error-patterns)
4. [Backend Error Handling](#backend-error-handling)
5. [UI Error Display](#ui-error-display)
6. [Firebase Error Handling](#firebase-error-handling)
7. [Best Practices](#best-practices)
8. [Testing Error Scenarios](#testing-error-scenarios)

## Error Handling Philosophy

Striae follows a user-centric error handling approach that prioritizes:

- **User Experience**: Clear, actionable error messages that help users resolve issues
- **Consistency**: Standardized error messages and display patterns across the application
- **Centralization**: Single source of truth for error messages and handling logic
- **Graceful Degradation**: The application should remain functional even when errors occur
- **Debugging Support**: Detailed error information for developers while maintaining user-friendly messages

## Centralized Error Service

### Firebase Errors Service

The primary error handling service is located at `app/services/firebase-errors.ts` and provides:

#### Error Message Constants

```typescript
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
  MFA_RECAPTCHA_EXPIRED: 'reCAPTCHA expired. Please try again.',
  MFA_RECAPTCHA_ERROR: 'reCAPTCHA not initialized. Please refresh and try again.',
  MFA_CODE_REQUIRED: 'Please enter the verification code',
  
  // General
  GENERAL_ERROR: 'Something went wrong. Please contact support.',
  NO_USER: 'No user found',
  PROFILE_UPDATED: 'Profile updated successfully'
};
```

#### Error Handling Function

```typescript
export const handleAuthError = (err: unknown): { message: string; data?: AuthErrorData } => {
  if (err instanceof FirebaseError) {
    // Maps Firebase error codes to user-friendly messages
    switch (err.code) {
      case 'auth/invalid-credential':
        return { message: ERROR_MESSAGES.INVALID_CREDENTIALS, data: errorData };
      // ... other cases
    }
  }
  return { message: ERROR_MESSAGES.GENERAL_ERROR };
};
```

#### Validation Helper

```typescript
export const getValidationError = (type: keyof typeof ERROR_MESSAGES): string => {
  return ERROR_MESSAGES[type];
};
```

### Usage Examples

```typescript
import { handleAuthError, getValidationError } from '~/services/firebase-errors';

// Firebase error handling
try {
  await signInWithEmailAndPassword(auth, email, password);
} catch (error) {
  const errorMessage = handleAuthError(error).message;
  setErrorMessage(errorMessage);
}

// Validation error handling
if (!email.trim()) {
  const error = getValidationError('INVALID_EMAIL');
  setErrorMessage(error);
}
```

## Frontend Error Patterns

### Component-Level Error State

Components should maintain local error state for immediate user feedback:

```typescript
const [errorMessage, setErrorMessage] = useState('');

// Display errors in UI
{errorMessage && (
  <div className={styles.errorMessage}>
    {errorMessage}
  </div>
)}
```

### Error Clearing Patterns

Errors should automatically clear when users take corrective actions:

```typescript
// Clear errors on input change
<input
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    if (errorMessage) setErrorMessage(''); // Clear error
  }}
/>

// Clear errors on form reset
const resetForm = () => {
  setEmail('');
  setPassword('');
  setErrorMessage(''); // Clear errors
};
```

### Async Error Handling

```typescript
const handleSubmit = async () => {
  setLoading(true);
  setErrorMessage(''); // Clear previous errors
  
  try {
    await performAsyncOperation();
    // Success handling
  } catch (error) {
    const errorMsg = handleAuthError(error).message;
    setErrorMessage(errorMsg);
    onError(errorMsg); // Also notify parent component
  } finally {
    setLoading(false);
  }
};
```

## Backend Error Handling

### Cloudflare Workers Error Patterns

```typescript
// Standard error response format
interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

// Error handling in workers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Main logic
      return new Response(JSON.stringify({ success: true, data }));
    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          code: 'WORKER_ERROR'
        } as ErrorResponse),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};
```

### API Error Response Standards

```typescript
// Success response
{
  "success": true,
  "data": { /* response data */ }
}

// Error response
{
  "error": "User-friendly error message",
  "code": "ERROR_CODE",
  "details": { /* additional error context */ }
}
```

## UI Error Display

### Error Message Styling

Standard error styling using CSS modules:

```css
.errorMessage {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  text-align: left;
  line-height: 1.4;
}

.errorMessage:empty {
  display: none;
}
```

### Error Display Patterns

#### Modal Error Display

```typescript
// In modal components (MFA, auth modals)
<div className={styles.modal}>
  <h2>Modal Title</h2>
  
  {errorMessage && (
    <div className={styles.errorMessage}>
      {errorMessage}
    </div>
  )}
  
  {/* Modal content */}
</div>
```

#### Form Error Display

```typescript
// Inline form errors
<div className={styles.formGroup}>
  <input
    type="email"
    value={email}
    onChange={handleEmailChange}
    className={errorMessage ? styles.inputError : styles.input}
  />
  {errorMessage && (
    <div className={styles.fieldError}>
      {errorMessage}
    </div>
  )}
</div>
```

#### Toast/Notification Errors

```typescript
// For global errors or success messages
import { toast } from '~/components/toast';

try {
  await saveData();
  toast.success('Data saved successfully');
} catch (error) {
  toast.error(handleAuthError(error).message);
}
```

## Firebase Error Handling

### Authentication Errors

Common Firebase auth error codes and their handling:

```typescript
// MFA enrollment/verification
case 'auth/invalid-verification-code':
  return { message: ERROR_MESSAGES.MFA_INVALID_CODE };

case 'auth/code-expired':
  return { message: ERROR_MESSAGES.MFA_CODE_EXPIRED };

case 'auth/too-many-requests':
  return { message: ERROR_MESSAGES.MFA_TOO_MANY_REQUESTS };

// Standard auth errors
case 'auth/user-not-found':
  return { message: ERROR_MESSAGES.USER_NOT_FOUND };

case 'auth/wrong-password':
  return { message: ERROR_MESSAGES.INVALID_PASSWORD };
```

### MFA-Specific Error Handling

```typescript
// In MFA components
const enrollMFA = async () => {
  try {
    await multiFactor(user).enroll(assertion, displayName);
    onSuccess();
  } catch (error) {
    const authError = error as { code?: string; message?: string };
    
    if (authError.code === 'auth/invalid-verification-code') {
      setErrorMessage(getValidationError('MFA_INVALID_CODE'));
    } else if (authError.code === 'auth/code-expired') {
      setErrorMessage(getValidationError('MFA_CODE_EXPIRED'));
      setCodeSent(false); // Reset UI state
    } else {
      setErrorMessage(handleAuthError(authError).message);
    }
  }
};
```

### ReCAPTCHA Error Handling

```typescript
const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  size: 'invisible',
  callback: () => {
    // Success callback
  },
  'expired-callback': () => {
    const error = getValidationError('MFA_RECAPTCHA_EXPIRED');
    setErrorMessage(error);
    onError(error);
  }
});
```

## Best Practices

### 1. User-Centric Messages

❌ **Don't:**

```typescript
setErrorMessage('Firebase: Error (auth/invalid-email)');
```

✅ **Do:**

```typescript
setErrorMessage(getValidationError('INVALID_EMAIL')); // "Invalid email address"
```

### 2. Provide Actionable Guidance

❌ **Don't:**

```typescript
'Code expired'
```

✅ **Do:**

```typescript
'Verification code has expired. Please request a new code.'
```

### 3. Clear Errors Appropriately

```typescript
// Clear errors when user takes corrective action
const handleInputChange = (value: string) => {
  setValue(value);
  if (errorMessage) setErrorMessage(''); // Clear on input
};

// Clear errors when starting new operations
const handleSubmit = async () => {
  setErrorMessage(''); // Clear previous errors
  // ... submit logic
};
```

### 4. Consistent Error Display

- Always use the same CSS classes for error styling
- Position errors consistently (usually above form controls)
- Use the same auto-hiding behavior (`errorMessage:empty { display: none; }`)

### 5. Graceful Degradation

```typescript
// Provide fallback behavior when errors occur
try {
  const data = await fetchUserData();
  setUserData(data);
} catch (error) {
  setErrorMessage(handleError(error).message);
  // Continue with cached data or default state
  setUserData(getDefaultUserData());
}
```

### 6. Development vs Production Errors

```typescript
export const handleAuthError = (err: unknown) => {
  if (err instanceof FirebaseError) {
    // Log detailed error for developers
    console.error('Firebase Auth Error:', {
      code: err.code,
      message: err.message,
      stack: err.stack
    });
    
    // Return user-friendly message
    return { message: getUserFriendlyMessage(err.code) };
  }
  
  // Log unknown errors with full context
  console.error('Unknown Error:', err);
  return { message: ERROR_MESSAGES.GENERAL_ERROR };
};
```

## Testing Error Scenarios

### Unit Testing Error Handling

```typescript
// Test error message display
test('displays error message when authentication fails', async () => {
  const mockError = new FirebaseError('auth/invalid-credential', 'Invalid credential');
  jest.spyOn(authService, 'signIn').mockRejectedValue(mockError);
  
  render(<LoginForm />);
  
  fireEvent.click(screen.getByText('Sign In'));
  
  await waitFor(() => {
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });
});

// Test error clearing
test('clears error when user types in input', () => {
  render(<LoginForm />);
  
  // Simulate error state
  fireEvent.click(screen.getByText('Sign In'));
  expect(screen.getByText(/error/i)).toBeInTheDocument();
  
  // Type in input
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'test@example.com' }
  });
  
  // Error should be cleared
  expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
});
```

### Integration Testing

```typescript
// Test complete error flow
test('handles complete MFA enrollment error flow', async () => {
  render(<MFAEnrollment user={mockUser} onSuccess={onSuccess} onError={onError} />);
  
  // Test invalid phone number
  fireEvent.change(screen.getByPlaceholderText(/phone/i), {
    target: { value: 'invalid' }
  });
  fireEvent.click(screen.getByText('Send Verification Code'));
  
  expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
  
  // Test error clearing
  fireEvent.change(screen.getByPlaceholderText(/phone/i), {
    target: { value: '+15551234567' }
  });
  
  expect(screen.queryByText('Please enter a valid phone number')).not.toBeInTheDocument();
});
```

### Manual Testing Checklist

#### Authentication Errors

- [ ] Invalid email format
- [ ] Wrong password
- [ ] Non-existent user
- [ ] Network connectivity issues
- [ ] Firebase service outages

#### MFA Errors

- [ ] Invalid phone numbers
- [ ] Wrong verification codes
- [ ] Expired verification codes
- [ ] ReCAPTCHA failures
- [ ] Network timeouts during code sending

#### Form Validation

- [ ] Required field validation
- [ ] Format validation (email, phone)
- [ ] Password strength requirements
- [ ] Error clearing on input change

#### Edge Cases

- [ ] Rapid successive API calls
- [ ] Browser back/forward navigation during errors
- [ ] Page refresh during error states
- [ ] Offline/online state changes

## Error Monitoring and Logging

### Development Logging

```typescript
// Structured error logging for development
const logError = (error: unknown, context: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error in ${context}`);
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
};
```

### Production Error Tracking

```typescript
// Error reporting service integration
const reportError = (error: unknown, context: string) => {
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service (Sentry, LogRocket, etc.)
    errorTrackingService.captureException(error, {
      tags: { context },
      user: getCurrentUser(),
      extra: { timestamp: Date.now() }
    });
  }
};
```

## Common Error Scenarios

### Scenario 1: MFA Enrollment Flow

```typescript
// User enters invalid phone → sees friendly error → corrects input → error clears
const handlePhoneInput = (phone: string) => {
  setPhoneNumber(phone);
  
  // Clear errors when user starts typing
  if (errorMessage) setErrorMessage('');
  
  // Validate on submit
  if (!isValidPhoneNumber(phone)) {
    setErrorMessage(getValidationError('MFA_INVALID_PHONE'));
  }
};
```

### Scenario 2: Network Connectivity

```typescript
// Handle network failures gracefully
const handleNetworkError = (error: unknown) => {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    setErrorMessage('Network connection error. Please check your internet connection.');
  } else {
    setErrorMessage(handleAuthError(error).message);
  }
};
```

### Scenario 3: Session Expiration

```typescript
// Handle expired sessions
const handleApiCall = async () => {
  try {
    return await apiCall();
  } catch (error) {
    if (error.code === 'auth/requires-recent-login') {
      // Redirect to re-authentication
      setErrorMessage(getValidationError('REQUIRES_RECENT_LOGIN'));
      redirectToLogin();
    } else {
      setErrorMessage(handleAuthError(error).message);
    }
  }
};
```

## Extending Error Handling

### Adding New Error Types

1. **Add to ERROR_MESSAGES constant:**

```typescript
export const ERROR_MESSAGES = {
  // ... existing errors
  NEW_ERROR_TYPE: 'User-friendly error message',
};
```

2. **Update handleAuthError function:**

```typescript
switch (err.code) {
  // ... existing cases
  case 'new-error-code':
    return { message: ERROR_MESSAGES.NEW_ERROR_TYPE, data: errorData };
}
```

3. **Use in components:**

```typescript
const error = getValidationError('NEW_ERROR_TYPE');
setErrorMessage(error);
```

### Creating Domain-Specific Error Handlers

```typescript
// For canvas/annotation errors
export const handleCanvasError = (error: unknown): string => {
  if (error instanceof CanvasError) {
    switch (error.type) {
      case 'INVALID_ANNOTATION':
        return 'Invalid annotation data. Please try again.';
      case 'INVALID_BOX_ANNOTATION':
        return 'Invalid box annotation coordinates. Please try drawing again.';
      case 'BOX_ANNOTATION_TOO_SMALL':
        return 'Box annotation is too small. Please draw a larger box.';
      case 'CANVAS_LOAD_FAILED':
        return 'Failed to load image. Please refresh and try again.';
      default:
        return 'Canvas operation failed. Please contact support.';
    }
  }
  return 'Unexpected error occurred. Please contact support.';
};
```

## Related Documentation

- **[Component Guide](https://developers.striae.org/striae-dev/guides/components)** - Component patterns and architecture
- **[Security Guide](https://developers.striae.org/striae-dev/guides/security)** - Security-related error handling
- **[API Reference](https://developers.striae.org/striae-dev/guides/api-reference)** - API error responses and handling

---

*For questions about error handling patterns or to report documentation issues, please contact the development team or create an issue in the GitHub repository.*
