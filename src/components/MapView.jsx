import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

const MapView = ({ logs }) => {
    // Basic center (Elche approx), update if logs exist
    const defaultCenter = [38.2661, -0.6865];
    const hasLogs = logs.length > 0;

    // Find average center of logs if any
    let center = defaultCenter;
    if (hasLogs) {
        const validLogs = logs.filter(l => l.location && l.location.lat && l.location.lng);
        if (validLogs.length > 0) {
            const sumLat = validLogs.reduce((acc, curr) => acc + curr.location.lat, 0);
            const sumLng = validLogs.reduce((acc, curr) => acc + curr.location.lng, 0);
            center = [sumLat / validLogs.length, sumLng / validLogs.length];
        }
    }

    return (
        <div className="h-[500px] w-full rounded-3xl overflow-hidden border-4 border-white shadow-xl">
            <MapContainer
                center={center}
                zoom={15}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {logs.map((log) => (
                    log.location && log.location.lat && (
                        <Marker key={log.id} position={[log.location.lat, log.location.lng]}>
                            <Popup>
                                <div className="text-emerald-950">
                                    <strong className="block text-emerald-700 uppercase tracking-wider text-xs">{log.seedName}</strong>
                                    <span className="text-sm font-medium">{log.microsite}</span> <br />
                                    <span className="text-xs text-slate-500">
                                        {log.groupName} • {log.holeCount || 1} golpe(s)
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>
        </div>
    );
};

export default MapView;
