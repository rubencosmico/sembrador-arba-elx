import React, { useState, useEffect } from 'react';
import {
    collection, query, orderBy, onSnapshot, addDoc,
    serverTimestamp, updateDoc, doc, where, getDocs
} from 'firebase/firestore';
import {
    PlusCircle, Power, Edit2, Check, X, ArrowLeft,
    Calendar, Globe, Lock, Link as LinkIcon, Users,
    Package, ArrowRight, UserPlus, Camera, Trash2,
    Download, Search, Table as TableIcon, Map as MapIcon,
    ChevronLeft, ChevronRight, ArrowUpDown, UploadCloud
} from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { filterAndSortLogs } from '../utils/logUtils';
import { generateLogCSV } from '../utils/csvUtils';
import MapView from './MapView';
import Breadcrumbs from './Breadcrumbs';

const CampaignManager = ({
    db, appId, user, isSuperAdmin, onBack,
    initialCampaignId, onNavigate, campaign, role
}) => {
    const [allCampaigns, setAllCampaigns] = useState([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(true);
    const [editingCampaign, setEditingCampaign] = useState(null); // Simple name edit
    const [selectedCampaignId, setSelectedCampaignId] = useState(initialCampaignId || null); // Deep management
    const [newCampaignName, setNewCampaignName] = useState('');
    const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

    useEffect(() => {
        if (initialCampaignId) {
            setSelectedCampaignId(initialCampaignId);
        }
    }, [initialCampaignId]);

    // Deep Management State
    const [campSeeds, setCampSeeds] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [newSeed, setNewSeed] = useState({ species: '', provider: '', treatment: '', totalQuantity: '', photo: null });
    const [activeTab, setActiveTab] = useState('config'); // 'config' | 'seeds' | 'data'

    // Results State (Internalized from CoordinatorView)
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('timestamp');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [logsPerPage, setLogsPerPage] = useState(10);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'map'
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [viewImage, setViewImage] = useState(null);
    const [verifyingDelete, setVerifyingDelete] = useState(false);

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
            setLoadingCampaigns(false);
        }, (err) => {
            console.error("Error fetching campaigns:", err);
            setLoadingCampaigns(false);
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

        // Logs
        const qLogs = query(collection(db, ...dataPath, 'logs'), where('campaignId', '==', selectedCampaignId), orderBy('timestamp', 'desc'));
        const unsubLogs = onSnapshot(qLogs, (snap) => {
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

        return () => {
            unsubSeeds();
            unsubLogs();
        };
    }, [selectedCampaignId, db, appId, allCampaigns]);

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setNewSeed({ ...newSeed, photo: compressed });
            } catch (err) {
                console.error("Error compressing image", err);
            }
        }
    };

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
        if (!newSeed.species || !newSeed.totalQuantity) return;
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'seeds'), {
                ...newSeed,
                campaignId: selectedCampaignId,
                totalQuantity: parseInt(newSeed.totalQuantity),
                assignedSeeds: [], // Legacy compat
                userAssignments: [], // New user-centric assignments
                createdAt: serverTimestamp()
            });
            setNewSeed({ species: '', provider: '', treatment: '', totalQuantity: '', photo: null });
        } catch (e) {
            console.error(e);
            alert("Error añadiendo lote");
        }
    };

    const handleDeleteSeed = async (seedId) => {
        if (!window.confirm("¿Seguro que quieres borrar este lote de semillas?")) return;
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'seeds', seedId), {
                deleted: true
            });
            // Or actual delete if preferred, but soft delete is safer
        } catch (e) { console.error(e); }
    };

    const handleAssignSeed = async (seedId, userId, qty) => {
        const seed = campSeeds.find(s => s.id === seedId);
        const currentAssignments = seed.userAssignments || [];

        // Update or add assignment
        const newAssignments = [...currentAssignments.filter(a => a.userId !== userId)];
        if (qty > 0) {
            newAssignments.push({ userId, quantity: parseInt(qty) });
        }

        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'seeds', seedId), {
                userAssignments: newAssignments
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const filteredAndSortedLogs = React.useMemo(() => {
        return filterAndSortLogs(logs, searchTerm, sortField, sortDirection);
    }, [logs, searchTerm, sortField, sortDirection]);

    const totalPages = Math.ceil(filteredAndSortedLogs.length / logsPerPage);
    const currentLogs = filteredAndSortedLogs.slice(
        (currentPage - 1) * logsPerPage,
        currentPage * logsPerPage
    );

    const exportCSV = () => {
        const csvContent = generateLogCSV(logs, campSeeds, selectedCampaignId);
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `datos_jornada_${selectedCampaignId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalHoles = logs.reduce((acc, log) => acc + (parseInt(log.holeCount) || 1), 0);

    // Deep Management View
    if (selectedCampaignId) {
        const camp = allCampaigns.find(c => c.id === selectedCampaignId);

        // If not found in allCampaigns (could be loading or unauthorized)
        if (!camp) {
            return (
                <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                    <div className="text-center space-y-4 p-8">
                        {loadingCampaigns ? (
                            <>
                                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Cargando configuración...</p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                                    <Lock size={32} />
                                </div>
                                <h3 className="text-xl font-bold">Acceso Denegado</h3>
                                <p className="text-slate-500 text-xs max-w-xs mx-auto">No tienes permisos para gestionar esta jornada o la jornada no existe.</p>
                                <button
                                    onClick={() => { setSelectedCampaignId(null); onBack(); }}
                                    className="mt-6 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase transition-all hover:bg-white/10"
                                >
                                    Volver al Dashboard
                                </button>
                            </>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-slate-900 text-white font-sans pb-24">
                <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedCampaignId(null)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                            <ArrowLeft />
                        </button>
                        <div className="flex flex-col">
                            <Breadcrumbs
                                campaign={campaign || camp}
                                role={role || 'coordinator'}
                                onNavigate={onNavigate}
                            />
                            <h2 className="text-xl font-bold truncate max-w-[200px] md:max-w-md">{camp?.name}</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Gestión Centralizada</p>
                        </div>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'config', label: 'Ajustes', icon: Edit2 },
                            { id: 'seeds', label: 'Lotes', icon: Package },
                            { id: 'data', label: 'Datos', icon: TableIcon }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 shrink-0 ${activeTab === tab.id
                                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <tab.icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </header>

                <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in">

                    {activeTab === 'config' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <section className="lg:col-span-2 space-y-6">
                                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre de la Jornada</label>
                                            <input
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                                value={camp?.name || ''}
                                                onChange={(e) => handleUpdateCampaign(camp.id, { name: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descripción de la Jornada</label>
                                            <textarea
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none font-medium h-32"
                                                placeholder="Describe el objetivo o lugar de la reforestación..."
                                                value={camp?.description || ''}
                                                onChange={(e) => handleUpdateCampaign(camp.id, { description: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Visibilidad</label>
                                                <button
                                                    onClick={() => handleUpdateCampaign(camp.id, { visibility: camp.visibility === 'public' ? 'private' : 'public' })}
                                                    className={`w-full border rounded-2xl p-4 text-xs font-black flex items-center justify-center gap-3 transition-all ${camp.visibility === 'public' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}
                                                >
                                                    {camp.visibility === 'public' ? <Globe size={18} /> : <Lock size={18} />}
                                                    {camp.visibility === 'public' ? 'MODO PÚBLICO' : 'MODO PRIVADO'}
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                                                <button
                                                    onClick={() => handleUpdateCampaign(camp.id, { status: camp.status === 'active' ? 'inactive' : 'active' })}
                                                    className={`w-full border rounded-2xl p-4 text-xs font-black flex items-center justify-center gap-3 transition-all ${camp.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-white/10 text-slate-500'}`}
                                                >
                                                    <Power size={18} />
                                                    {camp.status === 'active' ? 'JORNADA ACTIVA' : 'FINALIZADA'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <div className="bg-emerald-500/5 p-8 rounded-[2.5rem] border border-emerald-500/10 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <UserPlus className="text-emerald-500" /> Participantes
                                        </h3>
                                        <button
                                            onClick={() => {
                                                const link = `${window.location.origin}?join=${camp.id}`;
                                                navigator.clipboard.writeText(link);
                                                alert("¡Copiado! Envía este link a tus sembradores.");
                                            }}
                                            className="p-3 bg-emerald-500 text-slate-950 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                                            title="Copiar enlace de invitación"
                                        >
                                            <LinkIcon size={18} />
                                        </button>
                                    </div>

                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                                        {participants.map(p => (
                                            <div key={p.uid} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-2xl border border-white/5">
                                                <div className="shrink-0">
                                                    {p.photoURL ? (
                                                        <img src={p.photoURL} className="w-10 h-10 rounded-xl" alt="" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-xs font-black">
                                                            {p.displayName?.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate">{p.displayName}</p>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sembrador Activo</p>
                                                </div>
                                            </div>
                                        ))}
                                        {participants.length === 0 && (
                                            <div className="text-center py-8">
                                                <Users size={32} className="mx-auto text-slate-700 mb-2" />
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Sin participantes</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'seeds' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <section className="lg:col-span-1 space-y-6">
                                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 sticky top-28">
                                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                                        <PlusCircle className="text-emerald-500" /> Nuevo Lote
                                    </h3>
                                    <form onSubmit={handleAddSeed} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Especie</label>
                                            <input
                                                placeholder="Ej: Encina, Algarrobo..."
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                                value={newSeed.species}
                                                onChange={e => setNewSeed({ ...newSeed, species: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Origen</label>
                                                <input
                                                    placeholder="Lugar/Vivero"
                                                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                                    value={newSeed.provider}
                                                    onChange={e => setNewSeed({ ...newSeed, provider: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cant. Total</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                                    value={newSeed.totalQuantity}
                                                    onChange={e => setNewSeed({ ...newSeed, totalQuantity: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tratamiento (Opcional)</label>
                                            <input
                                                placeholder="Ej: Lijada, Hidropriming..."
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                                value={newSeed.treatment}
                                                onChange={e => setNewSeed({ ...newSeed, treatment: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Imagen del Lote</label>
                                            {!newSeed.photo ? (
                                                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-[2rem] bg-slate-950/50 hover:bg-emerald-500/5 hover:border-emerald-500/50 cursor-pointer group transition-all">
                                                    <Camera className="text-slate-700 group-hover:text-emerald-500 mb-2 transition-colors" size={40} />
                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-emerald-500/70">Subir Foto</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                                </label>
                                            ) : (
                                                <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-xl shadow-emerald-500/20">
                                                    <img src={newSeed.photo} className="w-full h-full object-cover" alt="" />
                                                    <button type="button" onClick={() => setNewSeed({ ...newSeed, photo: null })} className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-full backdrop-blur-md">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <button type="submit" className="w-full bg-emerald-500 py-5 rounded-[2rem] text-slate-950 font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                                            <Check strokeWidth={3} /> Guardar Semillas
                                        </button>
                                    </form>
                                </div>
                            </section>

                            <section className="lg:col-span-2 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {campSeeds.filter(s => !s.deleted).map(seed => (
                                        <div key={seed.id} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 flex flex-col h-full shadow-lg">
                                            <div className="flex gap-4 mb-6">
                                                <div className="w-20 h-20 rounded-3xl overflow-hidden bg-slate-950 shrink-0 border border-white/10">
                                                    {seed.photo ? (
                                                        <img src={seed.photo} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-800">
                                                            <Package size={32} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-black text-xl text-emerald-400 leading-tight uppercase">{seed.species}</h4>
                                                        <button onClick={() => handleDeleteSeed(seed.id)} className="text-slate-700 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        <span className="text-[10px] font-black bg-white/5 text-slate-400 px-2 py-1 rounded-lg border border-white/10 uppercase tracking-widest">{seed.provider}</span>
                                                        {seed.treatment && <span className="text-[10px] font-black bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg border border-amber-500/20 uppercase tracking-widest">{seed.treatment}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-950/50 p-6 rounded-3xl border border-white/5 space-y-4 flex-1 flex flex-col">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Distribución por Sembrador:</p>
                                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg uppercase tracking-widest">{seed.totalQuantity} TOTAL</span>
                                                </div>
                                                <div className="space-y-2 flex-1 overflow-y-auto pr-1 no-scrollbar min-h-[150px]">
                                                    {participants.map(p => {
                                                        const assignment = seed.userAssignments?.find(a => a.userId === p.uid);
                                                        return (
                                                            <div key={p.uid} className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-black shrink-0">
                                                                        {p.displayName?.charAt(0)}
                                                                    </div>
                                                                    <span className="text-[11px] font-bold truncate text-slate-300">{p.displayName}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        value={assignment?.quantity || ''}
                                                                        placeholder="0"
                                                                        onChange={(e) => handleAssignSeed(seed.id, p.uid, e.target.value)}
                                                                        className="w-16 bg-slate-950 border border-white/10 rounded-xl p-2 text-center text-xs font-black text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {campSeeds.length === 0 && (
                                        <div className="col-span-full py-20 bg-white/2 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center">
                                            <Package size={48} className="text-white/5 mb-4" />
                                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Crea el primer lote de semillas</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="space-y-8">
                            <section className="bg-white/5 p-8 rounded-[3rem] border border-white/10 shadow-2xl">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="bg-emerald-500 p-4 rounded-[2rem] shadow-xl shadow-emerald-500/20">
                                            <TableIcon size={32} className="text-slate-950" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Impacto Total</p>
                                            <div className="text-5xl font-black text-white leading-tight">{totalHoles} <span className="text-lg font-bold text-emerald-500 ml-1">golpes</span></div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <button onClick={exportCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all">
                                            <Download size={18} /> Exportar CSV
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 mb-8">
                                    <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/5 shrink-0">
                                        <button onClick={() => setViewMode('table')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Tabla</button>
                                        <button onClick={() => setViewMode('map')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Mapa</button>
                                    </div>
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar en registros (sembrador, especie, notas)..."
                                            className="w-full pl-12 p-4 bg-slate-950 border border-white/10 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {viewMode === 'map' ? (
                                    <MapView logs={filteredAndSortedLogs} />
                                ) : (
                                    <div className="overflow-x-auto no-scrollbar -mx-2">
                                        <table className="w-full text-left border-collapse min-w-[600px]">
                                            <thead>
                                                <tr className="border-b border-white/10 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                                                    <th className="p-4 cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => handleSort('timestamp')}>
                                                        <div className="flex items-center gap-1">Hora <ArrowUpDown size={10} /></div>
                                                    </th>
                                                    <th className="p-4 cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => handleSort('groupName')}>
                                                        <div className="flex items-center gap-1">Sembrador <ArrowUpDown size={10} /></div>
                                                    </th>
                                                    <th className="p-4 cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => handleSort('seedName')}>
                                                        <div className="flex items-center gap-1">Especie <ArrowUpDown size={10} /></div>
                                                    </th>
                                                    <th className="p-4 cursor-pointer hover:text-emerald-400 transition-colors" onClick={() => handleSort('holeCount')}>
                                                        <div className="flex items-center gap-1">Golpes <ArrowUpDown size={10} /></div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm font-bold">
                                                {currentLogs.map(log => (
                                                    <React.Fragment key={log.id}>
                                                        <tr
                                                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                                            className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${expandedLogId === log.id ? 'bg-white/5' : ''}`}
                                                        >
                                                            <td className="p-4 text-slate-400 font-mono text-[11px]">
                                                                {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                            </td>
                                                            <td className="p-4 text-emerald-100">{log.groupName || 'Anónimo'}</td>
                                                            <td className="p-4 text-slate-300 italic">{log.seedName}</td>
                                                            <td className="p-4 text-white">{log.holeCount || 1}</td>
                                                        </tr>
                                                        {expandedLogId === log.id && (
                                                            <tr className="bg-slate-950/50">
                                                                <td colSpan={4} className="p-8 animate-fadeIn">
                                                                    <div className="flex flex-col md:flex-row gap-8">
                                                                        <div className="shrink-0">
                                                                            {(log.photoUrl && log.photoUrl !== 'PENDING') || (log.photo && !log.photoUrl) ? (
                                                                                <div className="w-full md:w-48 h-48 rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-2xl cursor-pointer hover:scale-105 transition-all" onClick={() => setViewImage(log.photoUrl || log.photo)}>
                                                                                    <img src={log.photoUrl || log.photo} alt="Evidencia" className="w-full h-full object-cover" />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="w-full md:w-48 h-48 rounded-[2rem] bg-slate-900 flex flex-col items-center justify-center text-slate-700 border-2 border-dashed border-white/5 shadow-inner">
                                                                                    <Camera size={32} />
                                                                                    <span className="text-[10px] font-black uppercase mt-2">Sin evidencia</span>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-6">
                                                                            <div className="col-span-full bg-white/5 p-4 rounded-2xl border border-white/5">
                                                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2">Nota del Sembrador</span>
                                                                                <p className="text-slate-300 italic font-medium leading-relaxed">"{log.notes || "Sin comentarios registrados"}"</p>
                                                                            </div>

                                                                            <div>
                                                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Micrositio</span>
                                                                                <span className="text-white font-bold">{log.microsite || '-'}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Sustrato</span>
                                                                                <div className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase ${log.withSubstrate ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>{log.withSubstrate ? 'SI' : 'NO'}</div>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Protector</span>
                                                                                <div className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase ${log.withProtector ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>{log.withProtector ? 'SI' : 'NO'}</div>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Tratamiento</span>
                                                                                <span className="text-emerald-400 font-bold block truncate">{campSeeds.find(s => s.id === log.seedId)?.treatment || 'Ninguno'}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Proveedor</span>
                                                                                <span className="text-blue-400 font-bold block truncate">{campSeeds.find(s => s.id === log.seedId)?.provider || 'N/A'}</span>
                                                                            </div>

                                                                            <div className="col-span-2">
                                                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Localización GPS</span>
                                                                                {log.location?.lat ? (
                                                                                    <div className="flex items-center gap-3">
                                                                                        <MapPin size={16} className="text-emerald-500" />
                                                                                        <a
                                                                                            href={`https://www.google.com/maps/search/?api=1&query=${log.location.lat},${log.location.lng}`}
                                                                                            target="_blank" rel="noreferrer"
                                                                                            className="text-xs font-mono font-bold text-emerald-400 hover:underline transition-all"
                                                                                        >
                                                                                            {log.location.lat.toFixed(6)}, {log.location.lng.toFixed(6)}
                                                                                        </a>
                                                                                        <span className="text-[9px] font-black bg-white/5 px-1.5 py-0.5 rounded text-slate-500">±{log.location.acc?.toFixed(0)}m</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-xs text-slate-600 italic">No disponible</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                        {currentLogs.length === 0 && (
                                            <div className="py-20 text-center opacity-30 font-black uppercase tracking-widest text-xs">Sin registros que mostrar</div>
                                        )}
                                    </div>
                                )}

                                {viewMode === 'table' && totalPages > 1 && (
                                    <div className="mt-8 flex flex-col items-center gap-4">
                                        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-white/5 shadow-2xl">
                                            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 disabled:opacity-20 transition-all">«</button>
                                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 disabled:opacity-20 transition-all"><ChevronLeft size={16} /></button>
                                            <span className="text-[10px] font-black text-white px-4 uppercase tracking-widest">Pág {currentPage} / {totalPages}</span>
                                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 disabled:opacity-20 transition-all"><ChevronRight size={16} /></button>
                                            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 disabled:opacity-20 transition-all">»</button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>

                {viewImage && (
                    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewImage(null)}>
                        <button onClick={() => setViewImage(null)} className="absolute top-6 right-6 text-white bg-white/10 p-4 rounded-full backdrop-blur-md hover:bg-white/20 transition-all">
                            <X size={32} />
                        </button>
                        <img src={viewImage} className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl border-4 border-white/10" alt="" />
                    </div>
                )}
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
                    <div className="flex flex-col text-left">
                        <Breadcrumbs currentView="manage" onNavigate={onNavigate} />
                        <h1 className="text-3xl font-bold tracking-tight">Mis Jornadas</h1>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto space-y-8">
                {/* Create New */}
                {!isCreatingCampaign ? (
                    <button
                        onClick={() => setIsCreatingCampaign(true)}
                        className="group w-full py-8 rounded-[2.5rem] border-2 border-dashed border-slate-800 text-slate-500 font-bold hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-4 bg-slate-900/20"
                    >
                        <div className="p-2 bg-slate-800 rounded-full group-hover:bg-emerald-500/20 transition-colors">
                            <PlusCircle className="group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="text-lg">Crear Nueva Jornada de Siembra</span>
                    </button>
                ) : (
                    <section className="bg-slate-900 p-8 rounded-[2.5rem] border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 animate-fade-in">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                            <h3 className="font-bold text-xl uppercase tracking-tight">Nueva Jornada</h3>
                        </div>
                        <form onSubmit={handleCreateCampaign} className="flex flex-col md:flex-row gap-4">
                            <input
                                autoFocus
                                placeholder="Nombre de la jornada (ej: Reforestación Sierra Elx)..."
                                className="flex-1 p-5 bg-slate-800 border border-slate-700 rounded-3xl focus:ring-2 focus:ring-emerald-500/50 outline-none font-medium"
                                value={newCampaignName}
                                onChange={e => setNewCampaignName(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsCreatingCampaign(false)} className="px-8 py-5 font-bold text-slate-400 hover:bg-slate-800 rounded-3xl transition-colors">Cancelar</button>
                                <button type="submit" className="px-10 py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-3xl font-bold shadow-xl shadow-emerald-500/20 transition-all active:scale-95">Crear</button>
                            </div>
                        </form>
                    </section>
                )}

                {/* List */}
                <div className="grid gap-6">
                    {allCampaigns.length === 0 && !isCreatingCampaign && (
                        <div className="text-center py-20 bg-slate-900/50 rounded-[2.5rem] border-2 border-slate-800 border-dashed">
                            <p className="text-slate-500 font-medium">Aún no has creado ninguna jornada. ¡Empieza hoy mismo!</p>
                        </div>
                    )}

                    {allCampaigns.map(camp => (
                        <div key={camp.id} className={`group bg-slate-900/80 backdrop-blur-sm p-6 rounded-[2.5rem] border transition-all ${camp.status === 'active' ? 'border-emerald-500/20 hover:border-emerald-500/40 shadow-lg' : 'border-slate-800 opacity-70 grayscale'}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1 flex items-center gap-6">
                                    <div className={`w-1 structure-pill h-16 rounded-full ${camp.status === 'active' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-black text-2xl uppercase tracking-tight">{camp.name}</h3>
                                            <div className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase ${camp.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                                {camp.status === 'active' ? '● ACTIVA' : 'FINALIZADA'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <div className="flex items-center gap-2">
                                                {camp.visibility === 'public' ? <Globe size={14} className="text-blue-400" /> : <Lock size={14} className="text-orange-400" />}
                                                <span className={camp.visibility === 'public' ? 'text-blue-400' : 'text-orange-400'}>{camp.visibility === 'public' ? 'Visibilidad Pública' : 'Jornada Privada'}</span>
                                            </div>
                                            <span className="text-slate-800">|</span>
                                            <div className="flex items-center gap-2">
                                                <Users size={14} className="text-emerald-500/50" />
                                                <span>{camp.participants?.length || 0} Participantes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedCampaignId(camp.id)}
                                        className="px-8 py-4 bg-slate-800 hover:bg-emerald-500 text-white rounded-3xl transition-all flex items-center gap-3 font-black text-xs uppercase tracking-widest shadow-xl shadow-black/20 hover:shadow-emerald-500/20 active:scale-95"
                                    >
                                        <Package size={18} className="text-emerald-400 group-hover:text-emerald-950 transition-colors" />
                                        <span>Gestionar</span>
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
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
