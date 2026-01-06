import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, limit, or, orderBy } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const LandingPage = ({
    db, appId, user, isSuperAdmin,
    onSelectCampaign, onLoginClick, onClaimClick, onAdminClick,
    onProfileClick, onManageClick,
    onLogout, onMessagesClick, onSocialClick
}) => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [approxCoords, setApproxCoords] = useState({}); // { campaignId: {lat, lng} }
    const [campaignStats, setCampaignStats] = useState({}); // { campaignId: { totalHoles: 0 } }
    const [mapFilter, setMapFilter] = useState('all'); // 'all' | 'active' | 'finalized' | 'managed' | 'participated'

    useEffect(() => {
        const missing = campaigns.filter(c => !c.coordinates && !approxCoords[c.id]);
        if (missing.length === 0) return;

        const fetchApprox = async () => {
            const updates = {};
            for (const c of missing) {
                try {
                    const logsPath = ['artifacts', appId, 'public', 'data', 'logs'];
                    const q = query(collection(db, ...logsPath), where('campaignId', '==', c.id), limit(5));
                    const snap = await getDocs(q);
                    for (const d of snap.docs) {
                        const logData = d.data();
                        if (logData.location) {
                            const raw = logData.location;
                            const lat = typeof raw.latitude === 'number' ? raw.latitude : raw.lat;
                            const lng = typeof raw.longitude === 'number' ? raw.longitude : raw.lng;
                            if (typeof lat === 'number' && typeof lng === 'number') {
                                updates[c.id] = { lat, lng };
                                break;
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error fetching approx coords for", c.id, err);
                }
            }
            if (Object.keys(updates).length > 0) {
                setApproxCoords(prev => ({ ...prev, ...updates }));
            }
        };
        fetchApprox();
    }, [campaigns, db, appId]); // No incluir approxCoords aquí para evitar bucles

    useEffect(() => {
        const dataPath = ['artifacts', appId, 'public', 'data', 'campaigns'];

        const q = query(collection(db, ...dataPath));

        const unsubscribe = onSnapshot(q, (snap) => {
            const allCampaigns = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const visibleCampaigns = allCampaigns.filter(c => {
                if (isSuperAdmin) return true;
                const isPublic = !c.visibility || c.visibility === 'public';
                if (isPublic) return true;
                if (user && (c.ownerId === user.uid || (c.participants && c.participants.includes(user.uid)))) return true;
                return false;
            });

            setCampaigns(visibleCampaigns);
            setLoading(false);
        }, (err) => {
            console.error("[LANDING] Error en snapshot:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, appId, isSuperAdmin]);

    useEffect(() => {
        if (campaigns.length === 0) return;

        const logsPath = ['artifacts', appId, 'public', 'data', 'logs'];
        const unsubs = campaigns.map(c => {
            const qLogs = query(collection(db, ...logsPath), where('campaignId', '==', c.id));
            return onSnapshot(qLogs, (logSnap) => {
                const total = logSnap.docs.reduce((acc, d) => acc + (parseInt(d.data().holeCount) || 1), 0);
                setCampaignStats(prev => {
                    if (prev[c.id]?.totalHoles === total) return prev;
                    return { ...prev, [c.id]: { totalHoles: total } };
                });
            }, (err) => console.error(`Error stats for ${c.id}:`, err));
        });

        return () => unsubs.forEach(u => u());
    }, [campaigns, db, appId]);

    const formatDate = (date) => {
        if (!date) return 'Sin fecha';
        const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-emerald-500/30">
            {/* Header */}
            <header className="fixed top-0 w-full z-[1000] bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center transition-all">
                <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.location.reload()}>
                    <div className="p-2 rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight">Sembrador Elx</span>
                </div>

                <div className="flex items-center space-x-4 relative">
                    {user ? (
                        <>
                            <div
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center space-x-3 bg-slate-800 hover:bg-slate-700 rounded-full pl-2 pr-4 py-1.5 border border-slate-700 cursor-pointer transition-all"
                            >
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-emerald-500/30" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-xs font-bold">
                                        {user.displayName?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <span className="text-sm font-medium text-slate-200">{user.displayName || 'Usuario'}</span>
                                <svg className={`w-4 h-4 text-slate-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <div className="absolute top-12 right-0 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 animate-fade-in z-[1001]">
                                    <div className="p-3 mb-2 border-b border-slate-800">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ajustes / Perfil</div>
                                    </div>
                                    <button
                                        onClick={() => { setShowUserMenu(false); onProfileClick(); }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 text-sm flex items-center space-x-3 transition-colors text-emerald-400 font-bold"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span>Mi Perfil</span>
                                    </button>

                                    <button
                                        onClick={() => { setShowUserMenu(false); onManageClick(); }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 text-sm flex items-center space-x-3 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>Mis Jornadas</span>
                                    </button>

                                    <button
                                        onClick={() => { setShowUserMenu(false); onSocialClick(); }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 text-sm flex items-center space-x-3 transition-colors text-teal-400 font-bold"
                                    >
                                        <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span>Comunidad</span>
                                    </button>

                                    <button
                                        onClick={() => { setShowUserMenu(false); onMessagesClick(); }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 text-sm flex items-center space-x-3 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                        <span>Mensajes</span>
                                    </button>

                                    <button
                                        onClick={() => { setShowUserMenu(false); onClaimClick(); }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 text-sm flex items-center space-x-3 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <span>Reclamar Registros</span>
                                    </button>

                                    {isSuperAdmin && (
                                        <button
                                            onClick={() => { setShowUserMenu(false); onAdminClick(); }}
                                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 text-sm flex items-center space-x-3 transition-colors text-purple-400 font-bold"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            <span>Configuración Arba</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => { setShowUserMenu(false); onLogout(); }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-500 text-sm flex items-center space-x-3 transition-colors mt-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        <span>Cerrar Sesión</span>
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={onLoginClick}
                            className="bg-emerald-500 hover:bg-emerald-600 px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                            Explorar / Iniciar Sesión
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-24 px-6 pb-12 max-w-7xl mx-auto">
                {/* Hero / Intro */}
                <div className="text-center mb-16 animate-fade-in">
                    <h2 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        Reforestación Comunitaria Inteligente
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Descubre jornadas de siembra cerca de ti y ayuda a reconstruir nuestro ecosistema local con tecnología de seguimiento en tiempo real.
                    </p>
                </div>

                {/* Map Section */}
                <div className="mb-16">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <h3 className="text-2xl font-bold flex items-center space-x-2">
                            <span className="w-2 h-8 bg-emerald-500 rounded-full mr-1"></span>
                            <span>Explora las Jornadas</span>
                        </h3>

                        <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'all', label: 'Todas', color: 'bg-emerald-500' },
                                { id: 'active', label: 'Activas', color: 'bg-emerald-400' },
                                { id: 'finalized', label: 'Finalizadas', color: 'bg-slate-400' },
                                { id: 'managed', label: 'Gestionadas', color: 'bg-purple-500', auth: true },
                                { id: 'participated', label: 'Participadas', color: 'bg-blue-500', auth: true }
                            ].filter(f => !f.auth || user).map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setMapFilter(f.id)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${mapFilter === f.id
                                        ? `${f.color} text-slate-900 shadow-lg`
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        {loading && <div className="text-emerald-500 animate-pulse text-sm">Actualizando mapa...</div>}
                    </div>

                    <div className="h-[500px] w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
                        <MapContainer
                            center={[38.2667, -0.6992]}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={false}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {campaigns.filter(c => {
                                if (mapFilter === 'all') return true;
                                if (mapFilter === 'active') return c.status === 'active';
                                if (mapFilter === 'finalized') return c.status !== 'active';
                                if (mapFilter === 'managed') return user && c.ownerId === user.uid;
                                if (mapFilter === 'participated') return user && c.participants?.includes(user.uid);
                                return true;
                            }).map(c => {
                                let pos = c.coordinates || approxCoords[c.id];
                                if (!pos || (typeof pos === 'object' && Object.keys(pos).length === 0)) return null;

                                const lat = typeof pos.latitude === 'number' ? pos.latitude : pos.lat;
                                const lng = typeof pos.longitude === 'number' ? pos.longitude : pos.lng;

                                if (typeof lat !== 'number' || typeof lng !== 'number') return null;

                                return (
                                    <Marker
                                        key={c.id}
                                        position={[lat, lng]}
                                    >
                                        <Popup className="premium-popup" minWidth={280}>
                                            <div className="overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
                                                {/* Header Image or Gradient */}
                                                <div className="h-24 bg-gradient-to-br from-emerald-500 to-teal-600 relative">
                                                    <div className="absolute inset-0 bg-black/20"></div>
                                                    <div className="absolute bottom-4 left-4 right-4">
                                                        <div className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase mb-1 ${c.status === 'active' ? 'bg-emerald-400 text-emerald-950' : 'bg-slate-700 text-slate-300'}`}>
                                                            {c.status === 'active' ? '● EN CURSO' : 'FINALIZADA'}
                                                        </div>
                                                        <h4 className="font-black text-white text-lg leading-tight uppercase tracking-tight line-clamp-1">{c.name}</h4>
                                                    </div>
                                                </div>

                                                <div className="p-5">
                                                    <div className="flex items-center justify-between gap-4 mb-4">
                                                        <div className="flex items-center gap-2 text-slate-400">
                                                            <div className="p-1.5 bg-slate-800 rounded-lg">
                                                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-slate-500 uppercase leading-none mb-0.5">Fecha</span>
                                                                <span className="text-xs font-bold text-slate-300">{formatDate(c.createdAt)}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                                                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black text-emerald-500 uppercase leading-none mb-0.5">Golpes</span>
                                                                <span className="text-sm font-black text-emerald-400">{campaignStats[c.id]?.totalHoles || 0}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="text-slate-400 text-[11px] mb-6 line-clamp-2 leading-relaxed font-medium">
                                                        {c.description || 'Ayuda a reconstruir el ecosistema sembrando especies autóctonas en esta zona con seguimiento en tiempo real.'}
                                                    </p>

                                                    <button
                                                        onClick={() => onSelectCampaign(c)}
                                                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group active:scale-[0.98]"
                                                    >
                                                        <span>ACCEDER A LA JORNADA</span>
                                                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>

                        {!user && (
                            <div className="absolute inset-x-0 bottom-8 flex justify-center z-[1000]">
                                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-4">
                                    <span className="text-sm text-slate-300">¿Quieres unirte a una jornada privada?</span>
                                    <button
                                        onClick={onLoginClick}
                                        className="text-emerald-400 font-bold text-sm hover:text-emerald-300 transition-colors"
                                    >
                                        Inicia sesión ahora
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* List Section */}
                <div className="space-y-12">
                    {(() => {
                        const managed = campaigns.filter(c => user && c.ownerId === user.uid);
                        const participated = campaigns.filter(c => user && c.participants?.includes(user.uid) && c.ownerId !== user.uid);
                        const activePublic = campaigns.filter(c => c.status === 'active' && !(user && (c.ownerId === user.uid || c.participants?.includes(user.uid))));
                        const finalized = campaigns.filter(c => c.status !== 'active' && !(user && (c.ownerId === user.uid || c.participants?.includes(user.uid))));

                        const renderCampaignCard = (c) => (
                            <div
                                key={c.id}
                                onClick={() => onSelectCampaign(c)}
                                className="group bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 hover:border-emerald-500/50 rounded-3xl p-6 transition-all cursor-pointer transform hover:-translate-y-1"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                                        {c.status === 'active' ? '● ACTIVA' : 'FINALIZADA'}
                                    </div>
                                    {c.visibility === 'private' && (
                                        <div className="text-slate-500">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <h4 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors uppercase">{c.name}</h4>
                                <p className="text-slate-400 text-sm line-clamp-2 mb-6">{c.description || 'Contribuir a la plantación y seguimiento de especies autóctonas.'}</p>

                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center space-x-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>Elche, España</span>
                                    </div>
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center">
                                                <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-500/50 to-teal-500/50"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );

                        const renderSection = (title, items, colorClass = "bg-teal-500") => {
                            if (items.length === 0) return null;
                            return (
                                <div key={title}>
                                    <h3 className="text-2xl font-bold mb-8 flex items-center space-x-2">
                                        <span className={`w-2 h-8 ${colorClass} rounded-full mr-1`}></span>
                                        <span>{title}</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {items.map(renderCampaignCard)}
                                    </div>
                                </div>
                            );
                        };

                        const groups = [];
                        if (user) {
                            groups.push({ title: "Jornadas que Administras", items: managed, color: "bg-purple-500" });
                            groups.push({ title: "Jornadas en las que Participas", items: participated, color: "bg-blue-500" });
                            groups.push({ title: "Otras Jornadas Activas", items: activePublic, color: "bg-emerald-500" });
                        } else {
                            groups.push({ title: "Jornadas Activas", items: activePublic, color: "bg-emerald-500" });
                        }
                        groups.push({ title: "Jornadas Finalizadas", items: finalized, color: "bg-slate-500" });

                        const visibleGroups = groups.filter(g => g.items.length > 0);

                        if (visibleGroups.length === 0 && !loading) {
                            return (
                                <div className="col-span-full py-12 text-center bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
                                    <p className="text-slate-500">No hay jornadas disponibles actualmente. ¡Inicia sesión para crear una!</p>
                                </div>
                            );
                        }

                        return visibleGroups.map(g => renderSection(g.title, g.items, g.color));
                    })()}
                </div>
            </main>
        </div>
    );
};

export default LandingPage;
