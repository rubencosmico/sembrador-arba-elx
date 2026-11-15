import React, { useState } from 'react';
import { X, Camera, Save, Check, AlertTriangle, Sprout } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import {
    CHECKUP_STATUS_LIST,
    GROWTH_STAGES,
    CHECKUP_CAUSES
} from '../utils/monitoringUtils';

const CheckupFormModal = ({ log, onClose, onSave, isSaving = false }) => {
    const [status, setStatus] = useState('alive');
    const [survivingCount, setSurvivingCount] = useState(1);
    const [growthStage, setGrowthStage] = useState('seedling');
    const [causes, setCauses] = useState([]);
    const [notes, setNotes] = useState('');
    const [photoDataUrl, setPhotoDataUrl] = useState(null);
    const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

    if (!log) return null;

    const toggleCause = (causeId) => {
        setCauses((prev) =>
            prev.includes(causeId)
                ? prev.filter((id) => id !== causeId)
                : [...prev, causeId]
        );
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessingPhoto(true);
        try {
            const compressed = await compressImage(file);
            setPhotoDataUrl(compressed);
        } catch (err) {
            console.error('Error compressing checkup photo', err);
            alert('Error al procesar la imagen.');
        } finally {
            setIsProcessingPhoto(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave({
            status,
            survivingCount: status === 'alive' ? survivingCount : 0,
            growthStage: status === 'alive' ? growthStage : null,
            causes,
            notes: notes.trim(),
            photoDataUrl
        });
    };

    const originalPhoto = log.photoUrl && log.photoUrl !== 'PENDING' ? log.photoUrl : log.photo;

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xl animate-fade-in"
            onClick={onClose}
        >
            <div
                className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto no-scrollbar rounded-[2rem] border border-white/10 bg-slate-900 p-6 text-white shadow-2xl md:p-8"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar formulario de revisión"
                    className="absolute top-5 right-5 rounded-xl bg-white/5 p-2.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X size={20} />
                </button>

                <form onSubmit={handleSubmit} className="space-y-6 text-left">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                            <Sprout size={12} />
                            Revisión en Campo
                        </div>
                        <h3 className="text-2xl font-black uppercase leading-tight text-white">
                            {log.seedName || 'Punto de siembra'}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-slate-400">
                            {log.microsite || 'Sin micrositio'} • Orientación {log.orientation || '-'} • {log.holeCount || 1} golpe(s)
                        </p>
                    </div>

                    {originalPhoto && (
                        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                            <img
                                src={originalPhoto}
                                alt="Foto original de siembra"
                                className="h-16 w-16 shrink-0 rounded-xl object-cover"
                            />
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Referencia Original (T=0)
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-slate-300">
                                    {log.notes || 'Usa esta foto para confirmar el hoyo exacto junto a la nodriza.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Status 1-tap selector */}
                    <div className="space-y-2.5">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            1. Estado Observado
                        </label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {CHECKUP_STATUS_LIST.map((item) => {
                                const isSelected = status === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setStatus(item.id)}
                                        aria-pressed={isSelected}
                                        className={`flex items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-black uppercase tracking-wide transition-all ${isSelected
                                            ? `${item.pillClass} border-transparent shadow-lg`
                                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <span
                                                className="h-3 w-3 shrink-0 rounded-full border border-white/50"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            {item.label}
                                        </span>
                                        {isSelected && <Check size={16} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Details when alive */}
                    {status === 'alive' && (
                        <div className="space-y-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                    Plántulas vivas observadas (de {log.quantity || '1'} sem./hoyo)
                                </label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((count) => (
                                        <button
                                            key={count}
                                            type="button"
                                            onClick={() => setSurvivingCount(count)}
                                            className={`flex-1 rounded-xl py-2.5 text-xs font-black transition-all ${survivingCount === count
                                                ? 'bg-emerald-500 text-slate-950 shadow-md'
                                                : 'bg-slate-900 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {count === 5 ? '5+' : count}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                    Desarrollo / Altura
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {GROWTH_STAGES.map((stage) => (
                                        <button
                                            key={stage.id}
                                            type="button"
                                            onClick={() => setGrowthStage(stage.id)}
                                            className={`rounded-xl border px-3 py-2 text-left text-[11px] font-bold transition-all ${growthStage === stage.id
                                                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                                                : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {stage.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Causes / field stressors */}
                    <div className="space-y-2.5">
                        <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <AlertTriangle size={12} className="text-amber-400" />
                            Factores o Causas Observadas (Opcional)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {CHECKUP_CAUSES.map((cause) => {
                                const isSelected = causes.includes(cause.id);
                                return (
                                    <button
                                        key={cause.id}
                                        type="button"
                                        onClick={() => toggleCause(cause.id)}
                                        className={`rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all ${isSelected
                                            ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                                            : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                    >
                                        {cause.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Photo evidence */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Foto de Evolución (Opcional)
                        </label>
                        {!photoDataUrl ? (
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 bg-slate-950/50 p-5 text-slate-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-400">
                                <Camera size={20} />
                                <span className="text-xs font-bold uppercase tracking-wide">
                                    {isProcessingPhoto ? 'Comprimiendo foto...' : 'Tomar o subir foto actual'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                            </label>
                        ) : (
                            <div className="relative h-44 overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                                <img src={photoDataUrl} alt="Foto revisión" className="h-full w-full object-contain" />
                                <button
                                    type="button"
                                    onClick={() => setPhotoDataUrl(null)}
                                    className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 text-white shadow-lg"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Observaciones de Campo (Opcional)
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Brote vigoroso bajo el esparto, suelo aún húmedo..."
                            className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 p-3.5 text-sm text-white outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-xs font-black uppercase tracking-widest text-slate-300 transition-colors hover:bg-white/10"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isProcessingPhoto}
                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-xs font-black uppercase tracking-widest text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:opacity-50"
                        >
                            <Save size={16} />
                            <span>{isSaving ? 'Guardando...' : 'Guardar Revisión'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckupFormModal;

