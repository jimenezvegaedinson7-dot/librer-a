const pool = require('../config/database');

// ========================================
// PRECIO FINAL DE UN LIBRO
//
// Se calcula en SQL, no en el cliente, para que el panel y la web
// pública muestren exactamente la misma cifra. Un cálculo en dos
// sitios se desincroniza en cuanto uno de los dos cambia.
//
// Reglas, en este orden:
//   1. Sin descuento, o con la fecha ya vencida, vale el precio de lista.
//   2. Si hay precio_oferta explícito, manda ese (permite 2x1 o un monto
//      fijo en lugar de un porcentaje). LEAST evita que un dato mal
//      capturado "haga subir" el precio y lo llame descuento.
//   3. Si solo hay porcentaje, se aplica sobre el precio de lista.
//   4. El redondeo a 2 decimales es el del tipo NUMERIC(10,2): en JS,
//      Math.round(0.1 + 0.2) deja 0.30000000000000004.
//
// Va en el subselect INTERIOR porque Postgres no permite que una columna de
// la misma lista SELECT se refiera a otra de esa lista por su alias.
const PRECIO_FINAL_SQL = `
    CASE
        WHEN l.descuento_porcentaje IS NULL
            AND l.precio_oferta IS NULL THEN l.precio
        WHEN l.descuento_hasta IS NOT NULL
            AND l.descuento_hasta < (NOW() AT TIME ZONE 'America/Lima')::date THEN l.precio
        WHEN l.precio_oferta IS NOT NULL
            THEN LEAST(l.precio_oferta, l.precio)
        ELSE ROUND(
            l.precio * (100 - l.descuento_porcentaje) / 100.0,
            2
        )
    END AS precio_final
`;

// Los dos flags van en el SELECT EXTERIOR porque sí necesitan leer el
// precio_final ya resuelto.
//
// Y se derivan de ese mismo precio_final en vez de recalcular la promoción
// por su cuenta. Esa es la garantía que importa:
//
//     descuento_vigente = 1   <=>   precio_final < precio
//
// Si se calcularan aparte, un caso como porcentaje 30 con un precio_oferta
// igual al precio de lista daría precio_final = precio y a la vez
// vigente = 1: el catálogo anunciaría "-30%" sobre un precio que no está
// rebajado.
const COLUMNAS_DESCUENTO = `
    CASE
        WHEN base.precio IS NULL OR base.precio <= 0 THEN 0
        WHEN base.precio_final < base.precio THEN 1
        ELSE 0
    END AS descuento_vigente,
    CASE
        WHEN base.precio IS NULL OR base.precio <= 0 THEN 0
        WHEN base.precio_final >= base.precio THEN 0
        ELSE ROUND((base.precio - base.precio_final) / base.precio * 100)
    END AS descuento_porcentaje_efectivo
`;

// Solo las columnas derivadas. Las tres crudas de la promoción viajan en el
// subselect interior, porque precio_final se evalúa sobre ellas.
const CAMPOS_DESCUENTO = `
    ${COLUMNAS_DESCUENTO},
    CASE WHEN base.creado_en <= NOW()
        AND base.creado_en > NOW() - INTERVAL '30 days'
        THEN 1 ELSE 0 END AS es_nuevo
`;

// ========================================
// OBTENER TODOS LOS LIBROS
// ========================================
const obtenerTodos = async () => {
    const [rows] = await pool.query(`
        SELECT
            base.*,
            ${CAMPOS_DESCUENTO}

        FROM (
            SELECT
                l.id_libro,
                l.titulo,
                l.isbn,
                l.descripcion,
                l.precio,
                l.portada,
                l.id_autor,
                l.id_categoria,
                l.estado,

                l.creado_en,

                l.descuento_porcentaje,
                l.precio_oferta,
                TO_CHAR(l.descuento_hasta, 'YYYY-MM-DD') AS descuento_hasta,

                COALESCE(
                    i.stock,
                    l.stock,
                    0
                ) AS stock,

                CONCAT(
                    a.nombre,
                    ' ',
                    a.apellido
                ) AS autor,

                c.nombre AS categoria,

                CASE WHEN top.id_libro IS NULL THEN 0 ELSE 1 END AS mas_vendido,

                ${PRECIO_FINAL_SQL}

            FROM libros l

            INNER JOIN autores a
                ON l.id_autor = a.id_autor

            INNER JOIN categorias c
                ON l.id_categoria = c.id_categoria

            LEFT JOIN inventario i
                ON l.id_libro = i.id_libro

            -- Los 3 libros con más unidades vendidas (ventas pagadas o
            -- entregadas). Solo alimenta la etiqueta "Más vendido": las
            -- cantidades no salen de la base.
            LEFT JOIN (
                SELECT dv.id_libro
                FROM detalle_venta dv
                INNER JOIN ventas v
                    ON v.id_venta = dv.id_venta
                WHERE v.estado IN ('pagada', 'entregada')
                GROUP BY dv.id_libro
                HAVING SUM(dv.cantidad) > 0
                ORDER BY SUM(dv.cantidad) DESC, dv.id_libro
                LIMIT 3
            ) top
                ON top.id_libro = l.id_libro
        ) base

        ORDER BY base.id_libro DESC
    `);

    return rows;
};

