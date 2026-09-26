const pool = require('../config/database');

// Ingresos = ventas cobradas: pagadas o ya entregadas (una venta entregada
// sigue siendo un ingreso). Las canceladas y reembolsadas no cuentan.
//
// Fechas en hora de Perú: `fecha_venta` se guarda en la zona del servidor
// (UTC en Render); sin convertir, una venta de las 8 p. m. contaría como
// del día siguiente.
const FECHA_LIMA = "((fecha_venta AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'America/Lima')";
const HOY_LIMA = "((NOW() AT TIME ZONE 'America/Lima')::date)";

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
        WHERE estado IN ('pagada', 'entregada')
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
            l.portada,
            SUM(d.cantidad) AS cantidad_vendida,
            COALESCE(SUM(d.subtotal), 0) AS total_generado
        FROM detalle_venta d
        INNER JOIN ventas v
            ON d.id_venta = v.id_venta
        INNER JOIN libros l
            ON d.id_libro = l.id_libro
        WHERE v.estado IN ('pagada', 'entregada')
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
            EXTRACT(YEAR FROM ${FECHA_LIMA}) AS anio,
            EXTRACT(MONTH FROM ${FECHA_LIMA}) AS mes_numero,

            CASE EXTRACT(MONTH FROM ${FECHA_LIMA})
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

        WHERE estado IN ('pagada', 'entregada')

        GROUP BY
            EXTRACT(YEAR FROM ${FECHA_LIMA}),
            EXTRACT(MONTH FROM ${FECHA_LIMA})

        ORDER BY
            EXTRACT(YEAR FROM ${FECHA_LIMA}) DESC,
            EXTRACT(MONTH FROM ${FECHA_LIMA}) DESC

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
            DATE(${FECHA_LIMA}) AS fecha,

            EXTRACT(DAY FROM ${FECHA_LIMA}) AS dia,

            EXTRACT(MONTH FROM ${FECHA_LIMA}) AS mes_numero,

            EXTRACT(YEAR FROM ${FECHA_LIMA}) AS anio,

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

        WHERE estado IN ('pagada', 'entregada')

        GROUP BY
            DATE(${FECHA_LIMA}),
            EXTRACT(DAY FROM ${FECHA_LIMA}),
            EXTRACT(MONTH FROM ${FECHA_LIMA}),
            EXTRACT(YEAR FROM ${FECHA_LIMA})

        ORDER BY
            DATE(${FECHA_LIMA}) DESC

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

        WHERE estado IN ('pagada', 'entregada')
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
            estado IN ('pagada', 'entregada')
            AND DATE(${FECHA_LIMA}) = ${HOY_LIMA}
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
            estado IN ('pagada', 'entregada')
            AND EXTRACT(YEAR FROM ${FECHA_LIMA}) = EXTRACT(YEAR FROM ${HOY_LIMA})
            AND EXTRACT(MONTH FROM ${FECHA_LIMA}) = EXTRACT(MONTH FROM ${HOY_LIMA})
    `);

    const [[mejorMes]] = await pool.query(`
        SELECT
            EXTRACT(YEAR FROM ${FECHA_LIMA}) AS anio,
            EXTRACT(MONTH FROM ${FECHA_LIMA}) AS mes_numero,

            CASE EXTRACT(MONTH FROM ${FECHA_LIMA})
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

        WHERE estado IN ('pagada', 'entregada')

        GROUP BY
            EXTRACT(YEAR FROM ${FECHA_LIMA}),
            EXTRACT(MONTH FROM ${FECHA_LIMA})

        ORDER BY
            total_vendido DESC,
            cantidad_ventas DESC

        LIMIT 1
    `);

    const [[mejorDia]] = await pool.query(`
        SELECT
            DATE(${FECHA_LIMA}) AS fecha,

            COUNT(*) AS cantidad_ventas,

            COALESCE(
                SUM(total),
                0
            ) AS total_vendido

        FROM ventas

        WHERE estado IN ('pagada', 'entregada')

        GROUP BY
            DATE(${FECHA_LIMA})

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
// ========================================
// CIERRE DE CAJA DEL DÍA (hora de Perú)
// ----------------------------------------
// Cobros del día por medio de pago (mostrador y reservas: el método
// registrado; pedidos de la app: PayU), reembolsos del día y neto.
// Una venta reembolsada después cuenta como cobro el día que se cobró
// y como reembolso el día que se devolvió.
// ========================================
const MEDIO = "CASE WHEN v.origen IN ('panel', 'reserva') THEN COALESCE(v.metodo_pago, 'efectivo') ELSE 'payu' END";
const EN_LIMA = (columna) =>
    `((${columna} AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'America/Lima')`;

