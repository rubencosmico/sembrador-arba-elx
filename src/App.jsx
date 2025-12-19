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
    Leaf, Info, History, AlertTriangle
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
    <div className="flex flex-col items-center justify-center h-screen bg-green-50 text-green-800">
        <Sprout className="w-12 h-12 animate-bounce mb-4" />
        <p className="font-medium">Cargando Sembrador...</p>
    </div>
);

const WelcomeScreen = ({ setRole }) => (
    <div className="flex flex-col items-center justify-center h-screen bg-green-50 p-6 space-y-8">
        <div className="text-center">
            <div className="bg-green-600 text-white p-4 rounded-full inline-block mb-4 shadow-xl">
                <Sprout size={48} />
            </div>
            <h1 className="text-3xl font-bold text-green-900 tracking-tight">Sembradores ARBA</h1>
            <p className="text-green-700 mt-2 font-medium">Gestión de siembra y regeneración</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
            <button
                onClick={() => setRole('coordinator')}
                className="w-full group relative flex items-center justify-center space-x-3 bg-green-700 hover:bg-green-800 text-white p-5 rounded-2xl shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0"
            >
                <div className="absolute left-6 bg-green-800 p-2 rounded-lg group-hover:bg-green-600 transition-colors">
                    <ClipboardList size={24} />
                </div>
                <span className="text-lg font-bold pl-8">Soy Coordinador</span>
            </button>

            <button
                onClick={() => setRole('sower')}
                className="w-full group relative flex items-center justify-center space-x-3 bg-amber-600 hover:bg-amber-700 text-white p-5 rounded-2xl shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0"
            >
                <div className="absolute left-6 bg-amber-700 p-2 rounded-lg group-hover:bg-amber-500 transition-colors">
                    <Users size={24} />
                </div>
                <span className="text-lg font-bold pl-8">Soy Sembrador</span>
            </button>
        </div>

        <div className="text-xs text-gray-400 mt-8 text-center max-w-xs">
            v2.0 • Sincronización en la nube habilitada
        </div>
    </div>
);

