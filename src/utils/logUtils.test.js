import { describe, it, expect } from 'vitest';
import { filterAndSortLogs } from './logUtils';

describe('filterAndSortLogs', () => {
    const mockLogs = [
        { id: 1, seedName: 'Pino', microsite: 'Roca', notes: 'Difícil', timestamp: { seconds: 100 } },
        { id: 2, seedName: 'Encina', microsite: 'Matorral', notes: 'Fácil', timestamp: { seconds: 200 } },
        { id: 3, seedName: 'Aladierno', microsite: 'Roca', notes: '', timestamp: { seconds: 150 } },
    ];

    it('filters by search term', () => {
        const result = filterAndSortLogs(mockLogs, 'Encina', 'seedName', 'asc');
        expect(result).toHaveLength(1);
        expect(result[0].seedName).toBe('Encina');
    });

    it('filters by partial match case insensitive', () => {
        const result = filterAndSortLogs(mockLogs, 'roca', 'seedName', 'asc');
        expect(result).toHaveLength(2); // Pino y Aladierno
    });

    it('sorts by seedName asc', () => {
        const result = filterAndSortLogs(mockLogs, '', 'seedName', 'asc');
        expect(result.map(l => l.seedName)).toEqual(['Aladierno', 'Encina', 'Pino']);
    });

    it('sorts by timestamp desc', () => {
        const result = filterAndSortLogs(mockLogs, '', 'timestamp', 'desc');
        expect(result.map(l => l.id)).toEqual([2, 3, 1]); // 200, 150, 100
    });
});
