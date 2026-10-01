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
