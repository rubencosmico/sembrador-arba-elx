import React, { useState, useEffect } from 'react';
import {
    db, auth, storage, appId,
    onAuthStateChanged,
    signOut,
    messaging
} from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, onSnapshot } from 'firebase/firestore';

// Components
import LoadingScreen from './components/LoadingScreen';
import LoginScreen from './components/LoginScreen';
import LandingPage from './components/LandingPage';
import WelcomeScreen from './components/WelcomeScreen';
import SowerView from './components/SowerView';
import CampaignManager from './components/CampaignManager';
import ClaimRecordsView from './components/ClaimRecordsView';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import MessagesView from './components/MessagesView';
import ChatWindow from './components/ChatWindow';
import SocialView from './components/SocialView';
import ProfileView from './components/ProfileView';

// Utils
import MigratePhotos from './utils/migrate-photos';
import StorageDiagnostic from './components/StorageDiagnostic';
import { useOfflineQueue } from './hooks/useOfflineQueue';

function App() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [currentView, setCurrentView] = useState('home'); // 'home' | 'claim' | 'admin' | 'messages' | 'chat' | 'social' | 'profile' | 'manage'
    const [chatPartnerId, setChatPartnerId] = useState(null);
    const [role, setRole] = useState(null); // 'coordinator' | 'sower'
    const [campaign, setCampaign] = useState(null); // { id, name, status }
    const [isManagingCampaigns, setIsManagingCampaigns] = useState(false);

    // Data
    const [seeds, setSeeds] = useState([]);
    const [groups, setGroups] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Offline Queue
    const { isOnline, pendingCount, saveToQueue } = useOfflineQueue(storage, db);

    // Auth & Profile
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                // Scenario 8: Email Verification Gate
                if (!u.emailVerified && u.providerData.some(p => p.providerId === 'password')) {
                    setUser(u);
                    setLoading(false);
                    return;
                }

                setUser(u);

                // Fetch/Create Profile
                const userDocRef = doc(db, 'users', u.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    setUserProfile(userDoc.data());
                } else {
                    const newProfile = {
                        displayName: u.displayName || 'Sembrador Anónimo',
                        email: u.email,
                        photoURL: u.photoURL || null,
                        createdAt: new Date(),
                        defaultRole: 'sower'
                    };
                    await setDoc(userDocRef, newProfile);
                    setUserProfile(newProfile);
                }

                // Check SuperAdmin (Secure Collection)
                const adminDoc = await getDoc(doc(db, 'admins', u.uid));
                setIsSuperAdmin(adminDoc.exists());
                handleNotifications(u.uid);
            } else {
                setUser(null);
                setUserProfile(null);
                setIsSuperAdmin(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleNotifications = async (userId) => {
        if (!messaging) return;
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                // Explicitly register service worker for more robustness
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

                // Send config to SW (Scenario: Security fix to avoid hardcoded keys)
                const sendConfig = () => {
                    const configStr = import.meta.env.VITE_FIREBASE_CONFIG;
                    if (configStr && registration.active) {
                        registration.active.postMessage({
                            type: 'SET_FIREBASE_CONFIG',
                            config: JSON.parse(configStr)
                        });
                    }
                };

                if (registration.active) {
                    sendConfig();
                } else {
                    registration.addEventListener('updatefound', () => {
                        const installingWorker = registration.installing;
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'activated') sendConfig();
                        };
                    });
                }

                console.log("[NOTIFICATIONS] Service Worker registered:", registration);

                const token = await getToken(messaging, {
                    vapidKey: import.meta.env.VITE_VAPID_KEY,
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    await updateDoc(doc(db, 'users', userId), { fcmToken: token });
                    console.log("[NOTIFICATIONS] Token saved:", token);
                } else {
                    console.warn("[NOTIFICATIONS] No token received");
                }
            } else {
                console.warn("[NOTIFICATIONS] Permission denied:", permission);
            }
        } catch (err) {
            console.error("Error gestionando notificaciones:", err);
            if (err.name === 'AbortError') {
                console.error("[NOTIFICATIONS] Push registration aborted. This often happens due to an ad-blocker or lack of browser support for the push service.");
            }
        }

        onMessage(messaging, (payload) => {
            console.log('Mensaje en primer plano:', payload);
            alert(`${payload.notification.title}: ${payload.notification.body}`);
        });
    };

    // Handle Join Links
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const joinId = urlParams.get('join');

        if (joinId && user) {
            const processJoin = async () => {
                const campRef = doc(db, 'artifacts', appId, 'public', 'data', 'campaigns', joinId);
                const campSnap = await getDoc(campRef);

                if (campSnap.exists()) {
                    await updateDoc(campRef, {
                        participants: arrayUnion(user.uid)
                    });
                    setCampaign({ id: joinId, ...campSnap.data() });
                    // Clean URL
                    window.history.replaceState({}, document.title, "/");
                }
            };
            processJoin();
        }
    }, [user, appId]);

    const handleLogout = () => {
        signOut(auth);
        setCampaign(null);
        setRole(null);
    };

    // Load Data - Dependent on Campaign
    useEffect(() => {
        if (!campaign) {
            setSeeds([]);
            setGroups([]);
            setLogs([]);
            return;
        }

        const dataPath = ['artifacts', appId, 'public', 'data'];

        // Real-time listeners
        const qSeeds = query(collection(db, ...dataPath, 'seeds'), where('campaignId', '==', campaign.id));
        const unsubSeeds = onSnapshot(qSeeds, (snap) => {
            setSeeds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const qGroups = query(collection(db, ...dataPath, 'groups'), where('campaignId', '==', campaign.id));
        const unsubGroups = onSnapshot(qGroups, (snap) => {
            setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Logs are also needed if we want to show them updating? 
        // For now let's also listen to logs if we are in Coordinator view? 
        // But App.jsx fetches for everyone.
        // Let's listen to logs too to be safe and consistent.
        const qLogs = query(collection(db, ...dataPath, 'logs'), where('campaignId', '==', campaign.id));
        const unsubLogs = onSnapshot(qLogs, (snap) => {
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubSeeds();
            unsubGroups();
            unsubLogs();
        };
    }, [campaign]); // Removed 'role' dependency as data depends on campaign, not role.

    if (loading) return <LoadingScreen />;

    // 0. Verification Gate
    if (user && !user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
                <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl text-center">
                    <div className="inline-block p-4 rounded-2xl bg-amber-500/10 mb-6">
                        <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Verifica tu email</h2>
                    <p className="text-slate-400 mb-8">Hemos enviado un enlace de verificación a <strong>{user.email}</strong>. Por favor, revisa tu bandeja de entrada y pulsa en el enlace para activar tu cuenta.</p>
                    <div className="space-y-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-all"
                        >
                            Ya he verificado mi cuenta
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 0. Login Override
    if (showLogin && !user) {
        return <LoginScreen onLoginSuccess={(u) => { setUser(u); setShowLogin(false); }} />;
    }

    // 1. Campaign Manager / My Campaigns
    if (currentView === 'manage' && user) {
        return <CampaignManager db={db} appId={appId} user={user} isSuperAdmin={isSuperAdmin} onBack={() => setCurrentView('home')} />;
    }

    // 2. Specialized Internal Views
    if (currentView === 'claim' && user) {
        return <ClaimRecordsView db={db} appId={appId} user={user} onBack={() => setCurrentView('home')} />;
    }

    if (currentView === 'admin' && isSuperAdmin) {
        return <SuperAdminDashboard db={db} appId={appId} onBack={() => setCurrentView('home')} />;
    }

    if (currentView === 'messages' && user) {
        return (
            <MessagesView
                db={db} user={user}
                onSelectChat={(id) => { setChatPartnerId(id); setCurrentView('chat'); }}
                onBack={() => setCurrentView('home')}
            />
        );
    }

    if (currentView === 'chat' && user && chatPartnerId) {
        return (
            <ChatWindow
                db={db} user={user}
                otherUserId={chatPartnerId}
                onBack={() => setCurrentView('messages')}
            />
        );
    }

    if (currentView === 'social' && user) {
        return (
            <SocialView
                db={db} user={user}
                onBack={() => setCurrentView('home')}
                onChatClick={(id) => { setChatPartnerId(id); setCurrentView('chat'); }}
            />
        );
    }

    if (currentView === 'profile' && user) {
        return (
            <ProfileView
                db={db} user={user} userProfile={userProfile} storage={storage}
                onBack={() => setCurrentView('home')}
                onUpdateProfile={(p) => setUserProfile(p)}
            />
        );
    }

    // 3. Main Entry: Landing Page (if no campaign selected)
    if (!campaign) {
        return (
            <LandingPage
                db={db} appId={appId} user={user}
                isSuperAdmin={isSuperAdmin}
                onSelectCampaign={(c) => setCampaign(c)}
                onLoginClick={() => setShowLogin(true)}
                onClaimClick={() => setCurrentView('claim')}
                onAdminClick={() => setCurrentView('admin')}
                onProfileClick={() => setCurrentView('profile')}
                onManageClick={() => setCurrentView('manage')}
                onMessagesClick={() => setCurrentView('messages')}
                onSocialClick={() => setCurrentView('social')}
                onLogout={handleLogout}
            />
        );
    }

    // 2. Select Role
    if (!role) {
        return <WelcomeScreen setRole={setRole} campaignName={campaign.name} onBack={() => setCampaign(null)} />;
    }

    const isReadOnly = campaign.status !== 'active';

    // 3. Views
    if (role === 'coordinator') {
        return (
            <CampaignManager
                db={db} appId={appId} user={user}
                isSuperAdmin={isSuperAdmin}
                initialCampaignId={campaign.id}
                onBack={() => setRole(null)}
            />
        );
    }

    if (role === 'sower') {
        return (
            <SowerView
                db={db} appId={appId} campaignId={campaign.id}
                seeds={seeds} groups={groups} userId={user?.uid}
                storage={storage}
                onResetRole={() => setRole(null)}
                isReadOnly={isReadOnly}
                isOnline={isOnline}
                pendingCount={pendingCount}
                saveToQueue={saveToQueue}
            />
        );
    }

    return null;
}

export default App;