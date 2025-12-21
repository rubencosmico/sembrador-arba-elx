import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { addDoc, collection, serverTimestamp, query, orderBy, where, getDocs, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import {
    Users, LogOut, ArrowRight, AlertTriangle, PlusCircle, History,
    Leaf, Check, Compass, Shield, MapPin, Camera, X, Save,
    Search, ChevronDown, ChevronUp
} from 'lucide-react';

const SowerView = ({ db, appId, campaignId, seeds, groups, userId, storage, onResetRole }) => {
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [view, setView] = useState('form');
    const [formData, setFormData] = useState({
        seedId: '',
        microsite: 'Nodriza Viva',
        orientation: 'Norte',
        withSubstrate: true,
        withProtector: false,
        quantity: '1',
        holeCount: 1,
        notes: '',
        photo: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [myLogs, setMyLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [gpsStatus, setGpsStatus] = useState('waiting');
    const [currentLocation, setCurrentLocation] = useState({ lat: null, lng: null, acc: null });

    // Estados para el cuaderno de campo con paginación
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('seedName'); // 'seedName' o 'microsite'
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' o 'desc'

    // Estados para paginación
    const [allTeamLogs, setAllTeamLogs] = useState([]); // Todos los logs del equipo
    const [currentPage, setCurrentPage] = useState(1);
    const [logsPerPage, setLogsPerPage] = useState(10);
    const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

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

    const captureGPS = async () => {
        if (!("geolocation" in navigator)) return;
        setGpsStatus('searching');
        const getPosition = (options) => {
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, options);
            });
        };

        try {
            // Try High Accuracy first
            let position;
            try {
                position = await getPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
            } catch (e) {
                console.log("High accuracy failed, trying low accuracy");
                position = await getPosition({ enableHighAccuracy: false, timeout: 5000, maximumAge: 0 });
            }

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

    const handleSow = async () => {
        if (!formData.seedId) {
            alert("⚠️ ¡Falta elegir la semilla!");
            return;
        }
        setIsSubmitting(true);
        let location = currentLocation;
        if (!location.lat) {
            const captured = await captureGPS();
            if (captured) location = captured;
        }

        try {
            const selectedGroup = groups.find(g => g.id === selectedGroupId);

            // Preparar datos del log (sin foto por ahora)
            const logData = {
                seedId: formData.seedId,
                microsite: formData.microsite,
                orientation: formData.orientation,
                withSubstrate: formData.withSubstrate,
                withProtector: formData.withProtector,
                quantity: formData.quantity,
                holeCount: parseInt(formData.holeCount) || 1,
                notes: formData.notes,
                campaignId,
                groupId: selectedGroupId,
                groupName: selectedGroup?.name || 'Desconocido',
                userId,
                location,
                timestamp: serverTimestamp(),
                seedName: seeds.find(s => s.id === formData.seedId)?.species || 'Desconocida'
            };

            // Si hay foto, subirla a Storage
            if (formData.photo && storage) {
                const logId = `${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`;
                const photoRef = ref(storage, `photos/logs/${logId}.jpg`);
                await uploadString(photoRef, formData.photo, 'data_url');
                const photoUrl = await getDownloadURL(photoRef);
                logData.photoUrl = photoUrl;
            }

            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), logData);

            setFormData(prev => ({ ...prev, quantity: 1, holeCount: 1, notes: '', photo: null }));
            setCurrentLocation({ lat: null, lng: null, acc: null });
            setGpsStatus('waiting');
            if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(200);
        } catch (error) {
            console.error('Error guardando:', error);
            alert("Error guardando: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to compress image (same as Coordinator)
    const compressImage = (file) => { /* omitted for brevity, assuming moved to util or duped */
        // Simple duplicate for now to avoid external dep. 
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width; height = img.height;
                    const maxWidth = 800;
                    if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
                    canvas.width = width; canvas.height = height;
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
            setFormData({ ...formData, photo: compressed });
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
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                                <Users size={24} />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-xl font-extrabold text-emerald-950 group-hover:text-emerald-700 transition-colors">{group.name}</div>
                                <div className="text-emerald-800/40 text-xs font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                    <Leaf size={12} className="text-emerald-400" />
                                    {group.assignedSeeds?.length || 0} Variedades
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

    return (
        <div className="min-h-screen bg-[#f1f5f0] pb-28 font-sans">
            <header className="glass-card sticky top-0 z-30 px-6 py-4 flex justify-between items-end border-b border-amber-100/50">
                <div className="flex gap-4 items-end">
                    <button onClick={() => setSelectedGroupId(null)} className="mb-1 text-emerald-950/30 hover:text-emerald-950/60 transition-colors">
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
                <div className="px-5 space-y-8 animate-slideUp pb-12">
                    <section className="mt-4">
                        <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-3 px-1">1. ¿Qué estás sembrando?</label>
                        <div className="grid gap-3">
                            {mySeeds.map(seed => (
                                <button
                                    key={seed.id}
                                    onClick={() => setFormData({ ...formData, seedId: seed.id })}
                                    className={`btn-premium group flex items-center p-4 rounded-3xl border-2 transition-all relative overflow-hidden ${formData.seedId === seed.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200' : 'bg-white border-emerald-100/50 text-emerald-950'}`}
                                >
                                    <div className="flex-1 text-left pl-4 relative z-10">
                                        <div className="font-extrabold text-lg leading-tight uppercase tracking-tight">{seed.species}</div>
                                        <div className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${formData.seedId === seed.id ? 'text-emerald-200' : 'text-emerald-800/30'}`}>{seed.provider}</div>
                                    </div>
                                    {formData.seedId === seed.id && <div className="bg-white/20 p-1 rounded-full"><Check size={16} /></div>}
                                </button>
                            ))}
                        </div>
                    </section>

                    <div className="space-y-6">
                        <section className="glass-card p-6 rounded-3xl shadow-sm border border-emerald-100/30 space-y-6">
                            {/* Hole Count / Batch Logging */}
                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                <label className="text-[10px] font-bold text-amber-800/60 uppercase tracking-[0.2em] block mb-2">Cantidad de Golpes</label>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setFormData(p => ({ ...p, holeCount: Math.max(1, p.holeCount - 1) }))} className="w-12 h-12 bg-white rounded-xl shadow text-amber-600 font-bold text-xl">-</button>
                                    <input
                                        type="number"
                                        className="flex-1 text-center text-3xl font-black bg-transparent outline-none text-emerald-950"
                                        value={formData.holeCount}
                                        onChange={e => setFormData({ ...formData, holeCount: parseInt(e.target.value) || 1 })}
                                    />
                                    <button onClick={() => setFormData(p => ({ ...p, holeCount: p.holeCount + 1 }))} className="w-12 h-12 bg-white rounded-xl shadow text-amber-600 font-bold text-xl">+</button>
                                </div>
                                <p className="text-center text-[10px] text-amber-800/40 mt-2 font-bold px-4">Usa esto si has hecho varios hoyos en el mismo punto.</p>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-4">Micrositio</label>
                                <div className="flex p-1.5 bg-emerald-900/5 rounded-2xl">
                                    {['Nodriza Viva', 'Nodriza Muerta', 'Alcorque'].map(m => (
                                        <button key={m} onClick={() => setFormData({ ...formData, microsite: m })} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${formData.microsite === m ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-900/40'}`}>{m}</button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-4">Orientación</label>
                                <div className="flex p-1.5 bg-emerald-900/5 rounded-2xl">
                                    {['Norte', 'Sur', 'Este', 'Oeste'].map(o => (
                                        <button key={o} onClick={() => setFormData({ ...formData, orientation: o })} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${formData.orientation === o ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-900/40'}`}>{o}</button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-4">Semillas por Hoyo</label>
                                <div className="flex p-1.5 bg-emerald-900/5 rounded-2xl">
                                    {['1', '2', '3', '4', '5'].map(q => (
                                        <button key={q} onClick={() => setFormData({ ...formData, quantity: q })} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${formData.quantity === q ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-900/40'}`}>{q}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setFormData({ ...formData, withSubstrate: !formData.withSubstrate })}
                                    className={`flex-1 py-4 px-4 rounded-2xl border-2 transition-all flex items-center justify-between ${formData.withSubstrate ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-emerald-100 text-emerald-900/40'}`}
                                >
                                    <span className="text-xs font-black uppercase">Sustrato</span>
                                    {formData.withSubstrate && <Check size={18} />}
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, withProtector: !formData.withProtector })}
                                    className={`flex-1 py-4 px-4 rounded-2xl border-2 transition-all flex items-center justify-between ${formData.withProtector ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-emerald-100 text-emerald-900/40'}`}
                                >
                                    <span className="text-xs font-black uppercase">Protector</span>
                                    <Shield size={18} className={formData.withProtector ? '' : 'opacity-30'} />
                                </button>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-3">Notas (Opcional)</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Observaciones, estado del terreno, etc."
                                    className="w-full p-4 rounded-2xl border-2 border-emerald-100 focus:border-emerald-500 outline-none text-sm resize-none"
                                    rows={2}
                                />
                            </div>

                            <button
                                onClick={captureGPS}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${gpsStatus === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-emerald-100 text-emerald-900/40'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <MapPin size={20} className={gpsStatus === 'searching' ? 'animate-bounce' : ''} />
                                    <span className="text-xs font-black uppercase">{gpsStatus === 'success' ? `GPS OK (${currentLocation.acc?.toFixed(0)}m)` : gpsStatus === 'searching' ? 'Buscando...' : 'Activar GPS'}</span>
                                </div>
                                {gpsStatus === 'success' && <Check size={20} />}
                            </button>

                            {/* Photo (omitted logic for brevity, keeping UI) */}
                            <div className="pt-2">
                                <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-3 px-1">Foto (Opcional)</label>
                                {!formData.photo ? (
                                    <label className="w-full flex items-center justify-center p-6 border-2 border-dashed border-emerald-100 rounded-2xl cursor-pointer">
                                        <Camera size={24} className="text-emerald-300" />
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                                    </label>
                                ) : (
                                    <div className="relative h-32 rounded-xl overflow-hidden">
                                        <img src={formData.photo} className="w-full h-full object-cover" />
                                        <button onClick={() => setFormData({ ...formData, photo: null })} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X size={14} /></button>
                                    </div>
                                )}
                            </div>

                            <button onClick={handleSow} disabled={isSubmitting} className="btn-premium w-full bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mt-2">
                                <Save size={18} />
                                <span>{isSubmitting ? 'Guardando...' : 'Registrar Siembra'}</span>
                            </button>
                        </section>
                    </div>
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
                            <div className="space-y-3">
                                {paginatedLogs.map(log => (
                                    <div key={log.id} className="glass-card p-4 rounded-2xl border border-emerald-100/30 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-emerald-950 text-sm">{log.seedName}</div>
                                            <div className="text-xs text-emerald-800/50">{log.microsite}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-emerald-700 text-lg">{log.holeCount || 1}</div>
                                            <div className="text-[9px] font-bold text-emerald-800/30 uppercase">Golpes</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Controles de paginación */}
                            {totalPages > 1 && (
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
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SowerView;
