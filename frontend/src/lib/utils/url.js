import env from '../../config/env';

function extraerOrigenApi() {
    try {
        const url = new URL(env.apiUrl);
        return url.origin;
    } catch {
        return 'http://localhost:3000';
    }
}

export function construirUrlArchivo(foto) {
    if (!foto) return null;
    if (foto.startsWith('http://') || foto.startsWith('https://')) return foto;
    return `${extraerOrigenApi()}${foto.startsWith('/') ? foto : `/${foto}`}`;
}