const obtenerCierreCaja = async (fecha) => {
    const [cobros] = await pool.query(`
        SELECT ${MEDIO} AS medio,
               COUNT(*) AS cantidad,
               COALESCE(SUM(v.total), 0) AS total
        FROM ventas v
        WHERE v.estado IN ('pagada', 'entregada', 'reembolsada')
          AND DATE(${EN_LIMA('COALESCE(v.fecha_pago, v.fecha_venta)')}) = ?::date
        GROUP BY 1
    `, [fecha]);

    const [reembolsos] = await pool.query(`
        SELECT ${MEDIO} AS medio,
               COUNT(*) AS cantidad,
               COALESCE(SUM(v.total), 0) AS total
        FROM ventas v
        WHERE v.estado = 'reembolsada'
          AND v.fecha_reembolso IS NOT NULL
          AND DATE(${EN_LIMA('v.fecha_reembolso')}) = ?::date
        GROUP BY 1
    `, [fecha]);

    const [ventas] = await pool.query(`
        SELECT v.id_venta,
               v.origen,
               v.estado,
               v.total,
               v.metodo_pago,
               v.referencia_pago,
               v.payu_order_id,
               ${MEDIO} AS medio,
               TO_CHAR(${EN_LIMA('COALESCE(v.fecha_pago, v.fecha_venta)')}, 'HH24:MI') AS hora,
               CASE WHEN v.origen = 'panel'
                    THEN COALESCE(v.cliente_nombre, 'Cliente de mostrador')
                    ELSE COALESCE(v.cliente_nombre, TRIM(u.nombre || ' ' || u.apellido))
               END AS cliente
        FROM ventas v
        LEFT JOIN usuarios u ON u.id_usuario = v.id_usuario
        WHERE v.estado IN ('pagada', 'entregada', 'reembolsada')
          AND DATE(${EN_LIMA('COALESCE(v.fecha_pago, v.fecha_venta)')}) = ?::date
        ORDER BY COALESCE(v.fecha_pago, v.fecha_venta) ASC
    `, [fecha]);

    const [[comprobantes]] = await pool.query(`
        SELECT COUNT(*) AS emitidos,
               COALESCE(SUM(CASE WHEN numero_sunat IS NULL THEN 1 ELSE 0 END), 0) AS sin_sunat
        FROM comprobantes
        WHERE estado = 'emitido'
          AND DATE(${EN_LIMA('fecha_emision')}) = ?::date
    `, [fecha]);

    const medios = {};
    const asegurar = (medio) => {
        medios[medio] = medios[medio] || { medio, cobrado: 0, cobros: 0, reembolsado: 0, reembolsos: 0 };
        return medios[medio];
    };
    for (const fila of cobros) {
        const m = asegurar(fila.medio);
        m.cobrado = Number(fila.total);
        m.cobros = Number(fila.cantidad);
    }
    for (const fila of reembolsos) {
        const m = asegurar(fila.medio);
        m.reembolsado = Number(fila.total);
        m.reembolsos = Number(fila.cantidad);
    }
    const porMedio = Object.values(medios).map((m) => ({
        ...m,
        neto: Number((m.cobrado - m.reembolsado).toFixed(2))
    }));
    const suma = (campo) => Number(porMedio.reduce((acc, m) => acc + m[campo], 0).toFixed(2));

    return {
        fecha,
        por_medio: porMedio,
        totales: {
            cobrado: suma('cobrado'),
            reembolsado: suma('reembolsado'),
            neto: suma('neto'),
            cobros: porMedio.reduce((acc, m) => acc + m.cobros, 0),
            reembolsos: porMedio.reduce((acc, m) => acc + m.reembolsos, 0)
        },
        ventas: ventas.map((v) => ({ ...v, total: Number(v.total) })),
        comprobantes: {
            emitidos: Number(comprobantes.emitidos || 0),
            sin_sunat: Number(comprobantes.sin_sunat || 0)
        }
    };
};

module.exports = {
    obtenerResumenGeneral,
    obtenerLibrosMasVendidos,
    obtenerVentasPorEstado,
    obtenerReservasPorEstado,
    obtenerStockBajo,
    obtenerVentasPorMes,
    obtenerVentasPorDia,
    obtenerIndicadoresVentas,
    obtenerCierreCaja
};