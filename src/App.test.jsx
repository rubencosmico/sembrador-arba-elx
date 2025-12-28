import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// 1. Mock de firebase.js local
vi.mock('./firebase', () => ({
    db: {},
    auth: {},
    storage: {},
    appId: 'test-app'
}));

// 2. Mock de funciones de Firebase SDK usadas en App.jsx
vi.mock('firebase/auth', () => ({
    signInAnonymously: vi.fn().mockResolvedValue({ user: { uid: 'test-user' } })
}));

vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        getDocs: vi.fn().mockResolvedValue({ docs: [] }), // Default empty for fetches
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn()
    };
});

// 3. Mock de Componentes hijos para evitar ruido
vi.mock('./components/LoadingScreen', () => ({ default: () => <div data-testid="loading">Loading...</div> }));
vi.mock('./components/CampaignSelector', () => ({
    default: ({ onSelectCampaign }) => (
        <button onClick={() => onSelectCampaign({ id: 'c1', name: 'Campaign 1' })}>Select C1</button>
    )
}));
vi.mock('./components/WelcomeScreen', () => ({
    default: ({ setRole }) => (
        <button onClick={() => setRole('sower')}>Select Sower</button>
    )
}));
vi.mock('./components/SowerView', () => ({ default: () => <div>Sower View Loaded</div> }));
vi.mock('./components/CoordinatorView', () => ({ default: () => <div>Coordinator View Loaded</div> }));
vi.mock('./utils/migrate-photos', () => ({ default: () => <div>Migrate</div> }));
vi.mock('./components/StorageDiagnostic', () => ({ default: () => <div>Diagnostic</div> }));

import App from './App';

describe('App Integration Refactored', () => {
    it('completes the full user flow', async () => {
        render(<App />);

        // 1. Starts loading
        expect(screen.getByTestId('loading')).toBeInTheDocument();

        // 2. After auth, shows Campaign Selector
        await waitFor(() => {
            expect(screen.getByText('Select C1')).toBeInTheDocument();
        });

        // 3. Select Campaign
        fireEvent.click(screen.getByText('Select C1'));

        // 4. Shows Role Selector (WelcomeScreen)
        await waitFor(() => {
            expect(screen.getByText('Select Sower')).toBeInTheDocument();
        });

        // 5. Select Sower
        fireEvent.click(screen.getByText('Select Sower'));

        // 6. Shows Sower View
        await waitFor(() => {
            expect(screen.getByText('Sower View Loaded')).toBeInTheDocument();
        });
    });
});
