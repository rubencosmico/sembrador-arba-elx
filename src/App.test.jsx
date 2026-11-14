import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFirebase = vi.hoisted(() => ({
    authCallbacks: [],
    currentUser: null,
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    signInAnonymously: vi.fn(),
    sendEmailVerification: vi.fn(),
    signOut: vi.fn()
}));

vi.mock('./firebase', () => ({
    db: {},
    auth: {
        get currentUser() {
            return mockFirebase.currentUser;
        }
    },
    storage: {},
    messaging: null,
    appId: 'test-app',
    onAuthStateChanged: vi.fn((_auth, cb) => {
        mockFirebase.authCallbacks.push(cb);
        return vi.fn();
    }),
    signOut: (...args) => mockFirebase.signOut(...args),
    signInAnonymously: (...args) => mockFirebase.signInAnonymously(...args),
    isSignInWithEmailLink: vi.fn().mockReturnValue(false),
    signInWithEmailLink: vi.fn(),
    sendEmailVerification: (...args) => mockFirebase.sendEmailVerification(...args)
}));

vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        doc: vi.fn((_db, ...segments) => segments.join('/')),
        getDoc: (...args) => mockFirebase.getDoc(...args),
        setDoc: (...args) => mockFirebase.setDoc(...args),
        updateDoc: (...args) => mockFirebase.updateDoc(...args),
        deleteDoc: (...args) => mockFirebase.deleteDoc(...args),
        arrayUnion: vi.fn((val) => ({ arrayUnion: val })),
        collection: vi.fn((_db, ...segments) => segments.join('/')),
        query: vi.fn((target) => target),
        where: vi.fn(),
        onSnapshot: vi.fn((_q, cb) => {
            cb({ docs: [] });
            return vi.fn();
        })
    };
});

vi.mock('./hooks/useOfflineQueue', () => ({
    useOfflineQueue: () => ({
        isOnline: true,
        pendingCount: 0,
        saveToQueue: vi.fn()
    })
}));

vi.mock('./components/LoadingScreen', () => ({ default: () => <div data-testid="loading">Loading...</div> }));
vi.mock('./components/LoginScreen', () => ({
    default: ({ onLoginSuccess, onBack }) => (
        <div>
            <button onClick={() => onLoginSuccess({ uid: 'u-login', email: 'login@test.com', emailVerified: true, providerData: [] })}>
                Complete Login
            </button>
            {onBack && <button onClick={onBack}>Back from Login</button>}
        </div>
    )
}));
vi.mock('./components/LandingPage', () => ({
    default: ({ user, onSelectCampaign, onLoginClick }) => (
        <div>
            <span data-testid="landing-user">{user?.isAnonymous ? 'guest' : user?.email}</span>
            <button onClick={() => onSelectCampaign({ id: 'c1', name: 'Campaign 1', status: 'active', participants: [] })}>
                Select C1
            </button>
            <button onClick={onLoginClick}>Open Login</button>
        </div>
    )
}));
vi.mock('./components/CampaignDashboard', () => ({
    default: ({ campaign, onSelectRole }) => (
        <div>
            <span data-testid="dashboard-campaign">{campaign.name}</span>
            <button onClick={() => onSelectRole('sower', 'form')}>Select Sower</button>
        </div>
    )
}));
vi.mock('./components/SowerView', () => ({ default: () => <div>Sower View Loaded</div> }));
vi.mock('./components/CampaignManager', () => ({ default: () => <div>Campaign Manager Loaded</div> }));
vi.mock('./components/ClaimRecordsView', () => ({ default: () => <div>Claim View Loaded</div> }));
vi.mock('./components/SuperAdminDashboard', () => ({ default: () => <div>Admin View Loaded</div> }));
vi.mock('./components/MessagesView', () => ({ default: () => <div>Messages View Loaded</div> }));
vi.mock('./components/ChatWindow', () => ({ default: () => <div>Chat Window Loaded</div> }));
vi.mock('./components/SocialView', () => ({ default: () => <div>Social View Loaded</div> }));
vi.mock('./components/ProfileView', () => ({ default: () => <div>Profile View Loaded</div> }));
vi.mock('./utils/migrate-photos', () => ({ default: () => <div>Migrate</div> }));
vi.mock('./components/StorageDiagnostic', () => ({ default: () => <div>Diagnostic</div> }));

