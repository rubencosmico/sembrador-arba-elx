import { describe, it, expect } from 'vitest';
import { generateLogCSV, generateLogGeoJSON } from './csvUtils';

describe('generateLogCSV', () => {
    it('generates correct CSV headers and data including checkup status', () => {
        const mockLogs = [{
            id: '1',
            timestamp: { seconds: 1600000000 },
            groupName: 'Equipo A',
            seedName: 'Pino',
            seedId: 's1',
            microsite: 'Roca',
            holeCount: 5,
            notes: 'Test note',
            withProtector: true,
            withSubstrate: false,
            lastCheckupStatus: 'alive',
            lastSurvivingCount: 2,
            checkupCount: 1
        }];
        const mockSeeds = [{ id: 's1', treatment: 'Fungicida' }];

        const csv = generateLogCSV(mockLogs, mockSeeds, 'c1');

        expect(csv).toContain('Fecha,Hora,Jornada');
        expect(csv).toContain('Estado Seguimiento,Plántulas Vivas,Revisiones');
        expect(csv).toContain('Equipo A');
        expect(csv).toContain('Fungicida');
        expect(csv).toContain('Test note');
        expect(csv).toContain('Sí,No');
        expect(csv).toContain('Vivo,2,1');
    });
});

describe('generateLogGeoJSON', () => {
    it('exports valid GeoJSON FeatureCollection with lng/lat coordinates and metadata', () => {
        const logs = [
            {
                id: 'l1',
                seedId: 's1',
                seedName: 'Ceratonia siliqua',
                holeCount: 3,
                quantity: '2',
                microsite: 'Nodriza Viva',
                orientation: 'Norte',
                withSubstrate: true,
                withProtector: false,
                location: { lat: 38.2661, lng: -0.6865, acc: 1.5 },
                lastCheckupStatus: 'alive',
                lastSurvivingCount: 2,
                checkupCount: 1
            },
            {
                id: 'l2-no-gps',
                seedId: 's1',
                seedName: 'Ceratonia siliqua',
                location: { lat: null, lng: null, acc: null }
            }
        ];
        const seeds = [{ id: 's1', species: 'Ceratonia siliqua', provider: 'ARBA', treatment: 'Agua caliente' }];

        const geo = JSON.parse(generateLogGeoJSON(logs, seeds, 'Jornada Test'));
        expect(geo.type).toBe('FeatureCollection');
        expect(geo.name).toBe('Jornada Test');
        expect(geo.features).toHaveLength(1);
        expect(geo.features[0].geometry).toEqual({
            type: 'Point',
            coordinates: [-0.6865, 38.2661]
        });
        expect(geo.features[0].properties.treatment).toBe('Agua caliente');
        expect(geo.features[0].properties.checkupStatus).toBe('alive');
        expect(geo.features[0].properties.survivingSeedlings).toBe(2);
    });
});
