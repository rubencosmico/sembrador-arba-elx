// v1.0.1 - Force update
// Import and configure the Firebase SDK
// Using importScripts for static service worker compatibility
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCwQlpVTERw_zA_ZWmHCrOlQZf9ikf3ksc",
    authDomain: "arba-elx-siembra.firebaseapp.com",
    projectId: "arba-elx-siembra",
    storageBucket: "arba-elx-siembra.firebasestorage.app",
    messagingSenderId: "655439706240",
    appId: "1:655439706240:web:e5918953ae64263e44ce65"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
