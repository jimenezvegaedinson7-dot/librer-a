const pool = require('../config/database');

const CAMPOS_BIBLIOGRAFICOS = `l.editorial, l.idioma, l.numero_paginas, l.anio_publicacion, l.formato, l.numero_volumen, l.dimensiones`;
const PRECIO_FINAL_SQL = `CASE WHEN l.descuento_porcentaje IS NULL AND l.precio_oferta IS NULL THEN l.precio WHEN l.descuento_hasta IS NOT NULL AND l.descuento_hasta < (NOW() AT TIME ZONE 'America/Lima')::date THEN l.precio WHEN l.precio_oferta IS NOT NULL THEN LEAST(l.precio_oferta, l.precio) ELSE ROUND(l.precio * (100 - l.descuento_porcentaje) / 100.0, 2) END AS precio_final`;
const CAMPOS_DESCUENTO = `CASE WHEN base.precio IS NULL OR base.precio <= 0 THEN 0 WHEN base.precio_final < base.precio THEN 1 ELSE 0 END AS descuento_vigente, CASE WHEN base.precio IS NULL OR base.precio <= 0 THEN 0 WHEN base.precio_final >= base.precio THEN 0 ELSE ROUND((base.precio - base.precio_final) / base.precio * 100) END AS descuento_porcentaje_efectivo, CASE WHEN base.creado_en <= NOW() AND base.creado_en > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END AS es_nuevo`;
const CAMPOS_TEXTO = {
    titulo: ['final.titulo'],
    autor: ['final.autor'],
    categoria: ['final.categoria'],
    todos: ['final.titulo', 'COALESCE(final.descripcion, \'\')', 'final.autor', 'final.categoria']
};

const CATALOGO_BASE = `SELECT l.id_libro, l.titulo, l.isbn, l.descripcion, ${CAMPOS_BIBLIOGRAFICOS}, l.precio, l.portada, l.id_autor, l.id_categoria, l.estado, l.creado_en, l.descuento_porcentaje, l.precio_oferta, TO_CHAR(l.descuento_hasta, 'YYYY-MM-DD') AS descuento_hasta, CASE WHEN top.id_libro IS NULL THEN 0 ELSE 1 END AS mas_vendido, COALESCE(i.stock, l.stock, 0) AS stock, CONCAT(a.nombre, ' ', a.apellido) AS autor, c.nombre AS categoria, ${PRECIO_FINAL_SQL} FROM libros l INNER JOIN autores a ON a.id_autor = l.id_autor INNER JOIN categorias c ON c.id_categoria = l.id_categoria LEFT JOIN inventario i ON i.id_libro = l.id_libro LEFT JOIN (SELECT dv.id_libro FROM detalle_venta dv INNER JOIN ventas v ON v.id_venta = dv.id_venta WHERE v.estado IN ('pagada', 'entregada') GROUP BY dv.id_libro HAVING SUM(dv.cantidad) > 0 ORDER BY SUM(dv.cantidad) DESC, dv.id_libro LIMIT 3) top ON top.id_libro = l.id_libro`;

const facetas = async () => {
    const [[autores], [categorias]] = await Promise.all([
        pool.query(`SELECT a.id_autor AS id, CONCAT(a.nombre, ' ', a.apellido) AS nombre, COUNT(*) AS total FROM libros l INNER JOIN autores a ON a.id_autor = l.id_autor WHERE l.estado = 1 GROUP BY a.id_autor, a.nombre, a.apellido ORDER BY total DESC, nombre ASC`),
        pool.query(`SELECT c.id_categoria AS id, c.nombre, COUNT(*) AS total FROM libros l INNER JOIN categorias c ON c.id_categoria = l.id_categoria WHERE l.estado = 1 GROUP BY c.id_categoria, c.nombre ORDER BY total DESC, nombre ASC`)
    ]);
    return { autores, categorias };
};

const titulos = async (tokens) => {
    const palabras = (tokens || []).filter((t) => typeof t === 'string' && t.trim()).slice(0, 5);
    if (!palabras.length) return [];
    const condiciones = palabras.map((p) => `translate(lower(l.titulo), 'áéíóúñ', 'aeioun') LIKE ?`).join(' AND ');
    const [rows] = await pool.query(`SELECT l.id_libro, l.titulo FROM libros l WHERE l.estado = 1 AND ${condiciones} ORDER BY l.id_libro DESC LIMIT 20`, palabras.map((p) => `%${p.toLowerCase()}%`));
    return rows;
};

const buscar = async (filtros = {}, orden = 'relevancia', limite = 12) => {
    const condiciones = ['final.estado = 1', 'final.stock > 0'];
    const params = [];
    const ids = Array.isArray(filtros.ids) ? filtros.ids.map(Number).filter(Number.isInteger).slice(0, 40) : [];
    if (ids.length) {
        condiciones.push(`final.id_libro = ANY(?)`);
        params.push(ids);
    }
    if (filtros.autor) {
        condiciones.push('final.id_autor = ?');
        params.push(filtros.autor);
    }
    if (filtros.categoria) {
        condiciones.push('final.id_categoria = ?');
        params.push(filtros.categoria);
    }
    if (filtros.isbn) {
        condiciones.push(`UPPER(REPLACE(REPLACE(final.isbn, '-', ''), ' ', '')) = ?`);
        params.push(String(filtros.isbn).toUpperCase());
    }
    const camposTexto = CAMPOS_TEXTO[filtros.campo] || CAMPOS_TEXTO.todos;
    for (const palabra of (filtros.palabras || []).slice(0, 6)) {
        const termino = `%${String(palabra).toLowerCase().replace(/[^a-z0-9 ]/g, '')}%`;
        condiciones.push(`(${camposTexto.map((campo) => `translate(lower(${campo}), 'áéíóúñ', 'aeioun') LIKE ?`).join(' OR ')})`);
        params.push(...camposTexto.map(() => termino));
    }
    if (filtros.minimo) {
        condiciones.push('final.precio_final >= ?');
        params.push(filtros.minimo);
    }
    if (filtros.maximo) {
        condiciones.push('final.precio_final <= ?');
        params.push(filtros.maximo);
    }
    if (filtros.stock === 'disponible') condiciones.push('final.stock > 0');
    if (filtros.oferta) condiciones.push('final.descuento_vigente = 1');
    const ordenes = {
        precio_asc: 'precio_final ASC, id_libro DESC',
        precio_desc: 'precio_final DESC, id_libro DESC',
        relevancia: 'mas_vendido DESC, es_nuevo DESC, id_libro DESC'
    };
    const sql = `SELECT final.* FROM (SELECT base.*, ${CAMPOS_DESCUENTO} FROM (${CATALOGO_BASE}) base) final WHERE ${condiciones.join(' AND ')} ORDER BY ${ordenes[orden] || ordenes.relevancia} LIMIT ?`;
    params.push(Math.min(Math.max(Number(limite) || 12, 1), 24));
    const [rows] = await pool.query(sql, params);
    return rows;
};

module.exports = { facetas, titulos, buscar };
