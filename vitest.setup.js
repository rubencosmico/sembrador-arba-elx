import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Ejecuta cleanup después de cada test caso (automático en vitest si se habilita globals, pero explícito no daña)
afterEach(() => {
    cleanup();
});
