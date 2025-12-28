import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CoordinatorView from './CoordinatorView';
import * as firestore from 'firebase/firestore';

// Mock de módulos
vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        getDocs: vi.fn(),
        collection: vi.fn(),
        query: vi.fn(),
        onSnapshot: vi.fn((q, cb) => {
            // Simular respuesta vacía inmediata para evitar bloqueo
            if (cb) cb({ docs: [] });
            return vi.fn();
        }),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
    };
});

// Mock generico de compressImage para evitar llamar a Canvas
vi.mock('../utils/imageUtils', () => ({
    compressImage: vi.fn().mockResolvedValue('data:image/mock')
}));

describe('CoordinatorView', () => {
    const mockDb = {};
    const mockAppId = 'test-app';
    const mockCampaignId = 'campaign-1';
    const mockSeeds = [{ id: 's1', species: 'Pino', provider: 'Vivero' }];
    const mockGroups = [{ id: 'g1', name: 'Equipo 1' }];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders and fetches logs on mount', async () => {
        // Mock getDocs response
        const mockDocs = [
            { id: 'l1', data: () => ({ groupName: 'Equipo 1', seedName: 'Pino', timestamp: { seconds: 100 } }) }
        ];
        firestore.getDocs.mockResolvedValue({
            docs: mockDocs,
        });

        render(
            <CoordinatorView
                db={mockDb}
                appId={mockAppId}
                campaignId={mockCampaignId}
                seeds={mockSeeds}
                groups={mockGroups}
                storage={{}}
                onResetRole={vi.fn()}
            />
        );

        // Check header presence
        expect(screen.getByText('Panel de Control')).toBeInTheDocument();

        // Switch to Data tab to see logs
        const resultsTab = screen.getByText('Resultados');
        fireEvent.click(resultsTab);

        // Wait for logs to be displayed
        await waitFor(() => {
            expect(screen.getByText('Equipo 1')).toBeInTheDocument();
            expect(screen.getByText('Pino')).toBeInTheDocument();
        });
    });

    it('filters logs via search input', async () => {
        // Setup logs: One matching, one not
        const mockDocs = [
            { id: 'l1', data: () => ({ groupName: 'Alpha', seedName: 'Roble', timestamp: { seconds: 100 } }) },
            { id: 'l2', data: () => ({ groupName: 'Beta', seedName: 'Encina', timestamp: { seconds: 200 } }) }
        ];
        firestore.getDocs.mockResolvedValue({ docs: mockDocs });

        render(
            <CoordinatorView
                db={mockDb}
                appId={mockAppId}
                campaignId={mockCampaignId}
                seeds={mockSeeds}
                groups={mockGroups}
            />
        );

        // Ir a pestaña Resultados
        fireEvent.click(screen.getByText('Resultados'));
        await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());

        // Buscar
        const searchInput = screen.getByPlaceholderText('Buscar por equipo, especie, notas...');
        fireEvent.change(searchInput, { target: { value: 'Alpha' } });

        // Verificar filtro
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    });
});
