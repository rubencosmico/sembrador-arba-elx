import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Calendar, PlusCircle, ArrowRight, Map } from 'lucide-react';

const CampaignSelector = ({ db, appId, onSelectCampaign, onManage }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [newCampaignName, setNewCampaignName] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        // Removed orderBy to avoid 404/Index issues temporarily
        const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'campaigns')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const camps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCampaigns(camps);
        }, (err) => console.log("Error loading campaigns", err));
        return () => unsubscribe();
    }, [db, appId]);

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        if (!newCampaignName.trim()) return;
        try {
            const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'campaigns'), {
                name: newCampaignName,
                createdAt: serverTimestamp(),
                status: 'active'
            });
            onSelectCampaign({ id: docRef.id, name: newCampaignName, status: 'active' });
        } catch (error) {
            console.error("Error creating campaign", error);
            alert("Error al crear jornada");
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f5f0] p-6 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>

            {onManage && (
                <button
                    onClick={onManage}
                    className="absolute top-4 right-4 z-20 text-emerald-800 text-sm font-bold bg-white/50 p-2 rounded-lg hover:bg-white transition-all border border-emerald-100"
                >
                    Gestionar Jornadas
                </button>
            )}

            <div className="w-full max-w-md space-y-8 relative z-10 animate-slideUp">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-4 rounded-3xl bg-white shadow-xl mb-4 text-emerald-600">
                        <Map size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-emerald-950">Selecciona Jornada</h1>
                    <p className="text-emerald-800/60 font-medium">Elige en qué campaña vas a trabajar hoy</p>
                </div>

                <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-1">
                    {campaigns.map(camp => (
                        <button
                            key={camp.id}
                            onClick={() => onSelectCampaign(camp)}
                            className="group flex items-center p-4 rounded-2xl bg-white border border-emerald-100 hover:border-emerald-500 hover:shadow-lg transition-all text-left"
                        >
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                <Calendar size={20} />
                            </div>
                            <div className="flex-1 ml-4">
                                <div className="font-bold text-emerald-950 text-lg group-hover:text-emerald-700">{camp.name}</div>
                                <div className="text-xs font-semibold text-emerald-800/40 uppercase tracking-wider">
                                    {camp.createdAt?.seconds ? new Date(camp.createdAt.seconds * 1000).toLocaleDateString() : 'Fecha desconocida'}
                                </div>
                            </div>
                            <ArrowRight className="text-emerald-200 group-hover:text-emerald-500 transition-colors" />
                        </button>
                    ))}

                    {campaigns.length === 0 && (
                        <div className="text-center p-8 border-2 border-dashed border-emerald-200 rounded-3xl bg-emerald-50/50">
                            <p className="text-emerald-800/60 font-medium mb-4">No hay jornadas activas</p>
                            <button
                                onClick={() => setShowCreate(true)}
                                className="text-emerald-600 font-bold hover:underline"
                            >
                                Crear la primera jornada
                            </button>
                        </div>
                    )}
                </div>

                {!showCreate ? (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="w-full py-4 rounded-2xl border-2 border-dashed border-emerald-300 text-emerald-600 font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                    >
                        <PlusCircle size={20} />
                        Nueva Jornada
                    </button>
                ) : (
                    <form onSubmit={handleCreateCampaign} className="bg-white p-6 rounded-3xl shadow-xl border border-emerald-100 animate-fadeIn">
                        <h3 className="font-bold text-emerald-950 mb-4">Nueva Jornada</h3>
                        <input
                            autoFocus
                            placeholder="Ej: Reforestación Clot 2025"
                            className="w-full p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none mb-4 font-medium text-emerald-900"
                            value={newCampaignName}
                            onChange={e => setNewCampaignName(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="flex-1 py-3 text-emerald-600 font-bold hover:bg-emerald-50 rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg"
                            >
                                Crear
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="absolute bottom-6 text-[10px] font-bold text-emerald-900/20 uppercase tracking-[0.2em]">
                Sembrador ARBA • v2.1 Multi-Jornada
            </div>
        </div>
    );
};

export default CampaignSelector;
