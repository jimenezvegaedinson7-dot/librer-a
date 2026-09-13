import axios from 'axios';

import env from '../../config/env';
import storage from '../storage';
import { construirUrlArchivo } from '../utils/url';

const client = axios.create({
    baseURL: env.apiUrl,
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
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
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
