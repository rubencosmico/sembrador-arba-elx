import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Components
import LoadingScreen from './components/LoadingScreen';
import WelcomeScreen from './components/WelcomeScreen';
import CampaignSelector from './components/CampaignSelector';
import CoordinatorView from './components/CoordinatorView';
import SowerView from './components/SowerView';

// Utils
import { migrateOrphanData } from './utils/migration';
import MigratePhotos from './utils/migrate-photos';
import StorageDiagnostic from './components/StorageDiagnostic';

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
const storage = getStorage(app);

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
        signInAnonymously(auth).then((u) => {
            console.log("Auth success", u.user.uid);
            setUser(u.user);
            setLoading(false);
        }).catch(err => {
            console.error("Auth failed", err);
            setLoading(false);
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

        const fetchData = async () => {
            const qSeeds = query(collection(db, ...dataPath, 'seeds'), where('campaignId', '==', campaign.id));
            const seedsSnap = await getDocs(qSeeds);
            setSeeds(seedsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const qGroups = query(collection(db, ...dataPath, 'groups'), where('campaignId', '==', campaign.id));
            const groupsSnap = await getDocs(qGroups);
            setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        };

        fetchData();
    }, [campaign, role]);

    if (loading) return <LoadingScreen />;

    // Modo migración: acceder con ?migrate=photos
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('migrate') === 'photos') {
        return <MigratePhotos db={db} appId={appId} storage={storage} />;
    }

    if (urlParams.get('diagnostic') === 'true') {
        return <StorageDiagnostic db={db} appId={appId} storage={storage} />;
    }

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
                storage={storage}
                onResetRole={() => setRole(null)}
            />
        );
    }

    return null;
}

export default App;