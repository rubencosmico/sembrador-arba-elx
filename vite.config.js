import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**', 'tests/acceptance/**', '**/.features-gen/**'],
  },
})