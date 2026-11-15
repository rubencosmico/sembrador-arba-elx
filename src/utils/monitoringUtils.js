export const CHECKUP_STATUSES = {
    alive: {
        id: 'alive',
        label: 'Germinado / Vivo',
        shortLabel: 'Vivo',
        color: '#10b981',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        pillClass: 'bg-emerald-500 text-slate-950'
    },
    dormant: {
        id: 'dormant',
        label: 'Sin emerger aún',
        shortLabel: 'Latente',
        color: '#f59e0b',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        pillClass: 'bg-amber-400 text-slate-950'
    },
    dead: {
        id: 'dead',
        label: 'Seco / Muerto',
        shortLabel: 'Seco',
        color: '#ef4444',
        badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
        pillClass: 'bg-red-500 text-white'
    },
    predated: {
        id: 'predated',
        label: 'Depredado / Dañado',
        shortLabel: 'Depredado',
        color: '#f97316',
        badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        pillClass: 'bg-orange-500 text-white'
    },
    not_found: {
        id: 'not_found',
        label: 'No localizado',
        shortLabel: 'No localizado',
        color: '#64748b',
        badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
        pillClass: 'bg-slate-500 text-white'
    }
};

export const CHECKUP_STATUS_LIST = [
    CHECKUP_STATUSES.alive,
    CHECKUP_STATUSES.dormant,
    CHECKUP_STATUSES.dead,
    CHECKUP_STATUSES.predated,
    CHECKUP_STATUSES.not_found
];

export const GROWTH_STAGES = [
    { id: 'cotyledons', label: 'Cotiledones (< 3 cm)' },
    { id: 'seedling', label: 'Plántula (3–10 cm)' },
    { id: 'juvenile', label: 'Joven (10–25 cm)' },
    { id: 'established', label: 'Establecida (> 25 cm)' }
];

export const CHECKUP_CAUSES = [
    { id: 'drought', label: 'Sequía / Estrés hídrico' },
    { id: 'herbivory', label: 'Herbivoría' },
    { id: 'boar', label: 'Jabalí / Hozaduras' },
    { id: 'ants_rodents', label: 'Hormigas / Roedores' },
    { id: 'competition', label: 'Competencia herbácea' }
];

export const BIOME_OPTIONS = [
    'Matorral semiárido mediterráneo',
    'Bosque mediterráneo esclerófilo',
    'Restauración post-incendio',
    'Rambla / Ecosistema ripario',
    'Dunar / Litoral',
    'Altiplano / Estepa',
    'Otro ecosistema'
];

export const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
    if (
        typeof lat1 !== 'number' || typeof lng1 !== 'number' ||
        typeof lat2 !== 'number' || typeof lng2 !== 'number' ||
        Number.isNaN(lat1) || Number.isNaN(lng1) ||
        Number.isNaN(lat2) || Number.isNaN(lng2)
    ) {
        return null;
    }

    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const formatDistanceMeters = (meters) => {
    if (typeof meters !== 'number' || Number.isNaN(meters)) return '--';
    if (meters < 1) return `${Math.round(meters * 100)} cm`;
    if (meters < 100) return `${meters.toFixed(1)} m`;
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
};

export const calculateBearingCardinal = (lat1, lng1, lat2, lng2) => {
    if (
        typeof lat1 !== 'number' || typeof lng1 !== 'number' ||
        typeof lat2 !== 'number' || typeof lng2 !== 'number'
    ) {
        return '';
    }
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;
    const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
    const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
    const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    return directions[Math.round(bearing / 45) % 8];
};

