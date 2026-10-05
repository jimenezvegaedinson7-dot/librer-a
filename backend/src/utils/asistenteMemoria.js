// Sanea la memoria que la web envía: solo campos conocidos, tamaños
// acotados y sin texto libre largo. Nunca guarda conversaciones completas.
const TEXTO_CORTO = /^[\p{L}\p{N} .,'’&-]{1,60}$/u;

function conteos(valor, maximo = 12) {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
    return Object.fromEntries(Object.entries(valor)
        .filter(([k, v]) => TEXTO_CORTO.test(k) && Number.isInteger(v) && v > 0)
        .map(([k, v]) => [k.trim(), Math.min(v, 999)])
        .sort((a, b) => b[1] - a[1])
        .slice(0, maximo));
}

function sanearMemoria(entrada) {
    const datos = entrada && typeof entrada === 'object' && !Array.isArray(entrada) ? entrada : {};
    const apodo = typeof datos.apodo === 'string' && /^[\p{L} ]{2,40}$/u.test(datos.apodo.trim()) ? datos.apodo.trim() : undefined;
    const vistos = Array.isArray(datos.vistos)
        ? [...new Set(datos.vistos.filter((id) => Number.isSafeInteger(id) && id > 0))].slice(-20) : [];
    const visitas = Number.isInteger(datos.visitas) && datos.visitas >= 0 ? Math.min(datos.visitas, 100000) : 0;
    const ultimaBusqueda = typeof datos.ultimaBusqueda === 'string' && TEXTO_CORTO.test(datos.ultimaBusqueda.trim())
        ? datos.ultimaBusqueda.trim() : undefined;
    return {
        ...(apodo ? { apodo } : {}),
        categorias: conteos(datos.categorias),
        autores: conteos(datos.autores),
        vistos,
        visitas,
        ...(ultimaBusqueda ? { ultimaBusqueda } : {}),
    };
}

module.exports = { sanearMemoria };
