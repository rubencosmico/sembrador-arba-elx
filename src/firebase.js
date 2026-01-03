import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, EmailAuthProvider, onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

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
const appId = getAppId();

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
const auth = getAuth(app);
const storage = getStorage(app);
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export { db, auth, storage, messaging, appId, GoogleAuthProvider, EmailAuthProvider, onAuthStateChanged, signOut, signInWithPopup };