const buildGroupStats = (logs, keyExtractor) => {
    const groups = new Map();

    logs.forEach((log) => {
        const label = keyExtractor(log) || 'Sin especificar';
        if (!groups.has(label)) {
            groups.set(label, { label, total: 0, reviewed: 0, alive: 0 });
        }
        const entry = groups.get(label);
        entry.total += 1;
        if (log.lastCheckupStatus) {
            entry.reviewed += 1;
            if (log.lastCheckupStatus === 'alive') {
                entry.alive += 1;
            }
        }
    });

    return Array.from(groups.values())
        .map((entry) => ({
            ...entry,
            survivalPct: entry.reviewed > 0 ? Math.round((entry.alive / entry.reviewed) * 100) : null
        }))
        .sort((a, b) => (b.reviewed - a.reviewed) || (b.total - a.total));
};

export const computeMonitoringStats = (logs = [], seeds = []) => {
    const seedById = new Map(seeds.map((s) => [s.id, s]));

    let reviewedLogs = 0;
    let aliveLogs = 0;
    let dormantLogs = 0;
    let deadLogs = 0;
    let predatedLogs = 0;
    let notFoundLogs = 0;
    let totalSurvivingSeedlings = 0;

    logs.forEach((log) => {
        const status = log.lastCheckupStatus;
        if (!status) return;
        reviewedLogs += 1;
        if (status === 'alive') {
            aliveLogs += 1;
            totalSurvivingSeedlings += parseInt(log.lastSurvivingCount, 10) || 1;
        } else if (status === 'dormant') {
            dormantLogs += 1;
        } else if (status === 'dead') {
            deadLogs += 1;
        } else if (status === 'predated') {
            predatedLogs += 1;
        } else if (status === 'not_found') {
            notFoundLogs += 1;
        }
    });

    const totalLogs = logs.length;
    const reviewCoveragePct = totalLogs > 0 ? Math.round((reviewedLogs / totalLogs) * 100) : 0;
    const survivalRatePct = reviewedLogs > 0 ? Math.round((aliveLogs / reviewedLogs) * 100) : null;

    return {
        totalLogs,
        reviewedLogs,
        reviewCoveragePct,
        aliveLogs,
        dormantLogs,
        deadLogs,
        predatedLogs,
        notFoundLogs,
        survivalRatePct,
        totalSurvivingSeedlings,
        byMicrosite: buildGroupStats(logs, (l) => l.microsite),
        byOrientation: buildGroupStats(logs, (l) => l.orientation),
        byTreatment: buildGroupStats(logs, (l) => {
            const seed = seedById.get(l.seedId);
            return seed?.treatment?.trim() ? `${seed.species} (${seed.treatment})` : `${l.seedName || seed?.species || 'Especie'} (Sin tratamiento)`;
        })
    };
};

export const fetchPostSowingRainfall = async ({ lat, lng, startDateIso, endDateIso }) => {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !startDateIso || !endDateIso) {
        return null;
    }

    const params = new URLSearchParams({
        latitude: String(lat.toFixed(4)),
        longitude: String(lng.toFixed(4)),
        start_date: startDateIso,
        end_date: endDateIso,
        daily: 'precipitation_sum,temperature_2m_max',
        timezone: 'auto'
    });

    try {
        const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params.toString()}`);
        if (!response.ok) return null;
        const payload = await response.json();
        const precips = payload?.daily?.precipitation_sum || [];
        const temps = payload?.daily?.temperature_2m_max || [];

        let totalRainMm = 0;
        let rainyDays = 0;
        precips.forEach((mm) => {
            if (typeof mm === 'number' && !Number.isNaN(mm)) {
                totalRainMm += mm;
                if (mm >= 1) rainyDays += 1;
            }
        });

        const validTemps = temps.filter((t) => typeof t === 'number' && !Number.isNaN(t));
        const maxTempC = validTemps.length > 0 ? Math.max(...validTemps) : null;

        return {
            totalRainMm: Number(totalRainMm.toFixed(1)),
            rainyDays,
            maxTempC: maxTempC != null ? Number(maxTempC.toFixed(1)) : null,
            startDateIso,
            endDateIso
        };
    } catch {
        return null;
    }
};

