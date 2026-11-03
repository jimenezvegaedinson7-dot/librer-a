import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: { proxy: { '/api': { target: 'https://libreria-api-v9h0.onrender.com', changeOrigin: true, secure: true } } }
});
