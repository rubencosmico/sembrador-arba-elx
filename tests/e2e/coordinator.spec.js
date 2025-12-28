import { test, expect } from '@playwright/test';

test.describe('Flujo de Coordinador', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
    });

    test('debe acceder al panel de control y navegar por pestañas', async ({ page }) => {
        // 1. Crear Campaña dedicada para el test (Aislamiento)
        // Navegamos al gestor para crear una campaña nueva y asegurar estado limpio
        const manageBtn = page.getByText('Gestionar Jornadas');
        if (await manageBtn.isVisible()) {
            await manageBtn.click();
        } else {
            // Si no hay campañas, el botón puede no estar o estar en otro estado, 
            // pero CampaignSelector siempre muestra 'Gestionar Jornadas' si se pasa la prop, 
            // o muestra el botón de crear si está vacío.
            // Vamos a asumir el flujo de crear desde el selector si está vacío, o ir al manager.
            // Simplificación: Si vemos "Nueva Jornada" (botón grande), click.
        }

        // Estrategia más robusta: Crear siempre una campana via UI si es posible, 
        // o si ya hay muchas, ir a Gestionar -> Nueva.

        // Vamos a usar el botón de 'Gestionar Jornadas' que siempre debería estar si hay auth (que es anónima pero existe)
        // Si no, recargamos para asegurar.

        // Simplemente vamos a crear una nueva detectando el botón de creación del selector
        // O si no está (porque hay campañas), vamos al manager.

        const createMainBtn = page.getByRole('button', { name: 'Nueva Jornada' });
        if (await createMainBtn.isVisible()) {
            await createMainBtn.click();
        } else {
            await page.getByText('Gestionar Jornadas').click();
            await page.getByText('Nueva Jornada').click();
        }

        const campaignName = `Coord E2E ${Date.now()}`;
        await page.fill('input[placeholder*="Nombre"]', campaignName);
        await page.getByText('Crear', { exact: true }).click();

        // Esperar a que aparezca y seleccionarla (en el manager o selector se auto selecciona? 
        // CampaignSelector: onSelectCampaign se llama con la nueva. 
        // CampaignManager: Solo crea. Hay que volver.)

        // Si estamos en CampaignManager (porque pulsamos Gestionar), tras crear NO se selecciona auto, se queda en la lista.
        // Si estamos en CampaignSelector (createMainBtn), handleCreateCampaign llama a onSelect.

        if (await page.getByText('Gestión de Jornadas').isVisible()) {
            // Estábamos en el manager, volvemos atrás
            await page.locator('header button').first().click();
            // Ahora seleccionamos la campaña creada
            await page.getByText(campaignName).click();
        }

        // Si fue desde el selector principal, ya debería haberse seleccionado auto?
        // Revisando CampaignSelector.jsx: handleCreateCampaign llama a onSelectCampaign.
        // Así que si usamos el form del selector, entra directo.

        // Pero espera, mi lógica de "if createMainBtn visible" elige el camino.
        // Si hay campañas, createMainBtn ("Nueva Jornada" grande) NO está visible (está el botón chico al final).
        // El botón chico tiene el mismo texto?
        // Line 94: "Nueva Jornada" (botón chico al final).
        // Line 58: "Nueva Jornada" (botón grande si no hay nada).
        // Sí, tienen el mismo texto. Playwright getByRole('button', {name: 'Nueva Jornada'}) pillará cualquiera visible.
        // Pero si hacemos click en ese botón, `showCreate` se pone a true. MOSTRA EL FORMULARIO en el mismo componente.
        // Entonces NO vamos al Manager.
        // Perfecto.

        // Entonces el flujo es:
        // 1. Click "Nueva Jornada" (sea el grande o el chico).
        // 2. Rellenar form.
        // 3. Click "Crear".
        // -> handleCreateCampaign -> onSelectCampaign. Entra directo.

        // PERO: Si hay MUCHAS campañas, el botón chico puede estar abajo del scroll.
        // Mejor usar 'Gestionar Jornadas' -> Crear -> Volver -> Seleccionar para ser 100% consistente?
        // No, el selector es más rápido si funciona.
        // Vamos a intentar forzar el click en 'Nueva Jornada'.

        // Si el botón no es visible (scroll?), hacemos scroll.
        // O simplemente usamos gestión.

        // Esperar a que la autenticación anónima cargue y aparezca la UI principal
        await expect(page.getByText('Selecciona Jornada')).toBeVisible({ timeout: 10000 });

        // Intentar ir por el camino de "Gestionar Jornadas" que es el más estable
        // El botón puede tardar en aparecer si el user auth tarda
        const manageButton = page.getByText('Gestionar Jornadas');

        try {
            await manageButton.waitFor({ state: 'visible', timeout: 5000 });
            await manageButton.click();

            // En el manager, pulsamos Nueva Jornada
            await page.getByRole('button', { name: 'Nueva Jornada' }).click();

            const testName = `Coord E2E ${Date.now()}`;
            await page.fill('input[placeholder*="Nombre"]', testName);
            await page.getByRole('button', { name: 'Crear', exact: true }).click();

            // Volver
            await page.locator('header button').first().click();

            // Seleccionar
            await page.getByText(testName).click();

        } catch (e) {
            console.log("No Manage button or error in manager flow, trying direct create...", e);
            // Si falla, intentamos el botón "Nueva Jornada" directo del selector (si no hay campañas)
            const createBtn = page.getByRole('button', { name: 'Nueva Jornada' }).first();
            if (await createBtn.isVisible()) {
                await createBtn.click();
                const testName = `Coord E2E ${Date.now()}`;
                await page.fill('input[placeholder*="Nombre"]', testName);
                await page.getByRole('button', { name: 'Crear', exact: true }).click();
            } else {
                throw new Error("No se pudo crear una campaña para el test");
            }
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
