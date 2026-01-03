import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, onSnapshot, or } from 'firebase/firestore';
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
    onSelectCampaign, onLoginClick, onClaimClick, onAdminClick, onLogout,
    onMessagesClick, onSocialClick
}) => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);

    useEffect(() => {
        const dataPath = ['artifacts', appId, 'public', 'data', 'campaigns'];

        let q;
        if (user) {
            q = query(
                collection(db, ...dataPath),
                or(
                    where('visibility', '==', 'public'),
                    where('ownerId', '==', user.uid),
                    where('participants', 'array-contains', user.uid)
                )
            );
        } else {
            q = query(
                collection(db, ...dataPath),
                where('visibility', '==', 'public')
            );
        }

        const unsubscribe = onSnapshot(q, (snap) => {
            const allCampaigns = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const visibleCampaigns = allCampaigns.filter(c => {
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
    }, [user, appId]);

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-emerald-500/30">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center transition-all">
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
                                className="flex items-center space-x-3 bg-slate-800/50 hover:bg-slate-800 rounded-full pl-2 pr-4 py-1.5 border border-slate-700/50 cursor-pointer transition-all"
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
                                <div className="absolute top-12 right-0 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-2 animate-fade-in z-[1001]">
                                    <div className="p-3 mb-2 border-b border-slate-700/50">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ajustes / Perfil</div>
                                    </div>
                                    <button
                                        onClick={() => { setShowUserMenu(false); onSocialClick(); }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-700/50 text-sm flex items-center space-x-3 transition-colors text-teal-400 font-bold"
                                    >
                                        <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span>Comunidad</span>
                                    </button>

                                    <button
                                        onClick={() => { setShowUserMenu(false); onMessagesClick(); }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-700/50 text-sm flex items-center space-x-3 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                        <span>Mensajes</span>
                                    </button>

                                    <button
                                        onClick={() => { setShowUserMenu(false); onClaimClick(); }}
                                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-700/50 text-sm flex items-center space-x-3 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <span>Reclamar Registros</span>
                                    </button>

                                    {isSuperAdmin && (
                                        <button
                                            onClick={() => { setShowUserMenu(false); onAdminClick(); }}
                                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-700/50 text-sm flex items-center space-x-3 transition-colors text-emerald-400 font-bold"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                            <span>Panel Admin</span>
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
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold flex items-center space-x-2">
                            <span className="w-2 h-8 bg-emerald-500 rounded-full mr-1"></span>
                            <span>Explora las Jornadas</span>
                        </h3>
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
                            {campaigns.map(c => (
                                c.coordinates && (
                                    <Marker
                                        key={c.id}
                                        position={[c.coordinates.lat, c.coordinates.lng]}
                                        eventHandlers={{
                                            click: () => onSelectCampaign(c),
                                        }}
                                    >
                                        <Popup className="premium-popup">
                                            <div className="p-2">
                                                <h4 className="font-bold text-slate-900">{c.name}</h4>
                                                <p className="text-xs text-slate-600 mb-2 truncate max-w-[150px]">{c.description || 'Sin descripción'}</p>
                                                <button
                                                    onClick={() => onSelectCampaign(c)}
                                                    className="w-full bg-emerald-500 text-white text-[10px] font-bold py-1 px-2 rounded-lg hover:bg-emerald-600 transition-colors"
                                                >
                                                    VER DETALLES
                                                </button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )
                            ))}
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
                <div>
                    <h3 className="text-2xl font-bold mb-8 flex items-center space-x-2">
                        <span className="w-2 h-8 bg-teal-500 rounded-full mr-1"></span>
                        <span>Jornadas Activas</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.length === 0 && !loading && (
                            <div className="col-span-full py-12 text-center bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
                                <p className="text-slate-500">No hay jornadas públicas actualmente. ¡Inicia sesión para crear una!</p>
                            </div>
                        )}

                        {campaigns.map(c => (
                            <div
                                key={c.id}
                                onClick={() => onSelectCampaign(c)}
                                className="group bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 hover:border-emerald-500/50 rounded-3xl p-6 transition-all cursor-pointer transform hover:-translate-y-1"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-400'
                                        }`}>
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
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LandingPage;
