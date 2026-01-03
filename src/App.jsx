import {
    db, auth, storage, appId,
    onAuthStateChanged,
    signOut,
    messaging
} from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';

// Components
import LoadingScreen from './components/LoadingScreen';
import LoginScreen from './components/LoginScreen';
import LandingPage from './components/LandingPage';
import WelcomeScreen from './components/WelcomeScreen';
import CoordinatorView from './components/CoordinatorView';
import SowerView from './components/SowerView';
import CampaignManager from './components/CampaignManager';
import ClaimRecordsView from './components/ClaimRecordsView';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import MessagesView from './components/MessagesView';
import ChatWindow from './components/ChatWindow';
import SocialView from './components/SocialView';

// Utils
import MigratePhotos from './utils/migrate-photos';
import StorageDiagnostic from './components/StorageDiagnostic';
import { useOfflineQueue } from './hooks/useOfflineQueue';

function App() {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [currentView, setCurrentView] = useState('home'); // 'home' | 'claim' | 'admin' | 'messages' | 'chat' | 'social'
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
                handleNotifications(authUser.uid);
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
                const token = await getToken(messaging, {
                    vapidKey: 'BIl_placeholder_clave_vapid_de_la_consola_firebase'
                });
                if (token) {
                    await updateDoc(doc(db, 'users', userId), { fcmToken: token });
                }
            }
        } catch (err) {
            console.error("Error gestionando notificaciones:", err);
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

    // 0. Login Override
    if (showLogin && !user) {
        return <LoginScreen onLoginSuccess={(u) => { setUser(u); setShowLogin(false); }} />;
    }

    // 1. Campaign Manager (Admin only)
    if (isManagingCampaigns) {
        return <CampaignManager db={db} appId={appId} user={user} onBack={() => setIsManagingCampaigns(false)} />;
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
            <CoordinatorView
                db={db} appId={appId} campaignId={campaign.id}
                seeds={seeds} groups={groups} logs={logs}
                storage={storage}
                onResetRole={() => setRole(null)}
                isReadOnly={isReadOnly}
                isOnline={isOnline}
                pendingCount={pendingCount}
                saveToQueue={saveToQueue}
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