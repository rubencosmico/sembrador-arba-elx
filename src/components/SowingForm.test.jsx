import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SowingForm from './SowingForm';

describe('SowingForm', () => {
    const mockSeeds = [
        { id: '1', species: 'Quercus ilex', provider: 'Vivero A' },
        { id: '2', species: 'Pinus halepensis', provider: 'Vivero B' }
    ];

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
});
