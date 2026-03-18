import { EmailAuthProvider, type User } from 'firebase/auth';

export type UserNameParts = {
  firstName: string;
  lastName: string;
};

export const getUserFirstName = (user: User): string => {
  const displayName = user.displayName?.trim();
  if (displayName) {
    const [firstName] = displayName.split(/\s+/);
    if (firstName) {
      return firstName;
    }
  }

  const emailPrefix = user.email?.split('@')[0]?.trim();
  if (emailPrefix) {
    return emailPrefix;
  }

  return 'User';
};

export const getUserNameParts = (user: User): UserNameParts => {
  const displayName = user.displayName?.trim();
  if (displayName) {
    const [firstName = 'User', ...lastNameParts] = displayName.split(/\s+/);
    return {
      firstName,
      lastName: lastNameParts.join(' '),
    };
  }

  const emailPrefix = user.email?.split('@')[0]?.trim();
  if (emailPrefix) {
    return {
      firstName: emailPrefix,
      lastName: '',
    };
  }

  return {
    firstName: 'User',
    lastName: '',
  };
};

export const isOAuthUser = (user: User): boolean => {
  return user.providerData.some((p) => p.providerId !== EmailAuthProvider.PROVIDER_ID);
};

export const getAuthErrorCode = (authError: unknown): string => {
  if (
    authError &&
    typeof authError === 'object' &&
    'code' in authError &&
    typeof (authError as { code: unknown }).code === 'string'
  ) {
    return (authError as { code: string }).code;
  }

  return 'unknown';
};

export const getAuthErrorEmail = (authError: unknown): string => {
  if (
    authError &&
    typeof authError === 'object' &&
    'customData' in authError &&
    (authError as { customData: unknown }).customData &&
    typeof (authError as { customData: unknown }).customData === 'object' &&
    'email' in (authError as { customData: object }).customData &&
    typeof (authError as { customData: { email: unknown } }).customData.email === 'string'
  ) {
    return (authError as { customData: { email: string } }).customData.email;
  }

  return '';
};
