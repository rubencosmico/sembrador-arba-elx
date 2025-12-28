import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const getFirebaseConfig = () => {
    if (typeof __firebase_config !== 'undefined') return JSON.parse(__firebase_config || '{}');
    if (import.meta.env && import.meta.env.VITE_FIREBASE_CONFIG) {
        try { return JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG); } catch (e) { return {}; }
    }
    return {};
};

const getAppId = () => {
    if (typeof __app_id !== 'undefined') return __app_id;
    if (import.meta.env && import.meta.env.VITE_APP_ID) return import.meta.env.VITE_APP_ID;
    return 'arba-elx-default';
};

const firebaseConfig = getFirebaseConfig();
export const appId = getAppId();

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
