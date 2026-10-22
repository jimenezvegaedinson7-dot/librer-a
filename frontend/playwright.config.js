import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './test-browser', fullyParallel: true, workers: 3,
    // Las pruebas de API usan page.route; un SW las saltaría. Su integración
    // real se habilita explícitamente en cache-recursos.spec.js.
    use: { baseURL: 'http://127.0.0.1:5179', headless: true, serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } },
    webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5179 --strictPort',
        url: 'http://127.0.0.1:5179', reuseExistingServer: false,
        env: { VITE_API_URL: 'http://127.0.0.1:59999/api' } },
});
