import axios from 'axios';
import env from '../../../compartido/config/env';
import storage from '../storage/index';
import { construirUrlArchivo } from '../../../compartido/lib/utils/url';
import { es401DeCredencial } from '../../auth/erroresSesion';

const RUTA_LOGIN = '/admin/login';

const firmaSesionPanel = () => {
    const usuario = storage.getUsuario();
    return JSON.stringify([storage.getToken(), usuario?.id_usuario ?? null, usuario?.rol ?? null]);
};

const exigirSesionPanel = (config) => {
    if (config?._sesionPanel === firmaSesionPanel()) return;
    const error = new Error('La sesión administrativa cambió. Revisa la cuenta actual.');
    error.name = 'SesionCambiada';
    error.config = config;
    throw error;
};

const client = axios.create({
    baseURL: env.apiUrl,

    timeout: 120000
});

client.interceptors.request.use(
    (config) => {
        config._sesionPanel = firmaSesionPanel();
        const token = storage.getToken();
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

client.interceptors.response.use(
    (response) => {
        exigirSesionPanel(response.config);
        if (response.data?.sesiones_revocadas === true) {
            storage.clearSesion();
            window.location.href = RUTA_LOGIN;

            exigirSesionPanel(response.config);
        }
        return response.data;
    },
    (error) => {
        if (error.config) exigirSesionPanel(error.config);
        if (error.response?.status === 401 && !es401DeCredencial(error)) {
            storage.clearSesion();
            if (window.location.pathname !== RUTA_LOGIN) {
                window.location.href = RUTA_LOGIN;
            }
        }
        return Promise.reject(error);
    }
);

export { construirUrlArchivo };

export default client;
