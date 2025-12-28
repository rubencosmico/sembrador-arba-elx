# Testing en Sembrador ARBA Elx

Este proyecto ha sido configurado para soportar Tests Unitarios, de Integración y E2E (End-to-End).

## Stack Tecnológico
- **Unit & Integration:** Vitest + React Testing Library + Jest DOM.
- **E2E / User Tests:** Playwright.

## Scripts Disponibles

| Script | Descripción |
| field | description |
|---|---|
| `npm run test` | Ejecuta los tests unitarios en modo watch (interactivo). |
| `npm run test:run` | Ejecuta los tests unitarios una sola vez (CI). |
| `npm run test:e2e` | Ejecuta los tests E2E con Playwright (headless). |
| `npm run test:e2e:ui` | Ejecuta los tests E2E mostrando la interfaz gráfica de Playwright. |
| `npm run test:coverage` | Genera reporte de cobertura de código. |

## Estructura de Tests
- Los tests unitarios deben estar junto al componente que testean, ej: `src/components/SowingForm.test.jsx`.
- Los tests E2E deben estar en la carpeta `tests/e2e`.

## Cómo escribir tests unitarios (TDD)
1. Crear archivo `.test.jsx` junto al componente.
2. Importar `render`, `screen` de `@testing-library/react`.
3. Usar mocks para dependencias externas si es necesario.

Ejemplo:
```javascript
import { render, screen } from '@testing-library/react';
import MiComponente from './MiComponente';

test('renderiza correctamente', () => {
  render(<MiComponente />);
  expect(screen.getByText('Hola')).toBeInTheDocument();
});
```

## E2E Tests
Los tests de Playwright arrancan el servidor de desarrollo automáticamente (`npm run dev`) y ejecutan las pruebas sobre él en `http://localhost:5173`.
