import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Sembrador ARBA Elx/);
});

test('loads main sections', async ({ page }) => {
    await page.goto('/');
    // Esperar a que cargue algo significativo. Como hay auth anónimo, puede tardar.
    // Buscamos algo que esté en la pantalla inicial, ej "Sembradores de Semillas"
    // o el selector de campañas si carga.
    // Por ahora solo verificamos que no crashea en blanco.
    await expect(page.locator('#root')).toBeVisible();
});
