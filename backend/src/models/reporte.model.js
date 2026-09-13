const pool = require('../config/database');

// ========================================
// REPORTE GENERAL DEL SISTEMA
// ========================================
const obtenerResumenGeneral = async () => {
    const [[libros]] = await pool.query(`
        SELECT COUNT(*) AS total_libros
        FROM libros
    `);

    const [[autores]] = await pool.query(`
        SELECT COUNT(*) AS total_autores
        FROM autores
    `);

    const [[categorias]] = await pool.query(`
        SELECT COUNT(*) AS total_categorias
        FROM categorias
    `);

    const [[usuarios]] = await pool.query(`
        SELECT COUNT(*) AS total_usuarios
        FROM usuarios
    `);

    const [[ventas]] = await pool.query(`
        SELECT
            COUNT(*) AS total_ventas,
            COALESCE(SUM(total), 0) AS total_vendido
        FROM ventas
        WHERE estado = 'pagada'
    `);

    const [[reservas]] = await pool.query(`
        SELECT COUNT(*) AS total_reservas
        FROM reservas
    `);

    const [[stockBajo]] = await pool.query(`
        SELECT COUNT(*) AS libros_stock_bajo
        FROM inventario
        WHERE stock <= stock_minimo
    `);

    return {
        total_libros: libros.total_libros,
        total_autores: autores.total_autores,
        total_categorias: categorias.total_categorias,
        total_usuarios: usuarios.total_usuarios,
        total_ventas: ventas.total_ventas,
        total_vendido: ventas.total_vendido,
        total_reservas: reservas.total_reservas,
        libros_stock_bajo: stockBajo.libros_stock_bajo
    };
};

// ========================================
// LIBROS MÁS VENDIDOS
// ========================================
const obtenerLibrosMasVendidos = async () => {
    const [rows] = await pool.query(`
        SELECT
            l.id_libro,
            l.titulo,
            SUM(d.cantidad) AS cantidad_vendida,
            COALESCE(SUM(d.subtotal), 0) AS total_generado
        FROM detalle_venta d
        INNER JOIN ventas v
            ON d.id_venta = v.id_venta
        INNER JOIN libros l
            ON d.id_libro = l.id_libro
        WHERE v.estado = 'pagada'
        GROUP BY
            l.id_libro,
            l.titulo
        ORDER BY
            cantidad_vendida DESC,
            total_generado DESC,
            l.titulo ASC
    `);

    return rows;
};

// ========================================
// VENTAS POR ESTADO
// ========================================
const obtenerVentasPorEstado = async () => {
    const [rows] = await pool.query(`
        SELECT
            estado,
            COUNT(*) AS cantidad,
            COALESCE(SUM(total), 0) AS total
        FROM ventas
        GROUP BY estado
        ORDER BY cantidad DESC
    `);

    return rows;
};

// ========================================
// RESERVAS POR ESTADO
// ========================================
const obtenerReservasPorEstado = async () => {
    const [rows] = await pool.query(`
        SELECT
            estado,
            COUNT(*) AS cantidad
        FROM reservas
        GROUP BY estado
        ORDER BY cantidad DESC
    `);

    return rows;
};

// ========================================
// STOCK BAJO
// ========================================
const obtenerStockBajo = async () => {
    const [rows] = await pool.query(`
        SELECT
            i.id_inventario,
            i.id_libro,
            l.titulo,
            i.stock,
            i.stock_minimo,
            i.ubicacion
        FROM inventario i
        INNER JOIN libros l
            ON i.id_libro = l.id_libro
        WHERE i.stock <= i.stock_minimo
        ORDER BY
            i.stock ASC,
            l.titulo ASC
    `);

    return rows;
};

// ========================================
// VENTAS PAGADAS POR MES
// ========================================
const obtenerVentasPorMes = async () => {
    const [rows] = await pool.query(`
        SELECT
            EXTRACT(YEAR FROM fecha_venta) AS anio,
            EXTRACT(MONTH FROM fecha_venta) AS mes_numero,

            CASE EXTRACT(MONTH FROM fecha_venta)
                WHEN 1 THEN 'Ene'
                WHEN 2 THEN 'Feb'
                WHEN 3 THEN 'Mar'
                WHEN 4 THEN 'Abr'
                WHEN 5 THEN 'May'
                WHEN 6 THEN 'Jun'
                WHEN 7 THEN 'Jul'
                WHEN 8 THEN 'Ago'
                WHEN 9 THEN 'Sep'
                WHEN 10 THEN 'Oct'
                WHEN 11 THEN 'Nov'
                WHEN 12 THEN 'Dic'
            END AS mes,

            COUNT(*) AS cantidad_ventas,

            COALESCE(
                SUM(total),
                0
            ) AS total_vendido,

            COALESCE(
                AVG(total),
                0
            ) AS promedio_venta

        FROM ventas

        WHERE estado = 'pagada'

        GROUP BY
            EXTRACT(YEAR FROM fecha_venta),
            EXTRACT(MONTH FROM fecha_venta)

        ORDER BY
            EXTRACT(YEAR FROM fecha_venta) DESC,
            EXTRACT(MONTH FROM fecha_venta) DESC

        LIMIT 12
    `);

    return rows.reverse();
};

