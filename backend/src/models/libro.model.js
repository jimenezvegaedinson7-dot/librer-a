const pool = require('../config/database');

const PRECIO_FINAL_SQL = `CASE WHEN l.descuento_porcentaje IS NULL AND l.precio_oferta IS NULL THEN l.precio WHEN l.descuento_hasta IS NOT NULL AND l.descuento_hasta < (NOW() AT TIME ZONE 'America/Lima')::date THEN l.precio WHEN l.precio_oferta IS NOT NULL THEN LEAST(l.precio_oferta, l.precio) ELSE ROUND(l.precio * (100 - l.descuento_porcentaje) / 100.0, 2) END AS precio_final`;
const COLUMNAS_DESCUENTO = `CASE WHEN base.precio IS NULL OR base.precio <= 0 THEN 0 WHEN base.precio_final < base.precio THEN 1 ELSE 0 END AS descuento_vigente, CASE WHEN base.precio IS NULL OR base.precio <= 0 THEN 0 WHEN base.precio_final >= base.precio THEN 0 ELSE ROUND((base.precio - base.precio_final) / base.precio * 100) END AS descuento_porcentaje_efectivo`;
const CAMPOS_DESCUENTO = `${COLUMNAS_DESCUENTO}, CASE WHEN base.creado_en <= NOW() AND base.creado_en > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END AS es_nuevo`;

const obtenerTodos = async () => {
    const [rows] = await pool.query(
        `SELECT base.*, ${CAMPOS_DESCUENTO} FROM (SELECT l.id_libro, l.titulo, l.isbn, l.descripcion, l.precio, l.portada, l.id_autor, l.id_categoria, l.estado, l.creado_en, l.descuento_porcentaje, l.precio_oferta, TO_CHAR(l.descuento_hasta, 'YYYY-MM-DD') AS descuento_hasta, COALESCE(i.stock, l.stock, 0) AS stock, CONCAT(a.nombre, ' ', a.apellido) AS autor, c.nombre AS categoria, CASE WHEN top.id_libro IS NULL THEN 0 ELSE 1 END AS mas_vendido, ${PRECIO_FINAL_SQL} FROM libros l INNER JOIN autores a ON l.id_autor = a.id_autor INNER JOIN categorias c ON l.id_categoria = c.id_categoria LEFT JOIN inventario i ON l.id_libro = i.id_libro LEFT JOIN (SELECT dv.id_libro FROM detalle_venta dv INNER JOIN ventas v ON v.id_venta = dv.id_venta WHERE v.estado IN ('pagada', 'entregada') GROUP BY dv.id_libro HAVING SUM(dv.cantidad) > 0 ORDER BY SUM(dv.cantidad) DESC, dv.id_libro LIMIT 3) top ON top.id_libro = l.id_libro) base ORDER BY base.id_libro DESC`
    );

    return rows;
};

const obtenerPorId = async (id) => {
    const [rows] = await pool.query(
        `SELECT base.*, ${CAMPOS_DESCUENTO} FROM (SELECT l.id_libro, l.titulo, l.isbn, l.descripcion, l.precio, l.portada, l.id_autor, l.id_categoria, l.estado, l.creado_en, l.descuento_porcentaje, l.precio_oferta, TO_CHAR(l.descuento_hasta, 'YYYY-MM-DD') AS descuento_hasta, COALESCE(i.stock, l.stock, 0) AS stock, CONCAT(a.nombre, ' ', a.apellido) AS autor, c.nombre AS categoria, CASE WHEN top.id_libro IS NULL THEN 0 ELSE 1 END AS mas_vendido, ${PRECIO_FINAL_SQL} FROM libros l INNER JOIN autores a ON l.id_autor = a.id_autor INNER JOIN categorias c ON l.id_categoria = c.id_categoria LEFT JOIN inventario i ON l.id_libro = i.id_libro LEFT JOIN (SELECT dv.id_libro FROM detalle_venta dv INNER JOIN ventas v ON v.id_venta = dv.id_venta WHERE v.estado IN ('pagada', 'entregada') GROUP BY dv.id_libro HAVING SUM(dv.cantidad) > 0 ORDER BY SUM(dv.cantidad) DESC, dv.id_libro LIMIT 3) top ON top.id_libro = l.id_libro WHERE l.id_libro = ?) base`,
        [id]
    );

    return rows[0];
};

