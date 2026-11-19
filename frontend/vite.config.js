import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const proxyTarget = process.env.VITE_API_PROXY_TARGET || 'https://libreria-api-v9h0.onrender.com';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: { proxy: { '/api': { target: proxyTarget, changeOrigin: true, secure: true } } }
});
