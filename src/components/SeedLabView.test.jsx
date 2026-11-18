import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SeedLabView from './SeedLabView';
import * as firestore from 'firebase/firestore';
import { SEED_PROTOCOLS_CATALOG } from '../utils/seedProtocolsCatalog';

vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        collection: vi.fn((_db, ...segments) => segments.join('/')),
        doc: vi.fn((_db, ...segments) => segments.join('/')),
        onSnapshot: vi.fn(),
        addDoc: vi.fn(),
        updateDoc: vi.fn(),
        serverTimestamp: () => 'MOCK_TIMESTAMP'
    };
});

describe('SeedLabView', () => {
    const mockDb = {};
    const mockAppId = 'arba-elx';

    const mockCommunityDocs = [
        {
            id: 'comm-1',
            data: () => ({
                commonName: 'Cornicabra',
                scientificName: 'Pistacia terebinthus',
                family: 'Anacardiaceae',
                dormancyType: 'physiological',
                hydrationHours: 36,
                summaryRecipe: 'Despulpado + Estratificación fría 45 días',
                scarification: 'Limpieza de pulpa oleosa con arcilla',
                stratification: '45 días a 4 °C',
                status: 'community',
                authorId: 'user-2',
                authorName: 'Lucía'
            })
        }
    ];

    const mockSeedDocs = [
        {
            id: 'seed-alg-1',
            data: () => ({
                species: 'Algarrobo',
                protocolId: 'proto-ceratonia-siliqua'
            })
        }
    ];

    const mockLogDocs = [
        { id: 'log-1', data: () => ({ seedId: 'seed-alg-1', seedName: 'Algarrobo', lastCheckupStatus: 'alive' }) },
        { id: 'log-2', data: () => ({ seedId: 'seed-alg-1', seedName: 'Algarrobo', lastCheckupStatus: 'alive' }) },
        { id: 'log-3', data: () => ({ seedId: 'seed-alg-1', seedName: 'Algarrobo', lastCheckupStatus: 'dead' }) }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        firestore.addDoc.mockResolvedValue({ id: 'new-proto-id' });
        firestore.updateDoc.mockResolvedValue();

        firestore.onSnapshot.mockImplementation((target, cb) => {
            if (typeof target === 'string' && target.endsWith('/seedProtocols')) {
                cb({ docs: mockCommunityDocs });
            } else if (typeof target === 'string' && target.endsWith('/seeds')) {
                cb({ docs: mockSeedDocs });
            } else if (typeof target === 'string' && target.endsWith('/logs')) {
                cb({ docs: mockLogDocs });
            } else {
                cb({ docs: [] });
            }
            return vi.fn();
        });
    });

    it('renders built-in catalog, filters by search and dormancy, shows empirical stats and opens workshop mode', () => {
        render(
            <SeedLabView
                db={mockDb}
                appId={mockAppId}
                user={{ uid: 'anon-1', isAnonymous: true }}
                userProfile={null}
                isSuperAdmin={false}
                onBack={vi.fn()}
                onLoginClick={vi.fn()}
            />
        );

        SEED_PROTOCOLS_CATALOG.forEach((proto) => {
            expect(screen.getByText(proto.commonName)).toBeInTheDocument();
        });

        expect(screen.getByText('67% de éxito en campo')).toBeInTheDocument();
        expect(screen.getByText('(2/3 golpes revisados)')).toBeInTheDocument();

        const searchInput = screen.getByPlaceholderText('Buscar especie, nombre científico o tratamiento...');
        fireEvent.change(searchInput, { target: { value: 'Ceratonia' } });
        expect(screen.getByText('Algarrobo')).toBeInTheDocument();
        expect(screen.queryByText('Palmito')).not.toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'Combinada' }));
        expect(screen.getByText('Palmito')).toBeInTheDocument();
        expect(screen.getByText('Acebuche')).toBeInTheDocument();
        expect(screen.queryByText('Algarrobo')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
        const workshopButtons = screen.getAllByRole('button', { name: /Ver Receta Paso a Paso/i });
        fireEvent.click(workshopButtons[0]);

        expect(screen.getByText('Modo Taller Paso a Paso')).toBeInTheDocument();
        expect(screen.getByText('1. Escarificación / Limpieza de cubierta')).toBeInTheDocument();
    });

    it('allows authenticated volunteer to contribute a community protocol', async () => {
        render(
            <SeedLabView
                db={mockDb}
                appId={mockAppId}
                user={{ uid: 'user-1', displayName: 'Elena', isAnonymous: false }}
                userProfile={{ displayName: 'Elena' }}
                isSuperAdmin={false}
                onBack={vi.fn()}
                onLoginClick={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Aportar Protocolo/i }));

        fireEvent.change(screen.getByPlaceholderText('Ej: Cornicabra'), { target: { value: 'Lentisco Silvestre' } });
        fireEvent.change(screen.getByPlaceholderText('Ej: Pistacia terebinthus'), { target: { value: 'Pistacia atlantica' } });
        fireEvent.change(screen.getByPlaceholderText('Ej: Despulpado + Escarificación suave + Remojo 24h'), {
            target: { value: 'Despulpado completo + Remojo 24h' }
        });

        fireEvent.click(screen.getByRole('button', { name: 'Publicar Protocolo' }));

        await waitFor(() => {
            expect(firestore.addDoc).toHaveBeenCalledTimes(1);
        });

        expect(firestore.addDoc).toHaveBeenCalledWith(
            'artifacts/arba-elx/public/data/seedProtocols',
            expect.objectContaining({
                commonName: 'Lentisco Silvestre',
                scientificName: 'Pistacia atlantica',
                summaryRecipe: 'Despulpado completo + Remojo 24h',
                status: 'community',
                authorId: 'user-1',
                authorName: 'Elena',
                verifiedBy: null
            })
        );
    });

    it('allows SuperAdmin to verify a community protocol', async () => {
        render(
            <SeedLabView
                db={mockDb}
                appId={mockAppId}
                user={{ uid: 'admin-1', displayName: 'Admin ARBA', isAnonymous: false }}
                userProfile={{ displayName: 'Admin ARBA' }}
                isSuperAdmin={true}
                onBack={vi.fn()}
                onLoginClick={vi.fn()}
            />
        );

        expect(screen.getByText('Cornicabra')).toBeInTheDocument();
        const verifyBtn = screen.getByRole('button', { name: /Verificar Protocolo/i });
        fireEvent.click(verifyBtn);

        await waitFor(() => {
            expect(firestore.updateDoc).toHaveBeenCalledWith(
                'artifacts/arba-elx/public/data/seedProtocols/comm-1',
                expect.objectContaining({
                    status: 'verified',
                    verifiedBy: 'Admin ARBA',
                    verifiedAt: 'MOCK_TIMESTAMP',
                    updatedAt: 'MOCK_TIMESTAMP'
                })
            );
        });
    });
});