// --- VISTA COORDINADOR ---
const CoordinatorView = ({ seeds, groups }) => {
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
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <header className="bg-green-800 text-white p-4 shadow-lg sticky top-0 z-10 flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <ClipboardList className="text-green-300" />
                    Panel Coordinador
                </h2>
                <span className="text-xs bg-green-900 px-2 py-1 rounded text-green-100">En línea</span>
            </header>

            <div className="p-4 max-w-lg mx-auto">
                <div className="flex bg-white p-1 rounded-xl shadow-sm mb-6 border border-gray-100">
                    {['seeds', 'groups', 'assign'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === tab
                                    ? 'bg-green-100 text-green-800 shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            {tab === 'seeds' ? 'Inventario' : tab === 'groups' ? 'Equipos' : 'Asignar'}
                        </button>
                    ))}
                </div>

                {activeTab === 'seeds' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="bg-green-100 p-1.5 rounded-md text-green-700"><PlusCircle size={18} /></span>
                                Registrar Lote
                            </h3>
                            <form onSubmit={handleAddSeed} className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Especie</label>
                                    <input placeholder="Ej: Algarrobo" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all" value={newSeed.species} onChange={e => setNewSeed({ ...newSeed, species: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Origen</label>
                                        <input placeholder="Ej: Elena" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500" value={newSeed.provider} onChange={e => setNewSeed({ ...newSeed, provider: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tratamiento</label>
                                        <input placeholder="Ej: Lijada" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-500" value={newSeed.treatment} onChange={e => setNewSeed({ ...newSeed, treatment: e.target.value })} />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all">
                                    Guardar en Inventario
                                </button>
                            </form>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold text-gray-700 pl-1">Inventario Actual ({seeds.length})</h3>
                            {seeds.map(seed => (
                                <div key={seed.id} className="bg-white p-4 rounded-xl border-l-4 border-green-500 shadow-sm flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-gray-800">{seed.species}</div>
                                        <div className="text-xs text-gray-500 font-medium flex gap-2 mt-1">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{seed.provider}</span>
                                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{seed.treatment}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {seeds.length === 0 && <div className="text-center p-8 text-gray-400 border-2 border-dashed rounded-xl">No hay semillas registradas aún</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'groups' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="bg-amber-100 p-1.5 rounded-md text-amber-700"><Users size={18} /></span>
                                Crear Equipo
                            </h3>
                            <form onSubmit={handleAddGroup} className="flex gap-2">
                                <input placeholder="Ej: Pareja A (Ana y Luis)" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" value={newGroup} onChange={e => setNewGroup(e.target.value)} />
                                <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-6 rounded-xl font-bold shadow-md">Crear</button>
                            </form>
                        </div>
                        <div className="space-y-3">
                            {groups.map(group => (
                                <div key={group.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                                    <span className="font-bold text-gray-800">{group.name}</span>
                                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${group.assignedSeeds?.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                        {group.assignedSeeds?.length || 0} lotes
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'assign' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-blue-50 p-3 rounded-lg flex gap-3 text-sm text-blue-800 mb-4">
                            <Info className="shrink-0" size={20} />
                            <p>Selecciona un equipo y añade las semillas que llevarán en su mochila.</p>
                        </div>
                        {groups.map(group => (
                            <div key={group.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                                <h3 className="font-bold text-lg text-gray-800 border-b border-gray-100 pb-3 mb-3 flex justify-between items-center">
                                    {group.name}
                                    <Users size={16} className="text-gray-400" />
                                </h3>

                                <div className="mb-4">
                                    <div className="flex flex-wrap gap-2">
                                        {group.assignedSeeds && group.assignedSeeds.length > 0 ? (
                                            group.assignedSeeds.map(sid => {
                                                const seed = seeds.find(s => s.id === sid);
                                                return seed ? (
                                                    <span key={sid} className="bg-green-50 text-green-800 text-xs font-bold px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                                                        <Leaf size={10} /> {seed.species} ({seed.provider})
                                                    </span>
                                                ) : null;
                                            })
                                        ) : <span className="text-gray-400 text-sm italic">Mochila vacía</span>}
                                    </div>
                                </div>

                                <div className="relative">
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm appearance-none cursor-pointer hover:border-green-400 transition-colors"
                                        onChange={(e) => {
                                            if (e.target.value) assignSeedToGroup(group.id, e.target.value);
                                            e.target.value = "";
                                        }}
                                    >
                                        <option value="">+ Añadir semilla a la mochila...</option>
                                        {seeds.map(seed => (
                                            <option key={seed.id} value={seed.id}>
                                                {seed.species} - {seed.provider} ({seed.treatment})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                                        <PlusCircle size={16} />
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
const SowerView = ({ seeds, groups, userId }) => {
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
    const [gpsStatus, setGpsStatus] = useState('waiting'); // waiting, success, error

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

    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    const mySeeds = selectedGroup ? seeds.filter(s => selectedGroup.assignedSeeds?.includes(s.id)) : [];

    const handleSow = async () => {
        if (!formData.seedId) {
            alert("⚠️ ¡Falta elegir la semilla!");
            return;
        }
        setIsSubmitting(true);
        setGpsStatus('searching');

        let location = { lat: null, lng: null, acc: null };

        // Intento de GPS rápido (5s timeout)
        if ("geolocation" in navigator) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    });
                });
                location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    acc: position.coords.accuracy
                };
                setGpsStatus('success');
            } catch (err) {
                console.warn("GPS falló, guardando sin coords", err);
                setGpsStatus('error');
            }
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
            setFormData(prev => ({ ...prev, quantity: '1', notes: '' }));

            // Feedback táctil/visual si es posible
            if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(200);

        } catch (error) {
            alert("Error guardando: " + error.message);
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setGpsStatus('waiting'), 2000);
        }
    };

    if (!selectedGroupId) {
        return (
            <div className="min-h-screen bg-green-50 p-6 flex flex-col justify-center">
                <h2 className="text-2xl font-bold text-green-900 mb-2 text-center">Identifícate</h2>
                <p className="text-center text-green-700 mb-8 text-sm">Selecciona tu equipo para cargar la mochila digital</p>
                <div className="grid gap-4 max-w-md mx-auto w-full">
                    {groups.map(group => (
                        <button
                            key={group.id}
                            onClick={() => setSelectedGroupId(group.id)}
                            className="bg-white p-6 rounded-2xl shadow-sm border-2 border-green-100 hover:border-green-500 hover:shadow-md transition-all text-left group"
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-xl text-green-900 group-hover:text-green-700">{group.name}</span>
                                <Users className="text-green-200 group-hover:text-green-500 transition-colors" />
                            </div>
                            <div className="text-gray-500 text-sm mt-2 flex items-center gap-2">
                                <Leaf size={14} /> {group.assignedSeeds?.length || 0} tipos de semillas
                            </div>
                        </button>
                    ))}
                </div>
                {groups.length === 0 && (
                    <div className="text-center bg-white p-6 rounded-xl shadow mt-4">
                        <AlertTriangle className="mx-auto text-amber-500 mb-2" />
                        <p className="text-gray-600">No hay equipos activos.</p>
                        <p className="text-xs text-gray-400 mt-1">El coordinador debe crearlos primero.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 pb-24 font-sans">
            <div className="bg-amber-600 text-white px-4 py-3 sticky top-0 z-20 shadow-lg flex justify-between items-end">
                <div>
                    <h2 className="font-bold text-lg leading-none">{selectedGroup.name}</h2>
                    <p className="text-amber-200 text-xs font-mono mt-1 opacity-80 uppercase tracking-widest">Sembrando</p>
                </div>
                <div className="bg-amber-700/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-amber-500/30 text-center min-w-[60px]">
                    <div className="text-xs text-amber-200 uppercase text-[10px]">Hoyos</div>
                    <div className="font-mono font-bold text-lg leading-none">{myLogs.length}</div>
                </div>
            </div>

            <div className="flex bg-white shadow-sm mb-4 border-b border-gray-200">
                <button
                    onClick={() => setView('form')}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${view === 'form' ? 'border-amber-600 text-amber-600 bg-amber-50/50' : 'border-transparent text-gray-400 hover:bg-gray-50'}`}
                >
                    Nueva Siembra
                </button>
                <button
                    onClick={() => setView('history')}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${view === 'history' ? 'border-amber-600 text-amber-600 bg-amber-50/50' : 'border-transparent text-gray-400 hover:bg-gray-50'}`}
                >
                    Historial
                </button>
            </div>

            {view === 'form' && (
                <div className="px-4 space-y-6 max-w-md mx-auto">
                    {/* SELECCIÓN SEMILLA */}
                    <section>
                        <div className="flex justify-between items-baseline mb-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">1. ¿Qué siembras?</label>
                            {formData.seedId && <span className="text-xs text-green-600 font-bold bg-green-100 px-2 rounded-full">Seleccionada</span>}
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {mySeeds.map(seed => (
                                <button
                                    key={seed.id}
                                    onClick={() => setFormData({ ...formData, seedId: seed.id })}
                                    className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${formData.seedId === seed.id
                                            ? 'border-green-600 bg-green-50 shadow-md ring-1 ring-green-600'
                                            : 'border-white bg-white shadow-sm hover:border-green-200'
                                        }`}
                                >
                                    <div className="relative z-10">
                                        <div className={`font-bold text-lg ${formData.seedId === seed.id ? 'text-green-900' : 'text-gray-700'}`}>{seed.species}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                            <span className="bg-gray-100 px-1.5 rounded">{seed.provider}</span>
                                            <span>•</span>
                                            <span className="italic">{seed.treatment}</span>
                                        </div>
                                    </div>
                                    {formData.seedId === seed.id && (
                                        <div className="absolute right-0 bottom-0 text-green-200 opacity-20 -mb-4 -mr-4">
                                            <Leaf size={80} />
                                        </div>
                                    )}
                                </button>
                            ))}
                            {mySeeds.length === 0 && (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-800 text-sm flex gap-2 items-center">
                                    <AlertTriangle size={20} />
                                    Tu mochila está vacía. Pide al coordinador que te asigne semillas.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* DATOS GOLPE */}
                    <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-2">2. Micrositio</label>
                            <div className="flex p-1 bg-gray-100 rounded-lg">
                                {['Nodriza Viva', 'Nodriza Muerta', 'Alcorque'].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setFormData({ ...formData, microsite: m })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${formData.microsite === m
                                                ? 'bg-white text-blue-700 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {m.replace('Nodriza', 'N.')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {(formData.microsite !== 'Nodriza Muerta') && (
                            <div className="animate-fadeIn">
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Orientación</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['Norte', 'Este', 'Sur', 'Oeste'].map(o => (
                                        <button
                                            key={o}
                                            onClick={() => setFormData({ ...formData, orientation: o })}
                                            className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${formData.orientation === o
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                    : 'border-transparent bg-gray-50 text-gray-500'
                                                }`}
                                        >
                                            {o.charAt(0)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">3. Método</label>
                                <select
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:border-amber-500 outline-none"
                                    value={formData.method}
                                    onChange={e => setFormData({ ...formData, method: e.target.value })}
                                >
                                    <option>Con Sustrato</option>
                                    <option>Sin Sustrato</option>
                                    <option>Semilla Seca</option>
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2 text-center">Cantidad</label>
                                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                                    <input
                                        type="number"
                                        className="w-full p-2.5 bg-transparent text-center font-bold text-lg outline-none"
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <input
                                placeholder="Nota (ej: suelo rocoso)..."
                                className="w-full p-3 bg-gray-50 rounded-lg text-sm border-transparent focus:bg-white focus:border-amber-300 border transition-all outline-none"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </section>

                    <button
                        onClick={handleSow}
                        disabled={isSubmitting || !formData.seedId}
                        className={`w-full py-4 rounded-2xl text-lg font-bold text-white shadow-xl transform active:scale-95 transition-all flex items-center justify-center space-x-3 overflow-hidden relative ${isSubmitting || !formData.seedId
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600'
                            }`}
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                {gpsStatus === 'searching' && <MapPin className="animate-bounce" size={20} />}
                                <span>Guardando...</span>
                            </div>
                        ) : (
                            <>
                                <div className="bg-white/20 p-1.5 rounded-full"><PlusCircle size={20} /></div>
                                <span>REGISTRAR GOLPE</span>
                            </>
                        )}

                        {/* Success indicator overlay */}
                        {gpsStatus === 'success' && (
                            <div className="absolute inset-0 bg-green-500 flex items-center justify-center animate-fadeIn">
                                <CheckCircle className="mr-2" /> ¡Guardado con GPS!
                            </div>
                        )}
                    </button>

                    {!formData.seedId && <p className="text-center text-xs text-amber-600 font-medium bg-amber-50 py-2 rounded-lg">👆 Selecciona una semilla arriba para empezar</p>}
                </div>
            )}

            {view === 'history' && (
                <div className="px-4 space-y-3 pb-8">
                    {myLogs.length === 0 && (
                        <div className="text-center py-12 opacity-50">
                            <History className="mx-auto mb-2" size={32} />
                            <p>Tu cuaderno de campo está vacío.</p>
                        </div>
                    )}
                    {myLogs.map(log => (
                        <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-start">
                            <div className="bg-amber-100 text-amber-700 font-bold text-xl w-12 h-12 flex items-center justify-center rounded-lg shrink-0">
                                {log.quantity}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-800 truncate">{log.seedName}</div>
                                <div className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-2">
                                    <span className="bg-blue-50 text-blue-700 px-1.5 rounded text-xs border border-blue-100">
                                        {log.microsite} {log.orientation && `• ${log.orientation}`}
                                    </span>
                                    <span className="text-xs text-gray-400 flex items-center">
                                        <MapPin size={10} className="mr-0.5" />
                                        {log.location?.acc ? `±${Math.round(log.location.acc)}m` : 'Sin GPS'}
                                    </span>
                                </div>
                                {log.notes && <div className="text-xs text-gray-400 italic mt-1">"{log.notes}"</div>}
                            </div>
                            <div className="text-xs font-mono text-gray-400 pt-1">
                                {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </div>
                        </div>
                    ))}
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
    if (role === 'coordinator') return <CoordinatorView seeds={seeds} groups={groups} />;
    if (role === 'sower') return <SowerView seeds={seeds} groups={groups} userId={user.uid} />;
    return <div>Error de estado</div>;
}