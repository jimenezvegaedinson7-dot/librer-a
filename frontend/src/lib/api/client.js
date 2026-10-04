import axios from 'axios';

import env from '../../config/env';
import storage from '../storage';
import { construirUrlArchivo } from '../utils/url';
import { es401DeCredencial } from '../../features/auth/erroresSesion';

// Login del panel: una sesión vencida vuelve aquí.
const RUTA_LOGIN = '/admin/login';

const client = axios.create({
    baseURL: env.apiUrl,
    // Timeout generoso para arranques en frío de Render free, pero finito:
    // evita que el spinner se quede cargando para siempre.
    timeout: 120000,
});

client.interceptors.request.use(
    (config) => {
        const token = storage.getToken();
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

client.interceptors.response.use(
    (response) => {
        if (response.data?.sesiones_revocadas === true) {
            storage.clearSesion();
            window.location.href = RUTA_LOGIN;
        }
        return response.data;
    },
    (error) => {
        if (error.response?.status === 401 && !es401DeCredencial(error)) {
            storage.clearSesion();
            if (window.location.pathname !== RUTA_LOGIN) {
                window.location.href = RUTA_LOGIN;
            }
        }
        return Promise.reject(error);
    },
);

export { construirUrlArchivo };

export default client;
