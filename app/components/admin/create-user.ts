import { User } from 'firebase/auth';
import { getAdminApiToken } from '~/utils/auth';

interface InfinityUserData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  createdDate: string;
  uid: string;
}

interface InfinityApiResponse {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Attribute IDs for Infinity dashboard mapping
 * These should match the specific attribute IDs from your Infinity workspace
 */
const INFINITY_ATTRIBUTE_IDS = {
  FIRST_NAME: '169f48aa-5a55-4d22-940c-89ea57b3beef',
  LAST_NAME: '7f8aa702-134f-470b-8c13-2130327c643c',
  EMAIL: 'e806808d-9e6e-42c8-b7af-658e4749ecc3',
  LAB_COMPANY: '40b2619b-9312-442c-86f2-67b244888cbe',
  CREATED_DATE: 'eb6c1847-642a-4686-963b-1e93cb1d768c',
  UID: 'bf285694-93d2-4249-b40b-68d9dd816858'
} as const;

const INFINITY_CONFIG = {
  API_URL: 'https://admin.striae.org/api/v2/workspaces/Wm4J6dTmNuj/boards/Gz2boYV4VmL/items',
  FOLDER_ID: 'Wm4J6dTmNuj',
  API_VERSION: '2025-02-26.morava'
} as const;

/**
 * Creates a user entry in the Infinity admin dashboard
 * Called during user registration to track new users
 */
export async function createInfinityUserEntry(userData: InfinityUserData): Promise<InfinityApiResponse> {
  try {
    // Get the admin API token from keys worker
    let adminApiToken: string;
    try {
      adminApiToken = await getAdminApiToken();
    } catch (tokenError) {
      console.warn('Admin API token not available, skipping Infinity dashboard entry:', tokenError);
      return {
        success: false,
        error: 'Admin API token not configured'
      };
    }
    
    const payload = {
      folder_id: INFINITY_CONFIG.FOLDER_ID,
      values: [
        {
          attribute_id: INFINITY_ATTRIBUTE_IDS.FIRST_NAME,
          data: userData.firstName
        },
        {
          attribute_id: INFINITY_ATTRIBUTE_IDS.LAST_NAME,
          data: userData.lastName
        },
        {
          attribute_id: INFINITY_ATTRIBUTE_IDS.EMAIL,
          data: userData.email
        },
        {
          attribute_id: INFINITY_ATTRIBUTE_IDS.LAB_COMPANY,
          data: userData.company
        },
        {
          attribute_id: INFINITY_ATTRIBUTE_IDS.CREATED_DATE,
          data: userData.createdDate
        },
        {
          attribute_id: INFINITY_ATTRIBUTE_IDS.UID,
          data: userData.uid
        }
      ]
    };

    const response = await fetch(INFINITY_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': INFINITY_CONFIG.API_VERSION,
        'Authorization': `Bearer ${adminApiToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Infinity API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { id?: string };
    
    return {
      success: true,
      id: result.id
    };

  } catch (error) {
    console.error('Failed to create Infinity user entry:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Helper function to extract user data from Firebase Auth user object
 * and format it for Infinity dashboard
 */
export function formatUserDataForInfinity(
  user: User, 
  firstName: string, 
  lastName: string, 
  company: string
): InfinityUserData {
  return {
    firstName,
    lastName,
    email: user.email || '',
    company,
    createdDate: new Date().toISOString(),
    uid: user.uid
  };
}

/**
 * Main function to be called during user registration
 * Integrates with the existing registration flow
 */
export async function registerUserInAdminDashboard(
  user: User,
  firstName: string,
  lastName: string,
  company: string
): Promise<InfinityApiResponse> {
  // Format user data for Infinity
  const infinityUserData = formatUserDataForInfinity(user, firstName, lastName, company);
  
  // Create entry in Infinity dashboard
  const result = await createInfinityUserEntry(infinityUserData);
  
  if (result.success) {
    console.log(`User ${user.uid} successfully registered in admin dashboard with ID: ${result.id}`);
  } else {
    console.error(`Failed to register user ${user.uid} in admin dashboard:`, result.error);
  }
  
  return result;
}