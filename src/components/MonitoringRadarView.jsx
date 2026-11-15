import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Navigation, Sprout, CloudRain, Thermometer, BarChart3,
    Camera, CheckCircle2, MapPin, PlusCircle
} from 'lucide-react';
import MapView from './MapView';
import {
    CHECKUP_STATUSES,
    CHECKUP_STATUS_LIST,
    calculateDistanceMeters,
    formatDistanceMeters,
    calculateBearingCardinal,
    computeMonitoringStats,
    fetchPostSowingRainfall
} from '../utils/monitoringUtils';
import { formatGpsAccuracy } from '../utils/mapLayers';

const BreakdownBars = ({ title, items }) => {
    const withReviewed = items.filter((item) => item.reviewed > 0);
    const displayItems = (withReviewed.length > 0 ? withReviewed : items).slice(0, 6);

    return (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</h5>
            {displayItems.length === 0 ? (
                <p className="text-xs text-slate-500">Sin datos registrados.</p>
            ) : (
                <div className="space-y-3">
                    {displayItems.map((item) => (
                        <div key={item.label} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="truncate font-bold text-slate-200">{item.label}</span>
                                <span className="shrink-0 font-mono text-[11px] font-bold text-slate-400">
                                    {item.survivalPct !== null
                                        ? `${item.survivalPct}% (${item.alive}/${item.reviewed})`
                                        : `0/${item.total} rev.`}
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                                <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${item.survivalPct ?? 0}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const MonitoringRadarView = ({
    campaign,
    logs = [],
    seeds = [],
    onSelectLog,
    onStartReview,
    isRealUser,
    onLoginClick
}) => {
    const [radarFilter, setRadarFilter] = useState('all'); // 'all' | 'unreviewed' | 'alive' | 'issues'
    const [userGps, setUserGps] = useState(null);
    const [isRadarActive, setIsRadarActive] = useState(false);
    const [gpsError, setGpsError] = useState('');
    const [climateData, setClimateData] = useState(null);
    const [loadingClimate, setLoadingClimate] = useState(false);
    const watchIdRef = useRef(null);

    const stopRadar = () => {
        if (watchIdRef.current !== null && 'geolocation' in navigator && typeof navigator.geolocation.clearWatch === 'function') {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
        setIsRadarActive(false);
    };

    useEffect(() => {
        return () => stopRadar();
    }, []);

    const toggleRadar = () => {
        if (isRadarActive) {
            stopRadar();
            return;
        }
        if (!('geolocation' in navigator)) {
            setGpsError('Tu navegador no soporta geolocalización.');
            return;
        }
        setGpsError('');
        setIsRadarActive(true);

        const onPos = (pos) => {
            setUserGps({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                acc: pos.coords.accuracy
            });
        };
        const onErr = (err) => {
            console.warn('Radar GPS error', err);
            setGpsError('No se pudo obtener tu ubicación GPS en tiempo real.');
            stopRadar();
        };

        if (typeof navigator.geolocation.watchPosition === 'function') {
            watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            });
        } else {
            navigator.geolocation.getCurrentPosition(onPos, onErr, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            });
        }
    };

    const stats = useMemo(() => computeMonitoringStats(logs, seeds), [logs, seeds]);

    // Compute climate summary (Open-Meteo Archive API) from campaign start/first log until yesterday
    const climateQuery = useMemo(() => {
        const validLogs = logs.filter((l) => typeof l.location?.lat === 'number' && typeof l.location?.lng === 'number');
        const centerLat = validLogs.length > 0
            ? validLogs.reduce((acc, l) => acc + l.location.lat, 0) / validLogs.length
            : campaign?.coordinates?.lat ?? null;
        const centerLng = validLogs.length > 0
            ? validLogs.reduce((acc, l) => acc + l.location.lng, 0) / validLogs.length
            : campaign?.coordinates?.lng ?? null;

        const timestampsSec = logs
            .map((l) => l.timestamp?.seconds)
            .filter((s) => typeof s === 'number' && s > 0);
        if (campaign?.createdAt?.seconds) {
            timestampsSec.push(campaign.createdAt.seconds);
        }

        const yesterdayMs = Date.now() - 86400000;
        const endDateIso = new Date(yesterdayMs).toISOString().slice(0, 10);
        const minSec = timestampsSec.length > 0 ? Math.min(...timestampsSec) : Math.floor(yesterdayMs / 1000) - 86400 * 30;
        let startDateIso = new Date(minSec * 1000).toISOString().slice(0, 10);
        if (startDateIso > endDateIso) {
            startDateIso = endDateIso;
        }

        return { lat: centerLat, lng: centerLng, startDateIso, endDateIso };
    }, [logs, campaign?.coordinates?.lat, campaign?.coordinates?.lng, campaign?.createdAt?.seconds]);

    useEffect(() => {
        let isMounted = true;
        if (climateQuery.lat == null || climateQuery.lng == null) return;

        setLoadingClimate(true);
        fetchPostSowingRainfall(climateQuery).then((res) => {
            if (!isMounted) return;
            setClimateData(res);
            setLoadingClimate(false);
        });

        return () => {
            isMounted = false;
        };
    }, [climateQuery]);

    const sortedRadarLogs = useMemo(() => {
        const filtered = logs.filter((log) => {
            if (radarFilter === 'unreviewed') return !log.lastCheckupStatus;
            if (radarFilter === 'alive') return log.lastCheckupStatus === 'alive';
            if (radarFilter === 'issues') return ['dead', 'predated', 'not_found'].includes(log.lastCheckupStatus);
            return true;
        });

        return filtered
            .map((log) => {
                const distanceMeters = userGps && typeof log.location?.lat === 'number' && typeof log.location?.lng === 'number'
                    ? calculateDistanceMeters(userGps.lat, userGps.lng, log.location.lat, log.location.lng)
                    : null;
                const bearing = userGps && distanceMeters !== null
                    ? calculateBearingCardinal(userGps.lat, userGps.lng, log.location.lat, log.location.lng)
                    : '';
                return { log, distanceMeters, bearing };
            })
            .sort((a, b) => {
                if (userGps) {
                    if (a.distanceMeters !== null && b.distanceMeters !== null) {
                        return a.distanceMeters - b.distanceMeters;
                    }
                    if (a.distanceMeters !== null) return -1;
                    if (b.distanceMeters !== null) return 1;
                }
                const revA = a.log.lastCheckupStatus ? 1 : 0;
                const revB = b.log.lastCheckupStatus ? 1 : 0;
                return revA - revB;
            });
    }, [logs, radarFilter, userGps]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Scientific Evidence KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cobertura Revisión</p>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{stats.reviewCoveragePct}%</span>
                        <span className="text-xs font-bold text-slate-400">
                            ({stats.reviewedLogs}/{stats.totalLogs} puntos)
                        </span>
                    </div>
                </div>

                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Tasa Supervivencia</p>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-emerald-300">
                            {stats.survivalRatePct !== null ? `${stats.survivalRatePct}%` : '--'}
                        </span>
                        <span className="text-xs font-bold text-emerald-400/80">
                            ({stats.aliveLogs} puntos vivos)
                        </span>
                    </div>
                </div>

                <div className="rounded-3xl border border-teal-500/20 bg-teal-500/10 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-400">Plántulas Vivas</p>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{stats.totalSurvivingSeedlings}</span>
                        <span className="text-xs font-bold text-teal-400/80">emergidas</span>
                    </div>
                </div>

                <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-400">
                        <CloudRain size={12} /> Lluvia Post-Siembra
                    </p>
                    {loadingClimate ? (
                        <p className="mt-2 text-xs font-bold text-slate-400">Consultando Open-Meteo...</p>
                    ) : climateData ? (
                        <div className="mt-1 space-y-0.5">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-white">{climateData.totalRainMm} mm</span>
                                <span className="text-xs font-bold text-blue-300">({climateData.rainyDays} d. lluvia)</span>
                            </div>
                            {climateData.maxTempC !== null && (
                                <p className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                    <Thermometer size={11} /> Máx. periodo: {climateData.maxTempC} °C
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="mt-2 text-xs text-slate-400">Sin datos climáticos disponibles</p>
                    )}
                </div>
            </div>

            {/* Map colored by survival status + Live GPS Radar button */}
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-300">
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Sin revisar
                        </span>
                        {CHECKUP_STATUS_LIST.map((s) => (
                            <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-300">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.shortLabel}
                            </span>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={toggleRadar}
                        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${isRadarActive
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                            : 'border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                            }`}
                    >
                        <Navigation size={15} className={isRadarActive ? 'animate-pulse' : ''} />
                        <span>
                            {isRadarActive
                                ? `Radar GPS Activo (${userGps ? `±${formatGpsAccuracy(userGps.acc)}` : 'buscando'})`
                                : 'Activar Radar GPS en Campo'}
                        </span>
                    </button>
                </div>

                {gpsError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300">
                        {gpsError}
                    </div>
                )}

                <MapView
                    logs={sortedRadarLogs.map((entry) => entry.log)}
                    onSelect={onSelectLog}
                    colorByStatus={true}
                    userLocation={userGps}
                />
            </div>

            {/* Field Proximity Radar List */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h4 className="flex items-center gap-2 text-base font-black uppercase text-white">
                            <Sprout size={18} className="text-emerald-400" />
                            Puntos para Revisión {userGps ? '(Ordenados por cercanía)' : ''}
                        </h4>
                        <p className="text-xs text-slate-400">
                            Localiza el hoyo usando el satélite, la distancia en metros y la fotografía original T=0.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-950 p-1">
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'unreviewed', label: 'Sin revisar' },
                            { id: 'alive', label: 'Vivos' },
                            { id: 'issues', label: 'Incidencias' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setRadarFilter(tab.id)}
                                className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${radarFilter === tab.id
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {sortedRadarLogs.map(({ log, distanceMeters, bearing }) => {
                        const statusCfg = log.lastCheckupStatus ? CHECKUP_STATUSES[log.lastCheckupStatus] : null;
                        const photoSrc = log.photoUrl && log.photoUrl !== 'PENDING' ? log.photoUrl : log.photo;

                        return (
                            <div
                                key={log.id}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3.5 transition-colors hover:border-emerald-500/30"
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelectLog(log)}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                >
                                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-800 flex items-center justify-center text-slate-600">
                                        {photoSrc ? (
                                            <img src={photoSrc} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <Camera size={20} />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="truncate text-sm font-black uppercase text-white">
                                                {log.seedName}
                                            </span>
                                            {distanceMeters !== null && (
                                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 font-mono text-[10px] font-black text-blue-300">
                                                    <MapPin size={10} />
                                                    {formatDistanceMeters(distanceMeters)} {bearing}
                                                </span>
                                            )}
                                        </div>
                                        <p className="truncate text-[11px] font-medium text-slate-400">
                                            {log.microsite || 'Sin micrositio'} • Orientación {log.orientation || '-'}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2">
                                            {statusCfg ? (
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${statusCfg.badgeClass}`}>
                                                    <CheckCircle2 size={10} />
                                                    {statusCfg.shortLabel}
                                                    {log.lastCheckupStatus === 'alive' && log.lastSurvivingCount
                                                        ? ` (${log.lastSurvivingCount} pl.)`
                                                        : ''}
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                                                    Pendiente de revisión
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => (isRealUser ? onStartReview(log) : onLoginClick?.())}
                                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-black uppercase text-slate-950 transition-all hover:bg-emerald-400 active:scale-95"
                                >
                                    <PlusCircle size={14} />
                                    <span>Revisar</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Scientific Comparison Breakdowns */}
            <div className="space-y-3">
                <h4 className="flex items-center gap-2 px-1 text-base font-black uppercase text-white">
                    <BarChart3 size={18} className="text-emerald-400" />
                    Evidencia Metodológica (Éxito por Variable)
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <BreakdownBars title="Por Micrositio / Nodriza" items={stats.byMicrosite} />
                    <BreakdownBars title="Por Orientación" items={stats.byOrientation} />
                    <BreakdownBars title="Por Especie y Tratamiento" items={stats.byTreatment} />
                </div>
            </div>
        </div>
    );
};

export default MonitoringRadarView;

