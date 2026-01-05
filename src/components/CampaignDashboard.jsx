import React, { useState } from 'react';
import {
    Users, MapPin, Leaf, Calendar, ArrowLeft,
    ArrowRight, History, PlusCircle, Settings, HelpCircle,
    Info, Globe, Lock, List, X, Camera, ChevronRight, Map as MapIcon, Package, ChevronDown
} from 'lucide-react';
import MapView from './MapView';
import Breadcrumbs from './Breadcrumbs';

const CampaignDashboard = ({
    campaign, user, logs, seeds = [],
    onSelectRole, onBack, onLoginClick,
    isSuperAdmin, participantCount = 0,
    onNavigate
}) => {
    const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
    const [selectedLog, setSelectedLog] = useState(null);
    const [expandedSpecies, setExpandedSpecies] = useState(null);

    const totalHoles = logs.reduce((acc, log) => acc + (parseInt(log.holeCount) || 1), 0);

    // Group seeds by species
    const groupedSeeds = seeds.reduce((acc, seed) => {
        if (!acc[seed.species]) acc[seed.species] = [];
        acc[seed.species].push(seed);
        return acc;
    }, {});
    const isOwner = user && campaign?.ownerId && user.uid === campaign.ownerId;
    const canManage = isSuperAdmin || isOwner;
    const isActive = campaign.status === 'active';

    const formatDate = (date) => {
        if (!date) return 'Sin fecha';
        const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans pb-12 overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                        <Breadcrumbs campaign={campaign} onNavigate={onNavigate} />
                        <h1 className="text-xl font-bold uppercase tracking-tight truncate max-w-[200px] md:max-w-md">
                            {campaign.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {isActive ? 'Jornada Activa' : 'Finalizada'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {campaign.visibility === 'private' ? (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
                            <Lock size={12} className="text-orange-400" />
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Privada</span>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                            <Globe size={12} className="text-blue-400" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pública</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex items-center gap-6 shadow-xl">
                        <div className="bg-emerald-500 p-4 rounded-3xl shadow-lg shadow-emerald-500/20">
                            <Leaf size={32} className="text-slate-950" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Reforestación</p>
                            <div className="text-4xl font-black">{totalHoles} <span className="text-sm font-bold text-emerald-500">golpes</span></div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex items-center gap-6 shadow-xl">
                        <div className="bg-teal-500 p-4 rounded-3xl shadow-lg shadow-teal-500/20">
                            <Users size={32} className="text-slate-950" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Comunidad</p>
                            <div className="text-4xl font-black">{participantCount} <span className="text-sm font-bold text-teal-500">miembros</span></div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex items-center gap-6 shadow-xl text-slate-400">
                        <div className="bg-slate-800 p-4 rounded-3xl">
                            <Calendar size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Creada el</p>
                            <div className="text-xl font-bold">{formatDate(campaign.createdAt)}</div>
                        </div>
                    </div>
                </div>

                {/* Seeds / Lots Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Package className="text-emerald-500" />
                            Variedades de Semilla
                        </h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {Object.keys(groupedSeeds).length} Especies • {seeds.length} Lotes
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(groupedSeeds).map(([species, lots]) => (
                            <div
                                key={species}
                                className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden transition-all hover:border-emerald-500/30"
                            >
                                <button
                                    onClick={() => setExpandedSpecies(expandedSpecies === species ? null : species)}
                                    className="w-full p-6 flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                                            <Leaf size={24} />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-bold text-white uppercase">{species}</h4>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                {lots.length} {lots.length === 1 ? 'Lote' : 'Lotes'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-xl transition-all ${expandedSpecies === species ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-500 group-hover:bg-white/10'}`}>
                                        <ChevronDown size={16} className={`transition-transform duration-300 ${expandedSpecies === species ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {expandedSpecies === species && (
                                    <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-4 animate-fade-in">
                                        {lots.map((lot, idx) => (
                                            <div key={lot.id || idx} className="space-y-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-16 h-16 bg-slate-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                                                        {lot.photo ? (
                                                            <img src={lot.photo} className="w-full h-full object-cover" alt={lot.species} />
                                                        ) : (
                                                            <Package className="text-slate-700" size={24} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Lote {idx + 1}</p>
                                                            <span className="text-[10px] font-bold text-slate-500">{lot.totalQuantity} ud.</span>
                                                        </div>
                                                        <h5 className="font-bold text-slate-200 truncate">{lot.provider || 'Proveedor Local'}</h5>
                                                        {lot.treatment && (
                                                            <div className="mt-1.5 flex items-center gap-1.5">
                                                                <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
                                                                <p className="text-[10px] font-medium text-amber-500/80 italic">{lot.treatment}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Main Interactive Map / List Toggle */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                {viewMode === 'map' ? <MapPin className="text-emerald-500" /> : <List className="text-emerald-500" />}
                                {viewMode === 'map' ? 'Mapa de Plantaciones' : 'Lista de Registros'}
                            </h3>
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setViewMode('map')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Mapa
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Lista
                                </button>
                            </div>
                        </div>
                        <p className="hidden md:block text-xs text-slate-500 font-medium italic">Mostrando {logs.length} registros en tiempo real</p>
                    </div>

                    {viewMode === 'map' ? (
                        <div className="animate-fade-in relative">
                            <MapView logs={logs} onSelect={(log) => setSelectedLog(log)} />
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            {logs.length === 0 ? (
                                <div className="py-20 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-4">
                                    <div className="p-4 bg-white/5 rounded-2xl text-slate-700">
                                        <Leaf size={32} />
                                    </div>
                                    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No hay registros todavía</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {logs.map(log => (
                                        <div
                                            key={log.id}
                                            onClick={() => setSelectedLog(log)}
                                            className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 p-5 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden text-emerald-500">
                                                    {log.photoUrl || log.photo ? (
                                                        <img src={log.photoUrl || log.photo} className="w-full h-full object-cover" alt="" />
                                                    ) : <Camera size={20} />}
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors uppercase text-sm">{log.seedName}</h4>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{log.groupName} • {log.holeCount || 1} golpes</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="text-slate-700 group-hover:text-emerald-500 transition-colors shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Actions Grid */}
                <section className="bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-8">
                    <div className="text-center max-w-xl mx-auto space-y-2">
                        <h3 className="text-2xl font-black uppercase">¿Cómo quieres participar?</h3>
                        <p className="text-slate-400 text-sm">Gestiona tus propios registros o ayuda a rreforestar como sembrador.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Primary Action: Sowing */}
                        {isActive && (
                            <button
                                onClick={() => user ? onSelectRole('sower', 'form') : onLoginClick()}
                                className="group relative bg-emerald-500 hover:bg-emerald-400 p-8 rounded-[2rem] text-slate-950 transition-all flex flex-col justify-between h-56 shadow-xl shadow-emerald-500/10 active:scale-[0.98]"
                            >
                                <PlusCircle size={40} strokeWidth={2.5} />
                                <div className="text-left w-full">
                                    <h4 className="text-2xl font-black uppercase leading-none mb-2">Registrar<br />Siembras</h4>
                                    <p className="text-slate-950/60 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        Empezar ahora <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </p>
                                </div>
                            </button>
                        )}

                        {/* History Shortcut */}
                        {user && (
                            <button
                                onClick={() => onSelectRole('sower', 'history')}
                                className="group bg-slate-800/50 hover:bg-slate-800 p-8 rounded-[2rem] border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col justify-between h-56 active:scale-[0.98]"
                            >
                                <History size={40} className="text-emerald-500" />
                                <div className="text-left w-full">
                                    <h4 className="text-2xl font-black uppercase leading-none mb-2 text-white">Mi Cuaderno<br />de Campo</h4>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
                                        Ver mis registros <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </p>
                                </div>
                            </button>
                        )}

                        {/* Coordinator Shortcut */}
                        {canManage && (
                            <button
                                onClick={() => onSelectRole('coordinator')}
                                className="group bg-slate-800/50 hover:bg-slate-800 p-8 rounded-[2rem] border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col justify-between h-56 active:scale-[0.98]"
                            >
                                <Settings size={40} className="text-blue-500" />
                                <div className="text-left w-full">
                                    <h4 className="text-2xl font-black uppercase leading-none mb-2 text-white">Gestionar<br />Jornada</h4>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                                        Administrar datos <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </p>
                                </div>
                            </button>
                        )}

                        {/* Public Link / Info */}
                        <button
                            className="group bg-slate-900/50 hover:bg-slate-900 p-8 rounded-[2rem] border border-white/5 hover:border-slate-500/30 transition-all flex flex-col justify-between h-56 active:scale-[0.98]"
                            onClick={() => window.open('https://arbaelx.es', '_blank')}
                        >
                            <HelpCircle size={40} className="text-slate-500" />
                            <div className="text-left w-full">
                                <h4 className="text-2xl font-black uppercase leading-none mb-2 text-white italic opacity-80 underline underline-offset-4 decoration-slate-700">Saber más<br />sobre ARBA</h4>
                                <p className="text-slate-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
                                    Sitio web oficial <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </p>
                            </div>
                        </button>
                    </div>
                </section>
            </main>

            {/* Log Detail Modal */}
            {
                selectedLog && (
                    <div
                        className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-fade-in"
                        onClick={() => setSelectedLog(null)}
                    >
                        <div
                            className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-colors z-10"
                            >
                                <X size={24} />
                            </button>

                            <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                                {/* Left: Image/Map */}
                                <div className="bg-slate-950 p-2 h-64 lg:h-auto">
                                    {selectedLog.photoUrl || selectedLog.photo ? (
                                        <img
                                            src={selectedLog.photoUrl || selectedLog.photo}
                                            className="w-full h-full object-cover rounded-[2.5rem]"
                                            alt="Evidencia"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-[2.5rem] bg-slate-900 flex flex-col items-center justify-center text-slate-700">
                                            <Camera size={64} />
                                            <span className="text-xs font-black uppercase mt-4 tracking-widest">Sin evidencia fotográfica</span>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Info */}
                                <div className="p-8 md:p-12 space-y-8 text-left">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                Detalle del Registro
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500">
                                                {selectedLog.timestamp?.seconds ? new Date(selectedLog.timestamp.seconds * 1000).toLocaleString() : 'Reciente'}
                                            </span>
                                        </div>
                                        <h3 className="text-4xl font-black uppercase text-white leading-none">{selectedLog.seedName}</h3>
                                        <p className="text-slate-400 mt-2 font-medium italic">
                                            "{selectedLog.notes || 'Sin comentarios registrados por el sembrador.'}"
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Sembrador</p>
                                            <p className="text-sm font-bold text-white">{selectedLog.groupName || 'Anónimo'}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Impacto</p>
                                            <p className="text-sm font-black text-emerald-400">{selectedLog.holeCount || 1} GOLPES</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Micrositio</p>
                                            <p className="text-sm font-bold text-white">{selectedLog.microsite || '-'}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Orientación</p>
                                            <p className="text-sm font-bold text-white">{selectedLog.orientation || '-'}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Semillas / Hoyo</p>
                                            <p className="text-sm font-bold text-white">{selectedLog.quantity || '1'}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Coordenadas</p>
                                            {selectedLog.location?.lat ? (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedLog.location.lat},${selectedLog.location.lng}`}
                                                    target="_blank" rel="noreferrer"
                                                    className="text-xs font-mono font-bold text-emerald-500 hover:underline block truncate"
                                                >
                                                    {selectedLog.location.lat.toFixed(6)}, {selectedLog.location.lng.toFixed(6)}
                                                </a>
                                            ) : <span className="text-xs text-slate-600">N/D</span>}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-3">
                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${selectedLog.withSubstrate ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                                                Sustrato: {selectedLog.withSubstrate ? 'SÍ' : 'NO'}
                                            </div>
                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${selectedLog.withProtector ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-500'}`}>
                                                Protector: {selectedLog.withProtector ? 'SÍ' : 'NO'}
                                            </div>
                                        </div>

                                        {seeds.find(s => s.id === selectedLog.seedId)?.treatment && (
                                            <div className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/10 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                    <Info size={40} className="text-emerald-500" />
                                                </div>
                                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                                                    Tratamiento de la Variedad
                                                </p>
                                                <p className="text-sm font-medium text-slate-200 leading-relaxed">
                                                    {seeds.find(s => s.id === selectedLog.seedId).treatment}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CampaignDashboard;
