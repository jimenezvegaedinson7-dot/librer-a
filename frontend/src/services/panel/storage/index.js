const KEY_TOKEN = 'token';
const KEY_USUARIO = 'usuario';

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
    clearSesion() {
        localStorage.removeItem(KEY_TOKEN);
        localStorage.removeItem(KEY_USUARIO);
        localStorage.removeItem('ultimoHistorialVisto');
    }
};

export default storage;
