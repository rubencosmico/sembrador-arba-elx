// v1.0.2 - Force update
// Import and configure the Firebase SDK
// Using importScripts for static service worker compatibility
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration will be provided via postMessage during initialization
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_FIREBASE_CONFIG') {
        const firebaseConfig = event.data.config;
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

        console.log('[firebase-messaging-sw.js] Firebase Messaging initialized dynamically');
    }
});
