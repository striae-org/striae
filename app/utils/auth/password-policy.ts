export interface PasswordPolicyResult {
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  passwordsMatch: boolean;
  isStrong: boolean;
}

const MIN_PASSWORD_LENGTH = 10;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/;

export const evaluatePasswordPolicy = (password: string, confirmPassword?: string): PasswordPolicyResult => {
  const hasMinLength = password.length >= MIN_PASSWORD_LENGTH;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(password);
  const passwordsMatch = confirmPassword === undefined ? true : password === confirmPassword;

  return {
    hasMinLength,
    hasUpperCase,
    hasNumber,
    hasSpecialChar,
    passwordsMatch,
    isStrong: hasMinLength && hasUpperCase && hasNumber && hasSpecialChar && passwordsMatch,
  };
};
