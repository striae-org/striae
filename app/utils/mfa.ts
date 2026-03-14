// MFA Configuration Helper
// This file contains utilities and documentation for managing MFA in your Firebase project

import { multiFactor, type User } from 'firebase/auth';

/**
 * Check if a user has MFA enrolled
 * @param user - Firebase User object
 * @returns boolean indicating if user has any MFA factors enrolled
 */
export const userHasMFA = (user: User): boolean => {
  return multiFactor(user).enrolledFactors.length > 0;
};

/**
 * Get the number of MFA factors enrolled for a user
 * @param user - Firebase User object
 * @returns number of enrolled MFA factors
 */
export const getMFAFactorCount = (user: User): number => {
  return multiFactor(user).enrolledFactors.length;
};

/**
 * Get MFA factor information for a user
 * @param user - Firebase User object
 * @returns array of MFA factor information
 */
export const getMFAFactors = (user: User) => {
  return multiFactor(user).enrolledFactors.map(factor => ({
    uid: factor.uid,
    factorId: factor.factorId,
    displayName: factor.displayName,
    enrollmentTime: factor.enrollmentTime
  }));
};

/*
FIREBASE CONSOLE CONFIGURATION STEPS:

1. **Enable Multi-Factor Authentication in Firebase Console:**
   - Go to Firebase Console → Authentication → Sign-in method
   - Scroll down to "Multi-factor authentication"
   - Click "Enable" next to SMS
   - Configure your SMS settings

2. **Enable reCAPTCHA for Phone Auth:**
   - In the same section, make sure reCAPTCHA is enabled
   - Add your domain to the authorized domains list

3. **Configure Test Phone Numbers (Optional):**
   - Go to Authentication → Sign-in method → Phone
   - Add test phone numbers if needed for development

4. **Set MFA Enforcement (Optional):**
   - You can set MFA as required for all users in Firebase Console
   - Or use the approach in this app where we enforce it programmatically

5. **Monitor MFA Usage:**
   - Go to Authentication → Users to see which users have MFA enabled
   - Look for the "Multi-factor" column in the user list

TESTING MFA:

1. Create a new user account through registration
2. After email verification and login, the MFA enrollment modal will appear
3. Enter a valid phone number (use your real phone for testing)
4. Complete the SMS verification process
5. Try logging out and back in - you'll now need both password and SMS code

PRODUCTION CONSIDERATIONS:

- Ensure you have proper SMS quotas set up in Firebase
- Consider implementing backup codes for users who lose phone access
- Monitor SMS costs and usage
- Test the flow thoroughly with real phone numbers
- Consider implementing MFA recovery mechanisms

*/
