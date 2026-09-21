const pool = require('../config/database');
const { VENTA, permitirTransicion } = require('../utils/transiciones');
const { consultarEstadoOrdenPayu } = require('../utils/payuStatus');
const { registrarMovimiento } = require('./inventario.model');

// ========================================
// OBTENER TODAS LAS VENTAS
// ========================================
const obtenerTodos = async () => {
    const [rows] = await pool.query(`
        SELECT
            v.id_venta,
            v.id_usuario,
            u.nombre AS nombre_usuario,
            u.apellido AS apellido_usuario,
            u.email AS correo_usuario,
            v.fecha_venta,
            v.total,
            v.costo_envio,
            v.estado,
            v.tipo_entrega,
            v.direccion,
            v.referencia,
            v.id_distrito,
            v.id_agencia,
            d.nombre AS distrito,
            p.nombre AS provincia,
            a.nombre AS agencia,
            v.correo_compra,
            v.external_reference,
            v.payu_order_id,
            v.payu_payment_id,
            v.payu_payment_status,
            v.payu_payer_email,
            v.cliente_documento,
            v.cliente_tipo_documento,
            EXISTS (
                SELECT 1
                FROM comprobantes cc
                WHERE cc.id_venta = v.id_venta
            ) AS tiene_comprobante
        FROM ventas v
        INNER JOIN usuarios u
            ON v.id_usuario = u.id_usuario
        LEFT JOIN distritos_lima d
            ON v.id_distrito = d.id_distrito
        LEFT JOIN provincias_lima p
            ON d.id_provincia = p.id_provincia
        LEFT JOIN agencias_courier a
            ON v.id_agencia = a.id_agencia
        ORDER BY v.id_venta DESC
    `);

    return rows;
};

// ========================================
// OBTENER UNA VENTA POR ID
// ========================================
const obtenerPorId = async (id) => {
    const [ventaRows] = await pool.query(`
        SELECT
            v.id_venta,
            v.id_usuario,
            u.nombre AS nombre_usuario,
            u.apellido AS apellido_usuario,
            u.email AS correo_usuario,
            v.fecha_venta,
            v.total,
            v.costo_envio,
            v.estado,
            v.tipo_entrega,
            v.direccion,
            v.referencia,
            v.id_distrito,
            v.id_agencia,
            d.nombre AS distrito,
            p.nombre AS provincia,
            a.nombre AS agencia,
            v.correo_compra,
            v.external_reference,
            v.payu_order_id,
            v.payu_payment_id,
            v.payu_payment_status,
            v.payu_payer_email,
            v.cliente_documento,
            v.cliente_tipo_documento,
            EXISTS (
                SELECT 1
                FROM comprobantes cc
                WHERE cc.id_venta = v.id_venta
            ) AS tiene_comprobante
        FROM ventas v
        INNER JOIN usuarios u
            ON v.id_usuario = u.id_usuario
        LEFT JOIN distritos_lima d
            ON v.id_distrito = d.id_distrito
        LEFT JOIN provincias_lima p
            ON d.id_provincia = p.id_provincia
        LEFT JOIN agencias_courier a
            ON v.id_agencia = a.id_agencia
        WHERE v.id_venta = ?
        LIMIT 1
    `, [id]);

    if (ventaRows.length === 0) {
        return null;
    }

    const [detalleRows] = await pool.query(`
        SELECT
            d.id_detalle,
            d.id_libro,
            l.titulo,
            d.cantidad,
            d.precio_unitario,
            d.subtotal
        FROM detalle_venta d
        INNER JOIN libros l
            ON d.id_libro = l.id_libro
        WHERE d.id_venta = ?
        ORDER BY d.id_detalle ASC
    `, [id]);

    return {
        ...ventaRows[0],
        detalles: detalleRows
    };
};

