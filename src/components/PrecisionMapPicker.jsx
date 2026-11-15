import React, { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Circle, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair, RotateCcw, MapPin, X } from 'lucide-react';
import MapLayerControl from './MapLayerControl';
import { ELX_DEFAULT_CENTER, formatGpsAccuracy, nudgeCoordinates } from '../utils/mapLayers';

const roundCoord = (value) => Number(value.toFixed(7));

const MapPrecisionEvents = ({ center, onCoordinatePick }) => {
    const map = useMap();

    useEffect(() => {
        if (!center || center[0] == null || center[1] == null) return;
        const currentCenter = map.getCenter();
        if (Math.abs(currentCenter.lat - center[0]) > 1e-7 || Math.abs(currentCenter.lng - center[1]) > 1e-7) {
            map.panTo(center, { animate: true });
        }
    }, [center, map]);

    useMapEvents({
        dragend: () => {
            const c = map.getCenter();
            onCoordinatePick(roundCoord(c.lat), roundCoord(c.lng));
        },
        click: (e) => {
            onCoordinatePick(roundCoord(e.latlng.lat), roundCoord(e.latlng.lng));
        }
    });

    return null;
};

const PrecisionMapPicker = ({
    location,
    rawGpsLocation,
    existingLogs = [],
    editingLogId = null,
    isManuallyPinned = false,
    onSelectCoordinates,
    onRecenterGps,
    onClose
}) => {
    const fallbackCenter = useMemo(() => {
        const logWithCoords = existingLogs.find(
            (log) => log?.id !== editingLogId && typeof log?.location?.lat === 'number' && typeof log?.location?.lng === 'number'
        );
        return logWithCoords ? [logWithCoords.location.lat, logWithCoords.location.lng] : ELX_DEFAULT_CENTER;
    }, [existingLogs, editingLogId]);

    const hasAssignedPoint = typeof location?.lat === 'number' && typeof location?.lng === 'number';
    const hasRawGps = typeof rawGpsLocation?.lat === 'number' && typeof rawGpsLocation?.lng === 'number';

    const activeLat = hasAssignedPoint
        ? location.lat
        : hasRawGps
            ? rawGpsLocation.lat
            : fallbackCenter[0];
    const activeLng = hasAssignedPoint
        ? location.lng
        : hasRawGps
            ? rawGpsLocation.lng
            : fallbackCenter[1];

    const center = useMemo(() => [activeLat, activeLng], [activeLat, activeLng]);

    const nearbyLogs = useMemo(() => {
        return existingLogs
            .filter(
                (log) =>
                    log?.id !== editingLogId &&
                    typeof log?.location?.lat === 'number' &&
                    typeof log?.location?.lng === 'number'
            )
            .map((log) => {
                const dLat = log.location.lat - activeLat;
                const dLng = log.location.lng - activeLng;
                return { log, distSq: dLat * dLat + dLng * dLng };
            })
            .sort((a, b) => a.distSq - b.distSq)
            .slice(0, 80)
            .map((entry) => entry.log);
    }, [existingLogs, editingLogId, activeLat, activeLng]);

    const handleNudge = (direction) => {
        const next = nudgeCoordinates(activeLat, activeLng, direction, 0.25);
        onSelectCoordinates({ lat: next.lat, lng: next.lng, isManual: true });
    };

    return (
        <div className="mt-3 overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/5 shadow-sm">
            <div className="flex items-center justify-between border-b border-emerald-200/80 bg-emerald-50/90 px-3 py-2">
                <div className="flex items-center gap-2">
                    <Crosshair size={14} className="text-emerald-700" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                        Ajuste fino sobre ortofoto
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Ocultar mapa de precisión"
                    className="rounded-lg p-1 text-emerald-800/70 transition-colors hover:bg-emerald-200/50 hover:text-emerald-950"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="relative h-72 w-full sm:h-80">
                <MapContainer
                    center={center}
                    zoom={20}
                    maxZoom={22}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%' }}
                >
                    <MapLayerControl variant="dark" />
                    <MapPrecisionEvents
                        center={center}
                        onCoordinatePick={(lat, lng) => onSelectCoordinates({ lat, lng, isManual: true })}
                    />

                    {hasRawGps && (
                        <>
                            <Circle
                                center={[rawGpsLocation.lat, rawGpsLocation.lng]}
                                radius={Math.max(rawGpsLocation.acc || 1, 0.5)}
                                pathOptions={{
                                    color: '#3b82f6',
                                    fillColor: '#3b82f6',
                                    fillOpacity: 0.14,
                                    weight: 1.5,
                                    dashArray: '4 4'
                                }}
                            />
                            <CircleMarker
                                center={[rawGpsLocation.lat, rawGpsLocation.lng]}
                                radius={4}
                                pathOptions={{
                                    color: '#ffffff',
                                    weight: 1.5,
                                    fillColor: '#2563eb',
                                    fillOpacity: 1
                                }}
                            />
                        </>
                    )}

                    {nearbyLogs.map((log) => (
                        <CircleMarker
                            key={log.id}
                            center={[log.location.lat, log.location.lng]}
                            radius={4}
                            pathOptions={{
                                color: '#ffffff',
                                weight: 1.5,
                                fillColor: '#10b981',
                                fillOpacity: 0.9
                            }}
                        >
                            <Popup>
                                <div className="text-xs font-bold text-slate-800">
                                    {log.seedName || log.species || 'Siembra'}
                                    {log.holeCount ? ` · ${log.holeCount} golpes` : ''}
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}

                    {hasAssignedPoint && (
                        <Marker
                            position={[activeLat, activeLng]}
                            draggable={true}
                            eventHandlers={{
                                dragend: (e) => {
                                    const pos = e.target.getLatLng();
                                    onSelectCoordinates({
                                        lat: roundCoord(pos.lat),
                                        lng: roundCoord(pos.lng),
                                        isManual: true
                                    });
                                }
                            }}
                        />
                    )}
                </MapContainer>

                {/* Fixed center reticle aligned with map panning */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-1/2 z-[900] -translate-x-1/2 -translate-y-1/2"
                >
                    <div className="relative flex h-8 w-8 items-center justify-center">
                        <span className="h-6 w-6 rounded-full border-2 border-amber-300 shadow-[0_0_0_1px_rgba(0,0,0,0.65)]" />
                        <span className="absolute h-8 w-0.5 bg-amber-300/80 shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
                        <span className="absolute h-0.5 w-8 bg-amber-300/80 shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
                    </div>
                </div>
            </div>

            <div className="space-y-2.5 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-emerald-950">
                        <MapPin size={14} className="shrink-0 text-emerald-600" />
                        {hasAssignedPoint ? (
                            <span>
                                {activeLat.toFixed(6)}, {activeLng.toFixed(6)}
                            </span>
                        ) : (
                            <span className="font-sans text-amber-700">
                                Toca o arrastra el mapa para situar el punto
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {(hasAssignedPoint || hasRawGps) && (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                                ±{formatGpsAccuracy(location?.acc ?? rawGpsLocation?.acc)}
                            </span>
                        )}
                        {isManuallyPinned && (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
                                Ajuste manual
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100 pt-2">
                    <div className="flex items-center gap-1">
                        <span className="mr-1 text-[10px] font-black uppercase tracking-wider text-emerald-800/60">
                            ±25 cm
                        </span>
                        <button
                            type="button"
                            onClick={() => handleNudge('W')}
                            aria-label="Mover 25 cm al Oeste"
                            title="Oeste (-25 cm)"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 transition-colors hover:bg-emerald-100 active:scale-95"
                        >
                            <ArrowLeft size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleNudge('N')}
                            aria-label="Mover 25 cm al Norte"
                            title="Norte (+25 cm)"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 transition-colors hover:bg-emerald-100 active:scale-95"
                        >
                            <ArrowUp size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleNudge('S')}
                            aria-label="Mover 25 cm al Sur"
                            title="Sur (-25 cm)"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 transition-colors hover:bg-emerald-100 active:scale-95"
                        >
                            <ArrowDown size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleNudge('E')}
                            aria-label="Mover 25 cm al Este"
                            title="Este (+25 cm)"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 transition-colors hover:bg-emerald-100 active:scale-95"
                        >
                            <ArrowRight size={14} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {!hasAssignedPoint && (
                            <button
                                type="button"
                                onClick={() => onSelectCoordinates({ lat: roundCoord(activeLat), lng: roundCoord(activeLng), isManual: true })}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-black uppercase text-white transition-colors hover:bg-emerald-700"
                            >
                                Fijar centro aquí
                            </button>
                        )}
                        {hasRawGps && (
                            <button
                                type="button"
                                onClick={onRecenterGps}
                                className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-black uppercase text-blue-700 transition-colors hover:bg-blue-100"
                            >
                                <RotateCcw size={12} />
                                Recentrar en GPS
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrecisionMapPicker;