const crear = async (libro) => {
    const { titulo, isbn, descripcion, precio, stock, portada, id_autor, id_categoria, estado, descuento_porcentaje, precio_oferta, descuento_hasta } = libro;

    const [resultado] = await pool.query(
        `INSERT INTO libros (titulo, isbn, descripcion, precio, stock, portada, id_autor, id_categoria, estado, descuento_porcentaje, precio_oferta, descuento_hasta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            titulo,
            isbn ?? null,
            descripcion ?? null,
            precio,
            stock ?? 0,
            portada ?? null,
            id_autor,
            id_categoria,
            estado ?? 1,
            descuento_porcentaje ?? null,
            precio_oferta ?? null,
            descuento_hasta ?? null
        ]
    );

    return resultado.insertId;
};

const actualizar = async (id, libro) => {
    const { titulo, precio, stock, portada, id_autor, id_categoria, estado } = libro;

    const camposDescuento = [];
    const valoresDescuento = [];
    for (const campo of ['descuento_porcentaje', 'precio_oferta', 'descuento_hasta', 'isbn', 'descripcion']) {
        if (libro[campo] !== undefined) {
            camposDescuento.push(`${campo} = ?`);
            valoresDescuento.push(libro[campo]);
        }
    }

    const [resultado] = await pool.query(
        `UPDATE libros SET titulo = COALESCE(?, titulo), precio = COALESCE(?, precio), stock = COALESCE(?, stock), portada = COALESCE(?, portada), id_autor = COALESCE(?, id_autor), id_categoria = COALESCE(?, id_categoria), estado = COALESCE(?, estado) ${camposDescuento.length ? `, ${camposDescuento.join(', ')}` : ''} WHERE id_libro = ?`,
        [titulo ?? null, precio ?? null, stock ?? null, portada ?? null, id_autor ?? null, id_categoria ?? null, estado ?? null, ...valoresDescuento, id]
    );

    if (!resultado.affectedRows) {
        return 0;
    }

    return resultado.affectedRows;
};

const eliminar = async (id) => {
    const [resultado] = await pool.query(`DELETE FROM libros WHERE id_libro = ?`, [id]);

    return resultado.affectedRows;
};

const obtenerRelacionados = async (id) => {
    const [actuales] = await pool.query(`SELECT id_libro, id_autor, id_categoria FROM libros WHERE id_libro = ? AND estado = 1 LIMIT 1`, [id]);
    if (!actuales.length) return null;
    const actual = actuales[0];
    const candidatos = async (condicion, valores) => {
        const [rows] = await pool.query(
            `SELECT base.*, ${CAMPOS_DESCUENTO} FROM (SELECT l.id_libro, l.titulo, l.isbn, l.precio, l.portada, l.id_autor, l.id_categoria, l.estado, l.creado_en, COALESCE(i.stock, l.stock, 0) AS stock, CONCAT(a.nombre, ' ', a.apellido) AS autor, c.nombre AS categoria, ${PRECIO_FINAL_SQL} FROM libros l INNER JOIN autores a ON a.id_autor = l.id_autor INNER JOIN categorias c ON c.id_categoria = l.id_categoria LEFT JOIN inventario i ON i.id_libro = l.id_libro WHERE l.estado = 1 AND l.id_libro <> ? AND ${condicion} ORDER BY (COALESCE(i.stock, l.stock, 0) > 0) DESC, l.id_libro DESC LIMIT 8) base ORDER BY (base.stock > 0) DESC, base.id_libro DESC`,
            [id, ...valores]
        );
        return rows;
    };
    const autor = await candidatos('l.id_autor = ?', [actual.id_autor]);

    const categoria = await candidatos('l.id_categoria = ? AND l.id_autor <> ?', [actual.id_categoria, actual.id_autor]);
    const relacionados = [...autor.slice(0, 4), ...categoria.slice(0, Math.max(0, 4 - autor.length))];
    const usados = new Set(relacionados.map((l) => l.id_libro));
    return { relacionados, mas_autor: autor.filter((l) => !usados.has(l.id_libro)).slice(0, 4), interesarte: categoria.filter((l) => !usados.has(l.id_libro)).slice(0, 4) };
};

const obtenerRecomendados = async (idUsuario) => {
    const [rows] = await pool.query(
        `WITH compras AS (
            SELECT dv.id_libro, l.id_autor, l.id_categoria, LEAST(SUM(dv.cantidad), 10)::int AS peso
            FROM detalle_venta dv INNER JOIN ventas v ON v.id_venta = dv.id_venta INNER JOIN libros l ON l.id_libro = dv.id_libro
            WHERE v.id_usuario = ? AND v.estado IN ('pagada', 'entregada') AND dv.cantidad > 0
            GROUP BY dv.id_libro, l.id_autor, l.id_categoria
        ), afinidad_autor AS (
            SELECT id_autor, SUM(peso) AS peso FROM compras GROUP BY id_autor
        ), afinidad_categoria AS (
            SELECT id_categoria, SUM(peso) AS peso FROM compras GROUP BY id_categoria
        )
        SELECT base.*, ${CAMPOS_DESCUENTO} FROM (
            SELECT l.id_libro, l.titulo, l.isbn, l.precio, l.portada, l.id_autor, l.id_categoria, l.estado, l.creado_en,
                COALESCE(i.stock, l.stock, 0) AS stock, CONCAT(a.nombre, ' ', a.apellido) AS autor, c.nombre AS categoria,
                ${PRECIO_FINAL_SQL}, COALESCE(aa.peso, 0) * 3 + COALESCE(ac.peso, 0) * 2 AS afinidad,
                CASE WHEN aa.peso > 0 AND ac.peso > 0 THEN 'autor_categoria' WHEN aa.peso > 0 THEN 'autor' ELSE 'categoria' END AS motivo_recomendacion
            FROM libros l INNER JOIN autores a ON a.id_autor = l.id_autor INNER JOIN categorias c ON c.id_categoria = l.id_categoria
            LEFT JOIN inventario i ON i.id_libro = l.id_libro
            LEFT JOIN afinidad_autor aa ON aa.id_autor = l.id_autor LEFT JOIN afinidad_categoria ac ON ac.id_categoria = l.id_categoria
            WHERE l.estado = 1 AND COALESCE(i.stock, l.stock, 0) > 0
                AND (COALESCE(aa.peso, 0) > 0 OR COALESCE(ac.peso, 0) > 0)
                AND NOT EXISTS (SELECT 1 FROM compras p WHERE p.id_libro = l.id_libro)
        ) base ORDER BY base.afinidad DESC, base.creado_en DESC NULLS LAST, base.id_libro DESC LIMIT 8`,
        [idUsuario]
    );
    return rows;
};

module.exports = { PRECIO_FINAL_SQL, CAMPOS_DESCUENTO, obtenerTodos, obtenerPorId, obtenerRelacionados, obtenerRecomendados, crear, actualizar, eliminar };
