import React, { useState, useEffect, useRef } from 'react';
import { TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { Layers } from 'lucide-react';
import { DEFAULT_MAP_LAYER, MAP_LAYERS, MAP_LAYERS_LIST } from '../utils/mapLayers';

/**
 * Renders the active Leaflet TileLayer and an overlay layer-switcher control.
 * Must be mounted inside a react-leaflet MapContainer.
 */
const MapLayerControl = ({
    defaultLayer = DEFAULT_MAP_LAYER,
    variant = 'light'
}) => {
    const [activeLayerId, setActiveLayerId] = useState(defaultLayer);
    const controlRef = useRef(null);

    const activeLayer = MAP_LAYERS[activeLayerId] || MAP_LAYERS[DEFAULT_MAP_LAYER];

    useEffect(() => {
        const el = controlRef.current;
        if (!el || !L?.DomEvent) return;
        L.DomEvent.disableClickPropagation(el);
        L.DomEvent.disableScrollPropagation(el);
    }, []);

    const isDark = variant === 'dark';
    const wrapperClass = isDark
        ? 'bg-slate-900/90 border-slate-700/80 text-slate-200'
        : 'bg-white/95 border-emerald-200 text-emerald-950';

    return (
        <>
            <TileLayer
                key={activeLayer.id}
                attribution={activeLayer.attribution}
                url={activeLayer.url}
                maxNativeZoom={activeLayer.maxNativeZoom}
                maxZoom={activeLayer.maxZoom}
            />
            <div
                ref={controlRef}
                role="group"
                aria-label="Selector de capa del mapa"
                className={`absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1 rounded-xl border p-1 shadow-lg backdrop-blur-md ${wrapperClass}`}
            >
                <Layers size={14} className="mx-1 shrink-0 text-emerald-500" aria-hidden="true" />
                {MAP_LAYERS_LIST.map((layer) => {
                    const isActive = layer.id === activeLayer.id;
                    const buttonClass = isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isDark
                            ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            : 'text-emerald-900/70 hover:bg-emerald-50 hover:text-emerald-900';

                    return (
                        <button
                            key={layer.id}
                            type="button"
                            onClick={() => setActiveLayerId(layer.id)}
                            aria-pressed={isActive}
                            title={layer.label}
                            className={`rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide transition-colors cursor-pointer sm:text-[11px] ${buttonClass}`}
                        >
                            {layer.label}
                        </button>
                    );
                })}
            </div>
        </>
    );
};

export default MapLayerControl;
