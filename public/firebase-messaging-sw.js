// Import and configure the Firebase SDK
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// The config will be injected during build or read from env if possible.
// Alternatively, FCM works if the project ID is available here.
// For static public folder, we might need a script to inject this or use a global.

const firebaseConfig = {
    apiKey: "TODO_INJECT_VIA_ENV",
    authDomain: "TODO",
    projectId: "TODO",
    storageBucket: "TODO",
    messagingSenderId: "TODO",
    appId: "TODO"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo192.png' // Or equivalent
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
