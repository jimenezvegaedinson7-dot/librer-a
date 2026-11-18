const apiConfigurada = import.meta.env.VITE_API_URL || 'https://libreria-api-v9h0.onrender.com/api';
const env = { apiUrl: typeof window === 'undefined' ? apiConfigurada : new URL(apiConfigurada, window.location.origin).href };

export default env;
