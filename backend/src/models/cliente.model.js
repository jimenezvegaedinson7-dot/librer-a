const pool = require('../config/database');

// ========================================
// LISTAR CLIENTES PARA EL PANEL ADMIN
// GET /api/clientes (admin)
//
// Clientes = usuarios con rol 'cliente' O que hayan hecho compras.
// Se muestran con:
//   numero_compras  -> COUNT de ventas NO canceladas
//   total_gastado   -> SUM(total) de ventas NO canceladas
//   ultima_compra   -> MAX(fecha_venta) de ventas NO canceladas
// Filtros: q (nombre/apellido/email), pagina/porPagina.
// Orden: total_gastado DESC.
// Devuelve { clientes, total, paginas }.
// ========================================
const listarClientes = async ({
    q,
    pagina,
    porPagina
} = {}) => {
    const paginaNum =
        Math.max(
            1,
            parseInt(pagina, 10) || 1
        );

    const porPaginaNum =
        Math.min(
            100,
            Math.max(
                1,
                parseInt(porPagina, 10) || 20
            )
        );

    const offset =
        (paginaNum - 1) *
        porPaginaNum;

    const condiciones = [];
    const valores = [];

    // Incluye clientes con rol 'cliente' y cualquier usuario con
    // al menos una venta NO cancelada (p.ej. quedaron con rol admin
    // pero compran desde la app móvil).
    condiciones.push(`(
        u.rol = 'cliente'
        OR EXISTS (
            SELECT 1
            FROM ventas vv
            WHERE vv.id_usuario = u.id_usuario
              AND vv.estado <> 'cancelada'
        )
    )`);

    if (
        q &&
        String(q).trim()
    ) {
        const busqueda =
            `%${String(q).trim()}%`;

        condiciones.push(`(
            u.nombre LIKE ? OR
            u.apellido LIKE ? OR
            u.email LIKE ?
        )`);

        valores.push(
            busqueda,
            busqueda,
            busqueda
        );
    }

    const where =
        condiciones.length > 0
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

    // ========================================
    // TOTAL (PARA PAGINACIÓN)
    // ========================================
    const [conteo] = await pool.query(`
        SELECT
            COUNT(*) AS total
        FROM usuarios u
        ${where}
    `, valores);

    const total =
        Number(
            conteo[0]?.total || 0
        );

    // ========================================
    // RESUMEN GLOBAL (NO depende de la página)
    // total_general = SUM(total_gastado) de los clientes
    //   del filtro (ventas NO canceladas).
    // con_compras   = cantidad de clientes con al menos
    //   una compra (numero_compras > 0).
    // ========================================
    const [resumenFilas] = await pool.query(`
        SELECT
            COALESCE(
                SUM(
                    CASE
                        WHEN v.id_venta IS NOT NULL
                         AND v.estado <> 'cancelada'
                        THEN v.total
                        ELSE 0
                    END
                ),
                0
            ) AS total_general,
            COUNT(
                DISTINCT CASE
                    WHEN v.id_venta IS NOT NULL
                     AND v.estado <> 'cancelada'
                    THEN u.id_usuario
                END
            ) AS con_compras
        FROM usuarios u
        LEFT JOIN ventas v
            ON v.id_usuario = u.id_usuario
        ${where}
    `, valores);

    // ========================================
    // CLIENTES CON RESUMEN DE COMPRAS
    // ========================================
    const [filas] = await pool.query(`
        SELECT
            u.id_usuario,
            u.nombre,
            u.apellido,
            u.email,
            u.telefono,
            u.foto_perfil,
            u.rol,
            u.estado,
            u.fecha_registro,
            COUNT(
                CASE
                    WHEN v.id_venta IS NOT NULL
                     AND v.estado <> 'cancelada'
                    THEN 1
                END
            ) AS numero_compras,
            COALESCE(
                SUM(
                    CASE
                        WHEN v.estado <> 'cancelada'
                        THEN v.total
                        ELSE 0
                    END
                ),
                0
            ) AS total_gastado,
            MAX(
                CASE
                    WHEN v.estado <> 'cancelada'
                    THEN v.fecha_venta
                END
            ) AS ultima_compra
        FROM usuarios u
        LEFT JOIN ventas v
            ON v.id_usuario = u.id_usuario
        ${where}
        GROUP BY
            u.id_usuario,
            u.nombre,
            u.apellido,
            u.email,
            u.telefono,
            u.foto_perfil,
            u.rol,
            u.estado,
            u.fecha_registro
        ORDER BY
            total_gastado DESC,
            u.id_usuario DESC
        LIMIT ? OFFSET ?
    `, [...valores, porPaginaNum, offset]);

    return {
        clientes: filas.map((fila) => ({
            id_usuario: fila.id_usuario,
            nombre: fila.nombre,
            apellido: fila.apellido,
            nombre_completo:
                `${fila.nombre || ''} ${fila.apellido || ''}`
                    .trim(),
            email: fila.email,
            telefono: fila.telefono,
            foto_perfil: fila.foto_perfil,
            rol: fila.rol,
            estado: fila.estado,
            fecha_registro: fila.fecha_registro,
            numero_compras: Number(
                fila.numero_compras
            ),
            total_gastado: Number(
                fila.total_gastado
            ),
            ultima_compra:
                fila.ultima_compra || null
        })),
        total,
        paginas:
            porPaginaNum > 0
                ? Math.ceil(
                    total / porPaginaNum
                )
                : 0,
        resumen: {
            total_general: Number(
                resumenFilas[0]?.total_general || 0
            ),
            con_compras: Number(
                resumenFilas[0]?.con_compras || 0
            )
        }
    };
};

module.exports = {
    listarClientes
};