// ========================================
// OBTENER VENTAS POR USUARIO
// Devuelve TODOS los campos de la venta (incluyendo costo_envio,
// tipo_entrega, direccion, distrito, provincia, agencia,
// correo_compra y datos de pago MP) más un arreglo `detalle`
// con los ítems de detalle_venta JOIN libros.
// ========================================
const obtenerPorUsuario = async (id_usuario) => {
    const [rows] = await pool.query(`
        SELECT
            v.id_venta,
            v.id_usuario,
            v.fecha_venta,
            v.total,
            v.costo_envio,
            v.estado,
            v.tipo_entrega,
            v.direccion,
            v.referencia,
            v.id_distrito,
            v.id_agencia,
            d.nombre AS distrito,
            p.nombre AS provincia,
            a.nombre AS agencia,
            v.correo_compra,
            v.external_reference,
            v.payu_order_id,
            v.payu_payment_id,
            v.payu_payment_status,
            v.payu_payer_email,
            v.cliente_documento,
            v.cliente_tipo_documento,
            EXISTS (
                SELECT 1
                FROM comprobantes cc
                WHERE cc.id_venta = v.id_venta
            ) AS tiene_comprobante
        FROM ventas v
        LEFT JOIN distritos_lima d
            ON v.id_distrito = d.id_distrito
        LEFT JOIN provincias_lima p
            ON d.id_provincia = p.id_provincia
        LEFT JOIN agencias_courier a
            ON v.id_agencia = a.id_agencia
        WHERE v.id_usuario = ?
        ORDER BY v.id_venta DESC
    `, [id_usuario]);

    if (rows.length === 0) {
        return [];
    }

    const ids = rows.map((venta) => venta.id_venta);

    const placeholders =
        ids.map(() => '?').join(',');

    const [detalles] = await pool.query(`
        SELECT
            d.id_venta,
            d.id_libro,
            l.titulo,
            d.cantidad,
            d.precio_unitario,
            d.subtotal
        FROM detalle_venta d
        INNER JOIN libros l
            ON d.id_libro = l.id_libro
        WHERE d.id_venta IN (${placeholders})
        ORDER BY d.id_detalle ASC
    `, ids);

    const detallePorVenta = new Map();

    for (const detalle of detalles) {
        if (!detallePorVenta.has(detalle.id_venta)) {
            detallePorVenta.set(
                detalle.id_venta,
                []
            );
        }

        detallePorVenta.get(detalle.id_venta).push({
            id_libro: detalle.id_libro,
            titulo: detalle.titulo,
            cantidad: Number(detalle.cantidad),
            precio_unitario: Number(
                detalle.precio_unitario
            ),
            subtotal: Number(detalle.subtotal)
        });
    }

    return rows.map((venta) => ({
        ...venta,
        detalle:
            detallePorVenta.get(
                venta.id_venta
            ) || []
    }));
};

// ========================================
// AGRUPAR LIBROS REPETIDOS
// ========================================
const agruparDetalles = (detalles) => {
    const agrupados = new Map();

    for (const detalle of detalles) {
        const id_libro =
            Number(detalle.id_libro);

        const cantidad =
            Number(detalle.cantidad);

        if (
            !Number.isInteger(id_libro) ||
            id_libro <= 0
        ) {
            throw new Error(
                'El id del libro no es válido'
            );
        }

        if (
            !Number.isInteger(cantidad) ||
            cantidad <= 0
        ) {
            throw new Error(
                'La cantidad debe ser un número entero mayor a 0'
            );
        }

        if (agrupados.has(id_libro)) {
            agrupados.set(
                id_libro,
                agrupados.get(id_libro) +
                cantidad
            );
        } else {
            agrupados.set(
                id_libro,
                cantidad
            );
        }
    }

    return Array.from(
        agrupados,
        ([id_libro, cantidad]) => ({
            id_libro,
            cantidad
        })
    );
};

