import env from '../../config/env';

// Resuelve las portadas reales (incluidas rutas locales) para ficha y SEO.
export function urlPortada(foto, ancho = 480) {
    if (!foto) return null;
    try {
        const origen = String(foto).startsWith('/portadas/') ? window.location.origin
            : new URL(env.apiUrl, window.location.origin).origin;
        const url = new URL(foto, origen);
        if (!['https:', 'http:'].includes(url.protocol) && !String(foto).startsWith('data:image/')) return null;
        return portada(url.href, ancho);
    } catch {return null;}
}

// Portadas de Cloudinary al ancho justo y en el mejor formato que acepte
// el navegador (AVIF/WebP). Otras URLs se devuelven tal cual.
export function portada(url, ancho) {
    if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
    return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${ancho}/`);
}

export const soles = (valor) => `S/ ${Number(valor || 0).toFixed(2)}`;

export function fechaLarga(iso) {
    if (!iso) return '';
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}
