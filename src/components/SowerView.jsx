import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { addDoc, updateDoc, deleteDoc, doc, collection, serverTimestamp, query, orderBy, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import {
    Users, LogOut, ArrowRight, AlertTriangle, History,
    Leaf, X, HelpCircle, PlusCircle, Camera, MapPin, Trash2,
    Search, ChevronDown, ChevronUp, Pencil
} from 'lucide-react';
import ManualView from './ManualView';
import SowingForm from './SowingForm';

const SowerView = ({ db, appId, campaignId, seeds, groups, userId, storage, onResetRole }) => {
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [groupStats, setGroupStats] = useState({});
    const [showManual, setShowManual] = useState(false);
    const [view, setView] = useState('form');
    const [editingLog, setEditingLog] = useState(null);
    // FormData, GPS, and Photo states moved to SowingForm
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allTeamLogs, setAllTeamLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [viewImage, setViewImage] = useState(null);
    const [expandedLogId, setExpandedLogId] = useState(null);

    // Estados para el cuaderno de campo con paginación
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('seedName'); // 'seedName' o 'microsite'
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' o 'desc'

    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [logsPerPage, setLogsPerPage] = useState(10);
    const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

    // Efecto para cargar estadísticas de grupos
    useEffect(() => {
        if (selectedGroupId || !campaignId) return;

        const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'logs'),
            where('campaignId', '==', campaignId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const stats = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const gid = data.groupId;
                const count = parseInt(data.holeCount) || 1;

                if (gid) {
                    stats[gid] = (stats[gid] || 0) + count;
                }
            });
            setGroupStats(stats);
        });

        return () => unsubscribe();
    }, [campaignId, db, appId, selectedGroupId]);

    // Total de golpes del equipo
    const totalTeamHoles = useMemo(() => {
        return allTeamLogs.reduce((acc, log) => acc + (parseInt(log.holeCount) || 1), 0);
    }, [allTeamLogs]);

    // Cargar todos los logs de la campaña y filtrar por equipo
    useEffect(() => {
        if (!selectedGroupId || !campaignId) return;

        const fetchLogs = async () => {
            setLoadingLogs(true);
            setAllTeamLogs([]);
            setCurrentPage(1);

            try {
                const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
                const q = query(
                    logsRef,
                    where('campaignId', '==', campaignId),
                    where('groupId', '==', selectedGroupId),
                    orderBy('timestamp', 'desc'),
                    limit(500)
                );

                const snapshot = await getDocs(q);
                const teamLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllTeamLogs(teamLogs);
            } catch (error) {
                console.error('Error cargando logs:', error);
            } finally {
                setLoadingLogs(false);
            }
        };

        fetchLogs();
    }, [selectedGroupId, campaignId, db, appId]);

    // Resetear página cuando cambian filtros o resultados por página
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sortField, sortDirection, logsPerPage]);

    // Logs filtrados y ordenados (sobre todos los logs del equipo)
    const filteredAndSortedLogs = useMemo(() => {
        let result = [...allTeamLogs];

        // Filtrar por búsqueda
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(log =>
                (log.seedName || '').toLowerCase().includes(term) ||
                (log.microsite || '').toLowerCase().includes(term)
            );
        }

        // Ordenar
        result.sort((a, b) => {
            let valA, valB;
            if (sortField === 'seedName') {
                valA = (a.seedName || '').toLowerCase();
                valB = (b.seedName || '').toLowerCase();
            } else if (sortField === 'microsite') {
                valA = (a.microsite || '').toLowerCase();
                valB = (b.microsite || '').toLowerCase();
            }

            if (sortDirection === 'asc') {
                return valA > valB ? 1 : valA < valB ? -1 : 0;
            } else {
                return valA < valB ? 1 : valA > valB ? -1 : 0;
            }
        });

        return result;
    }, [allTeamLogs, searchTerm, sortField, sortDirection]);

    // Cálculos de paginación
    const totalPages = Math.ceil(filteredAndSortedLogs.length / logsPerPage);
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    const paginatedLogs = filteredAndSortedLogs.slice(startIndex, endIndex);

    // Función para cambiar ordenación
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Funciones de navegación de páginas
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const startEditing = (log) => {
        setEditingLog(log);
        setView('form');
    };

    const cancelEditing = () => {
        setEditingLog(null);
        setView('history');
    };


    const handleSow = async (data) => {
        setIsSubmitting(true);
        try {
            const selectedGroup = groups.find(g => g.id === selectedGroupId);
            // data.seedName ya viene de SowingForm, pero si queremos recalcular por seguridad:
            const seed = seeds.find(s => s.id === data.seedId);
            const seedName = seed ? seed.species : (data.seedName || 'Desconocida');

            const commonData = {
                holeCount: parseInt(data.holeCount) || 1,
                microsite: data.microsite,
                orientation: data.orientation,
                withSubstrate: data.withSubstrate,
                withProtector: data.withProtector,
                quantity: String(data.quantity || '1'),
                notes: data.notes,
                location: data.location,
                seedId: data.seedId,
                seedName
            };

            let photoUrl = editingLog?.photoUrl || null;

            if (data.photoDeleted) {
                photoUrl = null;
            }

            if (data.photo && storage) {
                const logId = editingLog ? editingLog.id : `${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`;
                const photoRef = ref(storage, `photos/logs/${logId}_${Date.now()}.jpg`);
                await uploadString(photoRef, data.photo, 'data_url');
                photoUrl = await getDownloadURL(photoRef);
            }

            if (editingLog) {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'logs', editingLog.id), {
                    ...commonData,
                    photoUrl,
                    updatedAt: serverTimestamp()
                });
                // Update local list
                setAllTeamLogs(prev => prev.map(l => l.id === editingLog.id ? { ...l, ...commonData, photoUrl, updatedAt: { seconds: Date.now() / 1000 } } : l));
            } else {
                const logData = {
                    ...commonData,
                    photoUrl,
                    campaignId,
                    groupId: selectedGroupId,
                    groupName: selectedGroup?.name || 'Desconocido',
                    userId,
                    timestamp: serverTimestamp()
                };
                const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), logData);
                const newLog = { id: docRef.id, ...logData, timestamp: { seconds: Date.now() / 1000 } };
                setAllTeamLogs(prev => [newLog, ...prev]);
            }

            cancelEditing();
            if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(200);

        } catch (error) {
            console.error('Error guardando:', error);
            alert("Error guardando: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    const mySeeds = selectedGroup ? seeds.filter(s => selectedGroup.assignedSeeds?.includes(s.id)) : [];
    const totalHoles = totalTeamHoles; // Usar el cálculo desde allTeamLogs

    if (!selectedGroupId) {
        // Team Selection Screen (Simplified copy from original)
        return (
            <div className="min-h-screen bg-[#f1f5f0] p-6 flex flex-col justify-center overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-emerald-500 to-emerald-700"></div>
                <div className="text-center mb-10 animate-slideUp">
                    <div className="inline-flex p-3 rounded-2xl bg-emerald-600 text-white shadow-xl mb-4 relative">
                        <Users size={32} />
                        <button onClick={onResetRole} className="absolute -top-2 -right-2 bg-white text-emerald-600 p-1.5 rounded-full shadow-lg border border-emerald-50 hover:bg-emerald-50 transition-colors">
                            <LogOut size={14} />
                        </button>
                    </div>
                    <h2 className="text-3xl font-extrabold text-emerald-950 mb-2">Identifícate</h2>
                    <p className="text-emerald-800/50 font-medium px-4">Selecciona tu equipo</p>
                </div>
                <div className="grid gap-4 max-w-md mx-auto w-full animate-slideUp [animation-delay:200ms]">
                    {groups.map((group) => (
                        <button
                            key={group.id}
                            onClick={() => setSelectedGroupId(group.id)}
                            className="btn-premium group relative bg-white border border-emerald-100 p-6 rounded-3xl flex items-center gap-4 hover:shadow-2xl hover:border-emerald-500 transition-all active:scale-[0.98]"
                        >
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner relative">
                                <Users size={24} />
                                {(groupStats[group.id] || 0) > 0 && (
                                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border-2 border-white">
                                        {groupStats[group.id]}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-xl font-extrabold text-emerald-950 group-hover:text-emerald-700 transition-colors">{group.name}</div>
                                <div className="flex items-center gap-3 mt-1">
                                    <div className="text-emerald-800/40 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                                        <Leaf size={12} className="text-emerald-400" />
                                        {group.assignedSeeds?.length || 0} Variedades
                                    </div>
                                    {(groupStats[group.id] || 0) > 0 && (
                                        <>
                                            <div className="w-1 h-1 bg-emerald-200 rounded-full"></div>
                                            <div className="text-emerald-600 text-xs font-bold uppercase tracking-widest">
                                                {groupStats[group.id] || 0} Golpes
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <ArrowRight className="text-emerald-100 group-hover:text-emerald-500 transition-colors" size={24} />
                        </button>
                    ))}
                    {groups.length === 0 && (
                        <div className="text-center glass-card p-10 rounded-3xl max-w-sm mx-auto animate-slideUp border-dashed border-2 border-emerald-100">
                            <AlertTriangle className="text-amber-500 mx-auto mb-4" size={32} />
                            <p className="text-emerald-950 font-bold mb-1">Sin equipos en esta jornada</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (showManual) {
        return <ManualView onBack={() => setShowManual(false)} />;
    }

    const exitGroup = () => {
        setSelectedGroupId(null);
        setEditingLog(null);
        setView('form');
    };

    const confirmAndDelete = async (logId) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.")) {
            setIsSubmitting(true); // Reuse submitting state for loading indication
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'logs', logId));
                setAllTeamLogs(prev => prev.filter(l => l.id !== logId));
                if (editingLog && editingLog.id === logId) {
                    cancelEditing();
                }
            } catch (error) {
                console.error("Error eliminando:", error);
                alert("Error al eliminar el registro.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f5f0] pb-28 font-sans">
            <header className="glass-card sticky top-0 z-30 px-6 py-4 flex justify-between items-end border-b border-amber-100/50">
                <div className="flex gap-4 items-end">
                    <button onClick={exitGroup} className="mb-1 text-emerald-950/30 hover:text-emerald-950/60 transition-colors">
                        <LogOut size={20} />
                    </button>
                    <button onClick={() => setShowManual(true)} className="mb-1 text-emerald-950/30 hover:text-emerald-950/60 transition-colors">
                        <HelpCircle size={20} />
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
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-emerald-400">Total</span>
                    <span className="text-xl font-black leading-none">{totalHoles}</span>
                </div>
            </header>

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
                <div className="glass-card p-1.5 rounded-[2.5rem] flex items-center shadow-2xl border border-emerald-100/30">
                    <button onClick={() => setView('form')} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-[2rem] transition-all duration-300 ${view === 'form' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-900/40'}`}>
                        <PlusCircle size={20} /><span className="text-[10px] font-bold uppercase">Siembra</span>
                    </button>
                    <button onClick={() => setView('history')} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-[2rem] transition-all duration-300 ${view === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-900/40'}`}>
                        <History size={20} /><span className="text-[10px] font-bold uppercase">Cuaderno</span>
                    </button>
                </div>
            </div>

            {view === 'form' && (
                <div className="px-3 md:px-5 pb-12 animate-slideUp">
                    {editingLog && (
                        <div className="bg-amber-100 p-4 rounded-2xl flex items-center justify-between border border-amber-200 mb-6 animate-pulse">
                            <span className="text-amber-900 font-bold flex items-center gap-2">
                                <Pencil size={18} /> Editando registro
                            </span>
                            <button onClick={cancelEditing} className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-amber-900 shadow-sm">
                                Cancelar
                            </button>
                        </div>
                    )}

                    <SowingForm
                        initialData={editingLog || undefined}
                        seeds={mySeeds}
                        onSave={handleSow}
                        onCancel={cancelEditing}
                        onDelete={editingLog ? () => confirmAndDelete(editingLog.id) : undefined}
                        isSaving={isSubmitting}
                    />
                </div>
            )}

            {view === 'history' && (
                <div className="px-5 space-y-4 animate-slideUp pb-12 pt-4">
                    {/* Header con total de golpes */}
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-emerald-950">Cuaderno de Campo</h3>
                        {!loadingLogs && allTeamLogs.length > 0 && (
                            <span className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-full shadow-sm">
                                {totalTeamHoles} golpes totales
                            </span>
                        )}
                    </div>

                    {/* Barra de herramientas: Buscador y selector de registros por página */}
                    {!loadingLogs && allTeamLogs.length > 0 && (
                        <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm outline-none focus:border-emerald-500 transition-colors"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-600"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <select
                                value={logsPerPage}
                                onChange={(e) => setLogsPerPage(parseInt(e.target.value))}
                                className="px-3 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm outline-none focus:border-emerald-500"
                            >
                                {PAGE_SIZE_OPTIONS.map(size => (
                                    <option key={size} value={size}>{size} / pág</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Botones de ordenación */}
                    {!loadingLogs && allTeamLogs.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleSort('seedName')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${sortField === 'seedName' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}
                            >
                                Semilla
                                {sortField === 'seedName' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                            </button>
                            <button
                                onClick={() => handleSort('microsite')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${sortField === 'microsite' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}
                            >
                                Micrositio
                                {sortField === 'microsite' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                            </button>
                        </div>
                    )}

                    {loadingLogs ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                            <p className="text-sm text-emerald-800/60 font-medium">Cargando registros...</p>
                        </div>
                    ) : allTeamLogs.length === 0 ? (
                        <div className="text-center py-12 text-emerald-800/40">
                            <History size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">Sin registros todavía</p>
                        </div>
                    ) : filteredAndSortedLogs.length === 0 ? (
                        <div className="text-center py-12 text-emerald-800/40">
                            <Search size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">No se encontraron resultados</p>
                            <button onClick={() => setSearchTerm('')} className="mt-2 text-xs text-emerald-600 font-bold underline">
                                Limpiar búsqueda
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Info de paginación */}
                            <div className="text-xs text-emerald-800/50 text-center">
                                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredAndSortedLogs.length)} de {filteredAndSortedLogs.length} registros
                            </div>

                            {/* Lista de registros */}
                            <div className="space-y-3 mt-4">
                                {paginatedLogs.map(log => (
                                    <div
                                        key={log.id}
                                        className={`glass-card rounded-2xl border transition-all cursor-pointer overflow-hidden ${expandedLogId === log.id ? 'bg-emerald-50/80 border-emerald-200 shadow-md' : 'border-emerald-100/30 hover:bg-white/60'}`}
                                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                    >
                                        <div className="p-4 flex justify-between items-center">
                                            <div className="flex-1">
                                                <div className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                                                    {log.seedName}
                                                    {log.notes && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>}
                                                </div>
                                                <div className="text-xs text-emerald-800/50 flex items-center gap-2">
                                                    <span>{log.microsite}</span>
                                                    <span className="text-emerald-200">•</span>
                                                    <span>{log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="text-right mr-1">
                                                    <div className="font-black text-emerald-700 text-lg">{log.holeCount || 1}</div>
                                                    <div className="text-[9px] font-bold text-emerald-800/30 uppercase">Golpes</div>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        startEditing(log);
                                                    }}
                                                    className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 hover:bg-emerald-100 active:scale-95 transition-all border border-emerald-100"
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        confirmAndDelete(log.id);
                                                    }}
                                                    className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-100 active:scale-95 transition-all border border-red-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>

                                                <div className="text-emerald-300 ml-1">
                                                    {expandedLogId === log.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </div>
                                            </div>
                                        </div>

                                        {expandedLogId === log.id && (
                                            <div className="px-4 pb-4 pt-0 border-t border-emerald-100/20 bg-emerald-50/20 animate-fadeIn">
                                                <div className="flex flex-col gap-4 mt-4">
                                                    {(log.photoUrl || log.photo) ? (
                                                        <div className="w-full bg-black/5 rounded-xl overflow-hidden shadow-sm" onClick={(e) => { e.stopPropagation(); setViewImage(log.photoUrl || log.photo); }}>
                                                            <img src={log.photoUrl || log.photo} alt="Evidencia" className="w-full h-auto max-h-[400px] object-contain mx-auto" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-24 rounded-xl bg-emerald-100/50 flex flex-col items-center justify-center text-emerald-800/30 border-2 border-dashed border-emerald-200">
                                                            <Camera size={24} />
                                                            <span className="text-[10px] font-bold uppercase mt-1">Sin foto</span>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 gap-3 text-xs text-emerald-900">
                                                        <div className="col-span-2">
                                                            <span className="text-[9px] font-bold text-emerald-800/40 uppercase tracking-wider block mb-1">Nota</span>
                                                            <div className="bg-white/60 p-2 rounded-lg italic border border-emerald-50 text-emerald-950">"{log.notes || 'Sin notas'}"</div>
                                                        </div>

                                                        <div>
                                                            <span className="text-[9px] font-bold text-emerald-800/40 uppercase tracking-wider block">Orientación</span>
                                                            <span className="font-bold">{log.orientation || '-'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] font-bold text-emerald-800/40 uppercase tracking-wider block">Semillas/Hoyo</span>
                                                            <span className="font-bold">{log.quantity || '1'}</span>
                                                        </div>

                                                        <div>
                                                            <span className="text-[9px] font-bold text-emerald-800/40 uppercase tracking-wider block">Sustrato</span>
                                                            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-[10px] uppercase ${log.withSubstrate ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'}`}>{log.withSubstrate ? "SÍ" : "NO"}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] font-bold text-emerald-800/40 uppercase tracking-wider block">Protector</span>
                                                            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-[10px] uppercase ${log.withProtector ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-400'}`}>{log.withProtector ? "SÍ" : "NO"}</div>
                                                        </div>

                                                        <div className="col-span-2">
                                                            <span className="text-[9px] font-bold text-emerald-800/40 uppercase tracking-wider block">Tratamiento</span>
                                                            <span className="font-medium">{seeds.find(s => s.id === log.seedId)?.treatment || 'Ninguno'}</span>
                                                        </div>

                                                        <div className="col-span-2">
                                                            <span className="text-[9px] font-bold text-emerald-800/40 uppercase tracking-wider block">GPS</span>
                                                            {log.location?.lat ? (
                                                                <div className="flex items-center gap-2">
                                                                    <MapPin size={14} className="text-emerald-400" />
                                                                    <span className="font-mono">{log.location.lat.toFixed(6)}, {log.location.lng.toFixed(6)}</span>
                                                                    <span className="text-[9px] bg-white px-1 rounded border border-emerald-100">±{log.location.acc?.toFixed(0)}m</span>
                                                                </div>
                                                            ) : <span className="text-gray-400 italic">Sin ubicación</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Controles de paginación */}
                            {
                                totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 pt-2">
                                        <button
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="w-9 h-9 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-200 transition-colors"
                                        >
                                            ←
                                        </button>

                                        {/* Números de página */}
                                        <div className="flex gap-1">
                                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => goToPage(pageNum)}
                                                        className={`w-9 h-9 flex items-center justify-center rounded-xl font-bold text-sm transition-colors ${currentPage === pageNum
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="w-9 h-9 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-200 transition-colors"
                                        >
                                            →
                                        </button>
                                    </div>
                                )
                            }
                        </>
                    )}
                </div >
            )}

            {
                viewImage && (
                    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4 animate-fadeIn" onClick={() => setViewImage(null)}>
                        <button onClick={() => setViewImage(null)} className="absolute top-4 right-4 text-white bg-white/20 p-2 rounded-full backdrop-blur-md">
                            <X size={24} />
                        </button>
                        <img src={viewImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    </div>
                )
            }
        </div >
    );
};

export default SowerView;
