import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { PlusCircle, Power, Edit2, Check, X, ArrowLeft, Calendar } from 'lucide-react';

const CampaignManager = ({ db, appId, onBack }) => {
    const [allCampaigns, setAllCampaigns] = useState([]);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [newCampaignName, setNewCampaignName] = useState('');
    const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'campaigns'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snap) => {
            setAllCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribe();
    }, [db, appId]);

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        if (!newCampaignName.trim()) return;
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'campaigns'), {
                name: newCampaignName,
                createdAt: serverTimestamp(),
                status: 'active'
            });
            setNewCampaignName('');
            setIsCreatingCampaign(false);
        } catch (e) {
            console.error(e);
            alert("Error creando jornada");
        }
    };

    const handleUpdateCampaign = async (id, data) => {
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'campaigns', id), data);
            setEditingCampaign(null);
        } catch (e) {
            console.error(e);
            alert("Error actualizando jornada");
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f5f0] p-6 font-sans">
            <header className="mb-8 flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm hover:bg-emerald-50 text-emerald-800">
                    <ArrowLeft />
                </button>
                <h1 className="text-2xl font-extrabold text-emerald-950">Gestión de Jornadas</h1>
            </header>

            <div className="max-w-4xl mx-auto space-y-6 animate-slideUp">
                {/* Create New */}
                {!isCreatingCampaign ? (
                    <button
                        onClick={() => setIsCreatingCampaign(true)}
                        className="w-full py-4 rounded-3xl border-2 border-dashed border-emerald-300 text-emerald-600 font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 group"
                    >
                        <PlusCircle className="group-hover:scale-110 transition-transform" />
                        Nueva Jornada
                    </button>
                ) : (
                    <section className="glass-card p-6 rounded-3xl shadow-sm border border-emerald-100/50 bg-white">
                        <h3 className="font-bold text-lg text-emerald-950 mb-4">Crear Nueva Jornada</h3>
                        <form onSubmit={handleCreateCampaign} className="flex gap-3">
                            <input
                                autoFocus
                                placeholder="Nombre de la jornada..."
                                className="flex-1 p-3 bg-emerald-900/5 border border-transparent rounded-xl focus:bg-white outline-none font-medium"
                                value={newCampaignName}
                                onChange={e => setNewCampaignName(e.target.value)}
                            />
                            <button type="button" onClick={() => setIsCreatingCampaign(false)} className="px-4 py-2 font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">Crear</button>
                        </form>
                    </section>
                )}

                {/* List */}
                <div className="grid gap-4">
                    {allCampaigns.map(camp => (
                        <div key={camp.id} className={`glass-card bg-white p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${camp.status === 'active' ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20' : 'border-emerald-100/50 opacity-80'}`}>

                            <div className="flex-1">
                                {editingCampaign?.id === camp.id ? (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleUpdateCampaign(camp.id, { name: editingCampaign.name });
                                        }}
                                        className="flex gap-2"
                                    >
                                        <input
                                            className="flex-1 p-2 bg-white border border-emerald-200 rounded-lg font-bold text-lg text-emerald-900"
                                            value={editingCampaign.name}
                                            onChange={e => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                                        />
                                        <button type="submit" className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Check size={18} /></button>
                                        <button type="button" onClick={() => setEditingCampaign(null)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><X size={18} /></button>
                                    </form>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className={`p-2 rounded-lg ${camp.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <Calendar size={20} />
                                            </div>
                                            <h3 className="font-bold text-lg text-emerald-950">{camp.name}</h3>
                                            {camp.status === 'active' && <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Activa</span>}
                                        </div>
                                        <div className="text-xs font-semibold text-emerald-800/40 uppercase tracking-widest pl-12">
                                            Creada: {camp.createdAt?.seconds ? new Date(camp.createdAt.seconds * 1000).toLocaleDateString() : '—'}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-2 pl-12 sm:pl-0">
                                {/* Toggle Status */}
                                <button
                                    onClick={() => handleUpdateCampaign(camp.id, { status: camp.status === 'active' ? 'inactive' : 'active' })}
                                    className={`p-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors ${camp.status === 'active' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    title={camp.status === 'active' ? 'Desactivar' : 'Activar'}
                                >
                                    <Power size={18} />
                                    {camp.status === 'active' ? 'Desactivar' : 'Activar'}
                                </button>

                                {/* Edit Name */}
                                <button
                                    onClick={() => setEditingCampaign(camp)}
                                    className="p-3 bg-white border border-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-50 transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CampaignManager;
