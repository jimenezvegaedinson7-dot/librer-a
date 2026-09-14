import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Build de produccion: VITE_API_URL se define en .env.production / Vercel env
export default defineConfig({
    plugins: [
        react(),
        tailwindcss()
    ]
});