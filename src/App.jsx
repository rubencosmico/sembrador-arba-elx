import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

// Firebase Config
import { db, auth, storage, appId } from './firebase';

// Components
// Components
import LoadingScreen from './components/LoadingScreen';
import WelcomeScreen from './components/WelcomeScreen';
import CampaignSelector from './components/CampaignSelector';
import CoordinatorView from './components/CoordinatorView';
import SowerView from './components/SowerView';
import CampaignManager from './components/CampaignManager';

// Utils
import MigratePhotos from './utils/migrate-photos';
import StorageDiagnostic from './components/StorageDiagnostic';

function App() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); // 'coordinator' | 'sower'
    const [campaign, setCampaign] = useState(null); // { id, name, status }
    const [isManagingCampaigns, setIsManagingCampaigns] = useState(false);

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

    // Modo migración: acceder con ?migrate=photos
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('migrate') === 'photos') {
        return <MigratePhotos db={db} appId={appId} storage={storage} />;
    }

    if (urlParams.get('diagnostic') === 'true') {
        return <StorageDiagnostic db={db} appId={appId} storage={storage} />;
    }

    // 0. Campaign Manager
    if (isManagingCampaigns) {
        return <CampaignManager db={db} appId={appId} onBack={() => setIsManagingCampaigns(false)} />;
    }

    // 1. Select Campaign
    if (!campaign) {
        return (
            <CampaignSelector
                db={db}
                appId={appId}
                onSelectCampaign={setCampaign}
                onManage={user?.uid ? () => setIsManagingCampaigns(true) : null}
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
            />
        );
    }

    return null;
}

export default App;