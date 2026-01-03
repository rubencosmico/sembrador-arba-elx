```javascript
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';

const sendPushNotification = async (toToken, title, body) => {
    if (!toToken) return;
    console.log(`[PUSH] A: ${ toToken } | ${ title }: ${ body } `);
};

const SuperAdminDashboard = ({ db, appId, onBack }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'claimRequests'), where('status', '==', 'pending'));
        const unsubscribe = onSnapshot(q, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    const handleAction = async (requestId, status, logIds, userId) => {
        setActioning(true);
        try {
            const batch = writeBatch(db);

            // 1. Update Request Status
            batch.update(doc(db, 'claimRequests', requestId), { status });

            // 2. If approved, update owners of logs
            if (status === 'approved') {
                const logsPath = ['artifacts', appId, 'public', 'data', 'logs'];
                logIds.forEach(logId => {
                    batch.update(doc(db, ...logsPath, logId), { ownerId: userId });
                });
            }

            await batch.commit();

            // Notify User
            if (userId) {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists() && userDoc.data().fcmToken) {
                    const msg = status === 'approved' ? 'Tu reclamación ha sido APROBADA' : 'Tu reclamación ha sido RECHAZADA';
                    sendPushNotification(userDoc.data().fcmToken, 'Actualización de Reclamación', msg);
                }
            }

            setRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (err) {
            console.error(err);
            setActioning(false);
        } finally {
            setActioning(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <header className="flex items-center justify-between mb-10">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Panel de Administración</h2>
                <div className="w-10"></div>
            </header>

            <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Reclamaciones Pendientes</h3>
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2].map(i => <div key={i} className="h-24 bg-slate-800/50 rounded-2xl"></div>)}
                    </div>
                ) : requests.length === 0 ? (
                    <div className="py-20 text-center bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
                        <p className="text-slate-500">No hay reclamaciones pendientes de revisión.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map(req => (
                            <div key={req.id} className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 shadow-xl">
                                <div className="flex items-center space-x-4 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
                                        {req.userName?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">{req.userName}</div>
                                        <div className="text-xs text-slate-500">Solicita {req.logIds?.length || 0} registros</div>
                                    </div>
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => handleAction(req.id, 'approved', req.logIds, req.userId)}
                                        disabled={actioning}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-xl transition-all"
                                    >
                                        Aprobar
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, 'rejected', [], null)}
                                        disabled={actioning}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-xl transition-all"
                                    >
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
