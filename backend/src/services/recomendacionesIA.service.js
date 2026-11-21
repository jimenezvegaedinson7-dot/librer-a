const libroModel = require('../models/libro.model');
const busquedaModel = require('../models/busquedaIA.model');
const gemini = require('../integrations/gemini');

function resumir(perfil) {
    const autores = new Map();
    const categorias = new Map();
    const titulos = new Map();
    let compras = 0;
    for (const fila of perfil) {
        const peso = Number(fila.peso) || 0;
        compras += peso;
        if (fila.autor) autores.set(fila.autor, (autores.get(fila.autor) || 0) + peso);
        if (fila.categoria) categorias.set(fila.categoria, (categorias.get(fila.categoria) || 0) + peso);
        if (fila.titulo) titulos.set(fila.titulo, (titulos.get(fila.titulo) || 0) + peso);
    }
    const top = (mapa, limite = 5) => [...mapa].sort((a, b) => b[1] - a[1]).slice(0, limite).map(([nombre, peso]) => `${nombre} (${peso})`).join(', ') || 'sin registro';
    return `El cliente ha comprado ${compras} ejemplares. Autores preferidos: ${top(autores)}. Categorías preferidas: ${top(categorias)}. Títulos comprados: ${top(titulos, 8)}.`;
}

function crearRecomendadorIA({ catalogo = libroModel, repositorio = busquedaModel, proveedor = gemini.seleccionar } = {}) {
    return async function recomendar(idUsuario, limite = 8) {
        const perfil = await catalogo.obtenerPerfilCompras(idUsuario);
        if (!perfil.length) return { libros: [], origen: 'catalogo' };
        const candidatos = await catalogo.obtenerCandidatosIA(idUsuario, 12);
        if (!candidatos.length) return { libros: [], origen: 'catalogo' };
        const respuesta = await proveedor({ mensaje: resumir(perfil), libros: candidatos, limite });
        const permitidos = new Map(candidatos.map((l) => [l.id_libro, l]));
        const ids = (respuesta.selecciones || []).map((s) => Number(s.id_libro)).filter((id) => permitidos.has(id)).slice(0, limite);
        if (ids.length) {
            const actuales = await repositorio.buscar({ ids }, 'relevancia', ids.length);
            const vistos = new Set();
            const libros = actuales
                .filter((libro) => ids.includes(libro.id_libro) && !vistos.has(libro.id_libro) && vistos.add(libro.id_libro))
                .slice(0, limite)
                .map((libro) => ({
                    ...libro,
                    motivo_recomendacion: permitidos.get(libro.id_libro).motivo_recomendacion || 'autor_categoria'
                }));
            if (libros.length) return { libros, origen: 'gemini' };
        }
        const libros = await catalogo.obtenerRecomendados(idUsuario);
        return { libros, origen: 'catalogo' };
    };
}

module.exports = { crearRecomendadorIA, recomendar: crearRecomendadorIA() };
