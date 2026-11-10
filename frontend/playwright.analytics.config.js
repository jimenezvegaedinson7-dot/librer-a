import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

export default defineConfig({
    ...base,
    metadata: { ga4: true },
    testMatch: 'analitica-recomendaciones.spec.js',
    use: { ...base.use, baseURL: 'http://127.0.0.1:5180' },
    webServer: {
        ...base.webServer,
        command: 'npm run dev -- --host 127.0.0.1 --port 5180 --strictPort',
        url: 'http://127.0.0.1:5180',
        env: { ...base.webServer.env, VITE_GA4_ID: 'G-TEST123456', VITE_GA4_DEBUG: 'true' }
    }
});
