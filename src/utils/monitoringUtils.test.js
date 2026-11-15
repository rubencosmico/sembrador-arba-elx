import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    calculateDistanceMeters,
    formatDistanceMeters,
    calculateBearingCardinal,
    computeMonitoringStats,
    fetchPostSowingRainfall
} from './monitoringUtils';

describe('monitoringUtils', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('calculates Haversine distance and cardinal bearing accurately', () => {
        const dSame = calculateDistanceMeters(38.2661, -0.6865, 38.2661, -0.6865);
        expect(dSame).toBe(0);

        const dNorth = calculateDistanceMeters(38.2661, -0.6865, 38.26619, -0.6865);
        expect(dNorth).toBeGreaterThan(9.5);
        expect(dNorth).toBeLessThan(10.5);
        expect(calculateBearingCardinal(38.2661, -0.6865, 38.26619, -0.6865)).toBe('N');
        expect(calculateBearingCardinal(38.2661, -0.6865, 38.2661, -0.6864)).toBe('E');

        expect(formatDistanceMeters(0.42)).toBe('42 cm');
        expect(formatDistanceMeters(12.34)).toBe('12.3 m');
        expect(formatDistanceMeters(250)).toBe('250 m');
        expect(formatDistanceMeters(1450)).toBe('1.45 km');
    });

    it('computes survival statistics and breakdowns by microsite, orientation and treatment', () => {
        const seeds = [
            { id: 's1', species: 'Ceratonia siliqua', treatment: 'Escarificación térmica' },
            { id: 's2', species: 'Pinus halepensis', treatment: '' }
        ];
        const logs = [
            {
                id: 'l1',
                seedId: 's1',
                seedName: 'Ceratonia siliqua',
                microsite: 'Nodriza Viva',
                orientation: 'Norte',
                lastCheckupStatus: 'alive',
                lastSurvivingCount: 2
            },
            {
                id: 'l2',
                seedId: 's1',
                seedName: 'Ceratonia siliqua',
                microsite: 'Nodriza Viva',
                orientation: 'Norte',
                lastCheckupStatus: 'dead'
            },
            {
                id: 'l3',
                seedId: 's2',
                seedName: 'Pinus halepensis',
                microsite: 'Alcorque',
                orientation: 'Sur',
                lastCheckupStatus: null
            }
        ];

        const stats = computeMonitoringStats(logs, seeds);
        expect(stats.totalLogs).toBe(3);
        expect(stats.reviewedLogs).toBe(2);
        expect(stats.reviewCoveragePct).toBe(67);
        expect(stats.aliveLogs).toBe(1);
        expect(stats.deadLogs).toBe(1);
        expect(stats.survivalRatePct).toBe(50);
        expect(stats.totalSurvivingSeedlings).toBe(2);

        const nodriza = stats.byMicrosite.find((m) => m.label === 'Nodriza Viva');
        expect(nodriza).toEqual({
            label: 'Nodriza Viva',
            total: 2,
            reviewed: 2,
            alive: 1,
            survivalPct: 50
        });
    });

    it('aggregates post-sowing rainfall and temperature from Open-Meteo archive API', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({
                daily: {
                    precipitation_sum: [0, 12.4, 0.3, 8.1],
                    temperature_2m_max: [18.2, 16.5, 21.4, 19.0]
                }
            })
        });

        const res = await fetchPostSowingRainfall({
            lat: 38.2661,
            lng: -0.6865,
            startDateIso: '2026-01-01',
            endDateIso: '2026-01-04'
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(res).toEqual({
            totalRainMm: 20.8,
            rainyDays: 2,
            maxTempC: 21.4,
            startDateIso: '2026-01-01',
            endDateIso: '2026-01-04'
        });
    });
});

