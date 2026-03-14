import { initializeApp } from 'firebase/app';
import { 
    getAuth,
    setPersistence,
    browserSessionPersistence,
    //connectAuthEmulator,    
 } from 'firebase/auth';
import firebaseConfig from '~/config/firebase';
import { getAppVersion } from '~/utils/version';

export const app = initializeApp(firebaseConfig, "Striae");
export const auth = getAuth(app);

setPersistence(auth, browserSessionPersistence);

console.log(`Welcome to ${app.name} v${getAppVersion()}`);

//Connect to the Firebase Auth emulator if running locally
//connectAuthEmulator(auth, 'http://127.0.0.1:9099');