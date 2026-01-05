import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Breadcrumbs from './Breadcrumbs';

const ClaimRecordsView = ({ db, appId, user, onBack, onNavigate }) => {
    const [orphanLogs, setOrphanLogs] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [campaignNames, setCampaignNames] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Cargar Campañas para tener los nombres
                const campPath = ['artifacts', appId, 'public', 'data', 'campaigns'];
                const campSnap = await getDocs(collection(db, ...campPath));
                const namesMap = {};
                campSnap.forEach(d => {
                    namesMap[d.id] = d.data().name;
                });
                setCampaignNames(namesMap);

                // 2. Cargar Logs huérfanos
                const dataPath = ['artifacts', appId, 'public', 'data', 'logs'];
                const q = query(collection(db, ...dataPath), where('ownerId', '==', null));
                const snap = await getDocs(q);

                const orphans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setOrphanLogs(orphans);
            } catch (err) {
                console.error("[CLAIM] Error al obtener datos:", err);
            }
            setLoading(false);
        };
        fetchData();
    }, [db, appId]);

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const filteredLogs = orphanLogs.filter(log =>
        log.groupName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectAll = () => {
        if (selectedIds.size === filteredLogs.length && filteredLogs.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLogs.map(l => l.id)));
        }
    };

    const handleSubmitClaim = async () => {
        if (selectedIds.size === 0) return;
        setSubmitting(true);
        try {
            // Find unique campaign IDs from selected logs
            const selectedCampaignIds = Array.from(new Set(
                orphanLogs
                    .filter(log => selectedIds.has(log.id))
                    .map(log => log.campaignId)
                    .filter(id => id)
            ));

            // Create a claim request for admin review
            await addDoc(collection(db, 'claimRequests'), {
                userId: user.uid,
                userName: user.displayName,
                logIds: Array.from(selectedIds),
                campaignIds: selectedCampaignIds,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setSuccess(true);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="p-8 text-center animate-fade-in">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Solicitud Enviada</h3>
                <p className="text-slate-400 mb-8">El administrador revisará tu reclamación de {selectedIds.size} registros.</p>
                <button onClick={onBack} className="bg-emerald-500 hover:bg-emerald-600 px-6 py-2 rounded-xl font-bold transition-all">
                    Volver
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 pb-24">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4 text-left">
                    <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex flex-col">
                        <Breadcrumbs currentView="claim" onNavigate={onNavigate} />
                        <h2 className="text-xl font-bold">Reclamar Registros</h2>
                    </div>
                </div>
                <div className="w-10"></div>
            </header>

            <div className="space-y-4 mb-6">
                <p className="text-slate-400 text-sm">
                    Selecciona las siembras que realizaste antes de tener cuenta para vincularlas a tu perfil.
                </p>

                {/* Search and Select All Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar por grupo (ej: Aaron...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        />
                    </div>
                    {filteredLogs.length > 0 && (
                        <button
                            onClick={handleSelectAll}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2 whitespace-nowrap"
                        >
                            <span>{selectedIds.size === filteredLogs.length ? 'Desmarcar todo' : 'Seleccionar visibles'}</span>
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            {searchTerm ? 'No hay resultados para esa búsqueda.' : 'No se encontraron registros huérfanos.'}
                        </div>
                    ) : (
                        filteredLogs.map(log => (
                            <div
                                key={log.id}
                                onClick={() => toggleSelect(log.id)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedIds.has(log.id)
                                    ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500'
                                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="font-bold text-emerald-400 truncate">
                                                {log.seedName || 'Especie desconocida'}
                                            </span>
                                            <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                                                {log.quantity || 1} uds
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-300 font-medium mb-1">
                                            👥 {log.groupName || 'Sin grupo'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                                            <span>📅 {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString() : 'Fecha desconocida'}</span>
                                            <span>•</span>
                                            <span className="truncate italic">📍 {campaignNames[log.campaignId] || 'Jornada desconocida'}</span>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.has(log.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                                        }`}>
                                        {selectedIds.has(log.id) && (
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {selectedIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent">
                    <button
                        onClick={handleSubmitClaim}
                        disabled={submitting}
                        className="w-full max-w-md mx-auto block bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                    >
                        {submitting ? 'Enviando...' : `Reclamar ${selectedIds.size} registros`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ClaimRecordsView;
