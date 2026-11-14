import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

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
                    maxZoom: 16,
                    animate: true
                });
            }
        }
    }, [logs, map]);

    return null;
};

const MapView = ({ logs, onSelect }) => {
    const defaultCenter = [38.2661, -0.6865];

    return (
        <div className="h-[500px] w-full rounded-3xl overflow-hidden border-4 border-white shadow-xl">
            <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <BoundsUpdater logs={logs} />

                {logs.map((log) => (
                    log.location && log.location.lat && (
                        <Marker
                            key={log.id}
                            position={[log.location.lat, log.location.lng]}
                            eventHandlers={{
                                click: () => {
                                    if (onSelect) onSelect(log);
                                },
                            }}
                        >
                            {!onSelect && (
                                <Popup>
                                    <div className="text-emerald-950 text-left">
                                        <strong className="block text-emerald-700 uppercase tracking-wider text-xs">{log.seedName}</strong>
                                        <span className="text-sm font-medium">{log.microsite}</span> <br />
                                        <span className="text-xs text-slate-500">
                                            {log.groupName} • {log.holeCount || 1} golpe(s)
                                        </span>
                                    </div>
                                </Popup>
                            )}
                        </Marker>
                    )
                ))}
            </MapContainer>
        </div>
    );
};

export default MapView;