// ========================================
// OBTENER LIBRO POR ID
// ========================================
const obtenerPorId = async (id) => {
    const [rows] = await pool.query(`
        SELECT
            base.*,
            ${CAMPOS_DESCUENTO}

        FROM (
            SELECT
                l.id_libro,
                l.titulo,
                l.isbn,
                l.descripcion,
                l.precio,
                l.portada,
                l.id_autor,
                l.id_categoria,
                l.estado,

                l.creado_en,

                l.descuento_porcentaje,
                l.precio_oferta,
                TO_CHAR(l.descuento_hasta, 'YYYY-MM-DD') AS descuento_hasta,

                COALESCE(
                    i.stock,
                    l.stock,
                    0
                ) AS stock,

                CONCAT(
                    a.nombre,
                    ' ',
                    a.apellido
                ) AS autor,

                c.nombre AS categoria,

                CASE WHEN top.id_libro IS NULL THEN 0 ELSE 1 END AS mas_vendido,

                ${PRECIO_FINAL_SQL}

            FROM libros l

            INNER JOIN autores a
                ON l.id_autor = a.id_autor

            INNER JOIN categorias c
                ON l.id_categoria = c.id_categoria

            LEFT JOIN inventario i
                ON l.id_libro = i.id_libro
            -- Los 3 libros con más unidades vendidas (ventas pagadas o
            -- entregadas). Solo alimenta la etiqueta "Más vendido": las
            -- cantidades no salen de la base.
            LEFT JOIN (
                SELECT dv.id_libro
                FROM detalle_venta dv
                INNER JOIN ventas v
                    ON v.id_venta = dv.id_venta
                WHERE v.estado IN ('pagada', 'entregada')
                GROUP BY dv.id_libro
                HAVING SUM(dv.cantidad) > 0
                ORDER BY SUM(dv.cantidad) DESC, dv.id_libro
                LIMIT 3
            ) top
                ON top.id_libro = l.id_libro

            WHERE l.id_libro = ?
        ) base
    `, [id]);

    return rows[0];
};

