const portadaModel = require('../models/portada.model');
const libroModel = require('../models/libro.model');
const { registrarAuditoria } = require('../utils/auditoria');
const { validarId } = require('../utils/validaciones');

// Datos públicos del libro protagonista: solo lo que la portada muestra.
const publico = (libro) => libro && ({
    id_libro: libro.id_libro,
    titulo: libro.titulo,
    autor: libro.autor,
    categoria: libro.categoria,
    descripcion: libro.descripcion,
    portada: libro.portada,
    precio: libro.precio,
    precio_final: libro.precio_final,
    descuento_vigente: libro.descuento_vigente,
    descuento_porcentaje_efectivo: libro.descuento_porcentaje_efectivo,
    stock: libro.stock,
    estado: libro.estado,
});

// GET /api/anuncios/protagonista (web pública)
async function obtenerPublico(_req, res) {
    try {
        res.set?.('Cache-Control', 'no-store');
        const { modo, libro } = await portadaModel.resolverProtagonista();
        return res.json({ success: true, data: { modo, libro: publico(libro) } });
    } catch {
        return res.status(503).json({ success: false, mensaje: 'No se pudo cargar el libro de la portada.' });
    }
}

// GET /api/anuncios/protagonista/panel (administrador)
async function obtenerPanel(_req, res) {
    try {
        const resuelto = await portadaModel.resolverProtagonista();
        const config = await portadaModel.obtenerConfig();
        const automatico = resuelto.modo === 'manual'
            ? await portadaModel.resolverProtagonista({ automatico: true }) : resuelto;
        return res.json({
            success: true,
            data: {
                modo: resuelto.modo,
                id_libro_manual: resuelto.id_libro_manual,
                // La selección manual existe pero ya no es válida (inactivo o sin portada).
                manual_invalido: Boolean(resuelto.id_libro_manual) && resuelto.modo !== 'manual',
                actualizado_en: config.actualizado_en,
                libro: publico(resuelto.libro),
                libro_automatico: publico(automatico.libro),
            },
        });
    } catch {
        return res.status(503).json({ success: false, mensaje: 'No se pudo cargar la configuración de la portada.' });
    }
}

// PUT /api/anuncios/protagonista (administrador). { id_libro: número | null }
async function guardar(req, res) {
    const body = req.body || {};
    if (Object.keys(body).some((k) => k !== 'id_libro') || !('id_libro' in body)) {
        return res.status(400).json({ success: false, mensaje: 'Indica el libro protagonista o null para el modo automático.' });
    }
    let idLibro = null;
    if (body.id_libro !== null && body.id_libro !== '') {
        idLibro = ['string', 'number'].includes(typeof body.id_libro) ? validarId(body.id_libro) : null;
        if (!idLibro) return res.status(400).json({ success: false, mensaje: 'El libro elegido no es válido.' });
    }
    try {
        if (idLibro) {
            const libro = await libroModel.obtenerPorId(idLibro);
            if (!libro) return res.status(404).json({ success: false, mensaje: 'El libro ya no existe.' });
            if (!portadaModel.esElegible(libro)) return res.status(400).json({ success: false, mensaje: 'Solo se puede destacar un libro activo.' });
            if (!portadaModel.tienePortada(libro)) return res.status(400).json({ success: false, mensaje: 'El libro necesita una portada para mostrarse en la portada web.' });
        }
        await portadaModel.guardarProtagonista(idLibro, req.usuario.id_usuario);
        await registrarAuditoria(req, 'anuncios', 'ACTUALIZAR', idLibro ? `Libro protagonista de la portada: #${idLibro}` : 'Libro protagonista de la portada en modo automático');
        return obtenerPanel(req, res);
    } catch {
        return res.status(503).json({ success: false, mensaje: 'No se pudo guardar el libro protagonista.' });
    }
}

module.exports = { obtenerPublico, obtenerPanel, guardar };
