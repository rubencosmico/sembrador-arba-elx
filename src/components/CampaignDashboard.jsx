import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, MapPin, Leaf, Calendar, ArrowLeft,
    ArrowRight, History, PlusCircle, Settings, HelpCircle,
    Info, Globe, Lock, List, X, Camera, ChevronRight, Map as MapIcon, Package, ChevronDown,
    Sprout
} from 'lucide-react';
import {
    collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import MapView from './MapView';
import Breadcrumbs from './Breadcrumbs';
import MonitoringRadarView from './MonitoringRadarView';
import CheckupFormModal from './CheckupFormModal';
import {
    CHECKUP_STATUSES,
    GROWTH_STAGES,
    CHECKUP_CAUSES
} from '../utils/monitoringUtils';

const CampaignDashboard = ({
    db, appId, storage, userProfile,
    campaign, user, logs, seeds = [],
    onSelectRole, onBack, onLoginClick,
    isSuperAdmin, participantCount = 0,
    onNavigate, participants = [],
    userFollowing = new Set(),
    onSocialAction, groups = []
}) => {
    const [viewMode, setViewMode] = useState('map'); // 'map' | 'list' | 'monitoring'
    const [selectedLog, setSelectedLog] = useState(null);
    const [reviewingLog, setReviewingLog] = useState(null);
    const [checkups, setCheckups] = useState([]);
    const [isSavingCheckup, setIsSavingCheckup] = useState(false);
    const [expandedSpecies, setExpandedSpecies] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [showCommunityModal, setShowCommunityModal] = useState(false);
    const [filters, setFilters] = useState({
        seedId: '',
        groupName: '',
        microsite: '',
        orientation: '',
        withSubstrate: null, // null | true | false
        withProtector: null
    });

    useEffect(() => {
        if (!db || !appId || !campaign?.id) {
            setCheckups([]);
            return;
        }
        const checkupsCol = collection(db, 'artifacts', appId, 'public', 'data', 'checkups');
        const q = query(checkupsCol, where('campaignId', '==', campaign.id));
        const unsub = onSnapshot(
            q,
            (snap) => {
                const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                items.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                setCheckups(items);
            },
            (err) => {
                console.error('Error fetching checkups:', err);
            }
        );
        return () => unsub();
    }, [db, appId, campaign?.id]);

    const totalHolesTotal = logs.reduce((acc, log) => acc + (parseInt(log.holeCount) || 1), 0);

    // Apply cumulative filtering
    const filteredLogs = React.useMemo(() => {
        return logs.filter(log => {
            if (filters.seedId && log.seedId !== filters.seedId) return false;
            if (filters.groupName && log.groupName !== filters.groupName) return false;
            if (filters.microsite && log.microsite !== filters.microsite) return false;
            if (filters.orientation && log.orientation !== filters.orientation) return false;
            if (filters.withSubstrate !== null && !!log.withSubstrate !== filters.withSubstrate) return false;
            if (filters.withProtector !== null && !!log.withProtector !== filters.withProtector) return false;
            return true;
        });
    }, [logs, filters]);

    const totalHoles = filteredLogs.reduce((acc, log) => acc + (parseInt(log.holeCount) || 1), 0);

    // Unique values for filters
    const filterOptions = React.useMemo(() => {
        const options = {
            seeds: [],
            users: new Set(),
            microsites: new Set(),
            orientations: new Set()
        };

        logs.forEach(log => {
            if (log.groupName) options.users.add(log.groupName);
            if (log.microsite) options.microsites.add(log.microsite);
            if (log.orientation) options.orientations.add(log.orientation);
        });

        // Map seeds to their names with provider and treatment
        const seedMap = seeds.reduce((acc, s) => {
            let label = s.species;
            if (s.provider) label += ` - ${s.provider}`;
            if (s.treatment) label += ` (${s.treatment})`;
            acc[s.id] = label;
            return acc;
        }, {});

        options.seeds = Array.from(new Set(logs.map(l => l.seedId)))
            .filter(Boolean)
            .map(id => ({ id, name: seedMap[id] || 'Especie desconocida' }));

        return {
            seeds: options.seeds,
            users: Array.from(options.users).sort(),
            microsites: Array.from(options.microsites).sort(),
            orientations: Array.from(options.orientations).sort()
        };
    }, [logs, seeds]);

    // Group seeds by species
    const groupedSeeds = seeds.reduce((acc, seed) => {
        if (!acc[seed.species]) acc[seed.species] = [];
        acc[seed.species].push(seed);
        return acc;
    }, {});
    const isRealUser = Boolean(user && !user.isAnonymous);
    const isOwner = Boolean(isRealUser && campaign?.ownerId && user.uid === campaign.ownerId);
    const isCoordinator = Boolean(isRealUser && campaign?.coordinators?.includes(user.uid));
    const canManage = Boolean(isSuperAdmin || isOwner || isCoordinator);
    const isParticipant = Boolean(isRealUser && campaign?.participants?.includes(user.uid));
    const canReview = Boolean(
        isRealUser && (
            !campaign?.visibility ||
            campaign.visibility === 'public' ||
            isParticipant ||
            canManage
        )
    );
    const isActive = campaign.status === 'active';

    const selectedLogCheckups = useMemo(() => {
        if (!selectedLog) return [];
        return checkups.filter((c) => c.logId === selectedLog.id);
    }, [checkups, selectedLog]);

    const handleSaveCheckup = async (formData) => {
        if (!reviewingLog || !db || !appId || !isRealUser) return;
        setIsSavingCheckup(true);
        try {
            let photoUrl = null;
            if (formData.photoDataUrl && storage) {
                const photoRef = ref(storage, `photos/logs/checkups/${reviewingLog.id}_${Date.now()}.jpg`);
                await uploadString(photoRef, formData.photoDataUrl, 'data_url');
                photoUrl = await getDownloadURL(photoRef);
            }

            const reviewerName = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Voluntario';
            const checkupPayload = {
                campaignId: campaign.id,
                logId: reviewingLog.id,
                status: formData.status,
                survivingCount: formData.survivingCount,
                growthStage: formData.growthStage,
                causes: formData.causes || [],
                notes: formData.notes || null,
                photoUrl,
                reviewerId: user.uid,
                reviewerName,
                timestamp: serverTimestamp()
            };

            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'checkups'), checkupPayload);

            const existingForLog = checkups.filter((c) => c.logId === reviewingLog.id).length;
            const nextCount = Math.max(reviewingLog.checkupCount || 0, existingForLog) + 1;

            const logSummaryUpdate = {
                lastCheckupStatus: formData.status,
                lastCheckupAt: serverTimestamp(),
                lastSurvivingCount: formData.status === 'alive' ? (formData.survivingCount ?? 1) : 0,
                lastGrowthStage: formData.growthStage || null,
                checkupCount: nextCount,
                lastCheckupBy: reviewerName,
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'logs', reviewingLog.id), logSummaryUpdate);

            if (selectedLog?.id === reviewingLog.id) {
                setSelectedLog((prev) => (prev ? { ...prev, ...logSummaryUpdate, lastCheckupAt: { seconds: Math.floor(Date.now() / 1000) } } : null));
            }
            setReviewingLog(null);
        } catch (err) {
            console.error('Error guardando revisión:', err);
            alert('No se pudo guardar la revisión. Verifica tu conexión y permisos.');
        } finally {
            setIsSavingCheckup(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'Sin fecha';
        const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const toggleBooleanFilter = (key) => {
        setFilters(prev => ({
            ...prev,
            [key]: prev[key] === null ? true : prev[key] === true ? false : null
        }));
    };

    const isModern = React.useMemo(() => groups.length === 0 || seeds.some(s => s.userAssignments?.length > 0), [groups, seeds]);

    const hasPersonalSeeds = React.useMemo(() => {
        if (!isRealUser) return false;
        if (!isModern) {
            return groups.some(g => g.assignedSeeds?.length > 0);
        }
        return seeds.some(s => !s.deleted && s.userAssignments?.some(a => a.userId === user.uid));
    }, [isModern, seeds, groups, user, isRealUser]);

    const hasPersonalLogs = React.useMemo(() => {
        if (!isRealUser) return false;
        if (!isModern) return logs.length > 0;
        return logs.some(l => l.userId === user.uid || l.ownerId === user.uid);
    }, [logs, user, isRealUser, isModern]);

    const isSowDisabled = isRealUser && !hasPersonalSeeds;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans pb-12 overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <Breadcrumbs campaign={campaign} onNavigate={onNavigate} />
                        <h1 className="text-xl font-bold uppercase tracking-tight truncate max-w-[200px] md:max-w-md">
                            {campaign.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {isActive ? 'Jornada Activa' : 'Finalizada'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                                • {campaign.organizationName || 'ARBA Elx'} • {campaign.locationName || 'Elche, España'}
                            </span>
                            {campaign.biome && (
                                <span className="hidden sm:inline-block rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-teal-400">
                                    {campaign.biome}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isRealUser && onLoginClick && (
                        <button
                            onClick={onLoginClick}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Iniciar Sesión
                        </button>
                    )}
                    {campaign.visibility === 'private' ? (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
                            <Lock size={12} className="text-orange-400" />
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Privada</span>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                            <Globe size={12} className="text-blue-400" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pública</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex items-center gap-6 shadow-xl">
                        <div className="bg-emerald-500 p-4 rounded-3xl shadow-lg shadow-emerald-500/20">
                            <Leaf size={32} className="text-slate-950" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Reforestación</p>
                            <div className="text-4xl font-black">{totalHolesTotal} <span className="text-sm font-bold text-emerald-500">golpes</span></div>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowCommunityModal(true)}
                        className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex items-center gap-6 shadow-xl relative overflow-hidden group hover:bg-white/10 transition-all cursor-pointer text-left"
                    >
                        <div className="bg-teal-500 p-4 rounded-3xl shadow-lg shadow-teal-500/20 z-10">
                            <Users size={32} className="text-slate-950" />
                        </div>
                        <div className="z-10">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Comunidad</p>
                            <div className="text-4xl font-black">{participantCount} <span className="text-sm font-bold text-teal-500">miembros</span></div>
                        </div>

                        {/* Member Avatars Overlap */}
                        <div className="absolute right-8 flex -space-x-3 opacity-20 group-hover:opacity-100 transition-opacity">
                            {participants.slice(0, 5).map((p, i) => (
                                <div key={p.uid || i} className="w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center overflow-hidden">
                                    {p.photoURL ? (
                                        <img src={p.photoURL} alt={p.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[10px] font-black">{p.displayName?.charAt(0)}</span>
                                    )}
                                </div>
                            ))}
                            {participants.length > 5 && (
                                <div className="w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                                    +{participants.length - 5}
                                </div>
                            )}
                        </div>
                    </button>

                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex items-center gap-6 shadow-xl text-slate-400">
                        <div className="bg-slate-800 p-4 rounded-3xl">
                            <Calendar size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Creada el</p>
                            <div className="text-xl font-bold">{formatDate(campaign.createdAt)}</div>
                        </div>
                    </div>
                </div>

                {/* Seeds / Lots Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Package className="text-emerald-500" />
                            Variedades de Semilla
                        </h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {Object.keys(groupedSeeds).length} Especies • {seeds.length} Lotes
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(groupedSeeds).map(([species, lots]) => (
                            <div
                                key={species}
                                className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden transition-all hover:border-emerald-500/30"
                            >
                                <button
                                    onClick={() => setExpandedSpecies(expandedSpecies === species ? null : species)}
                                    className="w-full p-6 flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                                            <Leaf size={24} />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-bold text-white uppercase">{species}</h4>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                {lots.length} {lots.length === 1 ? 'Lote' : 'Lotes'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-xl transition-all ${expandedSpecies === species ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-500 group-hover:bg-white/10'}`}>
                                        <ChevronDown size={16} className={`transition-transform duration-300 ${expandedSpecies === species ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {expandedSpecies === species && (
                                    <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4 animate-fade-in">
                                        {lots.map((lot, idx) => (
                                            <div key={lot.id || idx} className="space-y-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-16 h-16 bg-slate-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                                                        {lot.photo ? (
                                                            <img src={lot.photo} className="w-full h-full object-cover" alt={lot.species} />
                                                        ) : (
                                                            <Package className="text-slate-700" size={24} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Lote {idx + 1}</p>
                                                            <span className="text-[10px] font-bold text-slate-500">{lot.totalQuantity} ud.</span>
                                                        </div>
                                                        <h5 className="font-bold text-slate-200 truncate">{lot.provider || 'Proveedor Local'}</h5>
                                                        {lot.treatment && (
                                                            <div className="mt-1.5 flex items-center gap-1.5">
                                                                <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
                                                                <p className="text-[10px] font-medium text-amber-500/80 italic">{lot.treatment}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Main Interactive Map / List / Monitoring Toggle */}
                <section id="monitoring-section" className="space-y-4">
                    <div className="flex items-center justify-between px-2 gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                {viewMode === 'monitoring' ? <Sprout className="text-emerald-500" /> : viewMode === 'map' ? <MapPin className="text-emerald-500" /> : <List className="text-emerald-500" />}
                                {viewMode === 'monitoring' ? 'Seguimiento y Supervivencia' : viewMode === 'map' ? 'Mapa de Plantaciones' : 'Lista de Registros'}
                            </h3>
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setViewMode('map')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Mapa
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Lista
                                </button>
                                <button
                                    onClick={() => setViewMode('monitoring')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${viewMode === 'monitoring' ? 'bg-emerald-500 text-slate-950' : 'text-emerald-400/80 hover:text-emerald-300'}`}
                                >
                                    <Sprout size={12} />
                                    Seguimiento
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${showFilters || Object.values(filters).some(v => v !== '' && v !== null) ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                            >
                                <Settings size={14} />
                                <span>Filtros Avanzados</span>
                                {Object.values(filters).some(v => v !== '' && v !== null) && (
                                    <span className="flex w-2 h-2 rounded-full bg-emerald-500"></span>
                                )}
                            </button>
                            <p className="hidden md:block text-xs text-slate-500 font-medium italic">Mostrando {filteredLogs.length} registros</p>
                        </div>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Variedad de Semilla</label>
                                <select
                                    value={filters.seedId}
                                    onChange={e => setFilters(prev => ({ ...prev, seedId: e.target.value }))}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                >
                                    <option value="">Todas las especies</option>
                                    {filterOptions.seeds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Sembrador</label>
                                <select
                                    value={filters.groupName}
                                    onChange={e => setFilters(prev => ({ ...prev, groupName: e.target.value }))}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                >
                                    <option value="">Todos los usuarios</option>
                                    {filterOptions.users.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Nodriza</label>
                                <select
                                    value={filters.microsite}
                                    onChange={e => setFilters(prev => ({ ...prev, microsite: e.target.value }))}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                >
                                    <option value="">Cualquier micrositio</option>
                                    {filterOptions.microsites.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Orientación</label>
                                <select
                                    value={filters.orientation}
                                    onChange={e => setFilters(prev => ({ ...prev, orientation: e.target.value }))}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                >
                                    <option value="">Todas las orientaciones</option>
                                    {filterOptions.orientations.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-4 col-span-full pt-2 border-t border-white/5">
                                <button
                                    onClick={() => toggleBooleanFilter('withSubstrate')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filters.withSubstrate === null ? 'bg-white/5 border-white/10 text-slate-500' : filters.withSubstrate ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
                                >
                                    Sustrato: {filters.withSubstrate === null ? 'INDIFERENTE' : filters.withSubstrate ? 'SI' : 'NO'}
                                </button>
                                <button
                                    onClick={() => toggleBooleanFilter('withProtector')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filters.withProtector === null ? 'bg-white/5 border-white/10 text-slate-500' : filters.withProtector ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
                                >
                                    Protector: {filters.withProtector === null ? 'INDIFERENTE' : filters.withProtector ? 'SI' : 'NO'}
                                </button>
                                <button
                                    onClick={() => setFilters({ seedId: '', groupName: '', microsite: '', orientation: '', withSubstrate: null, withProtector: null })}
                                    className="ml-auto px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-colors"
                                >
                                    Limpiar Filtros
                                </button>
                            </div>
                        </div>
                    )}

                    {viewMode === 'monitoring' ? (
                        <MonitoringRadarView
                            campaign={campaign}
                            logs={filteredLogs}
                            seeds={seeds}
                            checkups={checkups}
                            onSelectLog={(log) => setSelectedLog(log)}
                            onStartReview={(log) => {
                                if (!isRealUser) {
                                    onLoginClick?.();
                                    return;
                                }
                                if (!canReview) {
                                    alert('Solo los participantes o gestores de esta jornada privada pueden registrar revisiones.');
                                    return;
                                }
                                setReviewingLog(log);
                            }}
                            isRealUser={isRealUser}
                            onLoginClick={onLoginClick}
                        />
                    ) : viewMode === 'map' ? (
                        <div className="animate-fade-in relative">
                            <MapView logs={filteredLogs} onSelect={(log) => setSelectedLog(log)} />
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            {filteredLogs.length === 0 ? (
                                <div className="py-20 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-4">
                                    <div className="p-4 bg-white/5 rounded-2xl text-slate-700">
                                        <Leaf size={32} />
                                    </div>
                                    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No hay registros que coincidan con los filtros</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredLogs.map(log => {
                                        const checkupCfg = log.lastCheckupStatus ? CHECKUP_STATUSES[log.lastCheckupStatus] : null;
                                        return (
                                            <div
                                                key={log.id}
                                                onClick={() => setSelectedLog(log)}
                                                className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 p-5 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden text-emerald-500">
                                                        {log.photoUrl || log.photo ? (
                                                            <img src={log.photoUrl || log.photo} className="w-full h-full object-cover" alt="" />
                                                        ) : <Camera size={20} />}
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors uppercase text-sm">{log.seedName}</h4>
                                                            {checkupCfg && (
                                                                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${checkupCfg.badgeClass}`}>
                                                                    {checkupCfg.shortLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{participants.find(p => p.uid === (log.ownerId || log.userId))?.displayName || log.userName || log.groupName} • {log.holeCount || 1} golpes</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-700 group-hover:text-emerald-500 transition-colors shrink-0" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Actions Grid */}
                <section className="bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-8">
                    <div className="text-center max-w-xl mx-auto space-y-2">
                        <h3 className="text-2xl font-black uppercase">¿Cómo quieres participar?</h3>
                        <p className="text-slate-400 text-sm">Gestiona tus propios registros o ayuda a rreforestar como sembrador.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Primary Action: Sowing */}
                        {isActive && (
                            <button
                                onClick={() => {
                                    if (!isRealUser) {
                                        onLoginClick();
                                        return;
                                    }
                                    if (isSowDisabled) return;
                                    onSelectRole('sower', 'form');
                                }}
                                disabled={isSowDisabled}
                                className={`group relative p-8 rounded-[2rem] text-slate-950 transition-all flex flex-col justify-between h-56 shadow-xl active:scale-[0.98] 
                                    ${isSowDisabled
                                        ? 'bg-slate-800 opacity-40 grayscale cursor-not-allowed border border-white/5'
                                        : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/10'}`}
                            >
                                <PlusCircle size={40} strokeWidth={2.5} className={isSowDisabled ? 'text-slate-600' : ''} />
                                <div className="text-left w-full">
                                    <h4 className={`text-2xl font-black uppercase leading-none mb-2 ${isSowDisabled ? 'text-slate-500' : ''}`}>Registrar<br />Siembras</h4>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isSowDisabled ? 'text-slate-600' : 'text-slate-950/60'}`}>
                                        {!isRealUser ? (
                                            <>Inicia sesión para participar <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></>
                                        ) : isSowDisabled ? (
                                            <>Sin semillas asignadas <Info size={14} /></>
                                        ) : (
                                            <>Empezar ahora <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></>
                                        )}
                                    </p>
                                </div>
                            </button>
                        )}

                        {/* History Shortcut */}
                        {isRealUser && (
                            <button
                                onClick={() => {
                                    if (!hasPersonalLogs) return;
                                    onSelectRole('sower', 'history');
                                }}
                                disabled={!hasPersonalLogs}
                                className={`group p-8 rounded-[2rem] border transition-all flex flex-col justify-between h-56 active:scale-[0.98] 
                                    ${!hasPersonalLogs
                                        ? 'bg-slate-900 border-white/5 opacity-40 grayscale cursor-not-allowed'
                                        : 'bg-slate-800/50 hover:bg-slate-800 border-white/5 hover:border-emerald-500/30'}`}
                            >
                                <History size={40} className={!hasPersonalLogs ? 'text-slate-600' : 'text-emerald-500'} />
                                <div className="text-left w-full">
                                    <h4 className={`text-2xl font-black uppercase leading-none mb-2 ${!hasPersonalLogs ? 'text-slate-500' : 'text-white'}`}>Mi Cuaderno<br />de Campo</h4>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${!hasPersonalLogs ? 'text-slate-600' : 'text-slate-500 group-hover:text-emerald-400'}`}>
                                        {!hasPersonalLogs ? (
                                            <>Sin registros previos <Info size={14} /></>
                                        ) : (
                                            <>Ver mis registros <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></>
                                        )}
                                    </p>
                                </div>
                            </button>
                        )}

                        {/* Coordinator Shortcut */}
                        {canManage && (
                            <button
                                onClick={() => onSelectRole('coordinator')}
                                className="group bg-slate-800/50 hover:bg-slate-800 p-8 rounded-[2rem] border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col justify-between h-56 active:scale-[0.98]"
                            >
                                <Settings size={40} className="text-blue-500" />
                                <div className="text-left w-full">
                                    <h4 className="text-2xl font-black uppercase leading-none mb-2 text-white">Gestionar<br />Jornada</h4>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                                        Administrar datos <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </p>
                                </div>
                            </button>
                        )}

                        {/* Field Monitoring Action (available in active & finalized campaigns) */}
                        <button
                            onClick={() => {
                                setViewMode('monitoring');
                                document.getElementById('monitoring-section')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="group bg-teal-500/10 hover:bg-teal-500/20 p-8 rounded-[2rem] border border-teal-500/30 transition-all flex flex-col justify-between h-56 active:scale-[0.98]"
                        >
                            <Sprout size={40} className="text-teal-400" />
                            <div className="text-left w-full">
                                <h4 className="text-2xl font-black uppercase leading-none mb-2 text-white">Seguimiento<br />en Campo</h4>
                                <p className="text-teal-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
                                    Revisar germinación <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </p>
                            </div>
                        </button>

                        {/* Public Link / Info */}
                        <button
                            className="group bg-slate-900/50 hover:bg-slate-900 p-8 rounded-[2rem] border border-white/5 hover:border-slate-500/30 transition-all flex flex-col justify-between h-56 active:scale-[0.98]"
                            onClick={() => window.open('https://arbaelx.es', '_blank')}
                        >
                            <HelpCircle size={40} className="text-slate-500" />
                            <div className="text-left w-full">
                                <h4 className="text-2xl font-black uppercase leading-none mb-2 text-white italic opacity-80 underline underline-offset-4 decoration-slate-700">Saber más<br />sobre ARBA</h4>
                                <p className="text-slate-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
                                    Sitio web oficial <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </p>
                            </div>
                        </button>
                    </div>
                </section>
            </main>

            {/* Log Detail Modal */}
            {
                selectedLog && (
                    <div
                        className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-fade-in"
                        onClick={() => setSelectedLog(null)}
                    >
                        <div
                            className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-colors z-10"
                            >
                                <X size={24} />
                            </button>

                            <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                                {/* Left: Image/Map */}
                                <div className="bg-slate-950 p-2 h-64 lg:h-auto">
                                    {selectedLog.photoUrl || selectedLog.photo ? (
                                        <img
                                            src={selectedLog.photoUrl || selectedLog.photo}
                                            className="w-full h-full object-cover rounded-[2.5rem]"
                                            alt="Evidencia"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-[2.5rem] bg-slate-900 flex flex-col items-center justify-center text-slate-700">
                                            <Camera size={64} />
                                            <span className="text-xs font-black uppercase mt-4 tracking-widest">Sin evidencia fotográfica</span>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Info */}
                                <div className="p-8 md:p-12 space-y-8 text-left">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                Detalle del Registro
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500">
                                                {selectedLog.timestamp?.seconds ? new Date(selectedLog.timestamp.seconds * 1000).toLocaleString() : 'Reciente'}
                                            </span>
                                        </div>
                                        <h3 className="text-4xl font-black uppercase text-white leading-none">{selectedLog.seedName}</h3>
                                        <p className="text-slate-400 mt-2 font-medium italic">
                                            "{selectedLog.notes || 'Sin comentarios registrados por el sembrador.'}"
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Sembrador</p>
                                            <p className="text-sm font-bold text-white">{participants.find(p => p.uid === (selectedLog.ownerId || selectedLog.userId))?.displayName || selectedLog.userName || selectedLog.groupName || 'Anónimo'}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Impacto</p>
                                            <p className="text-sm font-black text-emerald-400">{selectedLog.holeCount || 1} GOLPES</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Micrositio</p>
                                            <p className="text-sm font-bold text-white">{selectedLog.microsite || '-'}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Orientación</p>
                                            <p className="text-sm font-bold text-white">{selectedLog.orientation || '-'}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Semillas / Hoyo</p>
                                            <p className="text-sm font-bold text-white">{selectedLog.quantity || '1'}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Coordenadas</p>
                                            {selectedLog.location?.lat ? (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedLog.location.lat},${selectedLog.location.lng}`}
                                                    target="_blank" rel="noreferrer"
                                                    className="text-xs font-mono font-bold text-emerald-500 hover:underline block truncate"
                                                >
                                                    {selectedLog.location.lat.toFixed(6)}, {selectedLog.location.lng.toFixed(6)}
                                                </a>
                                            ) : <span className="text-xs text-slate-600">N/D</span>}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-3">
                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${selectedLog.withSubstrate ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                                                Sustrato: {selectedLog.withSubstrate ? 'SÍ' : 'NO'}
                                            </div>
                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${selectedLog.withProtector ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-500'}`}>
                                                Protector: {selectedLog.withProtector ? 'SÍ' : 'NO'}
                                            </div>
                                        </div>

                                        {seeds.find(s => s.id === selectedLog.seedId)?.treatment && (
                                            <div className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/10 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                    <Info size={40} className="text-emerald-500" />
                                                </div>
                                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                                    Tratamiento de la Variedad
                                                </p>
                                                <p className="text-sm font-medium text-slate-200 leading-relaxed">
                                                    {seeds.find(s => s.id === selectedLog.seedId).treatment}
                                                </p>
                                            </div>
                                        )}

                                        {/* Longitudinal Monitoring / Timelapse Section */}
                                        <div className="space-y-4 pt-2 border-t border-white/10">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-teal-400 flex items-center gap-2">
                                                        <Sprout size={14} />
                                                        Seguimiento / Timelapse ({selectedLogCheckups.length})
                                                    </h4>
                                                    {selectedLog.lastCheckupStatus && CHECKUP_STATUSES[selectedLog.lastCheckupStatus] && (
                                                        <span className={`inline-block mt-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${CHECKUP_STATUSES[selectedLog.lastCheckupStatus].badgeClass}`}>
                                                            Último estado: {CHECKUP_STATUSES[selectedLog.lastCheckupStatus].label}
                                                        </span>
                                                    )}
                                                </div>
                                                {(!isRealUser || canReview) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!isRealUser) {
                                                                onLoginClick?.();
                                                                return;
                                                            }
                                                            setReviewingLog(selectedLog);
                                                        }}
                                                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-[11px] font-black uppercase text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
                                                    >
                                                        <PlusCircle size={14} />
                                                        <span>{isRealUser ? 'Añadir Revisión' : 'Inicia sesión para revisar'}</span>
                                                    </button>
                                                )}
                                            </div>

                                            {selectedLogCheckups.length === 0 ? (
                                                <p className="text-xs text-slate-500 italic">
                                                    Aún no hay revisiones posteriores de campo registradas para este golpe.
                                                </p>
                                            ) : (
                                                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 no-scrollbar">
                                                    {selectedLogCheckups.map((chk) => {
                                                        const cfg = CHECKUP_STATUSES[chk.status];
                                                        const stageLabel = GROWTH_STAGES.find((g) => g.id === chk.growthStage)?.label;
                                                        return (
                                                            <div key={chk.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2">
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${cfg?.badgeClass || 'border-white/10 text-slate-300'}`}>
                                                                        {cfg?.label || chk.status}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono text-slate-500">
                                                                        {chk.timestamp?.seconds ? new Date(chk.timestamp.seconds * 1000).toLocaleDateString('es-ES') : 'Reciente'} · {chk.reviewerName || 'Voluntario'}
                                                                    </span>
                                                                </div>
                                                                {chk.status === 'alive' && (
                                                                    <p className="text-xs font-bold text-emerald-300">
                                                                        {chk.survivingCount || 1} plántula(s) viva(s){stageLabel ? ` · ${stageLabel}` : ''}
                                                                    </p>
                                                                )}
                                                                {chk.causes?.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {chk.causes.map((cId) => (
                                                                            <span key={cId} className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                                                                {CHECKUP_CAUSES.find((c) => c.id === cId)?.label || cId}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {chk.notes && (
                                                                    <p className="text-xs text-slate-300">{chk.notes}</p>
                                                                )}
                                                                {chk.photoUrl && (
                                                                    <img src={chk.photoUrl} alt="Evolución en campo" className="h-32 w-full rounded-xl object-cover border border-white/10" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Community Modal */}
            {showCommunityModal && (
                <div
                    className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-fade-in"
                    onClick={() => setShowCommunityModal(false)}
                >
                    <div
                        className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-2xl max-h-[80vh] overflow-y-auto no-scrollbar shadow-2xl relative p-8 md:p-12"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowCommunityModal(false)}
                            className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-colors z-10"
                        >
                            <X size={24} />
                        </button>

                        <div className="space-y-8">
                            <div className="text-center md:text-left">
                                <div className="inline-block px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full text-[10px] font-black text-teal-500 uppercase tracking-widest mb-4">
                                    Participantes de la Jornada
                                </div>
                                <h3 className="text-4xl font-black uppercase text-white leading-none">Comunidad</h3>
                                <p className="text-slate-400 mt-2 font-medium italic">
                                    Conoce a los sembradores que están haciendo posible esta jornada.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {participants.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 font-bold uppercase tracking-widest text-xs">
                                        Aún no hay participantes registrados.
                                    </div>
                                ) : (
                                    participants.map(p => (
                                        <div key={p.uid} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden">
                                                    {p.photoURL ? (
                                                        <img src={p.photoURL} alt={p.displayName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-sm font-black text-slate-500">{p.displayName?.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors uppercase text-sm">{p.displayName}</h4>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.defaultRole || 'Sembrador'}</p>
                                                </div>
                                            </div>

                                            {isRealUser && user.uid !== p.uid && (
                                                <button
                                                    onClick={() => onSocialAction('follow', p.uid)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userFollowing.has(p.uid)
                                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                        : 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95'
                                                        }`}
                                                >
                                                    {userFollowing.has(p.uid) ? 'SIGUIENDO' : 'SEGUIR'}
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {reviewingLog && (
                <CheckupFormModal
                    log={reviewingLog}
                    onClose={() => setReviewingLog(null)}
                    onSave={handleSaveCheckup}
                    isSaving={isSavingCheckup}
                />
            )}
        </div >
    );
};

export default CampaignDashboard;
