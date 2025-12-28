import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
    features: 'tests/acceptance/features/*.feature',
    steps: 'tests/acceptance/steps/*.js',
});

export default defineConfig({
    testDir, // Apunta al directorio generado por BDD
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:5174', // Port 5174 for Safe Test Environment
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'bdd',
            testDir,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'e2e',
            testDir: 'tests/e2e',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run dev -- --mode test --port 5174',
        url: 'http://localhost:5174',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
