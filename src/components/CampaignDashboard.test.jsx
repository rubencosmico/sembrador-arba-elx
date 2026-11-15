import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CampaignDashboard from './CampaignDashboard';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        collection: vi.fn((_db, ...segments) => segments.join('/')),
        doc: vi.fn((_db, ...segments) => segments.join('/')),
        query: vi.fn((target) => target),
        where: vi.fn((field, op, val) => ({ field, op, val })),
        onSnapshot: vi.fn((_q, cb) => {
            cb({ docs: [] });
            return vi.fn();
        }),
        addDoc: vi.fn(),
        updateDoc: vi.fn(),
        serverTimestamp: () => 'MOCK_TS'
    };
});

vi.mock('firebase/storage', () => ({
    ref: vi.fn(),
    uploadString: vi.fn(),
    getDownloadURL: vi.fn()
}));

vi.mock('./MapView', () => ({
    default: ({ logs, colorByStatus }) => (
        <div data-testid="map-view" data-colored={String(Boolean(colorByStatus))}>
            Map logs: {logs.length}
        </div>
    )
}));

describe('CampaignDashboard - Monitoring & Metadata', () => {
    const mockDb = {};
    const mockCampaign = {
        id: 'camp-1',
        name: 'Sierra de Elche',
        organizationName: 'ARBA Elx',
        locationName: 'Crevillent, Alicante',
        biome: 'Matorral semiárido mediterráneo',
        status: 'active',
        visibility: 'public',
        ownerId: 'owner-1',
        participants: ['user-1'],
        coordinates: { lat: 38.2661, lng: -0.6865 }
    };

    const mockSeeds = [
        { id: 's1', species: 'Ceratonia siliqua', treatment: 'Escarificación térmica', totalQuantity: 100 }
    ];

    const mockLogs = [
        {
            id: 'log-1',
            seedId: 's1',
            seedName: 'Ceratonia siliqua',
            microsite: 'Nodriza Viva',
            orientation: 'Norte',
            holeCount: 1,
            quantity: '2',
            location: { lat: 38.2661, lng: -0.6865, acc: 2 },
            timestamp: { seconds: 1700000000 }
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        firestore.addDoc.mockResolvedValue({ id: 'chk-new' });
        firestore.updateDoc.mockResolvedValue();
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({
                daily: {
                    precipitation_sum: [5.2, 10.3],
                    temperature_2m_max: [20.1, 22.4]
                }
            })
        });
    });

    it('renders organization metadata, opens monitoring radar, and saves a checkup review', async () => {
        render(
            <CampaignDashboard
                db={mockDb}
                appId="test-app"
                campaign={mockCampaign}
                user={{ uid: 'user-1', displayName: 'Lucía', isAnonymous: false }}
                userProfile={{ displayName: 'Lucía' }}
                logs={mockLogs}
                seeds={mockSeeds}
                onSelectRole={vi.fn()}
                onBack={vi.fn()}
                onLoginClick={vi.fn()}
                isSuperAdmin={false}
            />
        );

        expect(screen.getByText(/ARBA Elx/)).toBeInTheDocument();
        expect(screen.getByText(/Crevillent, Alicante/)).toBeInTheDocument();
        expect(screen.getByText('Matorral semiárido mediterráneo')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));

        await waitFor(() => {
            expect(screen.getByText('Cobertura Revisión')).toBeInTheDocument();
            expect(screen.getByText('15.5 mm')).toBeInTheDocument();
        });

        expect(screen.getByTestId('map-view')).toHaveAttribute('data-colored', 'true');

        fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));

        expect(screen.getByText('1. Estado Observado')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Guardar Revisión/i }));

        await waitFor(() => {
            expect(firestore.addDoc).toHaveBeenCalledTimes(1);
            expect(firestore.updateDoc).toHaveBeenCalledTimes(1);
        });

        expect(firestore.addDoc.mock.calls[0][1]).toMatchObject({
            campaignId: 'camp-1',
            logId: 'log-1',
            status: 'alive',
            survivingCount: 1,
            reviewerId: 'user-1',
            reviewerName: 'Lucía'
        });

        expect(firestore.updateDoc.mock.calls[0][1]).toMatchObject({
            lastCheckupStatus: 'alive',
            lastSurvivingCount: 1,
            checkupCount: 1,
            lastCheckupBy: 'Lucía'
        });
    });
});
