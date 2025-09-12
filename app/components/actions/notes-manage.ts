import { User } from 'firebase/auth';
import paths from '~/config/config.json';
import { getDataApiKey } from '~/utils/auth';

const DATA_WORKER_URL = paths.data_worker_url;

interface NotesData {
  leftCase: string;
  rightCase: string;
  leftItem: string;
  rightItem: string;
  caseFontColor: string;
  classType: 'Bullet' | 'Cartridge Case' | 'Other';
  customClass?: string;
  classNote: string;
  hasSubclass?: boolean;
  indexType: 'number' | 'color';
  indexNumber?: string;
  indexColor?: string;
  supportLevel: 'ID' | 'Exclusion' | 'Inconclusive';
  includeConfirmation: boolean;
  additionalNotes: string;
  updatedAt: string;
}

export const saveNotes = async (
  user: User,
  caseNumber: string,
  imageId: string,
  notesData: NotesData
): Promise<void> => {
  try {
    const apiKey = await getDataApiKey();
    const url = `${DATA_WORKER_URL}/${user.uid}/${caseNumber}/${imageId}/data.json`;

    // Add timestamp
    const dataToSave = {
      ...notesData,
      updatedAt: new Date().toISOString()
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Auth-Key': apiKey
      },
      body: JSON.stringify(dataToSave)
    });

    if (!response.ok) {
      throw new Error('Failed to save notes');
    }
  } catch (error) {
    console.error('Error saving notes:', error);
    throw error;
  }
};

export const getNotes = async (
  user: User,
  caseNumber: string,
  imageId: string
): Promise<NotesData | null> => {
  try {
    const apiKey = await getDataApiKey();
    const url = `${DATA_WORKER_URL}/${user.uid}/${caseNumber}/${imageId}/data.json`;

    const response = await fetch(url, {
      headers: {
        'X-Custom-Auth-Key': apiKey
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch notes');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching notes:', error);
    return null;
  }
};