// ========================================
// VENTAS PAGADAS POR DÍA
// ========================================
const obtenerVentasPorDia = async () => {
    const [rows] = await pool.query(`
        SELECT
            DATE(fecha_venta) AS fecha,

            EXTRACT(DAY FROM fecha_venta) AS dia,

            EXTRACT(MONTH FROM fecha_venta) AS mes_numero,

            EXTRACT(YEAR FROM fecha_venta) AS anio,

            COUNT(*) AS cantidad_ventas,

            COALESCE(
                SUM(total),
                0
            ) AS total_vendido,

            COALESCE(
                AVG(total),
                0
            ) AS promedio_venta,

            COALESCE(
                MAX(total),
                0
            ) AS venta_mayor

        FROM ventas

        WHERE estado = 'pagada'

        GROUP BY
            DATE(fecha_venta),
            EXTRACT(DAY FROM fecha_venta),
            EXTRACT(MONTH FROM fecha_venta),
            EXTRACT(YEAR FROM fecha_venta)

        ORDER BY
            DATE(fecha_venta) DESC

        LIMIT 30
    `);

    return rows.reverse();
};

// ========================================
// INDICADORES GENERALES DE VENTAS
// ========================================
const obtenerIndicadoresVentas = async () => {
    const [[general]] = await pool.query(`
        SELECT
            COUNT(*) AS total_ventas_pagadas,

            COALESCE(
                SUM(total),
                0
            ) AS total_vendido,

            COALESCE(
                AVG(total),
                0
            ) AS ticket_promedio,

            COALESCE(
                MAX(total),
                0
            ) AS venta_mayor,

            COALESCE(
                MIN(total),
                0
            ) AS venta_menor

        FROM ventas

        WHERE estado = 'pagada'
    `);

    const [[hoy]] = await pool.query(`
        SELECT
            COUNT(*) AS ventas_hoy,

            COALESCE(
                SUM(total),
                0
            ) AS vendido_hoy

        FROM ventas

        WHERE
            estado = 'pagada'
            AND DATE(fecha_venta) = CURRENT_DATE
    `);

    const [[mesActual]] = await pool.query(`
        SELECT
            COUNT(*) AS ventas_mes_actual,

            COALESCE(
                SUM(total),
                0
            ) AS vendido_mes_actual

        FROM ventas

        WHERE
            estado = 'pagada'
            AND EXTRACT(YEAR FROM fecha_venta) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND EXTRACT(MONTH FROM fecha_venta) = EXTRACT(MONTH FROM CURRENT_DATE)
    `);

    const [[mejorMes]] = await pool.query(`
        SELECT
            EXTRACT(YEAR FROM fecha_venta) AS anio,
            EXTRACT(MONTH FROM fecha_venta) AS mes_numero,

            CASE EXTRACT(MONTH FROM fecha_venta)
                WHEN 1 THEN 'Enero'
                WHEN 2 THEN 'Febrero'
                WHEN 3 THEN 'Marzo'
                WHEN 4 THEN 'Abril'
                WHEN 5 THEN 'Mayo'
                WHEN 6 THEN 'Junio'
                WHEN 7 THEN 'Julio'
                WHEN 8 THEN 'Agosto'
                WHEN 9 THEN 'Septiembre'
                WHEN 10 THEN 'Octubre'
                WHEN 11 THEN 'Noviembre'
                WHEN 12 THEN 'Diciembre'
            END AS mes,

            COUNT(*) AS cantidad_ventas,

            COALESCE(
                SUM(total),
                0
            ) AS total_vendido

        FROM ventas

        WHERE estado = 'pagada'

        GROUP BY
            EXTRACT(YEAR FROM fecha_venta),
            EXTRACT(MONTH FROM fecha_venta)

        ORDER BY
            total_vendido DESC,
            cantidad_ventas DESC

        LIMIT 1
    `);

    const [[mejorDia]] = await pool.query(`
        SELECT
            DATE(fecha_venta) AS fecha,

            COUNT(*) AS cantidad_ventas,

            COALESCE(
                SUM(total),
                0
            ) AS total_vendido

        FROM ventas

        WHERE estado = 'pagada'

        GROUP BY
            DATE(fecha_venta)

        ORDER BY
            total_vendido DESC,
            cantidad_ventas DESC

        LIMIT 1
    `);

    return {
        total_ventas_pagadas:
            general.total_ventas_pagadas,

        total_vendido:
            general.total_vendido,

        ticket_promedio:
            general.ticket_promedio,

        venta_mayor:
            general.venta_mayor,

        venta_menor:
            general.venta_menor,

        ventas_hoy:
            hoy.ventas_hoy,

        vendido_hoy:
            hoy.vendido_hoy,

        ventas_mes_actual:
            mesActual.ventas_mes_actual,

        vendido_mes_actual:
            mesActual.vendido_mes_actual,

        mejor_mes:
            mejorMes
                ? {
                    anio:
                        mejorMes.anio,

                    mes_numero:
                        mejorMes.mes_numero,

                    mes:
                        mejorMes.mes,

                    cantidad_ventas:
                        mejorMes.cantidad_ventas,

                    total_vendido:
                        mejorMes.total_vendido
                }
                : null,

        mejor_dia:
            mejorDia
                ? {
                    fecha:
                        mejorDia.fecha,

                    cantidad_ventas:
                        mejorDia.cantidad_ventas,

                    total_vendido:
                        mejorDia.total_vendido
                }
                : null
    };
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    obtenerResumenGeneral,
    obtenerLibrosMasVendidos,
    obtenerVentasPorEstado,
    obtenerReservasPorEstado,
    obtenerStockBajo,
    obtenerVentasPorMes,
    obtenerVentasPorDia,
    obtenerIndicadoresVentas
};