const apiConfigurada = import.meta.env.VITE_API_URL || 'https://libreria-api-v9h0.onrender.com/api';

const env = {
    // Los consumidores reciben siempre una URL absoluta, incluso al usar
    // el proxy /api del mismo dominio. Conserva las URLs externas de desarrollo.
    apiUrl: typeof window === 'undefined'
        ? apiConfigurada
        : new URL(apiConfigurada, window.location.origin).href,
};

export default env;
