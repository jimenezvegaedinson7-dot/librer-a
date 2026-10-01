import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Build de produccion: VITE_API_URL se define en .env.production / Vercel env.
// En desarrollo, con VITE_API_URL=/api (ver .env.development.local), las
// peticiones pasan por este proxy hacia la API de produccion: asi se evita
// el bloqueo CORS, porque la API no acepta el origen localhost.
export default defineConfig({
    plugins: [
        react(),
        tailwindcss()
    ],
    server: {
        proxy: {
            '/api': {
                target: 'https://libreria-api-v9h0.onrender.com',
                changeOrigin: true,
                secure: true,
            },
        },
    },
});
