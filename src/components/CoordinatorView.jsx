import React, { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import {
    Leaf, Users, MapPin, ClipboardList, PlusCircle, Save, LogOut, Info,
    Download, Trash2, Edit2, Map as MapIcon, Table as TableIcon, X, Camera,
    Search, ChevronLeft, ChevronRight, ArrowUpDown
} from 'lucide-react';
import MapView from './MapView';

const CoordinatorView = ({ db, appId, campaignId, seeds, groups, onResetRole }) => {

    // Local state for logs
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Filter, Sort & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('timestamp');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [logsPerPage, setLogsPerPage] = useState(10);

    const fetchLogs = async () => {
        if (loadingLogs) return;
        setLoadingLogs(true);
        try {
            const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
            const q = query(
                logsRef,
                where('campaignId', '==', campaignId),
                orderBy('timestamp', 'desc'),
                limit(2000) // Load up to 2000 logs for client-side processing
            );

            const snapshot = await getDocs(q);
            const newLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLogs(newLogs);
        } catch (error) {
            console.error("Error loading logs:", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    // Load initial logs
    useEffect(() => {
        fetchLogs();
    }, [campaignId]);

    // Derived Logic for Display
    const filteredAndSortedLogs = React.useMemo(() => {
        let result = [...logs];

        // 1. Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(log =>
                log.groupName?.toLowerCase().includes(term) ||
                log.seedName?.toLowerCase().includes(term) ||
                log.microsite?.toLowerCase().includes(term) ||
                log.notes?.toLowerCase().includes(term)
            );
        }

        // 2. Sort
        result.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Specific handling
            if (sortField === 'timestamp') {
                valA = a.timestamp?.seconds || 0;
                valB = b.timestamp?.seconds || 0;
            } else if (sortField === 'holeCount') {
                valA = parseInt(a.holeCount) || 0;
                valB = parseInt(b.holeCount) || 0;
            } else {
                // String comparison
                valA = (valA || '').toString().toLowerCase();
                valB = (valB || '').toString().toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [logs, searchTerm, sortField, sortDirection]);

    const totalPages = Math.ceil(filteredAndSortedLogs.length / logsPerPage);
    const currentLogs = filteredAndSortedLogs.slice(
        (currentPage - 1) * logsPerPage,
        currentPage * logsPerPage
    );

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const [newSeed, setNewSeed] = useState({ species: '', provider: '', treatment: '', quantity: '', photo: null });
    const [newGroup, setNewGroup] = useState('');
    const [activeTab, setActiveTab] = useState('seeds');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'map'
    const [editingLog, setEditingLog] = useState(null); // Log being edited
    const [expandedLogId, setExpandedLogId] = useState(null); // Log currently expanded for details
    const [viewImage, setViewImage] = useState(null);

    // Seed Editing State
    const [editingSeed, setEditingSeed] = useState(null);
    const [editingGroup, setEditingGroup] = useState(null);
    const [verifyingDelete, setVerifyingDelete] = useState(false);

    const compressImage = (file, maxWidth = 800) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
            };
        });
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const compressed = await compressImage(file);
            setNewSeed({ ...newSeed, photo: compressed });
        }
    };

    const handleAddSeed = async (e) => {
        e.preventDefault();
        if (!newSeed.species) return;
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'seeds'), {
                ...newSeed,
                campaignId,
                createdAt: serverTimestamp(),
            });
            setNewSeed({ species: '', provider: '', treatment: '', quantity: '', photo: null });
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
                campaignId,
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

    const removeSeedFromGroup = async (groupId, seedId) => {
        if (verifyingDelete) return;
        setVerifyingDelete(true);

        try {
            // INTEGRITY CHECK: Check if this group has already planted this seed
            const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
            const q = query(
                logsRef,
                where('campaignId', '==', campaignId),
                where('groupId', '==', groupId),
                where('seedId', '==', seedId),
                limit(1)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                alert("⚠️ No puedes retirar este lote de la mochila porque el equipo ya ha registrado siembras con él. Esto rompería la integridad de los datos.");
                setVerifyingDelete(false);
                return;
            }

            // If safe, remove it
            const groupRef = doc(db, 'artifacts', appId, 'public', 'data', 'groups', groupId);
            await updateDoc(groupRef, {
                assignedSeeds: arrayRemove(seedId)
            });

        } catch (error) {
            console.error("Error removing seed from group:", error);
            alert("Error al verificar registros. Inténtalo de nuevo.");
        } finally {
            setVerifyingDelete(false);
        }
    };

    const handleUpdateSeed = async (e) => {
        e.preventDefault();
        if (!editingSeed) return;
        try {
            // If new photo uploaded, logic would go here (omitted for brevity/complexity, reusing existing url if not changed)
            // Ideally we'd upload fields like in SowerView, for now let's update text fields
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'seeds', editingSeed.id), {
                species: editingSeed.species,
                provider: editingSeed.provider,
                treatment: editingSeed.treatment || '',
                photo: editingSeed.photo // Assumes it might have been updated in state via compressor
            });
            setEditingSeed(null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateGroup = async (e) => {
        e.preventDefault();
        if (!editingGroup) return;
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groups', editingGroup.id), {
                name: editingGroup.name
            });
            setEditingGroup(null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSeedPhotoEdit = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const compressed = await compressImage(file);
            setEditingSeed(prev => ({ ...prev, photo: compressed }));
        }
    };

    const handleDeleteSeed = async (seedId) => {
        if (!window.confirm("¿Seguro que quieres borrar este lote de semillas del inventario?")) return;
        if (verifyingDelete) return;
        setVerifyingDelete(true);

        try {
            // INTEGRITY CHECK: Check if any logs exist for this seed in this campaign
            const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
            const q = query(
                logsRef,
                where('campaignId', '==', campaignId),
                where('seedId', '==', seedId),
                limit(1)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                alert("⚠️ No puedes borrar este lote porque ya hay siembras registradas asociadas a él. Esto rompería la integridad de los datos.");
                setVerifyingDelete(false);
                return;
            }


            // 2. CHECK ASSIGNMENTS: Remove this seed from any group's backpack that has it assigned
            const groupsRef = collection(db, 'artifacts', appId, 'public', 'data', 'groups');
            const groupsQ = query(
                groupsRef,
                where('campaignId', '==', campaignId),
                where('assignedSeeds', 'array-contains', seedId)
            );
            const groupsSnapshot = await getDocs(groupsQ);

            // Create batch of updates to remove seed from groups
            const updatePromises = groupsSnapshot.docs.map(gDoc => {
                return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groups', gDoc.id), {
                    assignedSeeds: arrayRemove(seedId)
                });
            });
            await Promise.all(updatePromises);

            // 3. DELETE SEED
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'seeds', seedId));

        } catch (error) {
            console.error("Error deleting seed:", error);
            alert("Error al verificar integridad. Inténtalo de nuevo.");
        } finally {
            setVerifyingDelete(false);
        }
    };

    const handleDeleteLog = async (logId) => {
        if (!window.confirm("¿Seguro que quieres borrar este registro?")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'logs', logId));
        } catch (e) {
            console.error("Error deleting", e);
        }
    };

    const handleUpdateLog = async (e) => {
        e.preventDefault();
        if (!editingLog) return;
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'logs', editingLog.id), {
                holeCount: parseInt(editingLog.holeCount),
                microsite: editingLog.microsite,
                notes: editingLog.notes
            });
            setEditingLog(null);
        } catch (e) {
            console.error("Error updating", e);
        }
    };

    const exportCSV = () => {
        const headers = ["Fecha", "Hora", "Jornada", "Equipo", "Especie", "Micrositio", "Orientación", "Semillas/Hoyo", "Protector", "Sustrato", "Lat", "Lng", "Golpes", "Notas", "Foto URL"];
        const rows = logs.map(log => {
            const date = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : null;
            return [
                date ? date.toLocaleDateString() : '',
                date ? date.toLocaleTimeString() : '',
                campaignId,
                log.groupName,
                log.seedName,
                log.microsite,
                log.orientation || '',
                log.quantity || '1',
                log.withProtector ? 'Sí' : 'No',
                log.withSubstrate ? 'Sí' : 'No',
                log.location?.lat || '',
                log.location?.lng || '',
                log.holeCount || 1,
                `"${(log.notes || '').replace(/"/g, '""')}"`, // Escape quotes
                log.photo || log.photoUrl || ''
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `datos_jornada_${campaignId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalHoles = logs.reduce((acc, log) => acc + (parseInt(log.holeCount) || 1), 0);

    return (
        <div className="min-h-screen bg-[#f1f5f0] pb-24 font-sans">
            <header className="glass-card sticky top-0 z-30 px-6 py-4 flex justify-between items-center border-b border-emerald-100/50">
                <div className="flex items-center gap-3">
                    <button onClick={onResetRole} className="p-2 text-emerald-900/30 hover:text-emerald-900/60 transition-colors">
                        <LogOut size={20} />
                    </button>
                    <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-md">
                        <ClipboardList size={20} />
                    </div>
                    <div>
                        <h2 className="text-emerald-950 font-bold leading-tight">Panel de Control</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-wider">Jornada Activa</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="p-4 max-w-4xl mx-auto space-y-6">
                <div className="bg-emerald-900/5 p-1 rounded-2xl flex border border-emerald-900/5 overflow-x-auto">
                    {[
                        { id: 'seeds', label: 'Inventario', icon: Leaf },
                        { id: 'groups', label: 'Equipos y Logística', icon: Users },
                        { id: 'data', label: 'Resultados', icon: TableIcon }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-white text-emerald-900 shadow-sm ring-1 ring-emerald-950/5'
                                : 'text-emerald-900/40 hover:text-emerald-900/70 hover:bg-white/50'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {activeTab === 'seeds' && (
                    <div className="space-y-6 animate-slideUp">
                        {/* Seed Form */}
                        <section className="glass-card p-6 rounded-3xl shadow-sm border border-emerald-100/50">
                            <h3 className="text-lg font-bold text-emerald-950 mb-5 flex items-center gap-2">
                                <PlusCircle className="text-emerald-600" size={20} />
                                Registrar Lote
                            </h3>
                            <form onSubmit={handleAddSeed} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest px-1">Especie</label>
                                    <input placeholder="Ej: Algarrobo" className="w-full p-4 bg-emerald-900/5 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500/50 outline-none transition-all font-medium" value={newSeed.species} onChange={e => setNewSeed({ ...newSeed, species: e.target.value })} />
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
                                {/* Photo */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest px-1 block">Foto (Opcional)</label>
                                    <div className="flex items-center gap-4">
                                        {!newSeed.photo ? (
                                            <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-100 rounded-2xl bg-emerald-50/30 hover:bg-emerald-50 cursor-pointer group">
                                                <Camera className="text-emerald-300 group-hover:text-emerald-500 mb-2" size={32} />
                                                <span className="text-xs font-bold text-emerald-800/40 uppercase">Tomar Foto</span>
                                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                                            </label>
                                        ) : (
                                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-emerald-500">
                                                <img src={newSeed.photo} className="w-full h-full object-cover" alt="Preview" />
                                                <button type="button" onClick={() => setNewSeed({ ...newSeed, photo: null })} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button type="submit" className="btn-premium w-full bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mt-2">
                                    <Save size={18} />
                                    <span>Guardar en Inventario</span>
                                </button>
                            </form>
                        </section>
                        {/* List */}
                        <div className="space-y-3">
                            {seeds.map(seed => (
                                <div key={seed.id} className="glass-card p-4 rounded-2xl border border-emerald-100/30 flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        {seed.photo && (
                                            <button onClick={() => setViewImage(seed.photo)} className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-100 shadow-sm shrink-0">
                                                <img src={seed.photo} className="w-full h-full object-cover" alt="Seed" />
                                            </button>
                                        )}
                                        <div>
                                            <div className="font-bold text-emerald-950 flex items-center gap-2">
                                                {seed.species}
                                                {seed.treatment && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{seed.treatment}</span>}
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] font-bold bg-emerald-100/50 text-emerald-800 px-2 py-0.5 rounded-full">{seed.provider}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {seed.photo && (
                                            <button onClick={() => setViewImage(seed.photo)} className="p-2 text-emerald-300 hover:text-emerald-600 rounded bg-emerald-50/50">
                                                <Camera size={16} />
                                            </button>
                                        )}
                                        <button onClick={() => setEditingSeed(seed)} className="text-emerald-300 hover:text-emerald-600 p-2 bg-emerald-50/50 rounded hover:bg-emerald-100"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteSeed(seed.id)} disabled={verifyingDelete} className="text-red-300 hover:text-red-500 p-2 bg-red-50/50 rounded hover:bg-red-100"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'groups' && (
                    <div className="space-y-6 animate-slideUp">
                        <section className="glass-card p-6 rounded-3xl shadow-sm border border-emerald-100/50">
                            <h3 className="text-lg font-bold text-emerald-950 mb-5 flex items-center gap-2">
                                <Users className="text-emerald-600" size={20} />
                                Crear Equipo
                            </h3>
                            <form onSubmit={handleAddGroup} className="flex gap-3">
                                <input placeholder="Nombre..." className="flex-1 p-4 bg-emerald-900/5 border border-transparent rounded-2xl focus:bg-white outline-none font-medium" value={newGroup} onChange={e => setNewGroup(e.target.value)} />
                                <button type="submit" className="btn-premium bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-2xl font-bold">Crear</button>
                            </form>
                        </section>
                        <div className="grid gap-6">
                            {groups.map(group => (
                                <div key={group.id} className="glass-card p-6 rounded-3xl border border-emerald-100/30">
                                    <div className="flex justify-between items-center pb-4 mb-4 border-b border-emerald-100/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                                                {group.name.charAt(0)}
                                            </div>
                                            <h3 className="font-bold text-lg text-emerald-950">{group.name}</h3>
                                        </div>
                                        <button onClick={() => setEditingGroup(group)} className="text-emerald-400 hover:text-emerald-700 p-2 hover:bg-emerald-50 rounded-lg">
                                            <Edit2 size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest block mb-2">Mochila ({group.assignedSeeds?.length || 0} lotes)</label>
                                            <div className="flex flex-wrap gap-3">
                                                {group.assignedSeeds?.length > 0 ? (
                                                    group.assignedSeeds.map(sid => {
                                                        const seed = seeds.find(s => s.id === sid);
                                                        return seed ? (
                                                            <div key={sid} className="bg-emerald-50 text-emerald-900 text-xs font-bold pl-1 pr-3 py-1 rounded-xl border border-emerald-100 flex items-center gap-2 group/seed hover:shadow-sm transition-all">
                                                                {seed.photo ? (
                                                                    <button onClick={() => setViewImage(seed.photo)} className="w-8 h-8 rounded-lg overflow-hidden border border-emerald-200 shrink-0 hover:scale-110 transition-transform">
                                                                        <img src={seed.photo} className="w-full h-full object-cover" alt="Seed" />
                                                                    </button>
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-lg bg-emerald-100/50 flex items-center justify-center text-emerald-600">
                                                                        <Leaf size={14} />
                                                                    </div>
                                                                )}

                                                                <div className="flex flex-col">
                                                                    <span className="leading-none">{seed.species}</span>
                                                                    <div className="flex gap-1 mt-0.5 opacity-60 text-[9px] uppercase tracking-wide">
                                                                        <span>{seed.provider}</span>
                                                                        {seed.treatment && <span>• {seed.treatment}</span>}
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    onClick={() => removeSeedFromGroup(group.id, sid)}
                                                                    disabled={verifyingDelete}
                                                                    className="ml-1 w-6 h-6 flex items-center justify-center bg-white text-red-300 rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ) : null;
                                                    })
                                                ) : (
                                                    <p className="text-xs text-emerald-800/30 italic">Sin semillas asignadas</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative group">
                                            <select
                                                className="w-full p-3 pl-4 border border-transparent rounded-xl bg-emerald-900/5 text-sm font-bold text-emerald-900 appearance-none cursor-pointer outline-none hover:bg-emerald-900/10 transition-colors"
                                                onChange={(e) => {
                                                    if (e.target.value) assignSeedToGroup(group.id, e.target.value);
                                                    e.target.value = "";
                                                }}
                                            >
                                                <option value="">+ Añadir lote a la mochila</option>
                                                {seeds.map(seed => (
                                                    <option key={seed.id} value={seed.id}>{seed.species} ({seed.provider}) {seed.treatment ? `- ${seed.treatment}` : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="space-y-6 animate-slideUp">
                        <section className="glass-card p-6 rounded-3xl shadow-sm border border-emerald-100/50">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <div className="text-emerald-950 font-extrabold text-3xl">{totalHoles}</div>
                                    <div className="text-emerald-800/40 text-[10px] uppercase font-bold tracking-wider">Golpes Totales</div>
                                </div>
                                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs hover:bg-emerald-200 transition-colors">
                                    <Download size={16} /> Exportar CSV
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                <div className="flex bg-emerald-900/5 p-1 rounded-xl shrink-0">
                                    <button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${viewMode === 'table' ? 'bg-white shadow-sm text-emerald-900' : 'text-emerald-900/40'}`}>Tabla</button>
                                    <button onClick={() => setViewMode('map')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${viewMode === 'map' ? 'bg-white shadow-sm text-emerald-900' : 'text-emerald-900/40'}`}>Mapa</button>
                                </div>
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-800/30" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por equipo, especie, notas..."
                                        className="w-full pl-11 p-3 bg-white border border-emerald-100 rounded-xl text-sm font-medium text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {viewMode === 'map' ? (
                                <MapView logs={filteredAndSortedLogs} />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-emerald-100 text-emerald-900/40 text-[10px] uppercase font-bold tracking-wider">
                                                <th className="p-3 cursor-pointer hover:text-emerald-700" onClick={() => handleSort('timestamp')}>
                                                    <div className="flex items-center gap-1">Hora <ArrowUpDown size={10} /></div>
                                                </th>
                                                <th className="p-3 cursor-pointer hover:text-emerald-700" onClick={() => handleSort('groupName')}>
                                                    <div className="flex items-center gap-1">Equipo <ArrowUpDown size={10} /></div>
                                                </th>
                                                <th className="p-3 cursor-pointer hover:text-emerald-700" onClick={() => handleSort('seedName')}>
                                                    <div className="flex items-center gap-1">Especie <ArrowUpDown size={10} /></div>
                                                </th>
                                                <th className="p-3 cursor-pointer hover:text-emerald-700" onClick={() => handleSort('holeCount')}>
                                                    <div className="flex items-center gap-1">Golpes <ArrowUpDown size={10} /></div>
                                                </th>
                                                <th className="p-3">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm text-emerald-900">
                                            {currentLogs.map(log => (
                                                <React.Fragment key={log.id}>
                                                    <tr
                                                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                                        className={`border-b border-emerald-50 hover:bg-white/50 cursor-pointer transition-colors ${expandedLogId === log.id ? 'bg-emerald-50/50' : ''}`}
                                                    >
                                                        <td className="p-3 font-medium">
                                                            {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                        </td>
                                                        <td className="p-3">{log.groupName}</td>
                                                        <td className="p-3">{log.seedName}</td>
                                                        <td className="p-3 font-bold">{log.holeCount || 1}</td>
                                                        <td className="p-3 flex gap-2" onClick={e => e.stopPropagation()}>
                                                            <button onClick={() => setEditingLog(log)} className="p-1 hover:bg-emerald-100 rounded text-emerald-600"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDeleteLog(log.id)} className="p-1 hover:bg-red-100 rounded text-red-500"><Trash2 size={14} /></button>
                                                        </td>
                                                    </tr>
                                                    {expandedLogId === log.id && (
                                                        <tr className="bg-emerald-50/30 animate-fadeIn">
                                                            <td colSpan="5" className="p-4">
                                                                <div className="flex gap-4 items-start">
                                                                    {(log.photoUrl || log.photo) ? (
                                                                        <div className="w-32 h-32 shrink-0 rounded-xl overflow-hidden border-2 border-white shadow-sm">
                                                                            <img src={log.photoUrl || log.photo} alt="Evidencia" className="w-full h-full object-cover" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-32 h-32 shrink-0 rounded-xl bg-emerald-100/50 flex flex-col items-center justify-center text-emerald-800/30 border-2 border-white shadow-sm">
                                                                            <Camera size={24} />
                                                                            <span className="text-[10px] font-bold uppercase mt-1">Sin foto</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="space-y-2 text-sm text-emerald-900">
                                                                        <div>
                                                                            <span className="text-[10px] font-bold text-emerald-800/50 uppercase tracking-wider block">Micrositio</span>
                                                                            <span className="font-medium">{log.microsite}</span>
                                                                        </div>
                                                                        {log.notes && (
                                                                            <div>
                                                                                <span className="text-[10px] font-bold text-emerald-800/50 uppercase tracking-wider block">Notas</span>
                                                                                <span className="italic">"{log.notes}"</span>
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <span className="text-[10px] font-bold text-emerald-800/50 uppercase tracking-wider block">Ubicación</span>
                                                                            <span className="font-mono text-xs">{log.location?.lat?.toFixed(6)}, {log.location?.lng?.toFixed(6)} (±{log.location?.acc?.toFixed(0)}m)</span>
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
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {viewMode === 'table' && totalPages > 1 && (
                                <div className="mt-6 flex flex-col items-center gap-4">
                                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-emerald-100">
                                        <button
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent text-emerald-800"
                                        >
                                            <span className="sr-only">Primera</span>
                                            «
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent text-emerald-800"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>

                                        <span className="text-xs font-bold text-emerald-900 px-2 min-w-[60px] text-center">
                                            Pág {currentPage} / {totalPages}
                                        </span>

                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent text-emerald-800"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent text-emerald-800"
                                        >
                                            <span className="sr-only">Última</span>
                                            »
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800/40">
                                        <span>Filas por página:</span>
                                        <select
                                            value={logsPerPage}
                                            onChange={(e) => {
                                                setLogsPerPage(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="bg-transparent border-b border-emerald-800/20 focus:outline-none text-emerald-900"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>
                                    <div className="text-[10px] font-bold text-emerald-900/30 uppercase tracking-widest">
                                        Mostrando {filteredAndSortedLogs.length} resultados
                                    </div>
                                </div>
                            )}

                            {viewMode === 'table' && totalPages === 0 && !loadingLogs && (
                                <div className="mt-8 text-center">
                                    <p className="text-emerald-900/40 font-bold">No se encontraron registros</p>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>

            {/* Editing Modal */}
            {
                editingLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl animate-slideUp">
                            <h3 className="font-bold text-lg text-emerald-950 mb-4">Editar Registro</h3>
                            <form onSubmit={handleUpdateLog} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase">Cantidad de Golpes</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full p-3 bg-emerald-50 rounded-xl font-bold text-emerald-900 outline-none"
                                        value={editingLog.holeCount || 1}
                                        onChange={e => setEditingLog({ ...editingLog, holeCount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase">Notas</label>
                                    <textarea
                                        className="w-full p-3 bg-emerald-50 rounded-xl text-sm outline-none"
                                        value={editingLog.notes || ''}
                                        onChange={e => setEditingLog({ ...editingLog, notes: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setEditingLog(null)} className="flex-1 py-3 text-emerald-600 font-bold">Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }


            {/* View Image Modal */}
            {
                viewImage && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setViewImage(null)}>
                        <img src={viewImage} className="max-w-full max-h-[90vh] rounded-2xl object-contain" alt="Full size" />
                        <button className="absolute top-4 right-4 text-white p-2" onClick={() => setViewImage(null)}>
                            <X size={32} />
                        </button>
                    </div>
                )
            }

            {/* Edit Seed Modal */}
            {
                editingSeed && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
                        <div className="glass-card bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl animate-slideUp">
                            <h3 className="font-bold text-lg text-emerald-950 mb-4">Editar Lote</h3>
                            <form onSubmit={handleUpdateSeed} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase">Especie</label>
                                    <input className="w-full p-3 bg-emerald-50 rounded-xl font-bold text-emerald-900 outline-none" value={editingSeed.species} onChange={e => setEditingSeed({ ...editingSeed, species: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-emerald-800/40 uppercase">Origen</label>
                                        <input className="w-full p-3 bg-emerald-50 rounded-xl font-bold text-emerald-900 outline-none" value={editingSeed.provider} onChange={e => setEditingSeed({ ...editingSeed, provider: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-emerald-800/40 uppercase">Tratamiento</label>
                                        <input className="w-full p-3 bg-emerald-50 rounded-xl font-bold text-emerald-900 outline-none" value={editingSeed.treatment} onChange={e => setEditingSeed({ ...editingSeed, treatment: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase">Foto</label>
                                    <div className="flex items-center gap-3">
                                        {editingSeed.photo ? (
                                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-emerald-100 bg-black/5">
                                                <img src={editingSeed.photo} className="w-full h-full object-cover" alt="Preview" />
                                                <button type="button" onClick={() => setEditingSeed({ ...editingSeed, photo: null })} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X size={10} /></button>
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 rounded-xl bg-emerald-50/50 flex items-center justify-center text-emerald-800/30 border border-dashed border-emerald-200">
                                                <Camera size={20} />
                                            </div>
                                        )}
                                        <label className="flex-1 btn-premium bg-emerald-100 text-emerald-800 text-xs py-3 rounded-xl font-bold flex items-center justify-center cursor-pointer hover:bg-emerald-200">
                                            Cambiar Foto
                                            <input type="file" accept="image/*" className="hidden" onChange={handleSeedPhotoEdit} />
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setEditingSeed(null)} className="flex-1 py-3 text-emerald-600 font-bold">Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Group Modal */}
            {
                editingGroup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
                        <div className="glass-card bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl animate-slideUp">
                            <h3 className="font-bold text-lg text-emerald-950 mb-4">Editar Equipo</h3>
                            <form onSubmit={handleUpdateGroup} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase">Nombre del Equipo</label>
                                    <input className="w-full p-3 bg-emerald-50 rounded-xl font-bold text-emerald-900 outline-none" value={editingGroup.name} onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })} />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setEditingGroup(null)} className="flex-1 py-3 text-emerald-600 font-bold">Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default CoordinatorView;
