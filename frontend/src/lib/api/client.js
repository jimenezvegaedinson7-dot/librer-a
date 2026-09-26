import axios from 'axios';

import env from '../../config/env';
import storage from '../storage';
import { construirUrlArchivo } from '../utils/url';

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

// Operaciones donde el backend responde 401 por una credencial incorrecta
// (contraseña actual, código 2FA, login), no por sesión vencida: el error se
// muestra en el formulario sin cerrar la sesión.
const RUTAS_401_DE_CREDENCIAL = [
    '/usuarios/password',
    '/auth/2fa/',
    '/auth/login',
];

// Mensajes del middleware de autenticación: aunque lleguen en una de esas
// rutas, indican que la sesión ya no es válida.
const MENSAJES_DE_SESION = [
    'Token no proporcionado',
    'Formato de token inválido',
    'Token inválido',
    'El token ha expirado',
    'Cuenta desactivada',
];

const es401DeCredencial = (error) =>
    RUTAS_401_DE_CREDENCIAL.some((ruta) => String(error.config?.url || '').includes(ruta)) &&
    !MENSAJES_DE_SESION.includes(error.response?.data?.mensaje);

client.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401 && !es401DeCredencial(error)) {
            storage.clearSesion();
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    },
);

export { construirUrlArchivo };

export default client;
