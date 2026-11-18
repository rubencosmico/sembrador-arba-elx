import React, { useState, useEffect, useMemo } from 'react';
import {
    collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';
import {
    ArrowLeft, Search, FlaskConical, CheckCircle2, Droplets,
    Calendar, Plus, X, Sprout, ClipboardCheck, ShieldCheck,
    Sparkles, BookOpen
} from 'lucide-react';
import {
    DORMANCY_TYPES,
    getDormancyInfo,
    mergeProtocolsWithCommunity,
    computeProtocolFieldStats
} from '../utils/seedProtocolsCatalog';

const INITIAL_FORM_STATE = {
    commonName: '',
    scientificName: '',
    family: '',
    dormancyType: 'physical',
    hydrationHours: '24',
    summaryRecipe: '',
    scarification: '',
    stratification: '',
    inoculation: '',
    pelleting: '',
    harvestSeason: '',
    sowingSeason: '',
    workshopTips: ''
};

const SeedLabView = ({
    db, appId, user, userProfile, isSuperAdmin, onBack, onLoginClick
}) => {
    const [communityProtocols, setCommunityProtocols] = useState([]);
    const [seeds, setSeeds] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [dormancyFilter, setDormancyFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'verified' | 'community'

    const [selectedProtocol, setSelectedProtocol] = useState(null);
    const [checkedSteps, setCheckedSteps] = useState({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [verifyingId, setVerifyingId] = useState(null);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        if (!db || !appId) {
            setLoading(false);
            return;
        }

        const basePath = ['artifacts', appId, 'public', 'data'];
        const unsubProtocols = onSnapshot(
            collection(db, ...basePath, 'seedProtocols'),
            (snap) => {
                setCommunityProtocols(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error('[SeedLabView] Error cargando protocolos:', err);
                setLoading(false);
            }
        );

        const unsubSeeds = onSnapshot(
            collection(db, ...basePath, 'seeds'),
            (snap) => setSeeds(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => console.error('[SeedLabView] Error cargando lotes:', err)
        );

        const unsubLogs = onSnapshot(
            collection(db, ...basePath, 'logs'),
            (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
            (err) => console.error('[SeedLabView] Error cargando logs:', err)
        );

        return () => {
            unsubProtocols();
            unsubSeeds();
            unsubLogs();
        };
    }, [db, appId]);

    const protocols = useMemo(
        () => mergeProtocolsWithCommunity(communityProtocols),
        [communityProtocols]
    );

    const statsById = useMemo(
        () => computeProtocolFieldStats(protocols, seeds, logs),
        [protocols, seeds, logs]
    );

    const verifiedCount = useMemo(
        () => protocols.filter((p) => p.status === 'verified').length,
        [protocols]
    );

    const communityCount = useMemo(
        () => protocols.filter((p) => p.status !== 'verified').length,
        [protocols]
    );

    const filteredProtocols = useMemo(() => {
        const needle = searchTerm.trim().toLowerCase();
        return protocols.filter((protocol) => {
            if (dormancyFilter !== 'all' && protocol.dormancyType !== dormancyFilter) return false;
            if (statusFilter === 'verified' && protocol.status !== 'verified') return false;
            if (statusFilter === 'community' && protocol.status === 'verified') return false;

            if (!needle) return true;
            const haystack = [
                protocol.commonName,
                protocol.scientificName,
                protocol.family,
                protocol.summaryRecipe,
                protocol.scarification,
                protocol.stratification
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(needle);
        });
    }, [protocols, searchTerm, dormancyFilter, statusFilter]);

    const handleOpenCreate = () => {
        if (!user || user.isAnonymous) {
            onLoginClick?.();
            return;
        }
        setSubmitError('');
        setShowCreateModal(true);
    };

    const handleOpenWorkshop = (protocol) => {
        setCheckedSteps({});
        setSelectedProtocol(protocol);
    };

    const toggleWorkshopStep = (stepKey) => {
        setCheckedSteps((prev) => ({ ...prev, [stepKey]: !prev[stepKey] }));
    };

    const handleCreateProtocol = async (e) => {
        e.preventDefault();
        if (!db || !appId || !user || user.isAnonymous) return;

        if (!formData.commonName.trim() || !formData.scientificName.trim() || !formData.summaryRecipe.trim()) {
            setSubmitError('Completa el nombre común, nombre científico y resumen de la receta.');
            return;
        }

        const parsedHours = formData.hydrationHours === '' ? null : Number(formData.hydrationHours);
        if (parsedHours !== null && (Number.isNaN(parsedHours) || parsedHours < 0 || parsedHours > 2000)) {
            setSubmitError('Las horas de hidratación deben estar entre 0 y 2000.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');
        try {
            const authorName =
                userProfile?.displayName ||
                user.displayName ||
                user.email?.split('@')[0] ||
                'Voluntario';

            const payload = {
                commonName: formData.commonName.trim(),
                scientificName: formData.scientificName.trim(),
                family: formData.family.trim() || null,
                dormancyType: formData.dormancyType,
                hydrationHours: parsedHours,
                summaryRecipe: formData.summaryRecipe.trim(),
                scarification: formData.scarification.trim() || null,
                stratification: formData.stratification.trim() || null,
                inoculation: formData.inoculation.trim() || null,
                pelleting: formData.pelleting.trim() || null,
                harvestSeason: formData.harvestSeason.trim() || null,
                sowingSeason: formData.sowingSeason.trim() || null,
                workshopTips: formData.workshopTips.trim() || null,
                status: isSuperAdmin ? 'verified' : 'community',
                authorId: user.uid,
                authorName,
                verifiedBy: isSuperAdmin ? authorName : null,
                verifiedAt: isSuperAdmin ? serverTimestamp() : null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'seedProtocols'), payload);
            setFormData(INITIAL_FORM_STATE);
            setShowCreateModal(false);
        } catch (err) {
            console.error('[SeedLabView] Error guardando protocolo:', err);
            setSubmitError('No se pudo guardar el protocolo. Verifica los datos y permisos.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyProtocol = async (protocol) => {
        if (!db || !appId || !isSuperAdmin || !protocol?.id || protocol.isBuiltIn) return;
        setVerifyingId(protocol.id);
        try {
            const verifierName =
                userProfile?.displayName || user?.displayName || user?.uid || 'Admin';
            await updateDoc(
                doc(db, 'artifacts', appId, 'public', 'data', 'seedProtocols', protocol.id),
                {
                    status: 'verified',
                    verifiedBy: verifierName,
                    verifiedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }
            );
        } catch (err) {
            console.error('[SeedLabView] Error verificando protocolo:', err);
            alert('No se pudo verificar el protocolo.');
        } finally {
            setVerifyingId(null);
        }
    };

    const workshopSteps = selectedProtocol
        ? [
            {
                key: 'scarification',
                title: '1. Escarificación / Limpieza de cubierta',
                detail: selectedProtocol.scarification || 'No requerida para esta especie.'
            },
            {
                key: 'hydration',
                title: '2. Hidratación previa',
                detail:
                    selectedProtocol.hydrationHours != null && selectedProtocol.hydrationHours > 0
                        ? `${selectedProtocol.hydrationHours} horas en agua limpia (descartar semillas flotantes tras el remojo).`
                        : 'Sin remojo prolongado previo; mantener humedad ambiental adecuada.'
            },
            {
                key: 'stratification',
                title: '3. Estratificación / Rotura de latencia',
                detail: selectedProtocol.stratification || 'No requiere estratificación artificial adicional.'
            },
            {
                key: 'inoculation',
                title: '4. Inoculación / Bioestimulantes',
                detail: selectedProtocol.inoculation || 'Opcional: inóculo ligero de suelo forestal autóctono sano.'
            },
            {
                key: 'pelleting',
                title: '5. Pildorizado y Siembra en campo',
                detail: selectedProtocol.pelleting || 'Siembra directa en micrositio protegido (nodriza o piedra).'
            }
        ]
        : [];

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans pb-24">
            <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
                            title="Volver al inicio"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-black uppercase tracking-widest">
                                <BookOpen size={14} />
                                <span>Conocimiento Abierto ARBA</span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
                                Open Seed Lab · Biblioteca de Semillas y Tratamientos
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-2xl px-3.5 py-2 text-xs">
                            <span className="text-emerald-400 font-black">{verifiedCount} verificados</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-amber-400 font-bold">{communityCount} en ensayo</span>
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Plus size={16} strokeWidth={3} />
                            <span>+ Aportar Protocolo</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
                {/* Search and Filters */}
                <section className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-5 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar especie, nombre científico o tratamiento..."
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-950/70 border border-slate-700 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        />
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">
                                Latencia:
                            </span>
                            <button
                                onClick={() => setDormancyFilter('all')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${dormancyFilter === 'all'
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                            >
                                Todas
                            </button>
                            {DORMANCY_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setDormancyFilter(type.id)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${dormancyFilter === type.id
                                        ? 'bg-emerald-500 text-slate-950'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {type.shortLabel}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">
                                Estado:
                            </span>
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'verified', label: 'Verificados' },
                                { id: 'community', label: 'En ensayo' }
                            ].map((st) => (
                                <button
                                    key={st.id}
                                    onClick={() => setStatusFilter(st.id)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === st.id
                                        ? 'bg-teal-500 text-slate-950'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Protocols Grid */}
                {loading && (
                    <div className="text-center text-sm text-emerald-400 animate-pulse">
                        Sincronizando aportaciones comunitarias y métricas de campo...
                    </div>
                )}

                {filteredProtocols.length === 0 ? (
                    <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-3xl p-12 text-center space-y-3">
                        <Sprout className="mx-auto text-slate-600" size={40} />
                        <p className="text-slate-300 font-bold">No se encontraron protocolos con esos filtros.</p>
                        <button
                            onClick={() => { setSearchTerm(''); setDormancyFilter('all'); setStatusFilter('all'); }}
                            className="text-xs font-black text-emerald-400 uppercase tracking-wider hover:underline"
                        >
                            Restablecer filtros
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProtocols.map((protocol) => {
                            const isVerified = protocol.status === 'verified';
                            const dormancyMeta = getDormancyInfo(protocol.dormancyType);
                            const stats = statsById[protocol.id] || {
                                lotCount: 0,
                                totalSownLogs: 0,
                                reviewedLogs: 0,
                                aliveLogs: 0,
                                empiricalSuccessRate: null
                            };

                            return (
                                <article
                                    key={protocol.id}
                                    className="bg-slate-800/50 border border-slate-700/60 hover:border-emerald-500/40 rounded-3xl p-6 flex flex-col justify-between transition-all shadow-lg"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isVerified
                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                                    }`}
                                            >
                                                {isVerified ? (
                                                    <>
                                                        <CheckCircle2 size={12} />
                                                        <span>✓ Verificado</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FlaskConical size={12} />
                                                        <span>🧪 En ensayo</span>
                                                    </>
                                                )}
                                            </span>
                                            {protocol.family && (
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-900/70 px-2.5 py-1 rounded-lg">
                                                    {protocol.family}
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h2 className="text-xl font-extrabold text-white leading-tight">
                                                {protocol.commonName}
                                            </h2>
                                            <p className="text-sm italic text-emerald-300/90 font-medium mt-0.5">
                                                {protocol.scientificName}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                                            <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 text-slate-300 border border-slate-700/60">
                                                {dormancyMeta.shortLabel}
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 inline-flex items-center gap-1">
                                                <Droplets size={12} />
                                                <span>💧 {protocol.hydrationHours ?? 0}h</span>
                                            </span>
                                        </div>

                                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                                                Receta pre-germinativa
                                            </div>
                                            <p className="text-xs text-slate-200 font-medium leading-relaxed">
                                                {protocol.summaryRecipe}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                                            <div className="bg-slate-900/50 rounded-xl p-2.5">
                                                <span className="block text-[9px] font-black uppercase text-slate-500">
                                                    Recolección
                                                </span>
                                                <span className="text-slate-200 font-semibold">
                                                    {protocol.harvestSeason || 'Según comarca'}
                                                </span>
                                            </div>
                                            <div className="bg-slate-900/50 rounded-xl p-2.5">
                                                <span className="block text-[9px] font-black uppercase text-slate-500">
                                                    Siembra óptima
                                                </span>
                                                <span className="text-slate-200 font-semibold">
                                                    {protocol.sowingSeason || 'Otoño / Invierno'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Evidencia empírica en campo */}
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3.5">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-1.5">
                                                <Sparkles size={12} />
                                                <span>Evidencia empírica en campo</span>
                                            </div>
                                            {stats.reviewedLogs > 0 ? (
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <span className="text-lg font-black text-emerald-300">
                                                        {stats.empiricalSuccessRate}% de éxito en campo
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-semibold">
                                                        ({stats.aliveLogs}/{stats.reviewedLogs} golpes revisados)
                                                    </span>
                                                </div>
                                            ) : stats.totalSownLogs > 0 ? (
                                                <p className="text-xs text-slate-300 font-semibold">
                                                    {stats.totalSownLogs} golpes sembrados · Sin revisiones aún
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-500">
                                                    Sin ensayos en campo registrados
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-4 border-t border-slate-700/50 space-y-2">
                                        <button
                                            onClick={() => handleOpenWorkshop(protocol)}
                                            className="w-full py-3 px-4 bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 border border-slate-700 hover:border-emerald-400 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                                        >
                                            <ClipboardCheck size={15} />
                                            <span>Ver Receta Paso a Paso</span>
                                        </button>

                                        {isSuperAdmin && protocol.status === 'community' && !protocol.isBuiltIn && (
                                            <button
                                                onClick={() => handleVerifyProtocol(protocol)}
                                                disabled={verifyingId === protocol.id}
                                                className="w-full py-2.5 px-4 bg-purple-500/15 hover:bg-purple-500 hover:text-white text-purple-300 border border-purple-500/30 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                            >
                                                <ShieldCheck size={15} />
                                                <span>
                                                    {verifyingId === protocol.id ? 'Verificando...' : 'Verificar Protocolo'}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal: Modo Taller Paso a Paso */}
            {selectedProtocol && (
                <div className="fixed inset-0 z-[1100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 my-8 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                                    Modo Taller Paso a Paso
                                </div>
                                <h2 className="text-2xl font-black text-white">
                                    {selectedProtocol.commonName}
                                </h2>
                                <p className="text-sm italic text-emerald-300">
                                    {selectedProtocol.scientificName}
                                    {selectedProtocol.family ? ` · ${selectedProtocol.family}` : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedProtocol(null)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300"
                                aria-label="Cerrar receta"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3 flex items-center gap-2.5">
                                <Calendar size={16} className="text-emerald-400 shrink-0" />
                                <div>
                                    <span className="block text-[10px] text-slate-400 uppercase font-black">Recolección</span>
                                    <span className="font-bold text-white">{selectedProtocol.harvestSeason || 'Según comarca'}</span>
                                </div>
                            </div>
                            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3 flex items-center gap-2.5">
                                <Sprout size={16} className="text-teal-400 shrink-0" />
                                <div>
                                    <span className="block text-[10px] text-slate-400 uppercase font-black">Siembra</span>
                                    <span className="font-bold text-white">{selectedProtocol.sowingSeason || 'Otoño / Invierno'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                                Checklist interactivo de preparación
                            </h3>
                            {workshopSteps.map((step) => {
                                const done = Boolean(checkedSteps[step.key]);
                                return (
                                    <label
                                        key={step.key}
                                        className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${done
                                            ? 'bg-emerald-500/10 border-emerald-500/40'
                                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={done}
                                            onChange={() => toggleWorkshopStep(step.key)}
                                            className="mt-1 h-4 w-4 rounded accent-emerald-500"
                                        />
                                        <div>
                                            <div className={`text-sm font-bold ${done ? 'line-through text-emerald-300' : 'text-white'}`}>
                                                {step.title}
                                            </div>
                                            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                                {step.detail}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        {selectedProtocol.workshopTips && (
                            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-1">
                                    Consejos prácticos de taller y campo
                                </div>
                                <p className="text-xs text-amber-100/90 leading-relaxed">
                                    {selectedProtocol.workshopTips}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                            <span>Autoría: {selectedProtocol.authorName || 'Comunidad ARBA'}</span>
                            <span>Latencia: {getDormancyInfo(selectedProtocol.dormancyType).label}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Aportar Nuevo Protocolo */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[1100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 my-8 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400 mb-1">
                                    Ciencia Ciudadana Abierta
                                </div>
                                <h2 className="text-2xl font-black text-white">
                                    Aportar Nuevo Protocolo
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">
                                    {isSuperAdmin
                                        ? 'Tu protocolo se publicará verificado directamente.'
                                        : 'Se publicará con el sello «En ensayo» para validación comunitaria y verificación por administradores.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300"
                                aria-label="Cerrar formulario"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {submitError && (
                            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold">
                                {submitError}
                            </div>
                        )}

                        <form onSubmit={handleCreateProtocol} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Nombre común *
                                    </label>
                                    <input
                                        required
                                        value={formData.commonName}
                                        onChange={(e) => setFormData({ ...formData, commonName: e.target.value })}
                                        placeholder="Ej: Cornicabra"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Nombre científico *
                                    </label>
                                    <input
                                        required
                                        value={formData.scientificName}
                                        onChange={(e) => setFormData({ ...formData, scientificName: e.target.value })}
                                        placeholder="Ej: Pistacia terebinthus"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Familia botánica
                                    </label>
                                    <input
                                        value={formData.family}
                                        onChange={(e) => setFormData({ ...formData, family: e.target.value })}
                                        placeholder="Ej: Anacardiaceae"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Tipo de latencia *
                                    </label>
                                    <select
                                        value={formData.dormancyType}
                                        onChange={(e) => setFormData({ ...formData, dormancyType: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    >
                                        {DORMANCY_TYPES.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.shortLabel}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Hidratación (horas)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="2000"
                                        value={formData.hydrationHours}
                                        onChange={(e) => setFormData({ ...formData, hydrationHours: e.target.value })}
                                        placeholder="24"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Resumen de la receta *
                                </label>
                                <input
                                    required
                                    value={formData.summaryRecipe}
                                    onChange={(e) => setFormData({ ...formData, summaryRecipe: e.target.value })}
                                    placeholder="Ej: Despulpado + Escarificación suave + Remojo 24h"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Escarificación
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.scarification}
                                        onChange={(e) => setFormData({ ...formData, scarification: e.target.value })}
                                        placeholder="Detalla lijado, despulpado o choque térmico..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Estratificación
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.stratification}
                                        onChange={(e) => setFormData({ ...formData, stratification: e.target.value })}
                                        placeholder="Ej: Frío húmedo 30 días a 4 °C..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Inoculación / Bioestimulantes
                                    </label>
                                    <input
                                        value={formData.inoculation}
                                        onChange={(e) => setFormData({ ...formData, inoculation: e.target.value })}
                                        placeholder="Ej: Micorrizas / suelo bosque maduro"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Pildorizado / Protectores
                                    </label>
                                    <input
                                        value={formData.pelleting}
                                        onChange={(e) => setFormData({ ...formData, pelleting: e.target.value })}
                                        placeholder="Ej: Arcilla + profundidad 2 cm"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Época de recolección
                                    </label>
                                    <input
                                        value={formData.harvestSeason}
                                        onChange={(e) => setFormData({ ...formData, harvestSeason: e.target.value })}
                                        placeholder="Ej: Septiembre – Octubre"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Época de siembra
                                    </label>
                                    <input
                                        value={formData.sowingSeason}
                                        onChange={(e) => setFormData({ ...formData, sowingSeason: e.target.value })}
                                        placeholder="Ej: Noviembre – Enero"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Consejos prácticos de taller
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.workshopTips}
                                    onChange={(e) => setFormData({ ...formData, workshopTips: e.target.value })}
                                    placeholder="Recomendaciones para voluntarios en preparación y campo..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Publicando...' : 'Publicar Protocolo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeedLabView;
