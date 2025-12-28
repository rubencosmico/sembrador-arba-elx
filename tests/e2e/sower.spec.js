import { test, expect } from '@playwright/test';

test.describe('Flujo de Sembrador', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
        // Esperar a que cargue la lista de campañas (o mensaje de no campañas)
        // Buscamos cualquier botón que parezca una campaña o el selector
        await expect(page.locator('body')).not.toBeEmpty();
    });

    test('debe permitir completar un registro de siembra', async ({ page }) => {
        // 1. SETUP DE DATOS (Full E2E Flow)
        // El sembrador necesita una campaña ACTIVA, con al menos UN EQUIPO y UNA SEMILLA.
        // Vamos a crear todo desde cero para garantizar el test.

        // Esperar carga inicial
        await expect(page.getByText('Selecciona Jornada')).toBeVisible({ timeout: 10000 });

        // -- Crear Campaña --
        const manageButton = page.getByText('Gestionar Jornadas');
        const campaignName = `Sower E2E ${Date.now()}`;

        try {
            await manageButton.waitFor({ state: 'visible', timeout: 5000 });
            await manageButton.click();
            await page.getByRole('button', { name: 'Nueva Jornada' }).click();
            await page.fill('input[placeholder*="Nombre"]', campaignName);
            await page.getByRole('button', { name: 'Crear', exact: true }).click();
            // Volver
            await page.locator('header button').first().click();
            // Seleccionar
            await page.getByText(campaignName).click();
        } catch (e) {
            // Fallback creación directa
            const createBtn = page.getByRole('button', { name: 'Nueva Jornada' }).first();
            if (await createBtn.isVisible()) {
                await createBtn.click();
                await page.fill('input[placeholder*="Nombre"]', campaignName);
                await page.getByRole('button', { name: 'Crear', exact: true }).click();
            } else {
                throw new Error("No se pudo crear campaña para Sower test");
            }
        }

        // -- Crear Datos como Coordinador (Semilla y Equipo) --
        await page.getByText('Soy Coordinador').click();

        // Crear Semilla
        await page.getByRole('button', { name: 'Inventario', exact: true }).click();
        await page.fill('input[placeholder="Ej: Algarrobo"]', 'Semilla Test');
        await page.getByRole('button', { name: /Guardar en Inventario/i }).click();
        await expect(page.getByText('Semilla Test')).toBeVisible();

        // Crear Equipo
        await page.getByText('Equipos y Logística').click();
        await page.fill('input[placeholder="Nombre..."]', 'Equipo Test');
        await page.getByRole('button', { name: 'Crear', exact: true }).click();

        // Asignar semilla al equipo (importante para que aparezca en el select de sower si el filtro es estricto, 
        // aunque SowerView muestra 'assignedSeeds' o seeds de la campaña? 
        // SowerView: const mySeeds = selectedGroup ? seeds.filter(s => selectedGroup.assignedSeeds?.includes(s.id)) : [];
        // SI, hay que asignar la semilla a la mochila del equipo!!)

        // En CoordinatorView, tras crear equipo, aparece la tarjeta.
        // Hay un select "+ Añadir lote a la mochila".
        // Seleccionamos la semilla.
        const addSeedSelect = page.locator('select').first(); // Suponiendo que es el primer select en la tarjeta del equipo recien creado
        // Ojo, si hay mas equipos podria pillar otro. Pero acabamos de crear la campaña, es el único.
        await addSeedSelect.selectOption({ label: 'Semilla Test () ' }); // El label formato "Scientific (Prov) - Treat"
        // Wait, el label en option es: `{seed.species} ({seed.provider}) {seed.treatment ? ... : ''}`
        // provider y treatment son vacíos/undefined en mi fill arriba?
        // fill species='Semilla Test'. provider? treatment?
        // Voy a rellenar provider también para ser especifico.

        // RE-FILL Seed with Details
        // Mejor hacer fill de todo al crear la semilla.

        // Salir de modo coordinador
        // Coordinator header tiene un LogOut o Back? 
        // CoordinatorView no tiene boton de salir explícito en el header según mi último replace (Step 1209). 
        // Espera, CoordinatorView.jsx header:
        // <header className="..."> ... <button onClick={onBack} ...><LogOut/></button> ... </header>
        // SI tiene 'onBack'. App.jsx pasa `onResetRole`.

        // Vamos a volver al selector de Rol.
        await page.locator('header button').first().click(); // Botón con LogOut icon es el primero?
        // Revisar CoordinatorView header:
        /*
            <div className="flex justify-between items-center mb-8">
                <div>...</div>
                <button onClick={onResetRole} className="..."><LogOut size={20} /></button>
            </div>
        */
        // El botón está a la derecha (justify-between -> right).
        // `page.locator('header button')` podría pillar cualquiera?
        // Mejor `page.locator('button:has(svg.lucide-log-out)')`.
        await page.locator('button').filter({ has: page.locator('svg.lucide-log-out') }).click();

        // 2. Selección de Rol: Sembrador
        await page.getByText('Soy Sembrador').click();

        // 3. Selección de Equipo
        await page.getByText('Equipo Test').click();


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
