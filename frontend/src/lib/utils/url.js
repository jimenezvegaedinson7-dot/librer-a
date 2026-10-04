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
    if (typeof foto!=='string' || !foto.trim()) return null;
    foto=foto.trim();
    if(foto.startsWith('/portadas/'))return typeof window==='undefined'?foto:new URL(foto,window.location.origin).href;
    if(foto.startsWith('blob:') || foto.startsWith('data:image/'))return foto;
    if(/^[a-z][a-z0-9+.-]*:/i.test(foto) && !/^https?:/i.test(foto))return null;
    if (foto.startsWith('http://') || foto.startsWith('https://')) return foto;
    return `${extraerOrigenApi()}${foto.startsWith('/') ? foto : `/${foto}`}`;
}
