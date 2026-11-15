import React, { useEffect } from 'react';
import { MapContainer, Marker, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MapLayerControl from './MapLayerControl';
import { ELX_DEFAULT_CENTER } from '../utils/mapLayers';
import { CHECKUP_STATUSES } from '../utils/monitoringUtils';

// Helper component to update map bounds when logs change
const BoundsUpdater = ({ logs }) => {
    const map = useMap();

    useEffect(() => {
        if (logs && logs.length > 0) {
            const validLogs = logs.filter(l => l.location && l.location.lat && l.location.lng);
            if (validLogs.length > 0) {
                const bounds = L.latLngBounds(validLogs.map(l => [l.location.lat, l.location.lng]));
                map.fitBounds(bounds, {
                    padding: [50, 50],
                    maxZoom: 19,
                    animate: true
                });
            }
        }
    }, [logs, map]);

    return null;
};

const MapView = ({ logs, onSelect, colorByStatus = false, userLocation = null }) => {
    const defaultCenter = ELX_DEFAULT_CENTER;

    return (
        <div className="relative h-[500px] w-full rounded-3xl overflow-hidden border-4 border-white shadow-xl">
            <MapContainer
                center={defaultCenter}
                zoom={13}
                maxZoom={22}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
            >
                <MapLayerControl variant="light" />

                <BoundsUpdater logs={logs} />

                {typeof userLocation?.lat === 'number' && typeof userLocation?.lng === 'number' && (
                    <CircleMarker
                        center={[userLocation.lat, userLocation.lng]}
                        radius={7}
                        pathOptions={{
                            color: '#ffffff',
                            weight: 2,
                            fillColor: '#2563eb',
                            fillOpacity: 1
                        }}
                    />
                )}

                {logs.map((log) => {
                    if (!log.location?.lat || !log.location?.lng) return null;

                    const popupContent = !onSelect ? (
                        <Popup>
                            <div className="text-emerald-950 text-left">
                                <strong className="block text-emerald-700 uppercase tracking-wider text-xs">{log.seedName}</strong>
                                <span className="text-sm font-medium">{log.microsite}</span> <br />
                                <span className="text-xs text-slate-500">
                                    {log.groupName} • {log.holeCount || 1} golpe(s)
                                </span>
                                {log.lastCheckupStatus && (
                                    <span className="block mt-1 text-[11px] font-bold text-slate-700">
                                        Seguimiento: {CHECKUP_STATUSES[log.lastCheckupStatus]?.shortLabel || log.lastCheckupStatus}
                                    </span>
                                )}
                            </div>
                        </Popup>
                    ) : null;

                    if (colorByStatus) {
                        const statusCfg = CHECKUP_STATUSES[log.lastCheckupStatus];
                        return (
                            <CircleMarker
                                key={log.id}
                                center={[log.location.lat, log.location.lng]}
                                radius={8}
                                pathOptions={{
                                    color: '#ffffff',
                                    weight: 2,
                                    fillColor: statusCfg?.color || '#94a3b8',
                                    fillOpacity: 0.92
                                }}
                                eventHandlers={{
                                    click: () => {
                                        if (onSelect) onSelect(log);
                                    }
                                }}
                            >
                                {popupContent}
                            </CircleMarker>
                        );
                    }

                    return (
                        <Marker
                            key={log.id}
                            position={[log.location.lat, log.location.lng]}
                            eventHandlers={{
                                click: () => {
                                    if (onSelect) onSelect(log);
                                },
                            }}
                        >
                            {popupContent}
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default MapView;
