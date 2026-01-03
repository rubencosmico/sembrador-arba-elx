import React, { useState, useEffect } from 'react';
import {
    collection, query, orderBy, onSnapshot, addDoc,
    serverTimestamp, updateDoc, doc, where, getDocs
} from 'firebase/firestore';
import {
    PlusCircle, Power, Edit2, Check, X, ArrowLeft,
    Calendar, Globe, Lock, Link as LinkIcon, Users,
    Package, ArrowRight, UserPlus
} from 'lucide-react';

const CampaignManager = ({ db, appId, user, isSuperAdmin, onBack }) => {
    const [allCampaigns, setAllCampaigns] = useState([]);
    const [editingCampaign, setEditingCampaign] = useState(null); // Simple name edit
    const [selectedCampaignId, setSelectedCampaignId] = useState(null); // Deep management
    const [newCampaignName, setNewCampaignName] = useState('');
    const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

    // Deep Management State
    const [campSeeds, setCampSeeds] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [newSeedName, setNewSeedName] = useState('');
    const [newSeedQty, setNewSeedQty] = useState('');

    useEffect(() => {
        let q;
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'campaigns');

        if (isSuperAdmin) {
            q = query(colRef, orderBy('createdAt', 'desc'));
        } else {
            // For regular users, show their owned campaigns
            q = query(colRef, where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
        }

        const unsubscribe = onSnapshot(q, (snap) => {
            setAllCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribe();
    }, [db, appId, user.uid, isSuperAdmin]);

    // Load sub-data when a campaign is selected for deep management
    useEffect(() => {
        if (!selectedCampaignId) {
            setCampSeeds([]);
            setParticipants([]);
            return;
        }

        const dataPath = ['artifacts', appId, 'public', 'data'];

        // Seeds
        const qSeeds = query(collection(db, ...dataPath, 'seeds'), where('campaignId', '==', selectedCampaignId));
        const unsubSeeds = onSnapshot(qSeeds, (snap) => {
            setCampSeeds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Participants (fetch user profiles)
        const camp = allCampaigns.find(c => c.id === selectedCampaignId);
        if (camp?.participants?.length > 0) {
            const fetchParticipants = async () => {
                const uPros = [];
                for (const uid of camp.participants) {
                    const uDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', uid)));
                    if (!uDoc.empty) uPros.push({ uid, ...uDoc.docs[0].data() });
                }
                setParticipants(uPros);
            };
            fetchParticipants();
        }

        return () => unsubSeeds();
    }, [selectedCampaignId, db, appId, allCampaigns]);

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        if (!newCampaignName.trim()) return;
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'campaigns'), {
                name: newCampaignName,
                createdAt: serverTimestamp(),
                status: 'active',
                visibility: 'public',
                ownerId: user.uid,
                participants: [user.uid] // Owner is the first participant
            });
            setNewCampaignName('');
            setIsCreatingCampaign(false);
        } catch (e) {
            console.error(e);
            alert("Error creando jornada");
        }
    };

    const handleUpdateCampaign = async (id, data) => {
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'campaigns', id), data);
            setEditingCampaign(null);
        } catch (e) {
            console.error(e);
            alert("Error actualizando jornada");
        }
    };

    const handleAddSeed = async (e) => {
        e.preventDefault();
        if (!newSeedName || !newSeedQty) return;
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'seeds'), {
                campaignId: selectedCampaignId,
                name: newSeedName,
                totalQuantity: parseInt(newSeedQty),
                assignedSeeds: [], // To track distribution
                createdAt: serverTimestamp()
            });
            setNewSeedName('');
            setNewSeedQty('');
        } catch (e) {
            console.error(e);
        }
    };

    const handleAssignSeed = async (seedId, userId, qty) => {
        const seed = campSeeds.find(s => s.id === seedId);
        const currentAssignments = seed.assignedSeeds || [];

        // Update or add assignment
        const newAssignments = [...currentAssignments.filter(a => a.userId !== userId)];
        if (qty > 0) {
            newAssignments.push({ userId, quantity: parseInt(qty) });
        }

        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'seeds', seedId), {
                assignedSeeds: newAssignments
            });
        } catch (e) {
            console.error(e);
        }
    };

    // Deep Management View
    if (selectedCampaignId) {
        const camp = allCampaigns.find(c => c.id === selectedCampaignId);
        return (
            <div className="min-h-screen bg-slate-900 text-white p-6 font-sans pb-20">
                <header className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedCampaignId(null)} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
                            <ArrowLeft />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold">{camp?.name}</h2>
                            <p className="text-xs text-slate-500">Mestión de recursos y participantes</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Seeds Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Package className="text-emerald-500" /> Semillas Disponibles
                            </h3>
                        </div>

                        <form onSubmit={handleAddSeed} className="flex gap-2">
                            <input
                                placeholder="Especie..."
                                className="flex-1 bg-slate-800 border-none rounded-xl p-3 text-sm"
                                value={newSeedName}
                                onChange={e => setNewSeedName(e.target.value)}
                            />
                            <input
                                type="number"
                                placeholder="Cant."
                                className="w-20 bg-slate-800 border-none rounded-xl p-3 text-sm"
                                value={newSeedQty}
                                onChange={e => setNewSeedQty(e.target.value)}
                            />
                            <button type="submit" className="bg-emerald-500 p-3 rounded-xl hover:bg-emerald-600">
                                <PlusCircle />
                            </button>
                        </form>

                        <div className="space-y-3">
                            {campSeeds.map(seed => (
                                <div key={seed.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-bold">{seed.name}</span>
                                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">{seed.totalQuantity} total</span>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Asignar a mochilas:</p>
                                        {participants.map(p => {
                                            const assignment = seed.assignedSeeds?.find(a => a.userId === p.uid);
                                            return (
                                                <div key={p.uid} className="flex items-center justify-between text-sm bg-slate-900/50 p-2 rounded-lg">
                                                    <span className="truncate max-w-[120px]">{p.displayName}</span>
                                                    <input
                                                        type="number"
                                                        value={assignment?.quantity || ''}
                                                        placeholder="0"
                                                        onChange={(e) => handleAssignSeed(seed.id, p.uid, e.target.value)}
                                                        className="w-16 bg-slate-800 border border-slate-700 rounded-md p-1 text-center text-xs"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Participants Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Users className="text-blue-500" /> Participantes ({participants.length})
                            </h3>
                            <button
                                onClick={() => {
                                    const link = `${window.location.origin}?join=${camp.id}`;
                                    navigator.clipboard.writeText(link);
                                    alert("Enlace copiado. Compártelo con quien quieras invitar.");
                                }}
                                className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-xl border border-blue-500/20 flex items-center gap-2"
                            >
                                <UserPlus size={14} /> Invitar
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {participants.map(p => (
                                <div key={p.uid} className="flex items-center gap-3 bg-slate-800/30 p-3 rounded-2xl border border-slate-700/50">
                                    {p.photoURL ? (
                                        <img src={p.photoURL} className="w-8 h-8 rounded-full" alt="X" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                            {p.displayName?.charAt(0)}
                                        </div>
                                    )}
                                    <span className="text-sm font-medium truncate">{p.displayName}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 font-sans pb-24">
            <header className="mb-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors">
                        <ArrowLeft />
                    </button>
                    <h1 className="text-3xl font-bold">Mis Jornadas</h1>
                </div>
            </header>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Create New */}
                {!isCreatingCampaign ? (
                    <button
                        onClick={() => setIsCreatingCampaign(true)}
                        className="w-full py-6 rounded-3xl border-2 border-dashed border-slate-800 text-slate-500 font-bold hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-3 group"
                    >
                        <PlusCircle className="group-hover:scale-110 transition-transform" />
                        Crear Nueva Jornada de Siembra
                    </button>
                ) : (
                    <section className="bg-slate-900 p-6 rounded-3xl border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 animate-fade-in">
                        <h3 className="font-bold text-lg mb-6">Nueva Jornada</h3>
                        <form onSubmit={handleCreateCampaign} className="flex flex-col sm:flex-row gap-4">
                            <input
                                autoFocus
                                placeholder="Nombre de la jornada (ej: Reforestación Sierra Elx)..."
                                className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 outline-none font-medium"
                                value={newCampaignName}
                                onChange={e => setNewCampaignName(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsCreatingCampaign(false)} className="flex-1 sm:flex-none px-6 py-4 font-bold text-slate-400 hover:bg-slate-800 rounded-2xl transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 sm:flex-none px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all">Crear</button>
                            </div>
                        </form>
                    </section>
                )}

                {/* List */}
                <div className="grid gap-6">
                    {allCampaigns.length === 0 && !isCreatingCampaign && (
                        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                            <p className="text-slate-500">Aún no has creado ninguna jornada. ¡Empieza hoy mismo!</p>
                        </div>
                    )}

                    {allCampaigns.map(camp => (
                        <div key={camp.id} className={`group bg-slate-900 p-6 rounded-3xl border transition-all ${camp.status === 'active' ? 'border-emerald-500/30 hover:border-emerald-500/60' : 'border-slate-800 opacity-70 grayscale'}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`p-2 rounded-xl ${camp.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                            <Calendar size={20} />
                                        </div>
                                        <h3 className="font-bold text-xl">{camp.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest pl-11">
                                        <div className="flex items-center gap-1.5">
                                            {camp.visibility === 'public' ? <Globe size={14} className="text-blue-400" /> : <Lock size={14} className="text-orange-400" />}
                                            <span className={camp.visibility === 'public' ? 'text-blue-400' : 'text-orange-400'}>{camp.visibility === 'public' ? 'Pública' : 'Privada'}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="flex items-center gap-1.5">
                                            <Users size={14} />
                                            <span>{camp.participants?.length || 0} Participantes</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 pl-11 md:pl-0">
                                    <button
                                        onClick={() => setSelectedCampaignId(camp.id)}
                                        className="p-3 bg-slate-800 hover:bg-emerald-500 text-white rounded-xl transition-all flex items-center gap-2 font-bold text-sm"
                                    >
                                        <Package size={18} />
                                        <span>Gestionar</span>
                                        <ArrowRight size={16} />
                                    </button>

                                    <button
                                        onClick={() => handleUpdateCampaign(camp.id, { status: camp.status === 'active' ? 'inactive' : 'active' })}
                                        className={`p-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors ${camp.status === 'active' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
                                    >
                                        <Power size={18} />
                                        {camp.status === 'active' ? 'Finalizar' : 'Activar'}
                                    </button>

                                    <button
                                        onClick={() => handleUpdateCampaign(camp.id, { visibility: camp.visibility === 'public' ? 'private' : 'public' })}
                                        className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-colors"
                                        title="Cambiar visibilidad"
                                    >
                                        {camp.visibility === 'public' ? <Globe size={18} /> : <Lock size={18} />}
                                    </button>

                                    <button
                                        onClick={() => setEditingCampaign(camp)}
                                        className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CampaignManager;
