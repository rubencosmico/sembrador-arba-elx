import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, updateDoc, writeBatch, arrayUnion } from 'firebase/firestore';

const sendPushNotification = async (toToken, title, body) => {
    if (!toToken) return;
    console.log(`[PUSH] A: ${toToken} | ${title}: ${body}`);
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

    const handleAction = async (requestId, status, logIds, userId, campaignIds = []) => {
        setActioning(true);
        try {
            const batch = writeBatch(db);

            // 1. Update Request Status
            batch.update(doc(db, 'claimRequests', requestId), { status });

            // 2. If approved, update owners of logs AND add to campaign participants
            if (status === 'approved') {
                const logsPath = ['artifacts', appId, 'public', 'data', 'logs'];
                const campPath = ['artifacts', appId, 'public', 'data', 'campaigns'];

                // Update log owners
                logIds.forEach(logId => {
                    batch.update(doc(db, ...logsPath, logId), { ownerId: userId });
                });

                // Get campaign IDs if not provided (fallback for old requests)
                let finalCampaignIds = campaignIds;
                if (!finalCampaignIds || finalCampaignIds.length === 0) {
                    const uniqueCamps = new Set();
                    for (const logId of logIds) {
                        const logDoc = await getDoc(doc(db, ...logsPath, logId));
                        if (logDoc.exists() && logDoc.data().campaignId) {
                            uniqueCamps.add(logDoc.data().campaignId);
                        }
                    }
                    finalCampaignIds = Array.from(uniqueCamps);
                }

                // Add user to campaign participants
                finalCampaignIds.forEach(campId => {
                    batch.update(doc(db, ...campPath, campId), {
                        participants: arrayUnion(userId)
                    });
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
                                        onClick={() => handleAction(req.id, 'approved', req.logIds, req.userId, req.campaignIds)}
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

            <div className="mb-12 border-t border-slate-800 pt-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Mantenimiento</h3>
                    {actioning && <span className="text-[10px] text-emerald-500 animate-pulse font-bold">Procesando...</span>}
                </div>
                <div className="bg-slate-800/20 rounded-3xl p-6 border border-slate-800">
                    <h4 className="font-bold mb-2">Sincronizar Comunidad</h4>
                    <p className="text-xs text-slate-500 mb-6">Escanea reclamaciones aprobadas antiguas y asegura que los usuarios aparezcan como miembros en sus respectivas jornadas.</p>
                    <button
                        onClick={async () => {
                            setActioning(true);
                            try {
                                const q = query(collection(db, 'claimRequests'), where('status', '==', 'approved'));
                                const snap = await getDocs(q);
                                const batch = writeBatch(db);
                                const logsPath = ['artifacts', appId, 'public', 'data', 'logs'];
                                const campPath = ['artifacts', appId, 'public', 'data', 'campaigns'];

                                for (const reqDoc of snap.docs) {
                                    const req = reqDoc.data();
                                    const { userId, logIds, campaignIds } = req;

                                    let finalCampaignIds = campaignIds || [];
                                    if (finalCampaignIds.length === 0 && logIds?.length > 0) {
                                        const uniqueCamps = new Set();
                                        for (const logId of logIds) {
                                            const lDoc = await getDoc(doc(db, ...logsPath, logId));
                                            if (lDoc.exists() && lDoc.data().campaignId) {
                                                uniqueCamps.add(lDoc.data().campaignId);
                                            }
                                        }
                                        finalCampaignIds = Array.from(uniqueCamps);
                                    }

                                    finalCampaignIds.forEach(campId => {
                                        batch.update(doc(db, ...campPath, campId), {
                                            participants: arrayUnion(userId)
                                        });
                                    });
                                }
                                await batch.commit();
                                alert('Sincronización completada con éxito.');
                            } catch (err) {
                                console.error(err);
                                alert('Error durante la sincronización.');
                            } finally {
                                setActioning(false);
                            }
                        }}
                        disabled={actioning}
                        className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-3 px-6 rounded-2xl border border-white/10 transition-all flex items-center gap-2"
                    >
                        Ejecutar Sincronización
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
