
import { test, expect } from '@playwright/test';

test.describe('Read Only Campaign Enforcement', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for login
        await page.waitForTimeout(2000);
    });

    test('should disable modifications when campaign is inactive', async ({ page }) => {

        // 1. Check if we are at CampaignSelector
        const campaignSelector = page.getByText('Selecciona Jornada');
        await expect(campaignSelector).toBeVisible({ timeout: 10000 });

        if (await campaignSelector.isVisible()) {

            // Go to Manager
            const manageBtn = page.getByText('Gestionar Jornadas');
            await expect(manageBtn).toBeVisible();
            await manageBtn.click();

            // Create a dedicated test campaign to avoid messing with others
            const newCampaignBtn = page.getByText('Nueva Jornada');
            if (await newCampaignBtn.isVisible()) { // If not already in creation mode
                await newCampaignBtn.click();
            }

            const nameInput = page.getByPlaceholder('Nombre de la jornada...');
            const testName = `ReadOnly Test ${Date.now()}`;
            await nameInput.fill(testName);
            await page.getByText('Crear', { exact: true }).click();

            // Wait for it to appear
            await expect(page.getByText(testName)).toBeVisible();

            // It's active by default. Let's make it INACTIVE.
            // Find the campaign row.
            const row = page.locator('.glass-card').filter({ hasText: testName });

            // Click "Desactivar"
            await row.getByRole('button', { name: 'Desactivar' }).click();

            // Verify it says "Activar" now
            await expect(row.getByRole('button', { name: 'Activar' })).toBeVisible();

            // Go back
            await page.locator('header button').first().click(); // ArrowLeft is first button in header

            // 2. Select the Inactive Campaign
            await page.getByText(testName).click();

            // 3. Enter as Coordinator
            await page.getByText('Soy Coordinador').click();

            // 4. Verify "Registrar Lote" is NOT visible
            // The text "Registrar Lote" is in the header of the section that should be hidden
            // Wait a bit for potential animations
            await page.waitForTimeout(1000);
            await expect(page.getByText('Registrar Lote')).toBeHidden();

            // Verify "Crear Equipo" is NOT visible (switch tab)
            await page.getByText('Equipos').click();
            await expect(page.getByText('Crear Equipo')).toBeHidden();

            // 5. Check Sower View
            // Reload to reset role or finding a logout button might be harder in current UI depending on implementation
            // The CoordinatorView has a "Cerrar" icon top right? No, checking logic.
            // CoordinatorView header usually has a back/logout.
            // Let's just reload page to get back to Role selection (since campaign is remembered? No, campaign selection is usually remembered but role?)
            // App.jsx structure:
            // If campaign selected -> Role Selector or View.
            // If role selected -> View.
            // We need to reset role. In CoordinatorView, there is usually a button to exit/reset.
            // Let's reload page.
            await page.reload();

            // We might still be in Coordinator view because usually state is not persisted in URL/localStorage in this simple app?
            // Actually App.jsx uses `useState` for role, so reload resets role.
            // But verify if campaign is persisted? App.jsx `useState(null)` for campaign.
            // So reload resets everything.
            // We need to re-select the campaign.

            await page.getByText(testName).click();

            // Enter as Sower
            await page.getByText('Soy Sembrador').click();

            // We need to select a team first usually?
            // SowerView has team selection first.
            // If there are no teams, it says "Sin equipos".
            // Since we just created the campaign, there are no teams.
            // But "isReadOnly" logic for SowerView hides the "Siembra" button in the bottom nav.
            // The team selection screen itself might be visible, but we can't do much.
            // Wait, if no teams, we can't get to the main view?
            // "Identifícate" screen -> Select Team.
            // If no teams, we are stuck in "Identifícate".

            // We should create a team while we are in Coordinator mode, OR just assume "Sin equipos" is fine.
            // But we want to test that if we ARE in the view, buttons are hidden.
            // If we are stuck in team selection, we can't see the bottom nav.

            // Let's go back to Coordinator and create a team! 
            // BUT wait, campaign is inactive, so we CANNOT create a team!
            // This proves the point perfectly. If we can't create a team, the protection works.

            // So:
            // 1. Set Active.
            // 2. Create Team.
            // 3. Set Inactive.
            // 4. Verify ReadOnly in Sower View.

            // RESTART strategy:

            // Go back to Manager
            await page.reload();
            await manageBtn.click();

            // Find row again
            const rowAgain = page.locator('.glass-card').filter({ hasText: testName });
            // Activate it
            await rowAgain.getByRole('button', { name: 'Activar' }).click();

            // Go Back
            await page.locator('header button').first().click();

            // Select Campaign
            await page.getByText(testName).click();

            // Coordinator -> Create Team
            await page.getByText('Soy Coordinador').click();
            await page.getByText('Equipos').click();
            await page.getByPlaceholder('Nombre...').fill('Test Team');
            await page.getByText('Crear', { exact: true }).click();
            await expect(page.getByText('Test Team')).toBeVisible();

            // Now deactivate
            await page.reload();
            await manageBtn.click();
            await rowAgain.getByRole('button', { name: 'Desactivar' }).click();
            await page.locator('header button').first().click();

            // Select Campaign
            await page.getByText(testName).click();

            // Sower
            await page.getByText('Soy Sembrador').click();

            // Select Team
            await page.getByText('Test Team').click();

            // Now we are in Sower View.
            // Verify "Siembra" button (PlusCircle) is hidden
            // The bottom nav usually has "Siembra" and "Cuaderno".
            // With read-only, it should have only "Cuaderno" or "Siembra" should be hidden.
            await expect(page.getByText('Siembra')).toBeHidden();
            await expect(page.getByText('Cuaderno', { exact: true })).toBeVisible();

            // Also check header says "Sólo lectura"
            await expect(page.getByText('Sólo lectura')).toBeVisible();

            // CLEANUP: Reactivate the campaign so other tests don't fail if they pick this one.
            await page.reload();
            await manageBtn.click();
            const rowCleanup = page.locator('.glass-card').filter({ hasText: testName });
            await rowCleanup.getByRole('button', { name: 'Activar' }).click();

        }
    });
});