import App from './App';

describe('App Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFirebase.authCallbacks = [];
        mockFirebase.currentUser = null;
        window.sessionStorage.clear();
        window.history.replaceState({}, '', '/');

        mockFirebase.getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
        mockFirebase.setDoc.mockResolvedValue();
        mockFirebase.updateDoc.mockResolvedValue();
        mockFirebase.signInAnonymously.mockResolvedValue({ user: { uid: 'anon-1', isAnonymous: true } });
        mockFirebase.sendEmailVerification.mockResolvedValue();
        mockFirebase.signOut.mockResolvedValue();
    });

    it('uses anonymous fallback without writing a user profile and prompts login before entering SowerView', async () => {
        render(<App />);

        expect(screen.getByTestId('loading')).toBeInTheDocument();
        expect(mockFirebase.authCallbacks.length).toBe(1);

        const emitAuth = mockFirebase.authCallbacks[0];
        await act(async () => {
            await emitAuth(null);
        });
        expect(mockFirebase.signInAnonymously).toHaveBeenCalled();

        await act(async () => {
            await emitAuth({ uid: 'anon-1', isAnonymous: true });
        });

        await waitFor(() => {
            expect(screen.getByTestId('landing-user')).toHaveTextContent('guest');
        });
        expect(mockFirebase.setDoc).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('Select C1'));
        await waitFor(() => {
            expect(screen.getByTestId('dashboard-campaign')).toHaveTextContent('Campaign 1');
        });

        fireEvent.click(screen.getByText('Select Sower'));
        await waitFor(() => {
            expect(screen.getByText('Complete Login')).toBeInTheDocument();
        });
        expect(screen.queryByText('Sower View Loaded')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('Back from Login'));
        await waitFor(() => {
            expect(screen.getByTestId('dashboard-campaign')).toHaveTextContent('Campaign 1');
        });
    });

    it('creates profile for verified user and auto-joins ?join= campaign links', async () => {
        window.history.replaceState({}, '', '/?join=camp-invite');

        mockFirebase.getDoc.mockImplementation(async (docPath) => {
            if (typeof docPath === 'string' && docPath.endsWith('/campaigns/camp-invite')) {
                return {
                    exists: () => true,
                    data: () => ({ name: 'Jornada Invitada', status: 'active', participants: [] })
                };
            }
            return { exists: () => false, data: () => ({}) };
        });

        render(<App />);
        const emitAuth = mockFirebase.authCallbacks[0];

        await act(async () => {
            await emitAuth({
                uid: 'user-1',
                email: 'ana@arba.org',
                displayName: 'Ana',
                emailVerified: true,
                isAnonymous: false,
                providerData: [{ providerId: 'password' }]
            });
        });

        await waitFor(() => {
            expect(screen.getByTestId('dashboard-campaign')).toHaveTextContent('Jornada Invitada');
        });
        expect(mockFirebase.setDoc).toHaveBeenCalled();
        expect(mockFirebase.updateDoc).toHaveBeenCalled();
        expect(window.sessionStorage.getItem('pendingJoinCampaignId')).toBeNull();
    });

    it('renders verification gate for unverified password users and resends email without crashing', async () => {
        const unverifiedUser = {
            uid: 'user-unverified',
            email: 'nuevo@arba.org',
            emailVerified: false,
            isAnonymous: false,
            providerData: [{ providerId: 'password' }]
        };
        mockFirebase.currentUser = unverifiedUser;

        render(<App />);
        const emitAuth = mockFirebase.authCallbacks[0];
        await act(async () => {
            await emitAuth(unverifiedUser);
        });

        await waitFor(() => {
            expect(screen.getByText('Verifica tu email')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Reenviar email de verificación'));

        await waitFor(() => {
            expect(mockFirebase.sendEmailVerification).toHaveBeenCalledWith(unverifiedUser);
            expect(screen.getByText('Email de verificación reenviado.')).toBeInTheDocument();
        });
    });
});
