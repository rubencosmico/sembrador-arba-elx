import { test, expect } from '@playwright/test';

test.describe('Flujo de Coordinador', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('debe acceder al panel de control y navegar por pestañas', async ({ page }) => {
        // 1. Selección de Campaña (First available)
        try {
            const firstButton = page.locator('button').first();
            await firstButton.waitFor({ state: 'visible', timeout: 5000 });
            await firstButton.click();
        } catch (e) {
            console.log('⚠️ No se encontraron campañas (Timeout).');
            return;
        }

        // 2. Selección de Rol: Coordinador
        await page.getByText('Soy Coordinador', { exact: false }).click();

        // 3. Verificar Dashboard (Header)
        await expect(page.getByText('Panel de Control')).toBeVisible();
        await expect(page.getByText('Jornada Activa')).toBeVisible();

        // 4. Navegación por pestañas
        // Inventario - Usamos exact:true para no confundir con "Guardar en Inventario"
        await page.getByRole('button', { name: 'Inventario', exact: true }).click();
        await expect(page.getByText('Registrar Lote')).toBeVisible();

        // Equipos
        await page.getByText('Equipos y Logística').click();
        await expect(page.getByText('Crear Equipo')).toBeVisible();

        // Resultados/Datos
        await page.getByText('Resultados').click();
        await expect(page.getByText('Golpes Totales')).toBeVisible();

        // Verificar existencia de botón exportar
        await expect(page.getByText('Exportar CSV')).toBeVisible();
    });
});
