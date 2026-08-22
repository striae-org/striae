import { initializeApp } from 'firebase/app';
import {
	getAuth,
	setPersistence,
	browserSessionPersistence,
	//connectAuthEmulator,
} from 'firebase/auth';
import firebaseConfig from '~/config/firebase';

export const app = initializeApp(firebaseConfig, 'Striae');
export const auth = getAuth(app);

setPersistence(auth, browserSessionPersistence);

//Connect to the Firebase Auth emulator if running locally
//connectAuthEmulator(auth, 'http://127.0.0.1:9099');
