import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const ClaimRecordsView = ({ db, appId, user, onBack }) => {
    const [orphanLogs, setOrphanLogs] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchOrphans = async () => {
            try {
                const dataPath = ['artifacts', appId, 'public', 'data', 'logs'];
                console.log("[CLAIM] Buscando logs en:", dataPath.join('/'));

                const q = query(collection(db, ...dataPath)); // Traer todo y filtrar en cliente para debug
                const snap = await getDocs(q);

                console.log(`[CLAIM] Respuesta de Firestore: ${snap.docs.length} documentos.`);

                const orphans = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(l => !l.ownerId || l.ownerId === null);

                console.log(`[CLAIM] Registros huérfanos filtrados: ${orphans.length}`);
                setOrphanLogs(orphans);
            } catch (err) {
                console.error("[CLAIM] Error al obtener registros:", err);
            }
            setLoading(false);
        };
        fetchOrphans();
    }, [db, appId]);

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSubmitClaim = async () => {
        if (selectedIds.size === 0) return;
        setSubmitting(true);
        try {
            // Create a claim request for admin review
            await addDoc(collection(db, 'claimRequests'), {
                userId: user.uid,
                userName: user.displayName,
                logIds: Array.from(selectedIds),
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
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold">Reclamar Registros</h2>
                <div className="w-10"></div>
            </header>

            <div className="mb-6">
                <p className="text-slate-400 text-sm">
                    Selecciona las siembras que realizaste antes de tener cuenta para vincularlas a tu perfil.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {orphanLogs.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">No se encontraron registros huérfanos.</div>
                    ) : (
                        orphanLogs.map(log => (
                            <div
                                key={log.id}
                                onClick={() => toggleSelect(log.id)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedIds.has(log.id)
                                    ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500'
                                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-emerald-400 truncate max-w-[200px]">{log.species || 'Especie desconocida'}</div>
                                        <div className="text-xs text-slate-500">
                                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString() : 'Fecha desconocida'}
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
