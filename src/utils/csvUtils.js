export const generateLogCSV = (logs, seeds, campaignId) => {
    const headers = ["Fecha", "Hora", "Jornada", "Equipo", "Especie", "Proveedor", "Tratamiento", "Micrositio", "Orientación", "Semillas/Hoyo", "Protector", "Sustrato", "Lat", "Lng", "Golpes", "Notas", "Foto URL"];
    const rows = logs.map(log => {
        const date = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : null;
        const seed = seeds.find(s => s.id === log.seedId);
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
            `"${(log.notes || '').replace(/"/g, '""')}"`, // Escape quotes
            log.photo || log.photoUrl || ''
        ];
    });

    return "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
};
