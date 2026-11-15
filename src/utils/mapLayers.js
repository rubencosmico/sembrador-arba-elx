import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

if (typeof L?.icon === 'function' && L?.Marker?.prototype?.options) {
    try {
        L.Marker.prototype.options.icon = L.icon({
            iconUrl: icon,
            shadowUrl: iconShadow,
            iconSize: [25, 41],
            iconAnchor: [12, 41]
        });
    } catch {
        // Ignore in headless test environments without full DOM image support
    }
}

export const ELX_DEFAULT_CENTER = [38.2661, -0.6865];

export const DEFAULT_MAP_LAYER = 'pnoa';

export const MAP_LAYERS = {
    pnoa: {
        id: 'pnoa',
        label: 'Satélite (IGN)',
        shortLabel: 'Satélite IGN',
        url: 'https://www.ign.es/wmts/pnoa-ma?request=GetTile&service=WMTS&Version=1.0.0&Layer=OI.OrthoimageCoverage&Style=default&Format=image/jpeg&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}',
        attribution: '&copy; <a href="https://www.ign.es/">IGN España - PNOA</a>',
        maxNativeZoom: 19,
        maxZoom: 22
    },
    esri: {
        id: 'esri',
        label: 'Satélite (Global)',
        shortLabel: 'Satélite Global',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com/">Esri World Imagery</a>',
        maxNativeZoom: 19,
        maxZoom: 22
    },
    osm: {
        id: 'osm',
        label: 'Callejero',
        shortLabel: 'Mapa',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxNativeZoom: 19,
        maxZoom: 22
    }
};

export const MAP_LAYERS_LIST = [
    MAP_LAYERS.pnoa,
    MAP_LAYERS.esri,
    MAP_LAYERS.osm
];

export const formatGpsAccuracy = (accuracyMeters) => {
    if (typeof accuracyMeters !== 'number' || Number.isNaN(accuracyMeters)) {
        return '--';
    }
    if (accuracyMeters < 1) {
        return `${Math.round(accuracyMeters * 100)} cm`;
    }
    if (accuracyMeters < 10) {
        return `${accuracyMeters.toFixed(1)} m`;
    }
    return `${accuracyMeters.toFixed(0)} m`;
};

export const nudgeCoordinates = (lat, lng, direction, stepMeters = 0.25) => {
    const metersPerDegreeLat = 111111;
    const latRad = (lat * Math.PI) / 180;
    const metersPerDegreeLng = 111320 * Math.max(Math.cos(latRad), 0.1);

    const deltaLat = stepMeters / metersPerDegreeLat;
    const deltaLng = stepMeters / metersPerDegreeLng;

    let nextLat = lat;
    let nextLng = lng;

    if (direction === 'N') nextLat += deltaLat;
    else if (direction === 'S') nextLat -= deltaLat;
    else if (direction === 'E') nextLng += deltaLng;
    else if (direction === 'W') nextLng -= deltaLng;

    return {
        lat: Number(nextLat.toFixed(7)),
        lng: Number(nextLng.toFixed(7))
    };
};
