import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SowingForm from './SowingForm';
import {
    DEFAULT_MAP_LAYER,
    MAP_LAYERS,
    formatGpsAccuracy,
    nudgeCoordinates
} from '../utils/mapLayers';

describe('mapLayers utilities', () => {
    it('uses PNOA satellite as default layer with zoom headroom to 22', () => {
        expect(DEFAULT_MAP_LAYER).toBe('pnoa');
        expect(MAP_LAYERS.pnoa.maxNativeZoom).toBe(19);
        expect(MAP_LAYERS.pnoa.maxZoom).toBe(22);
        expect(MAP_LAYERS.esri.maxZoom).toBe(22);
        expect(MAP_LAYERS.osm.maxZoom).toBe(22);
    });

    it('formats sub-meter accuracy in centimeters and meter-level in meters', () => {
        expect(formatGpsAccuracy(0.35)).toBe('35 cm');
        expect(formatGpsAccuracy(4.24)).toBe('4.2 m');
        expect(formatGpsAccuracy(12.4)).toBe('12 m');
        expect(formatGpsAccuracy(null)).toBe('--');
    });

    it('nudges coordinates by ~25 cm in cardinal directions', () => {
        const startLat = 38.2661;
        const startLng = -0.6865;

        const north = nudgeCoordinates(startLat, startLng, 'N', 0.25);
        expect(north.lat).toBeGreaterThan(startLat);
        expect(north.lng).toBe(startLng);
        expect(north.lat - startLat).toBeCloseTo(0.0000023, 6);

        const east = nudgeCoordinates(startLat, startLng, 'E', 0.25);
        expect(east.lat).toBe(startLat);
        expect(east.lng).toBeGreaterThan(startLng);
    });
});

describe('SowingForm', () => {
    const mockSeeds = [
        { id: '1', species: 'Quercus ilex', provider: 'Vivero A' },
        { id: '2', species: 'Pinus halepensis', provider: 'Vivero B' }
    ];

    const originalGeolocation = global.navigator.geolocation;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        Object.defineProperty(global.navigator, 'geolocation', {
            configurable: true,
            value: originalGeolocation
        });
    });

    it('renders correctly with given seeds', () => {
        render(
            <SowingForm
                initialData={null}
                seeds={mockSeeds}
                onSave={vi.fn()}
                onCancel={vi.fn()}
                isSaving={false}
            />
        );

        expect(screen.getByText('1. ¿Qué estás sembrando?')).toBeInTheDocument();
        expect(screen.getByText('Quercus ilex')).toBeInTheDocument();
        expect(screen.getByText('Pinus halepensis')).toBeInTheDocument();
    });

    it('captures GPS via watchPosition, allows 25cm nudge & layer switching, and saves only lat/lng/acc', async () => {
        let watchCallback = null;
        const watchPositionMock = vi.fn((successCb) => {
            watchCallback = successCb;
            successCb({
                coords: { latitude: 38.2661, longitude: -0.6865, accuracy: 8.4 }
            });
            return 42;
        });
        const clearWatchMock = vi.fn();

        Object.defineProperty(global.navigator, 'geolocation', {
            configurable: true,
            value: {
                watchPosition: watchPositionMock,
                clearWatch: clearWatchMock,
                getCurrentPosition: vi.fn()
            }
        });

        const onSaveMock = vi.fn().mockResolvedValue(undefined);

        render(
            <SowingForm
                initialData={null}
                seeds={mockSeeds}
                existingLogs={[
                    {
                        id: 'other-1',
                        seedName: 'Olea europaea',
                        holeCount: 2,
                        location: { lat: 38.26615, lng: -0.68645, acc: 5 }
                    }
                ]}
                onSave={onSaveMock}
                onCancel={vi.fn()}
                isSaving={false}
            />
        );

        // Activate GPS stabilization
        fireEvent.click(screen.getByText('Activar GPS'));

        expect(watchPositionMock).toHaveBeenCalledTimes(1);
        expect(await screen.findByText('GPS OK (8.4 m)')).toBeInTheDocument();

        // Precision satellite map opens automatically with IGN Satellite active by default
        const ignButton = screen.getByRole('button', { name: 'Satélite (IGN)' });
        const osmButton = screen.getByRole('button', { name: 'Callejero' });
        expect(ignButton).toHaveAttribute('aria-pressed', 'true');
        expect(osmButton).toHaveAttribute('aria-pressed', 'false');

        // Layer switcher changes layer cleanly
        fireEvent.click(osmButton);
        expect(osmButton).toHaveAttribute('aria-pressed', 'true');
        expect(ignButton).toHaveAttribute('aria-pressed', 'false');

        // Subsequent improved sub-meter RTK reading updates location & displays cm
        act(() => {
            watchCallback({
                coords: { latitude: 38.2662, longitude: -0.6866, accuracy: 0.45 }
            });
        });
        expect(await screen.findByText('GPS OK (45 cm)')).toBeInTheDocument();

        // User nudges the point 25 cm North
        fireEvent.click(screen.getByRole('button', { name: 'Mover 25 cm al Norte' }));
        expect(screen.getByText('Ajuste manual')).toBeInTheDocument();

        // Another GPS tick arrives, should NOT overwrite user's manually adjusted pin
        act(() => {
            watchCallback({
                coords: { latitude: 38.267, longitude: -0.687, accuracy: 5 }
            });
        });

        // Recentrar en GPS restores the latest raw GPS fix and clears manual flag
        fireEvent.click(screen.getByRole('button', { name: /Recentrar en GPS/i }));
        expect(screen.queryByText('Ajuste manual')).not.toBeInTheDocument();

        // Nudge again 25 cm North from latest GPS fix (38.267, -0.687) before saving
        fireEvent.click(screen.getByRole('button', { name: 'Mover 25 cm al Norte' }));
        expect(screen.getByText('Ajuste manual')).toBeInTheDocument();

        // Select seed and submit
        fireEvent.click(screen.getByText('Quercus ilex'));
        fireEvent.click(screen.getByText('Registrar Siembra'));

        await waitFor(() => {
            expect(onSaveMock).toHaveBeenCalledTimes(1);
        });

        const savedPayload = onSaveMock.mock.calls[0][0];
        const expectedNorth = nudgeCoordinates(38.267, -0.687, 'N', 0.25);

        expect(Object.keys(savedPayload.location).sort()).toEqual(['acc', 'lat', 'lng']);
        expect(savedPayload.location.lat).toBeCloseTo(expectedNorth.lat, 6);
        expect(savedPayload.location.lng).toBeCloseTo(expectedNorth.lng, 6);
        expect(savedPayload.location.acc).toBe(5);
        expect(clearWatchMock).toHaveBeenCalledWith(42);
    });
});
