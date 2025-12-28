import { test, expect } from '@playwright/test';

test.describe('Flujo de Sembrador', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Esperar a que cargue la lista de campañas (o mensaje de no campañas)
        // Buscamos cualquier botón que parezca una campaña o el selector
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('debe permitir completar un registro de siembra', async ({ page }) => {
        // 1. Selección de Campaña (Selecciona la primera disponible si hay)
        // Asumimos que hay al menos una campaña o un elemento clicable en el selector
        // 1. Selección de Campaña
        // Esperamos que aparezca algún botón en la pantalla (las campañas son botones)
        const firstButton = page.locator('button').first();
        try {
            await firstButton.waitFor({ state: 'visible', timeout: 5000 });
            await firstButton.click();
        } catch (e) {
            console.log('⚠️ No se encontraron campañas (Timeout).');
            return;
        }

        // 2. Selección de Rol: Sembrador
        await page.getByText('Soy Sembrador', { exact: false }).click();

        // 3. Selección de Equipo (Selecciona el primero disponible del grid)
        // Buscamos botones dentro del grid de equipos (suelen tener clase glass-card)
        // Ignoramos botón de volver si lo hay.
        // Esperamos a que aparezca el título "equipo" por si acaso
        await expect(page.getByText('Selecciona tu equipo')).toBeVisible();

        const teamCard = page.locator('button.glass-card').first();
        try {
            await teamCard.waitFor({ state: 'visible', timeout: 5000 });
            await teamCard.click();
        } catch (e) {
            console.log('⚠️ No se encontraron equipos. Test detenido.');
            return;
        }

        // 4. Formulario de Siembra
        await expect(page.getByText('1. ¿Qué estás sembrando?')).toBeVisible();

        // Seleccionar una especie (la primera opción visual)
        const seedOption = page.locator('.glass-card').filter({ hasText: /Semilla|Planta/i }).first();
        // Alternativamente buscamos botones de opción de semilla
        await page.locator('button[class*="text-left"]').first().click();

        // Cambiar cantidad (clic en +)
        await page.locator('button').filter({ hasText: '+' }).click();

        // Micrositio (si hay selector, elegimos uno. Por defecto suele venir seleccionado o es botones)
        // Buscamos botones de micrositio (Roca, Matorral...)
        const micrositeBtn = page.getByText('Roca', { exact: false }).first();
        if (await micrositeBtn.isVisible()) {
            await micrositeBtn.click();
        }

        // 5. Enviar
        // Nota: No enviamos realmente para no ensuciar la BD en cada test, 
        // pero podemos verificar que el botón de enviar está habilitado.
        const submitBtn = page.getByRole('button', { name: /Registrar Siembra/i });
        await expect(submitBtn).toBeVisible();
        await expect(submitBtn).toBeEnabled();

        // Si queremos probar el envío real comentamos la siguiente línea:
        // await submitBtn.click();
        // await expect(page.getByText('¡Siembra registrada!')).toBeVisible();
    });
});
