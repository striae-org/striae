import type { MultiFactorInfo } from 'firebase/auth';
import { getValidationError } from '~/services/firebase/errors';

export interface PhoneValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const formatPhoneNumberForMfa = (phone: string): string => {
  const trimmedPhone = phone.trim();
  if (trimmedPhone.startsWith('+')) {
    return `+${trimmedPhone.slice(1).replace(/\D/g, '')}`;
  }

  const digitsOnly = trimmedPhone.replace(/\D/g, '');
  if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
    return `+${digitsOnly}`;
  }

  return `+1${digitsOnly}`;
};

export const maskPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '***-***-****';
  }

  return `***-***-${digits.slice(-4)}`;
};

export const getPhoneDisplayValue = (factor: MultiFactorInfo): string => {
  const displayName = factor.displayName ?? '';
  if (displayName.toLowerCase().startsWith('phone:')) {
    return displayName.slice('phone:'.length).trim();
  }

  return displayName;
};

export const getMaskedFactorDisplay = (factor: MultiFactorInfo | null): string => {
  if (!factor) {
    return 'your enrolled phone';
  }

  const phoneDisplayValue = getPhoneDisplayValue(factor);
  if (!phoneDisplayValue) {
    return 'your enrolled phone';
  }

  return maskPhoneNumber(phoneDisplayValue);
};

export const validatePhoneNumber = (phone: string): PhoneValidationResult => {
  if (!phone.trim()) {
    return { isValid: false, errorMessage: getValidationError('MFA_INVALID_PHONE') };
  }

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone === '15551234567' || cleanPhone === '5551234567') {
    return {
      isValid: false,
      errorMessage: 'Please enter your actual phone number, not the demo number.',
    };
  }

  if (cleanPhone.length < 7 || cleanPhone.length > 15) {
    return { isValid: false, errorMessage: 'Phone number must be between 7-15 digits.' };
  }

  if (phone.startsWith('+1') || (!phone.startsWith('+') && cleanPhone.length === 10)) {
    const usPhone = cleanPhone.startsWith('1') ? cleanPhone.slice(1) : cleanPhone;
    if (usPhone.length !== 10) {
      return { isValid: false, errorMessage: 'US/Canada phone numbers must be 10 digits.' };
    }

    if (usPhone[0] === '0' || usPhone[0] === '1') {
      return {
        isValid: false,
        errorMessage: 'Invalid area code. Area codes cannot start with 0 or 1.',
      };
    }

    if (usPhone[3] === '0' || usPhone[3] === '1') {
      return { isValid: false, errorMessage: 'Invalid phone number format.' };
    }
  }

  if (phone.startsWith('+') && cleanPhone.length < 8) {
    return {
      isValid: false,
      errorMessage: 'International phone numbers must have at least 8 digits including country code.',
    };
  }

  return { isValid: true };
};
