import { describe, it, expect } from 'vitest';
import { generateLogCSV } from './csvUtils';

describe('generateLogCSV', () => {
    it('generates correct CSV headers and data', () => {
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
            withSubstrate: false
        }];
        const mockSeeds = [{ id: 's1', treatment: 'Fungicida' }];

        const csv = generateLogCSV(mockLogs, mockSeeds, 'c1');

        expect(csv).toContain('Fecha,Hora,Jornada'); // Headers check
        expect(csv).toContain('Equipo A');
        expect(csv).toContain('Fungicida'); // Treatment check from seed join
        expect(csv).toContain('Test note');
        expect(csv).toContain('Sí,No'); // Protector/Substrate check
    });
});
