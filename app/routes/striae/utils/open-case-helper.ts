import type { User } from 'firebase/auth';
import { getLimitsDescription, getUserData } from '~/utils/data';

export const DEFAULT_OPEN_CASE_HELPER_TEXT = 'Load an existing case or create a new one.';

export const resolveOpenCaseHelperText = async (user: User): Promise<string> => {
  try {
    const userData = await getUserData(user);
    if (userData && !userData.permitted) {
      const limitsDescription = await getLimitsDescription(user);
      return limitsDescription || DEFAULT_OPEN_CASE_HELPER_TEXT;
    }

    return DEFAULT_OPEN_CASE_HELPER_TEXT;
  } catch {
    return DEFAULT_OPEN_CASE_HELPER_TEXT;
  }
};
