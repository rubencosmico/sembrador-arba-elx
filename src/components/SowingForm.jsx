import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Check, Shield, X, Save, Pencil, Trash2, Crosshair } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import PrecisionMapPicker from './PrecisionMapPicker';
import { formatGpsAccuracy } from '../utils/mapLayers';

const SowingForm = ({
    initialData, // Object with existing data (for edit) or defaults
    seeds,       // Array of available seeds
    existingLogs = [], // Optional campaign logs for nearby spatial reference on map
    editingLogId = null,
    onSave,      // Async function(data) -> void. Data includes all fields + photo object
    onCancel,    // Function -> void
    onDelete,    // Async function -> void (optional)
    isSaving,    // boolean
    storage      // Not used directly if we pass blob to parent, but useful if we moved logic. Let's keep it simple: pass data + photoBlob up.
}) => {

    // --- STATE ---
    const [formData, setFormData] = useState({
        seedId: initialData?.seedId || '',
        microsite: initialData?.microsite || 'Nodriza Viva',
        orientation: initialData?.orientation || 'Norte',
        withSubstrate: initialData?.withSubstrate ?? false, // Use ?? to handle false correctly
        withProtector: initialData?.withProtector ?? false,
        quantity: String(initialData?.quantity || '1'),
        holeCount: initialData?.holeCount || 1,
        notes: initialData?.notes || '',
        photo: null, // New photo file/blob
        photoDeleted: false
    });

    const [currentLocation, setCurrentLocation] = useState(initialData?.location || { lat: null, lng: null, acc: null });
    const [rawGpsLocation, setRawGpsLocation] = useState(initialData?.location?.lat ? initialData.location : null);
    const [gpsStatus, setGpsStatus] = useState(initialData?.location?.lat ? 'success' : 'waiting');
    const [isWatchingGps, setIsWatchingGps] = useState(false);
    const [isManuallyPinned, setIsManuallyPinned] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(Boolean(initialData?.location?.lat));
    const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

    const watchIdRef = useRef(null);
    const isManuallyPinnedRef = useRef(false);
    const hasGpsFixRef = useRef(Boolean(initialData?.location?.lat));
    const hasVibratedRef = useRef(false);

    // --- HELPERS ---
    // --- HELPERS ---
    // compressImage imported from utils

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsProcessingPhoto(true);
            try {
                const compressed = await compressImage(file);
                setFormData({ ...formData, photo: compressed, photoDeleted: false });
            } catch (err) {
                console.error("Error compressing photo", err);
                alert("Error al procesar la foto.");
            } finally {
                setIsProcessingPhoto(false);
            }
        }
    };

    const stopGpsWatch = () => {
        if (watchIdRef.current !== null && 'geolocation' in navigator && typeof navigator.geolocation.clearWatch === 'function') {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
        setIsWatchingGps(false);
    };

    useEffect(() => {
        return () => stopGpsWatch();
    }, []);

    const applyGpsPosition = (position) => {
        const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            acc: position.coords.accuracy
        };
        hasGpsFixRef.current = true;
        setRawGpsLocation(location);
        setGpsStatus('success');
        setIsMapOpen(true);

        if (!isManuallyPinnedRef.current) {
            setCurrentLocation(location);
        }

        if (!hasVibratedRef.current && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(50);
            hasVibratedRef.current = true;
        }
    };

    const captureGPS = async () => {
        if (!('geolocation' in navigator)) return;

        if (isWatchingGps) {
            stopGpsWatch();
            return;
        }

        stopGpsWatch();
        hasVibratedRef.current = false;
        setGpsStatus('searching');

        const getPosition = (options) => {
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, options);
            });
        };

        if (typeof navigator.geolocation.watchPosition === 'function') {
            setIsWatchingGps(true);
            watchIdRef.current = navigator.geolocation.watchPosition(
                applyGpsPosition,
                async (err) => {
                    console.log('High accuracy watch fallback', err);
                    if (hasGpsFixRef.current) return;
                    try {
                        const fallbackPos = await getPosition({ enableHighAccuracy: false, timeout: 5000, maximumAge: 0 });
                        applyGpsPosition(fallbackPos);
                    } catch (fallbackErr) {
                        console.warn('GPS falló', fallbackErr);
                        stopGpsWatch();
                        setGpsStatus('error');
                    }
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
            return;
        }

        try {
            let position;
            try {
                position = await getPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
            } catch (e) {
                console.log("High accuracy failed, trying low accuracy");
                position = await getPosition({ enableHighAccuracy: false, timeout: 5000, maximumAge: 0 });
            }
            applyGpsPosition(position);
        } catch (err) {
            console.warn("GPS falló", err);
            setGpsStatus('error');
        }
    };

    const handleSelectCoordinates = ({ lat, lng, isManual }) => {
        const manualFlag = Boolean(isManual);
        isManuallyPinnedRef.current = manualFlag;
        setIsManuallyPinned(manualFlag);
        setCurrentLocation((prev) => ({
            lat,
            lng,
            acc: prev?.acc ?? rawGpsLocation?.acc ?? null
        }));
        setGpsStatus('success');
    };

    const handleRecenterGps = () => {
        if (!rawGpsLocation?.lat || !rawGpsLocation?.lng) return;
        isManuallyPinnedRef.current = false;
        setIsManuallyPinned(false);
        setCurrentLocation(rawGpsLocation);
        setGpsStatus('success');
    };

    const handleSubmit = async () => {
        if (!formData.seedId) {
            alert("⚠️ ¡Falta elegir la semilla!");
            return;
        }

        stopGpsWatch();

        // Store only the final point { lat, lng, acc } matching Firestore rules
        const finalLocation = {
            lat: currentLocation?.lat ?? null,
            lng: currentLocation?.lng ?? null,
            acc: currentLocation?.acc ?? null
        };

        // Prepare data package
        const dataToSave = {
            ...formData,
            holeCount: parseInt(formData.holeCount) || 1,
            location: finalLocation
        };
        // Note: seedId is in formData. We don't include seedName here, logic assumes parent might resolve it or backend does. 
        // Actually, seedName is useful to store. Let's find it.
        const seedName = seeds.find(s => s.id === formData.seedId)?.species || 'Desconocida';
        dataToSave.seedName = seedName;

        await onSave(dataToSave);
    };

    return (
        <div className="space-y-6">
            <section className="mt-4">
                <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-3 px-1">1. ¿Qué estás sembrando?</label>
                <div className="grid gap-3">
                    {seeds.map(seed => (
                        <button
                            key={seed.id}
                            type="button"
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

            <section className="glass-card p-4 md:p-6 rounded-3xl shadow-sm border border-emerald-100/30 space-y-6">
                {/* Hole Count */}
                <div className="bg-amber-50 p-3 md:p-4 rounded-2xl border border-amber-100">
                    <label className="text-[10px] font-bold text-amber-800/60 uppercase tracking-[0.2em] block mb-2">Cantidad de Golpes</label>
                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={() => setFormData(p => ({ ...p, holeCount: Math.max(1, p.holeCount - 1) }))} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow text-amber-600 font-bold text-xl">-</button>
                        <input
                            type="number"
                            className="flex-1 text-center text-3xl font-black bg-transparent outline-none text-emerald-950 min-w-0"
                            value={formData.holeCount}
                            onChange={e => setFormData({ ...formData, holeCount: parseInt(e.target.value) || 1 })}
                        />
                        <button onClick={() => setFormData(p => ({ ...p, holeCount: p.holeCount + 1 }))} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow text-amber-600 font-bold text-xl">+</button>
                    </div>
                </div>

                {/* Micrositio */}
                <div>
                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-4">Micrositio</label>
                    <div className="flex p-1.5 bg-emerald-900/5 rounded-2xl">
                        {['Nodriza Viva', 'Nodriza Muerta', 'Alcorque'].map(m => (
                            <button key={m} onClick={() => setFormData({ ...formData, microsite: m })} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${formData.microsite === m ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-900/40'}`}>{m}</button>
                        ))}
                    </div>
                </div>

                {/* Orientación */}
                <div>
                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-4">Orientación</label>
                    <div className="flex p-1.5 bg-emerald-900/5 rounded-2xl">
                        {['Norte', 'Sur', 'Este', 'Oeste'].map(o => (
                            <button key={o} onClick={() => setFormData({ ...formData, orientation: o })} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${formData.orientation === o ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-900/40'}`}>{o}</button>
                        ))}
                    </div>
                </div>

                {/* Cantidad Semillas */}
                <div>
                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-4">Semillas por Hoyo</label>
                    <div className="flex p-1.5 bg-emerald-900/5 rounded-2xl">
                        {['1', '2', '3', '4', '5'].map(q => (
                            <button key={q} onClick={() => setFormData({ ...formData, quantity: q })} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${formData.quantity === q ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-900/40'}`}>{q}</button>
                        ))}
                    </div>
                </div>

                {/* Toggles */}
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

                {/* Notas */}
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

                {/* GPS */}
                <div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={captureGPS}
                            className={`flex-1 flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${gpsStatus === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : gpsStatus === 'error' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-white border-emerald-100 text-emerald-900/40'}`}
                        >
                            <div className="flex items-center gap-3">
                                <MapPin size={20} className={gpsStatus === 'searching' || isWatchingGps ? 'animate-pulse text-emerald-600' : ''} />
                                <div className="text-left">
                                    <span className="block text-xs font-black uppercase">
                                        {gpsStatus === 'success'
                                            ? `GPS OK (${formatGpsAccuracy(currentLocation.acc)})`
                                            : gpsStatus === 'searching'
                                                ? 'Estabilizando GPS...'
                                                : gpsStatus === 'error'
                                                    ? 'Error GPS · Reintentar'
                                                    : 'Activar GPS'}
                                    </span>
                                    {isWatchingGps && (
                                        <span className="block text-[10px] font-bold text-emerald-600/80">
                                            Lectura continua activa · Toca para fijar
                                        </span>
                                    )}
                                </div>
                            </div>
                            {gpsStatus === 'success' && <Check size={20} />}
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsMapOpen((prev) => !prev)}
                            className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-xs font-black uppercase transition-all sm:w-auto ${isMapOpen ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100'}`}
                        >
                            <Crosshair size={16} />
                            <span>{isMapOpen ? 'Ocultar mapa' : 'Situar / Afinar en mapa'}</span>
                        </button>
                    </div>

                    {isMapOpen && (
                        <PrecisionMapPicker
                            location={currentLocation}
                            rawGpsLocation={rawGpsLocation}
                            existingLogs={existingLogs}
                            editingLogId={editingLogId}
                            isManuallyPinned={isManuallyPinned}
                            onSelectCoordinates={handleSelectCoordinates}
                            onRecenterGps={handleRecenterGps}
                            onClose={() => setIsMapOpen(false)}
                        />
                    )}
                </div>

                {/* Photo */}
                <div className="pt-2">
                    <label className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.2em] block mb-3 px-1">Foto (Opcional)</label>
                    {!formData.photo && (!initialData?.photoUrl || formData.photoDeleted) ? (
                        <label className="w-full flex items-center justify-center p-6 border-2 border-dashed border-emerald-100 rounded-2xl cursor-pointer hover:bg-emerald-50 transition-colors">
                            <Camera size={24} className="text-emerald-300" />
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                        </label>
                    ) : (
                        <div className="relative h-40 rounded-xl overflow-hidden bg-black/5">
                            <img src={formData.photo || (formData.photoDeleted ? null : initialData?.photoUrl)} className="w-full h-full object-contain" alt="Evidencia" />
                            <div className="absolute top-2 right-2 flex gap-2">
                                <label className="bg-black/50 text-white p-2 rounded-full backdrop-blur-md cursor-pointer">
                                    <Pencil size={14} />
                                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                                </label>
                                <button onClick={() => setFormData({ ...formData, photo: null, photoDeleted: true })} className="bg-red-500 text-white p-2 rounded-full shadow-lg">
                                    <X size={14} />
                                </button>
                            </div>
                            {initialData?.photoUrl && !formData.photo && !formData.photoDeleted && (
                                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md">
                                    Foto actual
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Botones de Acción */}
                <button
                    onClick={handleSubmit}
                    disabled={isSaving || isProcessingPhoto}
                    className={`btn-premium w-full text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mt-2 ${isSaving || isProcessingPhoto ? 'bg-gray-400' : 'bg-emerald-700 hover:bg-emerald-800'}`}
                >
                    <Save size={18} />
                    <span>
                        {isSaving ? 'Guardando...' :
                            isProcessingPhoto ? 'Procesando Foto...' :
                                initialData ? 'Actualizar Registro' : 'Registrar Siembra'}
                    </span>
                </button>

                {initialData && onDelete && (
                    <button
                        onClick={onDelete}
                        disabled={isSaving}
                        className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mt-2 border border-red-100 hover:bg-red-100 transition-colors"
                    >
                        <Trash2 size={18} />
                        <span>Eliminar Registro</span>
                    </button>
                )}

                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="w-full bg-transparent text-emerald-800/50 py-3 font-bold text-sm hover:text-emerald-800"
                >
                    Cancelar
                </button>
            </section>
        </div>
    );
};

export default SowingForm;
