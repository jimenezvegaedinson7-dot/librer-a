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
    ${COLUMNAS_DESCUENTO}
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

                ${PRECIO_FINAL_SQL}

            FROM libros l

            INNER JOIN autores a
                ON l.id_autor = a.id_autor

            INNER JOIN categorias c
                ON l.id_categoria = c.id_categoria

            LEFT JOIN inventario i
                ON l.id_libro = i.id_libro
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

                ${PRECIO_FINAL_SQL}

            FROM libros l

            INNER JOIN autores a
                ON l.id_autor = a.id_autor

            INNER JOIN categorias c
                ON l.id_categoria = c.id_categoria

            LEFT JOIN inventario i
                ON l.id_libro = i.id_libro

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
// Por eso van aparte, donde undefined = no tocar y null = limpiar.
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
        id
    ]);

    if (!resultado.affectedRows) {
        return 0;
    }

    await actualizarDescuentos(id, libro);

    return resultado.affectedRows;
};

// ========================================
// ACTUALIZAR DESCUENTOS
// Query aparte para poder distinguir "no tocar" de "poner en null".
// Solo escribe: toda la validación vive en el controlador, y repetirla
// aquí es justo cómo una oferta inválida se acepta por un camino y se
// rechaza por el otro.
// ========================================
const actualizarDescuentos = async (id, libro) => {
    const {
        descuento_porcentaje,
        precio_oferta,
        descuento_hasta
    } = libro;

    const algunoViene =
        descuento_porcentaje !== undefined ||
        precio_oferta !== undefined ||
        descuento_hasta !== undefined;

    if (!algunoViene) {
        return;
    }

    const campos = [];
    const valores = [];

    if (descuento_porcentaje !== undefined) {
        campos.push('descuento_porcentaje = ?');
        valores.push(descuento_porcentaje);
    }

    if (precio_oferta !== undefined) {
        campos.push('precio_oferta = ?');
        valores.push(precio_oferta);
    }

    if (descuento_hasta !== undefined) {
        campos.push('descuento_hasta = ?');
        valores.push(descuento_hasta);
    }

    if (!campos.length) {
        return;
    }

    await pool.query(
        `
        UPDATE libros
        SET ${campos.join(', ')}
        WHERE id_libro = ?
    `,
        [...valores, id]
    );
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

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    PRECIO_FINAL_SQL,
    obtenerTodos,
    obtenerPorId,
    crear,
    actualizar,
    eliminar
};