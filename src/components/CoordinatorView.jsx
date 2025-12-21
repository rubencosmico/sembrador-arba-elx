import React, { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import {
    Leaf, Users, MapPin, ClipboardList, PlusCircle, Save, LogOut, Info,
    Download, Trash2, Edit2, Map as MapIcon, Table as TableIcon, X, Camera
} from 'lucide-react';
import MapView from './MapView';

const CoordinatorView = ({ db, appId, campaignId, seeds, groups, onResetRole }) => {

    // Local state for logs (moved from App.jsx for pagination)
    const [logs, setLogs] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const fetchLogs = async (isNextPage = false) => {
        if (loadingLogs) return;
        setLoadingLogs(true);
        try {
            const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
            let q;

            if (isNextPage && lastDoc) {
                q = query(
                    logsRef,
                    where('campaignId', '==', campaignId),
                    orderBy('timestamp', 'desc'),
                    startAfter(lastDoc),
                    limit(20)
                );
            } else {
                // First page
                q = query(
                    logsRef,
                    where('campaignId', '==', campaignId),
                    orderBy('timestamp', 'desc'),
                    limit(20)
                );
            }

            const snapshot = await getDocs(q);
            const newLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === 20);

            if (isNextPage) {
                setLogs(prev => [...prev, ...newLogs]);
            } else {
                setLogs(newLogs);
            }

        } catch (error) {
            console.error("Error loading logs (Pagination):", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    // Load initial logs
    useEffect(() => {
        fetchLogs();
    }, [campaignId]);

    const [newSeed, setNewSeed] = useState({ species: '', provider: '', treatment: '', quantity: '', photo: null });
    const [newGroup, setNewGroup] = useState('');
    const [activeTab, setActiveTab] = useState('seeds');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'map'
    const [editingLog, setEditingLog] = useState(null); // Log being edited
    const [expandedLogId, setExpandedLogId] = useState(null); // Log currently expanded for details

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
        const headers = ["Fecha", "Jornada", "Equipo", "Especie", "Micrositio", "Lat", "Lng", "Golpes", "Notas"];
        const rows = logs.map(log => [
            log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '',
            campaignId, // Using ID as name might need lookup if we want name
            log.groupName,
            log.seedName,
            log.microsite,
            log.location?.lat || '',
            log.location?.lng || '',
            log.holeCount || 1,
            `"${log.notes || ''}"`
        ]);

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
                        { id: 'groups', label: 'Equipos', icon: Users },
                        { id: 'assign', label: 'Logística', icon: MapPin },
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
                                    <div>
                                        <div className="font-bold text-emerald-950">{seed.species}</div>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[10px] font-bold bg-emerald-100/50 text-emerald-800 px-2 py-0.5 rounded-full">{seed.provider}</span>
                                        </div>
                                    </div>
                                    <button className="text-emerald-300 hover:text-emerald-600 p-2"><Edit2 size={16} /></button>
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
                        <div className="grid gap-3">
                            {groups.map(group => (
                                <div key={group.id} className="glass-card p-5 rounded-2xl border border-emerald-100/30 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                                            {group.name.charAt(0)}
                                        </div>
                                        <span className="font-bold text-emerald-950">{group.name}</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-emerald-800 uppercase bg-emerald-900/5 px-3 py-1 rounded-full">
                                        {group.assignedSeeds?.length || 0} lotes
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
                            <p className="leading-tight font-medium">Gestiona la mochila de cada equipo.</p>
                        </div>
                        {groups.map(group => (
                            <div key={group.id} className="glass-card p-6 rounded-3xl border border-emerald-100/30">
                                <h3 className="font-bold text-lg text-emerald-950 pb-4 mb-5 border-b border-emerald-100/50 flex justify-between items-center">
                                    {group.name}
                                </h3>
                                <div className="mb-6 flex flex-wrap gap-2">
                                    {group.assignedSeeds?.map(sid => {
                                        const seed = seeds.find(s => s.id === sid);
                                        return seed ? (
                                            <span key={sid} className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1.5">
                                                <Leaf size={10} className="text-emerald-600" /> {seed.species}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                                <div className="relative group">
                                    <select
                                        className="w-full p-4 pl-5 border border-transparent rounded-2xl bg-emerald-900/5 text-sm font-bold text-emerald-900 appearance-none cursor-pointer outline-none"
                                        onChange={(e) => {
                                            if (e.target.value) assignSeedToGroup(group.id, e.target.value);
                                            e.target.value = "";
                                        }}
                                    >
                                        <option value="">+ Añadir semillas a mochila</option>
                                        {seeds.map(seed => (
                                            <option key={seed.id} value={seed.id}>{seed.species} ({seed.provider})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
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

                            <div className="flex p-1 bg-emerald-900/5 rounded-xl mb-6">
                                <button onClick={() => setViewMode('table')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${viewMode === 'table' ? 'bg-white shadow-sm text-emerald-900' : 'text-emerald-900/40'}`}>Tabla</button>
                                <button onClick={() => setViewMode('map')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${viewMode === 'map' ? 'bg-white shadow-sm text-emerald-900' : 'text-emerald-900/40'}`}>Mapa</button>
                            </div>

                            {viewMode === 'map' ? (
                                <MapView logs={logs} />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-emerald-100 text-emerald-900/40 text-[10px] uppercase font-bold tracking-wider">
                                                <th className="p-3">Hora</th>
                                                <th className="p-3">Equipo</th>
                                                <th className="p-3">Especie</th>
                                                <th className="p-3">Golpes</th>
                                                <th className="p-3">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm text-emerald-900">
                                            {logs.map(log => (
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
                            {viewMode === 'table' && (
                                <div className="mt-6 flex justify-center">
                                    {loadingLogs ? (
                                        <div className="flex items-center gap-2 text-emerald-800/50 font-bold text-sm animate-pulse">
                                            <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></span>
                                            Cargando datos...
                                        </div>
                                    ) : (
                                        hasMore && (
                                            <button
                                                onClick={() => fetchLogs(true)}
                                                className="px-6 py-3 bg-white border border-emerald-100/50 rounded-xl text-emerald-800 font-bold text-sm shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-2"
                                            >
                                                <Download size={16} className="rotate-180" />
                                                Cargar más registros
                                            </button>
                                        )
                                    )}
                                    {!hasMore && logs.length > 0 && (
                                        <p className="text-[10px] font-bold text-emerald-900/30 uppercase tracking-widest mt-2">No hay más registros</p>
                                    )}
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
        </div >
    );
};

export default CoordinatorView;