// ========================================
// CREAR LIBRO
// ========================================
const crear = async (libro) => {
    const {
        titulo,
        isbn,
        descripcion,
        precio,
        stock,
        portada,
        id_autor,
        id_categoria,
        estado,
        descuento_porcentaje,
        precio_oferta,
        descuento_hasta
    } = libro;

    const [resultado] = await pool.query(`
        INSERT INTO libros
        (
            titulo,
            isbn,
            descripcion,
            precio,
            stock,
            portada,
            id_autor,
            id_categoria,
            estado,
            descuento_porcentaje,
            precio_oferta,
            descuento_hasta
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    ]);

    return resultado.insertId;
};

// ========================================
// ACTUALIZAR LIBRO
//
// Los descuentos salen del bloque COALESCE a propósito. COALESCE(?, col)
// salta el campo cuando llega null, y quitar un descuento ES escribir
// null: con COALESCE sería imposible retirar una promoción una vez puesta.
// Se añaden dinámicamente al mismo UPDATE: undefined = no tocar,
// null = limpiar, sin dejar estados intermedios entre precio y oferta.
// ========================================
const actualizar = async (id, libro) => {
    const {
        titulo,
        isbn,
        descripcion,
        precio,
        stock,
        portada,
        id_autor,
        id_categoria,
        estado
    } = libro;

    // Precio y promoción se cambian atómicamente: el CHECK de oferta se
    // evalúa sobre la fila final, nunca sobre un estado intermedio inválido.
    const camposDescuento = [];
    const valoresDescuento = [];
    for (const campo of ['descuento_porcentaje', 'precio_oferta', 'descuento_hasta']) {
        if (libro[campo] !== undefined) {
            camposDescuento.push(`${campo} = ?`);
            valoresDescuento.push(libro[campo]);
        }
    }

    const [resultado] = await pool.query(`
        UPDATE libros
        SET
            titulo = COALESCE(?, titulo),
            isbn = COALESCE(?, isbn),
            descripcion = COALESCE(?, descripcion),
            precio = COALESCE(?, precio),
            stock = COALESCE(?, stock),
            portada = COALESCE(?, portada),
            id_autor = COALESCE(?, id_autor),
            id_categoria = COALESCE(?, id_categoria),
            estado = COALESCE(?, estado)
            ${camposDescuento.length ? `, ${camposDescuento.join(', ')}` : ''}
        WHERE id_libro = ?
    `, [
        titulo ?? null,
        isbn ?? null,
        descripcion ?? null,
        precio ?? null,
        stock ?? null,
        portada ?? null,
        id_autor ?? null,
        id_categoria ?? null,
        estado ?? null,
        ...valoresDescuento,
        id
    ]);

    if (!resultado.affectedRows) {
        return 0;
    }

    return resultado.affectedRows;
};

// ========================================
// ELIMINAR LIBRO
// ========================================
const eliminar = async (id) => {
    const [resultado] = await pool.query(`
        DELETE FROM libros
        WHERE id_libro = ?
    `, [id]);

    return resultado.affectedRows;
};

// Consulta acotada para la ficha pública. Usa los índices de autor/categoría
// existentes y exactamente el mismo precio SQL del catálogo y la compra.
const obtenerRelacionados = async (id) => {
    const [actuales] = await pool.query(`
        SELECT id_libro, id_autor, id_categoria FROM libros
        WHERE id_libro = ? AND estado = 1 LIMIT 1
    `, [id]);
    if (!actuales.length) return null;
    const actual = actuales[0];
    const candidatos = async (condicion, valores) => {
        const [rows] = await pool.query(`
            SELECT base.*, ${CAMPOS_DESCUENTO} FROM (
                SELECT l.id_libro, l.titulo, l.isbn, l.precio, l.portada,
                    l.id_autor, l.id_categoria, l.estado, l.creado_en,
                    COALESCE(i.stock, l.stock, 0) AS stock,
                    CONCAT(a.nombre, ' ', a.apellido) AS autor, c.nombre AS categoria,
                    ${PRECIO_FINAL_SQL}
                FROM libros l
                INNER JOIN autores a ON a.id_autor = l.id_autor
                INNER JOIN categorias c ON c.id_categoria = l.id_categoria
                LEFT JOIN inventario i ON i.id_libro = l.id_libro
                WHERE l.estado = 1 AND l.id_libro <> ? AND ${condicion}
                ORDER BY (COALESCE(i.stock, l.stock, 0) > 0) DESC, l.id_libro DESC
                LIMIT 8
            ) base
            ORDER BY (base.stock > 0) DESC, base.id_libro DESC
        `, [id, ...valores]);
        return rows;
    };
    const autor = await candidatos('l.id_autor = ?', [actual.id_autor]);
    // Separar aquí evita duplicar títulos del autor en recomendaciones de categoría.
    const categoria = await candidatos('l.id_categoria = ? AND l.id_autor <> ?', [actual.id_categoria, actual.id_autor]);
    const relacionados = [...autor.slice(0, 4), ...categoria.slice(0, Math.max(0, 4 - autor.length))];
    const usados = new Set(relacionados.map(l => l.id_libro));
    return {
        relacionados,
        mas_autor: autor.filter(l => !usados.has(l.id_libro)).slice(0, 4),
        interesarte: categoria.filter(l => !usados.has(l.id_libro)).slice(0, 4)
    };
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    PRECIO_FINAL_SQL,
    CAMPOS_DESCUENTO,
    obtenerTodos,
    obtenerPorId,
    obtenerRelacionados,
    crear,
    actualizar,
    eliminar
};
