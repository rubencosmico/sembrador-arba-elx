import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getFirestore, collection, addDoc, onSnapshot,
    query, orderBy, serverTimestamp, doc, updateDoc, arrayUnion
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
    Sprout, Users, ClipboardList, MapPin,
    PlusCircle, Save, ArrowRight, CheckCircle,
    Leaf, Info, History, AlertTriangle,
    Check, ChevronRight, Compass, Shield, IterationCcw, LogOut
} from 'lucide-react';

// --- GESTIÓN DE CONFIGURACIÓN (Híbrida: Chat + Vercel) ---
const getFirebaseConfig = () => {
    // 1. Entorno Chat (Inyectado)
    if (typeof __firebase_config !== 'undefined') {
        return JSON.parse(__firebase_config || '{}');
    }
    // 2. Entorno Vite/Vercel (Variables de Entorno)
    // Nota: En Vercel deberás crear una variable VITE_FIREBASE_CONFIG con el JSON completo
    if (import.meta.env && import.meta.env.VITE_FIREBASE_CONFIG) {
        try {
            return JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
        } catch (e) {
            console.error("Error parseando VITE_FIREBASE_CONFIG", e);
            return {};
        }
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

// Inicialización segura
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- COMPONENTES ---

const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-[#f1f5f0] text-emerald-800">
        <div className="relative">
            <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <Sprout className="w-10 h-10 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="mt-6 font-semibold tracking-wide animate-pulse-subtle">Sincronizando con la tierra...</p>
    </div>
);

const WelcomeScreen = ({ setRole }) => (
    <div className="relative flex flex-col items-center justify-center h-screen bg-[#f1f5f0] p-6 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-700"></div>

        <div className="relative z-10 text-center space-y-2 mb-12 animate-slideUp">
            <div className="inline-flex p-4 rounded-3xl glass-card mb-4 text-emerald-700">
                <Leaf size={48} strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-extrabold text-emerald-950 tracking-tight">
                Sembrador <span className="text-emerald-600">ARBA</span>
            </h1>
            <p className="text-emerald-800/60 font-medium">Gestión inteligente de regeneración</p>
        </div>

        <div className="relative z-10 w-full max-w-sm space-y-4 animate-slideUp [animation-delay:200ms]">
            <button
                onClick={() => setRole('coordinator')}
                className="btn-premium w-full group flex items-center p-1 rounded-3xl bg-white border border-emerald-100 hover:border-emerald-500 transition-all hover:scale-[1.02]"
            >
                <div className="bg-emerald-600 text-white p-4 rounded-2xl group-hover:bg-emerald-700 transition-colors shadow-lg">
                    <ClipboardList size={24} />
                </div>
                <div className="flex-1 text-left pl-4">
                    <div className="text-emerald-950 font-bold text-lg">Soy Coordinador</div>
                    <div className="text-emerald-800/50 text-xs font-semibold">Gestionar semillas y equipos</div>
                </div>
                <div className="pr-4 text-emerald-200 group-hover:text-emerald-500 transition-colors">
                    <ArrowRight size={20} />
                </div>
            </button>

            <button
                onClick={() => setRole('sower')}
                className="btn-premium w-full group flex items-center p-1 rounded-3xl bg-white border border-amber-100 hover:border-amber-500 transition-all hover:scale-[1.02]"
            >
                <div className="bg-amber-600 text-white p-4 rounded-2xl group-hover:bg-amber-700 transition-colors shadow-lg">
                    <Users size={24} />
                </div>
                <div className="flex-1 text-left pl-4">
                    <div className="text-emerald-950 font-bold text-lg">Soy Sembrador</div>
                    <div className="text-emerald-800/50 text-xs font-semibold">Registrar golpes en campo</div>
                </div>
                <div className="pr-4 text-emerald-100 group-hover:text-amber-500 transition-colors">
                    <ArrowRight size={20} />
                </div>
            </button>
        </div>

        <div className="absolute bottom-8 text-[10px] font-bold text-emerald-900/40 uppercase tracking-[0.2em]">
            ARBA Elx • Edición Rediseño 2025
        </div>
    </div>
);

// --- VISTA COORDINADOR ---
const CoordinatorView = ({ seeds, groups, onResetRole }) => {
    const [newSeed, setNewSeed] = useState({ species: '', provider: '', treatment: '', quantity: '' });
    const [newGroup, setNewGroup] = useState('');
    const [activeTab, setActiveTab] = useState('seeds');

    const handleAddSeed = async (e) => {
        e.preventDefault();
        if (!newSeed.species) return;
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'seeds'), {
                ...newSeed,
                createdAt: serverTimestamp(),
            });
            setNewSeed({ species: '', provider: '', treatment: '', quantity: '' });
            // alert('Semilla añadida'); // Comentado para flujo más rápido
        } catch (error) {
            console.error("Error", error);
        }
    };

    const handleAddGroup = async (e) => {
        e.preventDefault();
        if (!newGroup) return;
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'groups'), {
                name: newGroup,
                assignedSeeds: [],
                createdAt: serverTimestamp()
            });
            setNewGroup('');
        } catch (error) { console.error(error); }
    };

    const assignSeedToGroup = async (groupId, seedId) => {
        const groupRef = doc(db, 'artifacts', appId, 'public', 'data', 'groups', groupId);
        await updateDoc(groupRef, {
            assignedSeeds: arrayUnion(seedId)
        });
    };

    return (
        <div className="min-h-screen bg-[#f1f5f0] pb-24 font-sans">
            <header className="glass-card sticky top-0 z-30 px-6 py-4 flex justify-between items-center border-b border-emerald-100/50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onResetRole}
                        className="p-2 text-emerald-900/30 hover:text-emerald-900/60 transition-colors"
                        title="Cambiar Perfil"
                    >
                        <LogOut size={20} />
                    </button>
                    <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-md">
                        <ClipboardList size={20} />
                    </div>
                    <div>
                        <h2 className="text-emerald-950 font-bold leading-tight">Panel de Control</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-wider">Sistema Activo</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="p-4 max-w-2xl mx-auto space-y-6">
                <div className="bg-emerald-900/5 p-1 rounded-2xl flex border border-emerald-900/5">
                    {[
                        { id: 'seeds', label: 'Inventario', icon: Leaf },
                        { id: 'groups', label: 'Equipos', icon: Users },
                        { id: 'assign', label: 'Logística', icon: MapPin }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-white text-emerald-900 shadow-sm ring-1 ring-emerald-950/5'
                                : 'text-emerald-900/40 hover:text-emerald-900/70 hover:bg-white/50'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span className="hidden xs:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {activeTab === 'seeds' && (
                    <div className="space-y-6 animate-slideUp">
                        <section className="glass-card p-6 rounded-3xl shadow-sm border border-emerald-100/50">
                            <h3 className="text-lg font-bold text-emerald-950 mb-5 flex items-center gap-2">
                                <PlusCircle className="text-emerald-600" size={20} />
                                Registrar Lote
                            </h3>
                            <form onSubmit={handleAddSeed} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest px-1">Especie</label>
                                    <input placeholder="Ej: Algarrobo" className="w-full p-4 bg-emerald-900/5 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-medium" value={newSeed.species} onChange={e => setNewSeed({ ...newSeed, species: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest px-1">Origen</label>
                                        <input placeholder="Ej: Elena" className="w-full p-4 bg-emerald-900/5 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500/50 outline-none transition-all font-medium" value={newSeed.provider} onChange={e => setNewSeed({ ...newSeed, provider: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest px-1">Tratamiento</label>
                                        <input placeholder="Ej: Lijada" className="w-full p-4 bg-emerald-900/5 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500/50 outline-none transition-all font-medium" value={newSeed.treatment} onChange={e => setNewSeed({ ...newSeed, treatment: e.target.value })} />
                                    </div>
                                </div>
                                <button type="submit" className="btn-premium w-full bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mt-2">
                                    <Save size={18} />
                                    <span>Guardar en Inventario</span>
                                </button>
                            </form>
                        </section>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="font-bold text-emerald-950/40 uppercase text-[10px] tracking-widest">Existencias ({seeds.length})</h3>
                            </div>
                            <div className="grid gap-3">
                                {seeds.map(seed => (
                                    <div key={seed.id} className="glass-card p-4 rounded-2xl border border-emerald-100/30 flex justify-between items-center group hover:border-emerald-500/30 transition-all">
                                        <div>
                                            <div className="font-bold text-emerald-950">{seed.species}</div>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] font-bold bg-emerald-100/50 text-emerald-800 px-2 py-0.5 rounded-full">{seed.provider}</span>
                                                <span className="text-[10px] font-bold bg-amber-100/50 text-amber-800 px-2 py-0.5 rounded-full">{seed.treatment}</span>
                                            </div>
                                        </div>
                                        <Leaf size={16} className="text-emerald-100 group-hover:text-emerald-500 transition-colors" />
                                    </div>
                                ))}
                                {seeds.length === 0 && (
                                    <div className="text-center p-12 glass-card rounded-3xl border-dashed border-2 border-emerald-100">
                                        <Sprout className="mx-auto text-emerald-100 mb-2" size={32} />
                                        <p className="text-emerald-900/30 font-medium text-sm">El inventario está vacío</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'groups' && (
                    <div className="space-y-6 animate-slideUp">
                        <section className="glass-card p-6 rounded-3xl shadow-sm border border-emerald-100/50">
                            <h3 className="text-lg font-bold text-emerald-950 mb-5 flex items-center gap-2">
                                <Users className="text-emerald-600" size={20} />
                                Configurar Equipos
                            </h3>
                            <form onSubmit={handleAddGroup} className="flex gap-3">
                                <input placeholder="Nombre del equipo..." className="flex-1 p-4 bg-emerald-900/5 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500/50 outline-none transition-all font-medium" value={newGroup} onChange={e => setNewGroup(e.target.value)} />
                                <button type="submit" className="btn-premium bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-2xl font-bold">Crear</button>
                            </form>
                        </section>
                        <div className="grid gap-3">
                            {groups.map(group => (
                                <div key={group.id} className="glass-card p-5 rounded-2xl border border-emerald-100/30 flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                            {group.name.charAt(0)}
                                        </div>
                                        <span className="font-bold text-emerald-950">{group.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/5 text-[10px] font-bold text-emerald-800 uppercase tracking-tighter">
                                        <Leaf size={10} />
                                        <span>{group.assignedSeeds?.length || 0} lotes</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'assign' && (
                    <div className="space-y-6 animate-slideUp">
                        <div className="bg-emerald-600/10 p-4 rounded-2xl flex gap-3 text-sm text-emerald-800 border border-emerald-600/10">
                            <Info className="shrink-0 text-emerald-600" size={20} />
                            <p className="leading-tight font-medium">Gestiona la carga de cada equipo. Selecciona qué lotes de semillas llevarán en su mochila.</p>
                        </div>
                        {groups.map(group => (
                            <div key={group.id} className="glass-card p-6 rounded-3xl border border-emerald-100/30">
                                <h3 className="font-bold text-lg text-emerald-950 pb-4 mb-5 border-b border-emerald-100/50 flex justify-between items-center">
                                    {group.name}
                                    <Users size={18} className="text-emerald-100" />
                                </h3>

                                <div className="mb-6">
                                    <div className="flex flex-wrap gap-2">
                                        {group.assignedSeeds && group.assignedSeeds.length > 0 ? (
                                            group.assignedSeeds.map(sid => {
                                                const seed = seeds.find(s => s.id === sid);
                                                return seed ? (
                                                    <span key={sid} className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1.5 transition-all hover:bg-emerald-100">
                                                        <Leaf size={10} className="text-emerald-600" /> {seed.species}
                                                    </span>
                                                ) : null;
                                            })
                                        ) : (
                                            <div className="w-full py-4 text-center border-2 border-dashed border-emerald-50 rounded-2xl">
                                                <p className="text-emerald-800/30 text-xs italic font-semibold">Mochila vacía</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="relative group">
                                    <select
                                        className="w-full p-4 pl-5 border border-transparent rounded-2xl bg-emerald-900/5 text-sm font-bold text-emerald-900 appearance-none cursor-pointer hover:bg-emerald-100/50 hover:border-emerald-200 transition-all outline-none focus:ring-4 focus:ring-emerald-500/5"
                                        onChange={(e) => {
                                            if (e.target.value) assignSeedToGroup(group.id, e.target.value);
                                            e.target.value = "";
                                        }}
                                    >
                                        <option value="">+ Añadir semillas a mochila</option>
                                        {seeds.map(seed => (
                                            <option key={seed.id} value={seed.id}>
                                                {seed.species} ({seed.provider})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400 group-hover:text-emerald-600 transition-colors">
                                        <PlusCircle size={20} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- VISTA SEMBRADOR ---
const SowerView = ({ seeds, groups, userId, onResetRole }) => {
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [view, setView] = useState('form');

    const [formData, setFormData] = useState({
        seedId: '',
        microsite: 'Nodriza Viva',
        orientation: 'Norte',
        method: 'Con Sustrato',
        quantity: '1',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [myLogs, setMyLogs] = useState([]);
    const [gpsStatus, setGpsStatus] = useState('waiting'); // waiting, searching, success, error
    const [currentLocation, setCurrentLocation] = useState({ lat: null, lng: null, acc: null });

    useEffect(() => {
        if (!userId) return;
        // En Vercel no necesitamos limitar la colección, pero para mantener compatibilidad usamos paths limpios
        const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'logs'),
            orderBy('timestamp', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(log => log.userId === userId);
            setMyLogs(logs);
        }, (err) => console.log("Error logs", err)); // Fail silent en primera carga si no hay permisos
        return () => unsubscribe();
    }, [userId]);

    const captureGPS = async () => {
        if (!("geolocation" in navigator)) return;
        setGpsStatus('searching');
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 0
                });
            });
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                acc: position.coords.accuracy
            };
            setCurrentLocation(location);
            setGpsStatus('success');
            if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
            return location;
        } catch (err) {
            console.warn("GPS falló", err);
            setGpsStatus('error');
            return null;
        }
    };

    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    const mySeeds = selectedGroup ? seeds.filter(s => selectedGroup.assignedSeeds?.includes(s.id)) : [];

    const handleSow = async () => {
        if (!formData.seedId) {
            alert("⚠️ ¡Falta elegir la semilla!");
            return;
        }
        setIsSubmitting(true);

        let location = currentLocation;

        // Si no tenemos ubicación todavía, intentamos capturarla al vuelo
        if (!location.lat) {
            const captured = await captureGPS();
            if (captured) location = captured;
        }

        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), {
                ...formData,
                groupId: selectedGroupId,
                groupName: selectedGroup.name,
                userId,
                location,
                timestamp: serverTimestamp(),
                seedName: seeds.find(s => s.id === formData.seedId)?.species || 'Desconocida'
            });

            // Reset parcial (mantenemos contexto de sitio)
            setFormData(prev => ({ ...prev, quantity: 1, notes: '' }));
            setCurrentLocation({ lat: null, lng: null, acc: null });
            setGpsStatus('waiting');

            // Feedback táctil/visual si es posible
            if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(200);

        } catch (error) {
            alert("Error guardando: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!selectedGroupId) {
        return (
            <div className="min-h-screen bg-[#f1f5f0] p-6 flex flex-col justify-center overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-emerald-500 to-emerald-700"></div>

                <div className="text-center mb-10 animate-slideUp">
                    <div className="inline-flex p-3 rounded-2xl bg-emerald-600 text-white shadow-xl mb-4 relative">
                        <Users size={32} />
                        <button
                            onClick={onResetRole}
                            className="absolute -top-2 -right-2 bg-white text-emerald-600 p-1.5 rounded-full shadow-lg border border-emerald-50 hover:bg-emerald-50 transition-colors"
                            title="Volver al inicio"
                        >
                            <LogOut size={14} />
                        </button>
                    </div>
                    <h2 className="text-3xl font-extrabold text-emerald-950 mb-2">Identifícate</h2>
                    <p className="text-emerald-800/50 font-medium px-4">Selecciona tu equipo para cargar la mochila digital</p>
                </div>

                <div className="grid gap-4 max-w-md mx-auto w-full animate-slideUp [animation-delay:200ms]">
                    {groups.map((group, idx) => (
                        <button
                            key={group.id}
                            onClick={() => setSelectedGroupId(group.id)}
                            className="btn-premium group relative bg-white border border-emerald-100 p-6 rounded-3xl flex items-center gap-4 hover:shadow-2xl hover:border-emerald-500 transition-all active:scale-[0.98]"
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                                <Users size={24} />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-xl font-extrabold text-emerald-950 group-hover:text-emerald-700 transition-colors">{group.name}</div>
                                <div className="text-emerald-800/40 text-xs font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                    <Leaf size={12} className="text-emerald-400" />
                                    {group.assignedSeeds?.length || 0} Variedades en mochila
                                </div>
                            </div>
                            <ArrowRight className="text-emerald-100 group-hover:text-emerald-500 transition-colors" size={24} />
                        </button>
                    ))}
                </div>

                {groups.length === 0 && (
                    <div className="text-center glass-card p-10 rounded-3xl max-w-sm mx-auto animate-slideUp border-dashed border-2 border-emerald-100">
                        <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="text-amber-500" size={32} />
                        </div>
                        <p className="text-emerald-950 font-bold mb-1">Sin misiones activas</p>
                        <p className="text-emerald-800/40 text-xs font-medium">El coordinador debe configurar los equipos primero.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f1f5f0] pb-28 font-sans">
            <header className="glass-card sticky top-0 z-30 px-6 py-4 flex justify-between items-end border-b border-amber-100/50">
                <div className="flex gap-4 items-end">
                    <button
                        onClick={() => setSelectedGroupId(null)}
                        className="mb-1 text-emerald-950/30 hover:text-emerald-950/60 transition-colors"
                        title="Cambiar Equipo"
                    >
                        <LogOut size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold text-amber-900/40 uppercase tracking-widest">Misión en curso</span>
                        </div>
                        <h2 className="text-xl font-extrabold text-emerald-950 leading-none">{selectedGroup.name}</h2>
                    </div>
                </div>
                <div className="bg-emerald-950 text-white px-4 py-2 rounded-2xl shadow-lg border border-emerald-800 flex flex-col items-center min-w-[70px]">
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-emerald-400">Hoyos</span>
                    <span className="text-xl font-black leading-none">{myLogs.length}</span>
                </div>
            </header>

            {/* Bottom Navigation */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
                <div className="glass-card p-1.5 rounded-[2.5rem] flex items-center shadow-2xl border border-emerald-100/30">
                    <button
                        onClick={() => setView('form')}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-[2rem] transition-all duration-300 ${view === 'form' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-900/40 hover:text-emerald-900/60'}`}
                    >
                        <PlusCircle size={20} />
                        <span className="text-[10px] font-bold uppercase">Siembra</span>
                    </button>
                    <button
                        onClick={() => setView('history')}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-[2rem] transition-all duration-300 ${view === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-900/40 hover:text-emerald-900/60'}`}
                    >
                        <History size={20} />
                        <span className="text-[10px] font-bold uppercase">Cuaderno</span>
                    </button>
                </div>
            </div>

            {view === 'form' && (
                <div className="px-5 space-y-8 animate-slideUp pb-12">
                    {/* SELECCIÓN SEMILLA */}
                    <section className="mt-4">
                        <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-3 px-1">1. ¿Qué estás sembrando?</label>
                        <div className="grid gap-3">
                            {mySeeds.map(seed => (
                                <button
                                    key={seed.id}
                                    onClick={() => setFormData({ ...formData, seedId: seed.id })}
                                    className={`btn-premium group flex items-center p-4 rounded-3xl border-2 transition-all relative overflow-hidden ${formData.seedId === seed.id
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200'
                                        : 'bg-white border-emerald-100/50 text-emerald-950 hover:border-emerald-300'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${formData.seedId === seed.id ? 'bg-emerald-500/50' : 'bg-emerald-50 text-emerald-600'}`}>
                                        <Leaf size={24} />
                                    </div>
                                    <div className="flex-1 text-left pl-4 relative z-10">
                                        <div className="font-extrabold text-lg leading-tight uppercase tracking-tight">{seed.species}</div>
                                        <div className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${formData.seedId === seed.id ? 'text-emerald-200' : 'text-emerald-800/30'}`}>
                                            {seed.provider} • {seed.treatment}
                                        </div>
                                    </div>
                                    {formData.seedId === seed.id && (
                                        <div className="bg-white/20 p-1 rounded-full flex items-center justify-center">
                                            <Check size={16} />
                                        </div>
                                    )}
                                </button>
                            ))}
                            {mySeeds.length === 0 && (
                                <div className="glass-card p-6 rounded-3xl border-dashed border-2 border-red-100 flex flex-col items-center gap-2 text-center">
                                    <AlertTriangle className="text-red-400" size={32} />
                                    <p className="text-red-900 font-bold text-sm">Tu mochila está vacía</p>
                                    <p className="text-red-800/40 text-xs font-medium">No tienes semillas asignadas por el coordinador.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* DATOS GOLPE */}
                    <div className="space-y-6">
                        <section className="glass-card p-6 rounded-3xl shadow-sm border border-emerald-100/30 space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-4">2. Micrositio</label>
                                <div className="flex p-1.5 bg-emerald-900/5 rounded-2xl">
                                    {['Nodriza Viva', 'Nodriza Muerta', 'Alcorque'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setFormData({ ...formData, microsite: m })}
                                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all ${formData.microsite === m
                                                ? 'bg-white text-emerald-900 shadow-sm'
                                                : 'text-emerald-900/40'
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="animate-slideUp border-t border-emerald-100/20 pt-4">
                                <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-4">Orientación respecto al micrositio</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {['Norte', 'Este', 'Sur', 'Oeste'].map(o => (
                                        <button
                                            key={o}
                                            onClick={() => setFormData({ ...formData, orientation: o })}
                                            className={`py-4 rounded-2xl text-xs font-black uppercase border-2 transition-all flex flex-col items-center gap-1 ${formData.orientation === o
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                                                : 'bg-emerald-900/5 border-transparent text-emerald-900/40'
                                                }`}
                                        >
                                            <Compass size={14} className={formData.orientation === o ? 'text-white' : 'text-emerald-200'} />
                                            {o.charAt(0)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-4">3. ¿Cómo es el golpe?</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setFormData({ ...formData, method: formData.method === 'Protector' ? 'Directo' : 'Protector' })}
                                        className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 font-bold text-xs ${formData.method === 'Protector'
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                            : 'bg-white border-emerald-100 text-emerald-900/40'
                                            }`}
                                    >
                                        <Shield size={16} />
                                        {formData.method === 'Protector' ? 'Protector ON' : 'Sin Protector'}
                                    </button>
                                    <div className="flex bg-emerald-900/5 rounded-2xl p-1 gap-1 relative group">
                                        <div className="absolute -top-4 left-1 text-[8px] font-black text-emerald-800/20 uppercase tracking-widest bg-white px-1">Semillas por golpe</div>
                                        {[1, 2, 3].map(n => (
                                            <button
                                                key={n}
                                                onClick={() => setFormData({ ...formData, quantity: n })}
                                                className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${formData.quantity === n
                                                    ? 'bg-emerald-950 text-white shadow-sm'
                                                    : 'text-emerald-950/20 hover:text-emerald-950/40'
                                                    }`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <textarea
                                placeholder="Notas del terreno (opcional)..."
                                className="w-full p-4 bg-emerald-900/5 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500/50 outline-none transition-all font-medium text-sm min-h-[80px]"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />

                            {/* EXPLICIT GPS CAPTURE */}
                            <div className="pt-2">
                                <button
                                    onClick={captureGPS}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${gpsStatus === 'success'
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                        : gpsStatus === 'searching'
                                            ? 'bg-amber-50 border-amber-500 text-amber-700 animate-pulse'
                                            : 'bg-white border-emerald-100 text-emerald-900/40 hover:border-emerald-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${gpsStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                                            <MapPin size={20} className={gpsStatus === 'searching' ? 'animate-bounce' : ''} />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xs font-black uppercase tracking-tight">Geoposicionar Hoyo</div>
                                            <div className="text-[10px] font-bold opacity-60">
                                                {gpsStatus === 'success'
                                                    ? `Precisión: ${currentLocation.acc?.toFixed(1)}m`
                                                    : gpsStatus === 'searching'
                                                        ? 'Capturando señal...'
                                                        : 'Toca para precisión GPS'}
                                            </div>
                                        </div>
                                    </div>
                                    {gpsStatus === 'success' && <Check size={20} className="text-emerald-500" />}
                                </button>
                            </div>
                        </section>

                        <button
                            disabled={!formData.seedId || isSubmitting}
                            onClick={handleSow}
                            className={`btn-premium w-full py-6 rounded-3xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-[0.95] ${formData.seedId ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-200'}`}
                        >
                            {isSubmitting ? (
                                <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></span>
                            ) : (
                                <>
                                    <MapPin size={24} className={gpsStatus === 'success' ? 'text-emerald-300' : 'text-white/50'} />
                                    <span>Registrar Golpe</span>
                                </>
                            )}
                        </button>
                    </div>

                    {!formData.seedId && <p className="text-center text-[10px] text-amber-600 font-black uppercase tracking-widest animate-pulse">👆 Selecciona una semilla para activar</p>}
                </div>
            )}

            {view === 'history' && (
                <div className="px-5 space-y-4 animate-slideUp pb-12">
                    {myLogs.length === 0 && (
                        <div className="text-center py-20 glass-card rounded-[2.5rem] border-dashed border-2 border-emerald-100 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-200">
                                <History size={32} />
                            </div>
                            <div>
                                <p className="text-emerald-950 font-bold">Tu cuaderno está vacío</p>
                                <p className="text-emerald-800/40 text-xs font-medium">Registra tu primera siembra hoy.</p>
                            </div>
                        </div>
                    )}
                    <div className="grid gap-3">
                        {myLogs.map(log => (
                            <div key={log.id} className="glass-card p-5 rounded-3xl border border-emerald-100/30 flex gap-4 items-center group transition-all hover:bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
                                <div className="w-12 h-12 bg-emerald-900/5 rounded-2xl flex flex-col items-center justify-center text-emerald-900/30 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <MapPin size={18} />
                                    <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="font-extrabold text-emerald-950 truncate uppercase tracking-tight leading-none">{log.seedName}</h4>
                                        <span className="shrink-0 text-[8px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">{log.microsite.replace('Nodriza', 'N.')}</span>
                                    </div>
                                    <div className="text-[9px] font-bold text-emerald-800/40 uppercase tracking-widest flex items-center gap-2 mt-1">
                                        <span className="flex items-center gap-1"><IterationCcw size={10} /> {log.quantity}</span>
                                        <span>•</span>
                                        <span className="text-amber-600/60 font-black">{log.orientation || 'CENTRO'}</span>
                                        {log.location?.acc && (
                                            <>
                                                <span>•</span>
                                                <span className="text-emerald-500/50 flex items-center gap-0.5">GPS <Check size={8} /></span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-emerald-50 w-8 h-8 rounded-full flex items-center justify-center text-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function App() {
    const [role, setRole] = useState(null);
    const [user, setUser] = useState(null);
    const [seeds, setSeeds] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Auth Error", error);
            }
        };
        initAuth();

        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;

        // Rutas dinámicas basadas en appId para flexibilidad
        const seedsRef = collection(db, 'artifacts', appId, 'public', 'data', 'seeds');
        const groupsRef = collection(db, 'artifacts', appId, 'public', 'data', 'groups');

        const unsubSeeds = onSnapshot(seedsRef, (snap) => {
            setSeeds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.error("Error seeds", err));

        const unsubGroups = onSnapshot(groupsRef, (snap) => {
            setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.error("Error groups", err));

        return () => { unsubSeeds(); unsubGroups(); };
    }, [user]);

    if (loading) return <LoadingScreen />;
    if (!role) return <WelcomeScreen setRole={setRole} />;
    if (role === 'coordinator') return <CoordinatorView seeds={seeds} groups={groups} onResetRole={() => setRole(null)} />;
    if (role === 'sower') return <SowerView seeds={seeds} groups={groups} userId={user.uid} onResetRole={() => setRole(null)} />;
    return <div>Error de estado</div>;
}