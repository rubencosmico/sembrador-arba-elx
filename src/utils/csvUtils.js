import { CHECKUP_STATUSES } from './monitoringUtils';

export const generateLogCSV = (logs, seeds = [], campaignId = '') => {
    const headers = [
        "Fecha", "Hora", "Jornada", "Equipo", "Especie", "Proveedor",
        "Tratamiento", "Micrositio", "Orientación", "Semillas/Hoyo",
        "Protector", "Sustrato", "Lat", "Lng", "Golpes", "Notas",
        "Foto URL", "Estado Seguimiento", "Plántulas Vivas", "Revisiones"
    ];
    const rows = logs.map(log => {
        const date = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : null;
        const seed = seeds.find(s => s.id === log.seedId);
        const checkupLabel = log.lastCheckupStatus
            ? (CHECKUP_STATUSES[log.lastCheckupStatus]?.shortLabel || log.lastCheckupStatus)
            : 'Sin revisar';

        return [
            date ? date.toLocaleDateString() : '',
            date ? date.toLocaleTimeString() : '',
            campaignId,
            log.groupName,
            log.seedName,
            seed?.provider || '',
            seed?.treatment || '',
            log.microsite,
            log.orientation || '',
            log.quantity || '1',
            log.withProtector ? 'Sí' : 'No',
            log.withSubstrate ? 'Sí' : 'No',
            log.location?.lat || '',
            log.location?.lng || '',
            log.holeCount || 1,
            `"${(log.notes || '').replace(/"/g, '""')}"`,
            log.photo || log.photoUrl || '',
            checkupLabel,
            log.lastCheckupStatus === 'alive' ? (log.lastSurvivingCount ?? 1) : 0,
            log.checkupCount || 0
        ];
    });

    return "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
};

export const generateLogGeoJSON = (logs = [], seeds = [], campaignName = '') => {
    const seedById = new Map(seeds.map(s => [s.id, s]));

    const features = logs
        .filter(log => typeof log.location?.lat === 'number' && typeof log.location?.lng === 'number')
        .map(log => {
            const seed = seedById.get(log.seedId);
            const timestampIso = log.timestamp?.seconds
                ? new Date(log.timestamp.seconds * 1000).toISOString()
                : null;
            const lastCheckupIso = log.lastCheckupAt?.seconds
                ? new Date(log.lastCheckupAt.seconds * 1000).toISOString()
                : null;

            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [log.location.lng, log.location.lat]
                },
                properties: {
                    id: log.id || null,
                    campaignName,
                    timestamp: timestampIso,
                    species: log.seedName || seed?.species || 'Desconocida',
                    provider: seed?.provider || null,
                    treatment: seed?.treatment || null,
                    holeCount: parseInt(log.holeCount, 10) || 1,
                    seedsPerHole: log.quantity || '1',
                    microsite: log.microsite || null,
                    orientation: log.orientation || null,
                    withSubstrate: Boolean(log.withSubstrate),
                    withProtector: Boolean(log.withProtector),
                    accuracyMeters: log.location?.acc ?? null,
                    sower: log.userName || log.groupName || null,
                    checkupStatus: log.lastCheckupStatus || 'unreviewed',
                    checkupStatusLabel: log.lastCheckupStatus
                        ? (CHECKUP_STATUSES[log.lastCheckupStatus]?.label || log.lastCheckupStatus)
                        : 'Sin revisar',
                    survivingSeedlings: log.lastCheckupStatus === 'alive' ? (log.lastSurvivingCount ?? 1) : 0,
                    growthStage: log.lastGrowthStage || null,
                    checkupCount: log.checkupCount || 0,
                    lastCheckupAt: lastCheckupIso,
                    notes: log.notes || '',
                    photoUrl: log.photoUrl || log.photo || null
                }
            };
        });

    return JSON.stringify(
        {
            type: 'FeatureCollection',
            name: campaignName || 'sembrador-arba-elx',
            features
        },
        null,
        2
    );
};