// ========================================
// CREAR VENTA
// ========================================
const crear = async (venta) => {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        const {
            id_usuario,
            detalles,
            tipo_entrega,
            direccion,
            referencia,
            correo_compra,
            external_reference,
            payu_order_id,
            idempotencia_clave,
            id_distrito,
            id_agencia,
            costo_envio,
            cliente_documento,
            cliente_tipo_documento,
            estado = 'pendiente'
        } = venta;

        if (
            !id_usuario ||
            !Array.isArray(detalles) ||
            detalles.length === 0
        ) {
            throw new Error(
                'Los datos de la venta no son válidos'
            );
        }

        // ========================================
        // AGRUPAR LIBROS REPETIDOS
        // ========================================
        const detallesAgrupados =
            agruparDetalles(detalles);

        let total = 0;

        const detallesProcesados = [];

        // ========================================
        // VALIDAR CADA LIBRO
        // ========================================
        for (
            const detalle
            of detallesAgrupados
        ) {
            const {
                id_libro,
                cantidad
            } = detalle;

            // ========================================
            // OBTENER LIBRO
            // ========================================
            const [libros] =
                await connection.query(`
                    SELECT
                        id_libro,
                        titulo,
                        precio,
                        estado
                    FROM libros
                    WHERE id_libro = ?
                    LIMIT 1
                `, [id_libro]);

            if (libros.length === 0) {
                throw new Error(
                    `El libro ${id_libro} no existe`
                );
            }

            const libro =
                libros[0];

            // ========================================
            // VERIFICAR LIBRO ACTIVO
            // ========================================
            if (
                Number(libro.estado) !== 1
            ) {
                throw new Error(
                    `El libro "${libro.titulo}" se encuentra inactivo`
                );
            }

            // ========================================
            // VALIDAR PRECIO
            // ========================================
            const precioUnitario =
                Number(libro.precio);

            if (
                !Number.isFinite(
                    precioUnitario
                ) ||
                precioUnitario < 0
            ) {
                throw new Error(
                    `El precio del libro "${libro.titulo}" no es válido`
                );
            }

            // ========================================
            // BLOQUEAR INVENTARIO
            // ========================================
            const [inventario] =
                await connection.query(`
                    SELECT
                        stock
                    FROM inventario
                    WHERE id_libro = ?
                    FOR UPDATE
                `, [id_libro]);

            if (
                inventario.length === 0
            ) {
                throw new Error(
                    `El libro "${libro.titulo}" no tiene inventario`
                );
            }

            const stockActual =
                Number(
                    inventario[0].stock
                );

            // ========================================
            // VALIDAR STOCK
            // ========================================
            if (
                stockActual < cantidad
            ) {
                throw new Error(
                    `Stock insuficiente para "${libro.titulo}". Disponible: ${stockActual}`
                );
            }

            // ========================================
            // CALCULAR SUBTOTAL
            // ========================================
            const subtotal =
                Number(
                    (
                        precioUnitario *
                        cantidad
                    ).toFixed(2)
                );

            total =
                Number(
                    (
                        total +
                        subtotal
                    ).toFixed(2)
                );

            detallesProcesados.push({
                id_libro,
                cantidad,
                titulo: libro.titulo,
                precio_unitario:
                    precioUnitario,
                subtotal
            });
        }

        // ========================================
        // INCLUIR COSTO DE ENVÍO EN EL TOTAL
        // (el cliente paga libros + envío)
        // ========================================
        total = Number(
            (
                total +
                Number(costo_envio || 0)
            ).toFixed(2)
        );

        // ========================================
        // CREAR CABECERA DE VENTA
        // ========================================
        const [ventaResultado] =
            await connection.query(`
                INSERT INTO ventas
                (
                    id_usuario,
                    total,
                    estado,
                    tipo_entrega,
                    direccion,
                    referencia,
                    correo_compra,
                    external_reference,
                    payu_order_id,
                    idempotencia_clave,
                    id_distrito,
                    id_agencia,
                    costo_envio,
                    cliente_documento,
                    cliente_tipo_documento
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id_usuario,
                total,
                estado,
                tipo_entrega || null,
                direccion || null,
                referencia || null,
                correo_compra || null,
                external_reference || null,
                payu_order_id || null,
                idempotencia_clave || null,
                id_distrito || null,
                id_agencia || null,
                costo_envio || 0,
                cliente_documento || null,
                cliente_tipo_documento || null
            ]);

        const idVenta =
            ventaResultado.insertId;

        // ========================================
        // CREAR DETALLES Y DESCONTAR STOCK
        // ========================================
        for (
            const detalle
            of detallesProcesados
        ) {
            await connection.query(`
                INSERT INTO detalle_venta
                (
                    id_venta,
                    id_libro,
                    cantidad,
                    precio_unitario,
                    subtotal
                )
                VALUES (?, ?, ?, ?, ?)
            `, [
                idVenta,
                detalle.id_libro,
                detalle.cantidad,
                detalle.precio_unitario,
                detalle.subtotal
            ]);

            await connection.query(`
                UPDATE inventario
                SET stock = stock - ?
                WHERE id_libro = ?
            `, [
                detalle.cantidad,
                detalle.id_libro
            ]);

            const [[{ stock: stockNuevo }]] = await connection.query(`
                SELECT stock
                FROM inventario
                WHERE id_libro = ?
            `, [detalle.id_libro]);

            await registrarMovimiento(connection, {
                id_libro: detalle.id_libro,
                id_usuario,
                tipo: 'salida',
                motivo: 'venta',
                cantidad: detalle.cantidad,
                stock_resultante: stockNuevo
            });
        }

        await connection.commit();

        return {
            id_venta: idVenta,
            total,
            costo_envio:
                costo_envio || 0,
            detalles: detallesProcesados
        };

    } catch (error) {
        await connection.rollback();

        throw error;

    } finally {
        connection.release();
    }
};

// ========================================
// OBTENER VENTA POR REFERENCIA EXTERNA (MP)
// ========================================
const buscarPorReferenciaExterna = async (externalReference) => {
    const [rows] = await pool.query(`
        SELECT
            v.id_venta,
            v.id_usuario,
            v.estado,
            v.total,
            v.costo_envio,
            v.external_reference,
            v.payu_order_id,
            v.payu_payment_id,
            v.payu_payment_status,
            v.correo_compra,
            v.cliente_documento,
            v.cliente_tipo_documento
        FROM ventas v
        WHERE v.external_reference = ?
        LIMIT 1
    `, [externalReference]);

    return rows[0] || null;
};

const buscarPorPayuOrderId = async (preferenceId) => {
    const [rows] = await pool.query(`
        SELECT
            v.id_venta,
            v.id_usuario,
            v.estado,
            v.total,
            v.costo_envio,
            v.external_reference,
            v.payu_order_id,
            v.payu_payment_id,
            v.payu_payment_status,
            v.correo_compra,
            v.cliente_documento,
            v.cliente_tipo_documento
        FROM ventas v
        WHERE v.payu_order_id = ?
        LIMIT 1
    `, [preferenceId]);

    return rows[0] || null;
};

// ========================================
// ACTUALIZAR DATOS DE PAGO (WEBHOOK)
// ========================================
const actualizarDatosPago = async ({
    external_reference,
    payu_order_id,
    payu_payment_id,
    payu_payment_status,
    payu_payer_email
}) => {
    const [resultado] = await pool.query(`
        UPDATE ventas
        SET
            payu_order_id = COALESCE(?, payu_order_id),
            payu_payment_id = COALESCE(?, payu_payment_id),
            payu_payment_status = COALESCE(?, payu_payment_status),
            payu_payer_email = COALESCE(?, payu_payer_email)
        WHERE external_reference = ?
    `, [
        payu_order_id ?? null,
        payu_payment_id ?? null,
        payu_payment_status ?? null,
        payu_payer_email ?? null,
        external_reference
    ]);

    return resultado.affectedRows;
};

// ========================================
// ACTUALIZAR ESTADO DE VENTA
// ========================================
const actualizarEstado = async (
    id,
    nuevoEstado
) => {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        // ========================================
        // BLOQUEAR VENTA
        // ========================================
        const [ventas] =
            await connection.query(`
                SELECT
                    id_venta,
                    estado
                FROM ventas
                WHERE id_venta = ?
                FOR UPDATE
            `, [id]);

        if (ventas.length === 0) {
            await connection.rollback();

            return 0;
        }

        const venta =
            ventas[0];

        // ========================================
        // MISMO ESTADO
        // ========================================
        if (
            venta.estado ===
            nuevoEstado
        ) {
            throw new Error(
                `La venta ya se encuentra en estado "${nuevoEstado}"`
            );
        }

        // ========================================
        // MÁQUINA DE ESTADOS (FUENTE ÚNICA: utils/transiciones)
        // ========================================
        const puedeCambiar =
            permitirTransicion(
                VENTA,
                venta.estado,
                nuevoEstado
            );

        if (!puedeCambiar) {
            throw new Error(
                `No se puede cambiar una venta de "${venta.estado}" a "${nuevoEstado}"`
            );
        }

        // ========================================
        // CANCELAR Y DEVOLVER STOCK
        // ========================================
        if (
            nuevoEstado ===
            'cancelada'
        ) {
            const [detalles] =
                await connection.query(`
                    SELECT
                        id_libro,
                        cantidad
                    FROM detalle_venta
                    WHERE id_venta = ?
                `, [id]);

            for (
                const detalle
                of detalles
            ) {
                await connection.query(`
                    UPDATE inventario
                    SET stock = stock + ?
                    WHERE id_libro = ?
                `, [
                    detalle.cantidad,
                    detalle.id_libro
                ]);

                const [[{ stock: stockNuevo }]] = await connection.query(`
                    SELECT stock
                    FROM inventario
                    WHERE id_libro = ?
                `, [detalle.id_libro]);

                await registrarMovimiento(connection, {
                    id_libro: detalle.id_libro,
                    id_usuario: null,
                    tipo: 'entrada',
                    motivo: 'cancelacion_venta',
                    cantidad: detalle.cantidad,
                    stock_resultante: stockNuevo
                });
            }
        }

        // ========================================
        // ACTUALIZAR VENTA
        // ========================================
        const [resultado] =
            await connection.query(`
                UPDATE ventas
                SET estado = ?
                WHERE id_venta = ?
            `, [
                nuevoEstado,
                id
            ]);

        await connection.commit();

        return resultado.affectedRows;

    } catch (error) {
        await connection.rollback();

        throw error;

    } finally {
        connection.release();
    }
};

// ========================================
// OBTENER DATOS DE PAGO DE UNA VENTA
// (para GET /ventas/:id/pago)
// ========================================
const obtenerDatosPago = async (id) => {
    const [rows] = await pool.query(`
        SELECT
            id_venta,
            id_usuario,
            fecha_venta,
            external_reference,
            payu_order_id,
            payu_payment_id,
            payu_payment_status,
            payu_payer_email,
            cliente_documento,
            cliente_tipo_documento,
            estado
        FROM ventas
        WHERE id_venta = ?
        LIMIT 1
    `, [id]);

    return rows[0] || null;
};

// ========================================
// LISTAR PAGOS PARA EL PANEL ADMIN
// (GET /pagos — ordena las ventas con sus datos de pago)
// Filtros opcionales:
//   estado    -> estado de la venta
//   q         -> búsqueda en nombre/apellido/email/external_reference
//   pagina, porPagina -> paginación (default 1 y 20)
// ========================================
const listarPagosAdmin = async ({
    estado,
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

    if (estado) {
        condiciones.push(
            'v.estado = ?'
        );
        valores.push(estado);
    }

    if (
        q &&
        String(q).trim()
    ) {
        const busqueda =
            `%${String(q).trim()}%`;

        condiciones.push(`(
            u.nombre LIKE ? OR
            u.apellido LIKE ? OR
            u.email LIKE ? OR
            v.external_reference LIKE ? OR
            v.cliente_documento LIKE ?
        )`);

        valores.push(
            busqueda,
            busqueda,
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
    // TOTAL (para paginación)
    // ========================================
    const [conteo] = await pool.query(`
        SELECT
            COUNT(*) AS total
        FROM ventas v
        INNER JOIN usuarios u
            ON v.id_usuario = u.id_usuario
        ${where}
    `, valores);

    const total =
        Number(
            conteo[0]?.total || 0
        );

    // ========================================
    // ÓRDENES CON DATOS DE PAGO
    // ========================================
    const [rows] = await pool.query(`
        SELECT
            v.id_venta,
            v.id_usuario,
            v.external_reference,
            v.payu_order_id,
            v.payu_payment_id,
            v.payu_payment_status,
            v.payu_payer_email,
            v.total,
            v.costo_envio,
            v.estado,
            v.tipo_entrega,
            v.fecha_venta,
            v.cliente_documento,
            v.cliente_tipo_documento,
            u.nombre AS nombre_usuario,
            u.apellido AS apellido_usuario,
            u.email AS correo_usuario
        FROM ventas v
        INNER JOIN usuarios u
            ON v.id_usuario = u.id_usuario
        ${where}
        ORDER BY v.id_venta DESC
        LIMIT ? OFFSET ?
    `, [...valores, porPaginaNum, offset]);

    return {
        pagos: rows.map((row) => ({
            id_venta: row.id_venta,
            id_pago: row.payu_payment_id,
            external_reference:
                row.external_reference,
            payu_order_id:
                row.payu_order_id,
            metodo_pago:
                row.external_reference
                    ? 'mercadopago'
                    : null,
            estado_venta:
                row.estado,
            estado_pago:
                row.payu_payment_status,
            monto_total:
                Number(row.total),
            tipo_entrega:
                row.tipo_entrega,
            fecha_creacion:
                row.fecha_venta,
            cliente: {
                id_usuario:
                    row.id_usuario,
                nombre_completo:
                    `${row.nombre_usuario || ''} ${row.apellido_usuario || ''}`.trim(),
                email:
                    row.correo_usuario,
                cliente_documento:
                    row.cliente_documento || null,
                cliente_tipo_documento:
                    row.cliente_tipo_documento || null
            }
        })),
        total,
        paginas:
            porPaginaNum > 0
                ? Math.ceil(
                    total / porPaginaNum
                )
                : 0
    };
};

// ========================================
// CANCELAR ÓRDENES DE VENTA ABANDONADAS
// (pendientes con más de `minutos` de antigüedad)
// Devuelve el stock de cada venta cancelada.
//
// Reglas:
//   - Ventas SIN external_reference (mostrador/pendiente) → cancelar
//     y devolver stock directamente.
//   - Ventas CON external_reference/payu_order_id → se consulta
//     PayU:
//       * pagado  → NO se cancela (el pago sí ocurrió) y no se
//                   devuelve stock.
//       * error   → API caída: no se cancela (evita liberar stock
//                   de una compra que pudo estar pagada).
//       * no pagado → cancelar y devolver stock.
//
// Trabaja por lotes de 50 con cursor id_venta para no saltar filas
// mientras las ventas canceladas desaparecen del filtro.
// Devuelve { canceladas, conPagoPendienteEnMP }.
// ========================================
const TAMANO_LOTE = 50;

const cancelarOrdenesAbandonadas = async (minutos = 30) => {
    let canceladas = 0;
    let conPagoPendienteEnMP = 0;

    let desdeId = 0;

    while (true) {
        const [lote] = await pool.query(`
            SELECT
                id_venta,
                external_reference,
                payu_order_id
            FROM ventas
            WHERE
                estado = 'pendiente'
                AND id_venta > ?
                AND fecha_venta < NOW() - (? * INTERVAL '1 MINUTE')
            ORDER BY id_venta ASC
            LIMIT ?
        `, [desdeId, minutos, TAMANO_LOTE]);

        if (lote.length === 0) {
            break;
        }

        for (const venta of lote) {
            desdeId = venta.id_venta;

            try {
                // ========================================
                // VENTA MOSTRADOR / PENDIENTE (sin PS)
                // ========================================
                if (
                    !venta.external_reference
                ) {
                    await actualizarEstado(
                        venta.id_venta,
                        'cancelada'
                    );
                    canceladas++;
                    continue;
                }

                // ========================================
                // VENTA CON ORDEN PAYU: CONSULTAR ESTADO REAL
                // ========================================
                const estadoPayu =
                    await consultarEstadoOrdenPayu({
                        externalReference:
                            venta.external_reference ||
                            null,
                        orderId:
                            venta.payu_order_id ||
                            null
                    });

                // API caída: no cancelar para no liberar
                // stock de una compra posiblemente pagada.
                if (estadoPayu.error) {
                    console.error(
                        `[venta] No se pudo consultar PayU para la venta ${venta.id_venta}: ${estadoPayu.mensaje}`
                    );
                    continue;
                }

                // Pago REALMENTE ocurrido en PayU: no cancelar.
                if (estadoPayu.pagado) {
                    console.log(
                        `[venta] Orden PayU pagada detectada, no se cancela id=${venta.id_venta} (${estadoPayu.status || 'aprobado'})`
                    );
                    conPagoPendienteEnMP++;
                    continue;
                }

                // Un pago pendiente/en proceso puede confirmarse después.
                // No se devuelve stock mientras PayU lo siga procesando.
                if (estadoPayu.pendiente) {
                    console.log(
                        `[venta] Orden PayU aún en proceso, no se cancela id=${venta.id_venta} (${estadoPayu.status})`
                    );
                    conPagoPendienteEnMP++;
                    continue;
                }

                // Orden viva pero no pagada: cancelar + stock.
                await actualizarEstado(
                    venta.id_venta,
                    'cancelada'
                );
                canceladas++;

            } catch (error) {
                console.error(
                    `[venta] No se pudo cancelar la venta ${venta.id_venta}:`,
                    error.message
                );
            }
        }

        if (lote.length < TAMANO_LOTE) {
            break;
        }
    }

    return {
        canceladas,
        conPagoPendienteEnMP
    };
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    obtenerTodos,
    obtenerPorId,
    obtenerPorUsuario,
    buscarPorReferenciaExterna,
    buscarPorPayuOrderId,
    crear,
    actualizarDatosPago,
    actualizarEstado,
    agruparDetalles,
    obtenerDatosPago,
    listarPagosAdmin,
    cancelarOrdenesAbandonadas
};
