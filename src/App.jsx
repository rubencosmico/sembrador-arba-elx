import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Components
import LoadingScreen from './components/LoadingScreen';
import WelcomeScreen from './components/WelcomeScreen';
import CampaignSelector from './components/CampaignSelector';
import CoordinatorView from './components/CoordinatorView';
import SowerView from './components/SowerView';

// Utils
import { migrateOrphanData } from './utils/migration';

// --- CONFIG ---
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
const db = getFirestore(app);
const auth = getAuth(app);

function App() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); // 'coordinator' | 'sower'
    const [campaign, setCampaign] = useState(null); // { id, name }

    // Data
    const [seeds, setSeeds] = useState([]);
    const [groups, setGroups] = useState([]);
    const [logs, setLogs] = useState([]); // Only fetched for coordinator usually, or small scale
    const [loading, setLoading] = useState(true);

    // Auth
    useEffect(() => {
        signInAnonymously(auth).catch(console.error);
        return auth.onAuthStateChanged(u => {
            if (u) {
                setUser(u);
                // Trigger migration once on load
                migrateOrphanData(db, appId).then(() => setLoading(false));
            }
        });
    }, []);

    // Load Data - Dependent on Campaign
    useEffect(() => {
        if (!campaign) {
            setSeeds([]);
            setGroups([]);
            setLogs([]);
            return;
        }

        const dataPath = ['artifacts', appId, 'public', 'data'];

        // Seeds
        const qSeeds = query(collection(db, ...dataPath, 'seeds'), where('campaignId', '==', campaign.id));
        const unsubSeeds = onSnapshot(qSeeds, s => setSeeds(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        // Groups
        const qGroups = query(collection(db, ...dataPath, 'groups'), where('campaignId', '==', campaign.id));
        const unsubGroups = onSnapshot(qGroups, s => setGroups(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        // Logs - Only fetch if Coordinator to verify/manage, OR fetch always if small. 
        // For Coordinator Data tab we need it.
        // Let's optimize: fetch only if role === 'coordinator'.
        let unsubLogs = () => { };
        if (role === 'coordinator') {
            // Removing orderBy from server query to avoid requiring a composite index immediately.
            // Sorting client-side instead.
            const qLogs = query(collection(db, ...dataPath, 'logs'), where('campaignId', '==', campaign.id));
            unsubLogs = onSnapshot(qLogs, (s) => {
                const fetchedLogs = s.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort by timestamp desc
                fetchedLogs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                setLogs(fetchedLogs);
            }, (error) => {
                console.error("Error fetching logs:", error);
                alert("Error cargando datos. Revisa la consola.");
            });
        }

        return () => {
            unsubSeeds();
            unsubGroups();
            unsubLogs();
        };
    }, [campaign, role]);

    if (loading) return <LoadingScreen />;

    // 1. Select Campaign
    if (!campaign) {
        return <CampaignSelector db={db} appId={appId} onSelectCampaign={setCampaign} />;
    }

    // 2. Select Role
    if (!role) {
        return <WelcomeScreen setRole={setRole} campaignName={campaign.name} onBack={() => setCampaign(null)} />;
    }

    // 3. Views
    if (role === 'coordinator') {
        return (
            <CoordinatorView
                db={db} appId={appId} campaignId={campaign.id}
                seeds={seeds} groups={groups} logs={logs}
                onResetRole={() => setRole(null)}
            />
        );
    }

    if (role === 'sower') {
        return (
            <SowerView
                db={db} appId={appId} campaignId={campaign.id}
                seeds={seeds} groups={groups} userId={user?.uid}
                onResetRole={() => setRole(null)}
            />
        );
    }

    return null;
}

export default App;