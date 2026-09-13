const KEY_TOKEN = 'token';
const KEY_USUARIO = 'usuario';
const KEY_HISTORIAL_VISTO = 'ultimoHistorialVisto';

const storage = {
    getToken() {
        return localStorage.getItem(KEY_TOKEN);
    },
    setToken(token) {
        localStorage.setItem(KEY_TOKEN, token);
    },
    removeToken() {
        localStorage.removeItem(KEY_TOKEN);
    },
    getUsuario() {
        try {
            return JSON.parse(localStorage.getItem(KEY_USUARIO));
        } catch {
            return null;
        }
    },
    setUsuario(usuario) {
        if (usuario) {
            localStorage.setItem(KEY_USUARIO, JSON.stringify(usuario));
        } else {
            localStorage.removeItem(KEY_USUARIO);
        }
    },
    removeUsuario() {
        localStorage.removeItem(KEY_USUARIO);
    },
    getUltimoHistorialVisto() {
        return localStorage.getItem(KEY_HISTORIAL_VISTO);
    },
    setUltimoHistorialVisto(valor) {
        localStorage.setItem(KEY_HISTORIAL_VISTO, String(valor));
    },
    clearSesion() {
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(KEY_USUARIO);
        localStorage.removeItem(KEY_HISTORIAL_VISTO);
    },
};

export default storage;
