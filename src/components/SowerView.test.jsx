import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SowerView from './SowerView';
import * as firestore from 'firebase/firestore';

// Mock de módulos
vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        getDocs: vi.fn(),
        addDoc: vi.fn(), // Fundamental para probar el guardado
        updateDoc: vi.fn(),
        deleteDoc: vi.fn(),
        collection: vi.fn(),
        query: vi.fn(),
        onSnapshot: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
        serverTimestamp: () => 'MOCK_TIMESTAMP'
    };
});

// Mock de imageUtils
vi.mock('../utils/imageUtils', () => ({
    compressImage: vi.fn().mockResolvedValue('data:image/mock')
}));

describe('SowerView Integration', () => {
    const mockDb = {}; // Objeto dB dummy
    const mockAppId = 'test-app';
    const mockCampaignId = 'camp-1';
    const mockUserId = 'user-1';

    const mockSeeds = [
        { id: 's1', species: 'Encina', provider: 'Vivero A' },
        { id: 's2', species: 'Pino', provider: 'Vivero B' }
    ];

    const mockGroups = [
        { id: 'g1', name: 'Equipo Alpha', assignedSeeds: ['s1', 's2'] },
        { id: 'g2', name: 'Equipo Beta', assignedSeeds: ['s1'] }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Configurar comportamiento por defecto de onSnapshot (para evitar errores al montar)
        firestore.onSnapshot.mockImplementation((query, callback) => {
            callback({ forEach: () => { } }); // Snapshot vacío inicial
            return () => { }; // Unsubscribe function
        });
    });

    it('allows selecting a group and submitting a sowing log', async () => {
        // Renderizar componente
        render(
            <SowerView
                db={mockDb}
                appId={mockAppId}
                campaignId={mockCampaignId}
                seeds={mockSeeds}
                groups={mockGroups}
                userId={mockUserId}
                storage={{}}
                onResetRole={vi.fn()}
            />
        );

        // 1. Verificar pantalla de selección de equipo
        expect(screen.getByText('Selecciona tu equipo')).toBeInTheDocument();
        const groupButton = screen.getByText('Equipo Alpha');
        fireEvent.click(groupButton);

        // 2. Verificar carga del formulario (SowingForm)
        await waitFor(() => {
            expect(screen.getByText('1. ¿Qué estás sembrando?')).toBeInTheDocument();
        });

        // 3. Rellenar formulario
        // Seleccionar semilla
        fireEvent.click(screen.getByText('Encina'));

        // Cambiar cantidad de golpes
        const plusButton = screen.getByText('+');
        fireEvent.click(plusButton); // De 1 a 2 golpes

        // 4. Enviar formulario
        const submitButton = screen.getByText('Registrar Siembra');
        fireEvent.click(submitButton);

        // 5. Verificar llamada a Firebase
        await waitFor(() => {
            expect(firestore.addDoc).toHaveBeenCalled();
        });

        // Verificar argumentos de la llamada
        const addDocCall = firestore.addDoc.mock.calls[0];
        // El primer argumento es la collection ref, el segundo es data
        const savedData = addDocCall[1];

        expect(savedData).toMatchObject({
            campaignId: mockCampaignId,
            groupId: 'g1',
            groupName: 'Equipo Alpha',
            seedName: 'Encina',
            userId: mockUserId,
            holeCount: 2
        });
    });

    it('displays history logs correctly', async () => {
        // Mockear respuesta inicial de logs
        const mockLogs = [
            { id: 'log1', data: () => ({ seedName: 'Pino', microsite: 'Roca', holeCount: 3, timestamp: { seconds: 100 } }) }
        ];

        // Mock getDocs para cuando se cargue el historial
        firestore.getDocs.mockResolvedValue({
            docs: mockLogs,
            empty: false
        });

        render(
            <SowerView
                db={mockDb}
                appId={mockAppId}
                campaignId={mockCampaignId}
                seeds={mockSeeds}
                groups={mockGroups}
                userId={mockUserId}
            />
        );

        // Seleccionar equipo para entrar
        fireEvent.click(screen.getByText('Equipo Alpha'));

        // Cambiar a pestaña Historial (Cuaderno)
        // Buscamos el botón por el icono o texto. En el código actual son botones con iconos.
        // El botón de historial tiene el texto 'Cuaderno' oculto en desktop o visible. 
        // Buscamos por el rol button que contenga el texto si es visible, o por test-id si lo hubiéramos puesto.
        // En SowerView línea 654 aprox: tiene <span>Cuaderno</span>

        const historyTabBtn = screen.getByText('Cuaderno');
        fireEvent.click(historyTabBtn);

        // Verificar que se renderizan los logs mockeados
        await waitFor(() => {
            expect(screen.getByText('Pino')).toBeInTheDocument();
            expect(screen.getByText('Roca')).toBeInTheDocument();
        });
        // Comprobar que existe algún elemento con '3' (cantidad de golpes)
        expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    });
});
