import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CampaignManager from './CampaignManager';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        collection: vi.fn((_db, ...segments) => segments.join('/')),
        doc: vi.fn((_db, ...segments) => segments.join('/')),
        query: vi.fn((target) => target),
        where: vi.fn((field, op, val) => ({ field, op, val })),
        or: vi.fn((...clauses) => ({ or: clauses })),
        orderBy: vi.fn(),
        onSnapshot: vi.fn(),
        getDocs: vi.fn(),
        addDoc: vi.fn(),
        updateDoc: vi.fn(),
        deleteDoc: vi.fn(),
        writeBatch: vi.fn(),
        serverTimestamp: () => 'MOCK_TIMESTAMP',
        arrayUnion: vi.fn((v) => v),
        arrayRemove: vi.fn((v) => v)
    };
});

vi.mock('../utils/imageUtils', () => ({
    compressImage: vi.fn().mockResolvedValue('data:image/mock')
}));

vi.mock('./MapView', () => ({
    default: ({ logs }) => <div data-testid="map-view">Map logs: {logs.length}</div>
}));

describe('CampaignManager', () => {
    const mockDb = {};
    const mockAppId = 'test-app';
    const mockUser = { uid: 'owner-1', displayName: 'Elena' };

    const mockCampaignDoc = {
        id: 'camp-1',
        data: () => ({
            name: 'Jornada Serra del Molar',
            description: 'Reforestación anual',
            status: 'active',
            visibility: 'public',
            ownerId: 'owner-1',
            coordinators: [],
            participants: ['owner-1', 'u2']
        })
    };

    const mockSeedDocs = [
        {
            id: 's1',
            data: () => ({
                species: 'Carrasca',
                provider: 'Vivero Forestal',
                treatment: 'Hidratación',
                totalQuantity: 50,
                userAssignments: [{ userId: 'owner-1', quantity: 20 }]
            })
        },
        {
            id: 's2-legacy',
            data: () => ({
                species: 'Coscoja',
                provider: 'Vivero Legacy',
                quantity: 35,
                userAssignments: []
            })
        }
    ];

    const mockLogDocs = [
        {
            id: 'l1',
            data: () => ({
                seedId: 's1',
                seedName: 'Carrasca',
                userId: 'owner-1',
                groupName: 'Elena',
                holeCount: 5,
                microsite: 'Bajo arbusto',
                notes: 'Zona húmeda',
                withSubstrate: true,
                withProtector: false,
                timestamp: { seconds: 1000 },
                location: { lat: 38.2669, lng: -0.6983, acc: 12 }
            })
        },
        {
            id: 'l2',
            data: () => ({
                seedId: 's2-legacy',
                seedName: 'Coscoja',
                ownerId: 'u2',
                userName: 'Marcos',
                groupName: 'Marcos',
                holeCount: 12,
                microsite: 'Roca',
                notes: 'Ladera solana',
                withSubstrate: false,
                withProtector: true,
                timestamp: { seconds: 2000 }
            })
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        firestore.onSnapshot.mockImplementation((target, cb) => {
            if (typeof target === 'string' && target.endsWith('/campaigns')) {
                cb({ docs: [mockCampaignDoc] });
            } else if (typeof target === 'string' && target.endsWith('/seeds')) {
                cb({ docs: mockSeedDocs });
            } else if (typeof target === 'string' && target.endsWith('/logs')) {
                cb({ docs: mockLogDocs });
            } else {
                cb({ docs: [] });
            }
            return vi.fn();
        });

        firestore.getDocs.mockImplementation(async (target) => {
            if (typeof target === 'string' && target.endsWith('users')) {
                return { empty: false, docs: [{ data: () => ({ displayName: 'Elena' }) }] };
            }
            return { empty: true, docs: [] };
        });

        firestore.updateDoc.mockResolvedValue();
    });

    it('renders seed lots including legacy quantity and enforces assignment bounds', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(
            <CampaignManager
                db={mockDb}
                appId={mockAppId}
                user={mockUser}
                isSuperAdmin={false}
                initialCampaignId="camp-1"
                onBack={vi.fn()}
                onNavigate={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Jornada Serra del Molar' })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Lotes'));

        await waitFor(() => {
            expect(screen.getByText('Carrasca')).toBeInTheDocument();
            expect(screen.getByText('Coscoja')).toBeInTheDocument();
        });

        expect(screen.getByText('50 TOTAL')).toBeInTheDocument();
        expect(screen.getByText('30 RESTANTES')).toBeInTheDocument();
        expect(screen.getByText('35 TOTAL')).toBeInTheDocument();
        expect(screen.getByText('35 RESTANTES')).toBeInTheDocument();

        const inputs = screen.getAllByPlaceholderText('0');
        const legacySeedInput = inputs[inputs.length - 1];
        fireEvent.change(legacySeedInput, { target: { value: '40' } });
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Solo quedan 35 disponibles'));

        fireEvent.change(legacySeedInput, { target: { value: '15' } });
        await waitFor(() => {
            expect(firestore.updateDoc).toHaveBeenCalled();
        });

        alertSpy.mockRestore();
    });

    it('filters logs, sorts columns via handleSort, and expands GPS location with MapPin', async () => {
        render(
            <CampaignManager
                db={mockDb}
                appId={mockAppId}
                user={mockUser}
                isSuperAdmin={true}
                initialCampaignId="camp-1"
                onBack={vi.fn()}
                onNavigate={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Jornada Serra del Molar' })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Datos'));

        await waitFor(() => {
            expect(screen.getByText('Carrasca')).toBeInTheDocument();
            expect(screen.getByText('Coscoja')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Especie'));
        fireEvent.click(screen.getByText('Golpes'));

        const searchInput = screen.getByPlaceholderText('Buscar en registros (sembrador, especie, notas)...');
        fireEvent.change(searchInput, { target: { value: 'Carrasca' } });

        expect(screen.getByText('Carrasca')).toBeInTheDocument();
        expect(screen.queryByText('Coscoja')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('Carrasca'));

        await waitFor(() => {
            expect(screen.getByText('38.266900, -0.698300')).toBeInTheDocument();
        });
    });

    it('links an Open Seed Lab protocol and saves genetic provenance on new seed lot', async () => {
        firestore.addDoc.mockResolvedValue({ id: 'new-seed-1' });

        render(
            <CampaignManager
                db={mockDb}
                appId={mockAppId}
                user={mockUser}
                isSuperAdmin={false}
                initialCampaignId="camp-1"
                onBack={vi.fn()}
                onNavigate={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Jornada Serra del Molar' })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Lotes'));

        const protocolSelect = await screen.findByLabelText('Protocolo Open Seed Lab');
        fireEvent.change(protocolSelect, { target: { value: 'proto-ceratonia-siliqua' } });

        const speciesInput = screen.getByPlaceholderText('Ej: Encina, Algarrobo...');
        const treatmentInput = screen.getByPlaceholderText('Ej: Lijada, Hidropriming...');
        expect(speciesInput.value).toBe('Algarrobo');
        expect(treatmentInput.value).toBe('Escarificación mecánica/térmica + Hidratación 24h');

        fireEvent.change(screen.getByPlaceholderText('Procedencia genética (ej: Serra del Molar)'), {
            target: { value: 'Serra del Molar' }
        });
        fireEvent.change(screen.getByPlaceholderText('Año cosecha (ej: 2026)'), {
            target: { value: '2026' }
        });

        const totalQtyInputs = screen.getAllByPlaceholderText('0');
        fireEvent.change(totalQtyInputs[0], { target: { value: '100' } });

        fireEvent.click(screen.getByRole('button', { name: /Guardar Semillas/i }));

        await waitFor(() => {
            expect(firestore.addDoc).toHaveBeenCalledWith(
                'artifacts/test-app/public/data/seeds',
                expect.objectContaining({
                    campaignId: 'camp-1',
                    species: 'Algarrobo',
                    treatment: 'Escarificación mecánica/térmica + Hidratación 24h',
                    protocolId: 'proto-ceratonia-siliqua',
                    originLocation: 'Serra del Molar',
                    harvestYear: '2026',
                    totalQuantity: 100
                })
            );
        });
    });
});
