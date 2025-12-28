export function filterAndSortLogs(logs, searchTerm, sortField, sortDirection) {
    let result = [...logs];

    // Filtrar por búsqueda
    if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        result = result.filter(log =>
            (log.seedName || '').toLowerCase().includes(term) ||
            (log.microsite || '').toLowerCase().includes(term) ||
            (log.notes || '').toLowerCase().includes(term)
        );
    }

    // Ordenar
    if (sortField) {
        result.sort((a, b) => {
            let valA, valB;

            if (sortField === 'timestamp') {
                valA = a.timestamp?.seconds || 0;
                valB = b.timestamp?.seconds || 0;
            } else {
                valA = (a[sortField] || '').toString().toLowerCase();
                valB = (b[sortField] || '').toString().toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
}
