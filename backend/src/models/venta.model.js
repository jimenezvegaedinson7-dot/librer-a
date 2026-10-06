const pool = require('../config/database');
const { PRECIO_FINAL_SQL } = require('./libro.model');
const {
    VENTA,
    permitirTransicion,
    permitirTransicionEntrega,
    esTipoEntregaValido,
    esVentaHistorica,
    TIPOS_ENTREGA
} = require('../utils/transiciones');
const { consultarEstadoOrdenPayu, montoPagoCoincide, debeActualizarEstadoPago } = require('../utils/payuStatus');
const { registrarMovimiento } = require('./inventario.model');
const zonaDeliveryModel = require('./zonaDelivery.model');
const { validarId } = require('../utils/validaciones');
const { esReembolsoElegible } = require('../utils/devoluciones');

// ========================================
// OBTENER TODAS LAS VENTAS
// ========================================
const obtenerTodos = async () => {
    const [rows] = await pool.query(`
        SELECT
            v.pago_revision_motivo,
            v.pago_revision_fecha,
            v.reembolso_referencia,
            v.reembolso_evidencia,
            v.estado_reembolso, v.fecha_solicitud_reembolso, v.reembolso_solicitado_por, v.reembolso_confirmado_por,
            v.id_venta,
            v.id_usuario,
            u.nombre AS nombre_usuario,
            u.apellido AS apellido_usuario,
            u.email AS correo_usuario,
            v.fecha_venta,
            v.total,
            v.costo_envio,
            v.estado,
            v.estado_entrega,
            v.tipo_entrega,
            v.cobertura_entrega,
            v.canal_compra,
            v.id_zona_delivery,
            v.zona_delivery_nombre,
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
            v.cliente_nombre,
            v.origen,
            v.metodo_pago,
            v.referencia_pago,
            v.fecha_pago,
            v.id_reserva,
            v.motivo_reembolso,
            v.fecha_reembolso,
            EXISTS (
                SELECT 1
                FROM comprobantes cc
                WHERE cc.id_venta = v.id_venta
                  AND cc.estado = 'emitido'
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

    return rows.map(venta => ({ ...venta, reembolso_elegible: esReembolsoElegible(venta) }));
};

// ========================================
// OBTENER UNA VENTA POR ID
// ========================================
const obtenerPorId = async (id) => {
    const [ventaRows] = await pool.query(`
        SELECT
            v.pago_revision_motivo,
            v.pago_revision_fecha,
            v.reembolso_referencia,
            v.reembolso_evidencia,
            v.estado_reembolso, v.fecha_solicitud_reembolso, v.reembolso_solicitado_por, v.reembolso_confirmado_por,
            v.id_venta,
            v.id_usuario,
            u.nombre AS nombre_usuario,
            u.apellido AS apellido_usuario,
            u.email AS correo_usuario,
            v.fecha_venta,
            v.total,
            v.costo_envio,
            v.estado,
            v.estado_entrega,
            v.tipo_entrega,
            v.cobertura_entrega,
            v.canal_compra,
            v.id_zona_delivery,
            v.zona_delivery_nombre,
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
            v.cliente_nombre,
            v.origen,
            v.metodo_pago,
            v.referencia_pago,
            v.fecha_pago,
            v.id_reserva,
            v.motivo_reembolso,
            v.fecha_reembolso,
            EXISTS (
                SELECT 1
                FROM comprobantes cc
                WHERE cc.id_venta = v.id_venta
                  AND cc.estado = 'emitido'
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
            COALESCE(d.titulo_snapshot, l.titulo) AS titulo,
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
        reembolso_elegible: esReembolsoElegible(ventaRows[0]),
        detalles: detalleRows
    };
};

// ========================================
// OBTENER VENTAS POR USUARIO
// Devuelve TODOS los campos de la venta (incluyendo costo_envio,
// tipo_entrega, direccion, distrito, provincia, agencia,
// correo_compra y datos de pago PayU) más un arreglo `detalle`
// con los ítems de detalle_venta JOIN libros.
// ========================================
const obtenerPorUsuario = async (id_usuario) => {
    const [rows] = await pool.query(`
        SELECT
            v.pago_revision_motivo,
            v.estado_reembolso,
            v.id_venta,
            v.id_usuario,
            v.fecha_venta,
            v.total,
            v.costo_envio,
            v.estado,
            v.estado_entrega,
            v.tipo_entrega,
            v.cobertura_entrega,
            v.canal_compra,
            v.id_zona_delivery,
            v.zona_delivery_nombre,
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
            v.cliente_nombre,
            v.origen,
            v.metodo_pago,
            v.referencia_pago,
            v.fecha_pago,
            v.id_reserva,
            v.motivo_reembolso,
            v.fecha_reembolso,
            EXISTS (
                SELECT 1
                FROM comprobantes cc
                WHERE cc.id_venta = v.id_venta
                  AND cc.estado = 'emitido'
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
            COALESCE(d.titulo_snapshot, l.titulo) AS titulo,
            l.portada,
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
            // La portada permite mostrar el libro en Mis compras (web y app).
            portada: detalle.portada || null,
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
// OBTENER VENTAS CON FILTROS (módulo PEDIDOS)
// Devuelve las ventas con mismos JOINs que obtenerTodos pero
// aplicando filtros opcionales:
//   tipo_entrega   -> tipo de entrega ('domicilio' | 'tienda')
//   estado_entrega -> estado logístico del pedido
// ========================================
const obtenerConFiltros = async (filtros = {}) => {
    const condiciones = [];
    const valores = [];

    if (filtros.tipo_entrega) {
        condiciones.push('v.tipo_entrega = ?');
        valores.push(filtros.tipo_entrega);
    }

    if (filtros.estado_entrega) {
        condiciones.push('v.estado_entrega = ?');
        valores.push(filtros.estado_entrega);
    }

    const where = condiciones.length > 0
        ? `WHERE ${condiciones.join(' AND ')}`
        : '';

    const [rows] = await pool.query(`
        SELECT
            v.id_venta,
            v.estado_reembolso,
            v.id_usuario,
            u.nombre AS nombre_usuario,
            u.apellido AS apellido_usuario,
            u.email AS correo_usuario,
            v.fecha_venta,
            v.total,
            v.costo_envio,
            v.estado,
            v.estado_entrega,
            v.tipo_entrega,
            v.cobertura_entrega,
            v.canal_compra,
            v.id_zona_delivery,
            v.zona_delivery_nombre,
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
            v.cliente_nombre,
            v.origen,
            v.metodo_pago,
            v.referencia_pago,
            v.fecha_pago,
            v.id_reserva,
            v.motivo_reembolso,
            v.fecha_reembolso,
            EXISTS (
                SELECT 1
                FROM comprobantes cc
                WHERE cc.id_venta = v.id_venta
                  AND cc.estado = 'emitido'
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
        ${where}
        ORDER BY v.id_venta DESC
    `, valores);

    return rows;
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
    ).sort((a, b) => a.id_libro - b.id_libro);
};

// ========================================
// CREAR VENTA
// ----------------------------------------
// Una nueva venta nace pendiente y descuenta stock para un checkout PayU.
// Las reservas históricas no llaman a este método ni registran cobros.
// ========================================
const crear = async (venta, conexionExterna = null) => {
    if ((venta.origen ?? 'app') !== 'app' || venta.id_reserva != null || venta.descontar_stock === false ||
        (venta.metodo_pago != null && venta.metodo_pago !== 'payu') || venta.referencia_pago != null || (venta.estado ?? 'pendiente') !== 'pendiente') {
        throw Object.assign(new Error('Solo se crean ventas online pendientes mediante el flujo PayU; los cobros manuales están retirados'), { status: 409 });
    }
    const propia = !conexionExterna;
    const connection =
        conexionExterna || await pool.getConnection();

    try {
        if (propia) {
            await connection.beginTransaction();
        }

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
            cobertura_entrega,
            id_zona_delivery,
            cliente_documento,
            cliente_tipo_documento,
            cliente_nombre,
            origen = 'app',
            canal_compra,
            metodo_pago,
            referencia_pago,
            id_reserva,
            descontar_stock = true,
            precio_unitario_esperado,
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
        // NORMALIZAR TIPO DE ENTREGA
        // ========================================
        // Este model se puede llamar directo (scripts, tests, jobs), no
        // solo por el controlador HTTP. Guardar el valor tal cual
        // trusting que alguien ya lo validó hacía que un tipo inválido
        // terminara en un 23514 de la base, es decir un error opaco.
        // Un tipo explícito e inválido se rechaza aquí con un mensaje
        // claro; ausente significa NULL (venta legacy, admisible).
        // Un valor no textual (número, booleano, array) es un bug de quien
        // llama, no una ausencia: si se cuela, PostgreSQL lo convertía
        // silenciosamente o devolvía un 23514 opaco.
        const tipoAusente =
            tipo_entrega === undefined ||
            tipo_entrega === null ||
            tipo_entrega === '';

        if (!tipoAusente && typeof tipo_entrega !== 'string') {
            throw new Error(
                `El tipo de entrega debe ser texto. Valor recibido: ${JSON.stringify(tipo_entrega)}. Usa ${TIPOS_ENTREGA.join(' o ')}.`
            );
        }

        const tipoSolicitado =
            tipoAusente ? '' : tipo_entrega.trim();

        if (tipoSolicitado && !esTipoEntregaValido(tipoSolicitado)) {
            throw new Error(
                `El tipo de entrega "${tipoSolicitado}" no existe. Usa ${TIPOS_ENTREGA.join(' o ')}.`
            );
        }

        const tipoEntregaVenta = tipoSolicitado || null;

        let costoEnvioVenta = Number(costo_envio || 0);
        let zonaEntrega = null;
        if (cobertura_entrega === 'pallasca') {
            if (!tipoEntregaVenta) throw new Error('Selecciona el tipo de entrega en Pallasca');
            costoEnvioVenta = 0;
            if (tipoEntregaVenta === 'domicilio') {
                const idZona = validarId(id_zona_delivery);
                zonaEntrega = idZona ? await zonaDeliveryModel.obtenerPorId(idZona, connection, true) : null;
                if (!zonaEntrega || Number(zonaEntrega.estado) !== 1) {
                    const error = new Error('Selecciona una zona activa de delivery dentro de Pallasca');
                    error.deliveryValidation = true;
                    throw error;
                }
                if (typeof direccion !== 'string' || direccion.trim().length < 5 || direccion.trim().length > 255) {
                    throw new Error('Indica una dirección de entrega válida');
                }
                costoEnvioVenta = Number(zonaEntrega.tarifa);
            }
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
                        l.id_libro,
                        l.titulo,
                        l.precio,
                        l.estado,
                        ${PRECIO_FINAL_SQL}
                    FROM libros l
                    WHERE l.id_libro = ?
                    LIMIT 1
                    FOR SHARE
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
            // Se cobra el precio final (con la promoción vigente), el mismo
            // que muestran la web y el panel. Cobrar el de lista mientras
            // la web anuncia la oferta sería vender más caro de lo
            // publicado.
            const precioUnitario =
                Number(libro.precio_final);

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
            // (una reserva ya lo descontó: no se vuelve a validar)
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
                descontar_stock &&
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
                costoEnvioVenta
            ).toFixed(2)
        );

        // ========================================
        // CREAR CABECERA DE VENTA
        // ========================================
        if (!Number.isFinite(total) || total <= 0 || total > 99999999.99) {
            throw Object.assign(new Error('El total de la compra debe ser mayor que cero y no superar S/ 99999999.99'), { status: 400, paymentValidation: true });
        }
        if (precio_unitario_esperado !== undefined && detallesProcesados.some(detalle =>
            Math.round(Number(detalle.precio_unitario) * 100) !== Math.round(Number(precio_unitario_esperado) * 100))) {
            throw Object.assign(new Error('El precio cambió. Revisa el importe antes de confirmar el cobro.'), { status: 409 });
        }
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
                    cobertura_entrega,
                    id_zona_delivery,
                    zona_delivery_nombre,
                    cliente_documento,
                    cliente_tipo_documento,
                    cliente_nombre,
                    origen,
                    canal_compra,
                    metodo_pago,
                    referencia_pago,
                    fecha_pago,
                    id_reserva
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id_usuario,
                total,
                estado,
                tipoEntregaVenta,
                cobertura_entrega === 'pallasca'
                    ? (tipoEntregaVenta === 'tienda' ? null : direccion.trim()) : (direccion || null),
                cobertura_entrega === 'pallasca'
                    ? (tipoEntregaVenta === 'tienda' ? null : referencia?.trim() || null) : (referencia || null),
                correo_compra || null,
                external_reference || null,
                payu_order_id || null,
                idempotencia_clave || null,
                cobertura_entrega === 'pallasca' ? null : (id_distrito || null),
                cobertura_entrega === 'pallasca' ? null : (id_agencia || null),
                costoEnvioVenta,
                cobertura_entrega || null,
                zonaEntrega?.id_zona || null,
                zonaEntrega?.nombre || null,
                cliente_documento || null,
                cliente_tipo_documento || null,
                cliente_nombre || null,
                origen,
                canal_compra || null,
                metodo_pago || null,
                referencia_pago || null,
                // Una venta que nace pagada (mostrador o reserva) se cobró ahora.
                estado === 'pagada' ? new Date() : null,
                id_reserva || null
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
                    subtotal,
                    titulo_snapshot
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                idVenta,
                detalle.id_libro,
                detalle.cantidad,
                detalle.precio_unitario,
                detalle.subtotal,
                detalle.titulo
            ]);

            if (!descontar_stock) {
                continue;
            }

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

        if (propia) {
            await connection.commit();
        }

        return {
            id_venta: idVenta,
            total,
            costo_envio:
                costoEnvioVenta,
            detalles: detallesProcesados
        };

    } catch (error) {
        if (propia) {
            await connection.rollback();
        }

        throw error;

    } finally {
        if (propia) {
            connection.release();
        }
    }
};

// ========================================
// OBTENER VENTA POR REFERENCIA EXTERNA (PayU)
// ========================================
const buscarPorReferenciaExterna = async (externalReference) => {
    const [rows] = await pool.query(`
        SELECT
            v.id_venta,
            v.id_usuario,
            v.estado,
            v.total,
            v.costo_envio,
            v.canal_compra,
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
            v.canal_compra,
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
    payu_payer_email,
    monto,
    moneda
}) => {
    const resultado = await aplicarPago({ externalReference: external_reference,
        payuOrderId: payu_order_id, payuPaymentId: payu_payment_id,
        payuPaymentStatus: payu_payment_status, payuPayerEmail: payu_payer_email,
        monto, moneda });
    return resultado ? 1 : 0;
};

// Único escritor del resultado PayU. Datos, estado, fecha y stock se confirman
// juntos. Solo el ganador de una transición recibe `cambio_estado=true`.
const aplicarPago = async ({ externalReference, payuOrderId, payuPaymentId,
    payuPaymentStatus, payuPayerEmail, monto, moneda, reportedReference = externalReference }) => {
    const status = typeof payuPaymentStatus === 'string' ? payuPaymentStatus.trim().toUpperCase() : '';
    const aprobados = ['APPROVED', 'CAPTURED'];
    const cancelados = ['DECLINED', 'ERROR', 'EXPIRED', 'VOIDED'];
    const reversiones = ['REFUNDED', 'CHARGED_BACK'];
    const pendientes = ['PENDING', 'PENDING_TRANSACTION_REVIEW', 'PENDING_TRANSACTION_CONFIRMATION'];
    if (![...aprobados, ...cancelados, ...reversiones, ...pendientes].includes(status)) {
        throw Object.assign(new Error('Estado de pago no reconocido'), { status: 409 });
    }
    if (!externalReference || reportedReference !== externalReference || moneda !== 'PEN') {
        throw Object.assign(new Error('La referencia o moneda informada por PayU no coincide con la compra'), { status: 409 });
    }
    for (const id of [payuOrderId, payuPaymentId]) {
        if (id != null && (typeof id !== 'string' && typeof id !== 'number' || String(id).length > 64)) {
            throw Object.assign(new Error('Identificador de pago no válido'), { status: 409 });
        }
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT * FROM ventas WHERE external_reference = ? FOR UPDATE', [externalReference]);
        const venta = rows[0];
        if (!venta) { await connection.rollback(); return null; }
        if (!montoPagoCoincide(monto, venta.total) || Number(monto) <= 0) {
            throw Object.assign(new Error('El importe informado por PayU no coincide con la compra'), { status: 409 });
        }
        if (!debeActualizarEstadoPago(venta.payu_payment_status, status)) {
            await connection.commit();
            return { venta, cambio_estado: false, ignorado: true };
        }
        const anterior = venta.estado;
        let nuevo = anterior;
        let revision = venta.pago_revision_motivo;
        if (aprobados.includes(status)) {
            if (anterior === 'pendiente') nuevo = 'pagada';
            else if (anterior === 'cancelada') revision = 'aprobacion_tardia';
            // Una venta ya reembolsada no revive ante un reporte de su cobro original.
        } else if (cancelados.includes(status) && anterior === 'pendiente') {
            nuevo = 'cancelada';
        } else if (reversiones.includes(status) && anterior !== 'reembolsada') {
            revision = 'reversion_payu';
        }
        if (nuevo === 'cancelada' && anterior === 'pendiente') {
            const [detalles] = await connection.query('SELECT id_libro, cantidad FROM detalle_venta WHERE id_venta = ? ORDER BY id_libro', [venta.id_venta]);
            for (const detalle of detalles) {
                const [stocks] = await connection.query('UPDATE inventario SET stock = stock + ? WHERE id_libro = ? RETURNING stock', [detalle.cantidad, detalle.id_libro]);
                if (!stocks[0]) throw new Error('Inventario no encontrado al cancelar el pago');
                await registrarMovimiento(connection, { id_libro: detalle.id_libro, tipo: 'entrada', motivo: 'cancelacion_venta', cantidad: detalle.cantidad, stock_resultante: stocks[0].stock });
            }
        }
        const [actualizadas] = await connection.query(`
            UPDATE ventas SET payu_order_id = COALESCE(?, payu_order_id),
                payu_payment_id = COALESCE(?, payu_payment_id), payu_payment_status = ?,
                payu_payer_email = COALESCE(?, payu_payer_email), estado = ?,
                fecha_pago = CASE WHEN ? THEN COALESCE(fecha_pago, NOW()) ELSE fecha_pago END,
                metodo_pago = COALESCE(metodo_pago, 'payu'),
                pago_revision_motivo = ?,
                pago_revision_fecha = CASE WHEN ?::text IS NOT NULL THEN COALESCE(pago_revision_fecha, NOW()) ELSE NULL END
            WHERE id_venta = ? RETURNING *
        `, [payuOrderId == null ? null : String(payuOrderId), payuPaymentId == null ? null : String(payuPaymentId), status,
            typeof payuPayerEmail === 'string' ? payuPayerEmail.slice(0, 255) : null, nuevo,
            aprobados.includes(status), revision || null, revision || null, venta.id_venta]);
        await connection.commit();
        return { venta: actualizadas[0], cambio_estado: nuevo !== anterior, estado_anterior: anterior,
            requiere_revision: Boolean(revision), duplicado: status === venta.payu_payment_status && nuevo === anterior };
    } catch (error) {
        await connection.rollback(); throw error;
    } finally { connection.release(); }
};

// ========================================
// ACTUALIZAR ESTADO DE VENTA
// ========================================
const actualizarEstado = async (
    id,
    nuevoEstado
) => {
    if (nuevoEstado === 'entregada') {
        throw Object.assign(new Error('La entrega se confirma exclusivamente desde Pedidos'), { status: 409 });
    }
    if (nuevoEstado === 'pagada') {
        throw Object.assign(new Error('El pago solo se confirma mediante PayU'), { status: 409 });
    }
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
                    estado,
                    origen,
                    id_reserva,
                    payu_payment_status
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

        if (esVentaHistorica(venta)) {
            throw Object.assign(new Error('Las ventas históricas son de solo lectura'), { status: 409 });
        }
        if (nuevoEstado === 'reembolsada') {
            throw Object.assign(new Error('Usa el flujo de registro de reembolso'), { status: 400 });
        }
        if (nuevoEstado === 'cancelada' && ['APPROVED', 'CAPTURED'].includes(venta.payu_payment_status)) {
            throw Object.assign(new Error('El pago ya se confirmó; registra un reembolso'), { status: 409 });
        }

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
                    ORDER BY id_libro
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
                SET estado = ?, fecha_pago = CASE WHEN ? = 'pagada' THEN COALESCE(fecha_pago, NOW()) ELSE fecha_pago END
                WHERE id_venta = ?
            `, [
                nuevoEstado,
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
// ACTUALIZAR ESTADO DE ENTREGA (módulo PEDIDOS)
// ========================================
// Pedidos es la única fuente de entrega. El último paso sincroniza el
// estado comercial dentro del mismo bloqueo; no toca pago ni inventario.
const actualizarEstadoEntrega = async (
    id,
    nuevoEstado
) => {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [ventas] =
            await connection.query(`
                SELECT
                    id_venta,
                    estado_entrega,
                    tipo_entrega,
                    origen,
                    id_reserva,
                    estado,
                    canal_compra,
                    estado_reembolso
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

        if (esVentaHistorica(venta)) {
            throw Object.assign(new Error('Las ventas históricas son de solo lectura'), { status: 409 });
        }
        if (venta.estado_reembolso === 'pendiente_verificacion') {
            throw Object.assign(new Error('La devolución está pendiente de verificación; no se puede avanzar la entrega'), { status: 409 });
        }
        if (!['pagada', 'entregada'].includes(venta.estado) && nuevoEstado !== 'cancelado') {
            throw Object.assign(new Error('El pago de esta compra debe confirmarse antes de preparar la entrega'), { status: 409 });
        }

        // ========================================
        // MISMO ESTADO
        // ========================================
        if (
            venta.estado_entrega ===
            nuevoEstado
        ) {
            throw Object.assign(new Error(
                `El pedido ya se encuentra en estado "${nuevoEstado}"`
            ), { status: 400 });
        }

        // ========================================
        // TIPO DE ENTREGA LEGACY
        // ========================================
        // Este model es la última línea antes de la base, así que valida
        // por construcción y no por confianza en el llamador. Sin esto,
        // un pedido con tipo inválido llegaría al UPDATE y la base lo
        // rechazaría con 23514, es decir un 500 en vez de un error claro.
        if (!esTipoEntregaValido(venta.tipo_entrega)) {
            throw Object.assign(new Error(
                'El pedido contiene un tipo de entrega no compatible con el flujo actual. Requiere corrección de datos antes de continuar.'
            ), { status: 409 });
        }

        // ========================================
        // MÁQUINA DE ESTADOS DE ENTREGA
        // ========================================
        // Consciente del tipo: 'listo_recojo' solo existe para recojo en
        // tienda y 'en_camino' solo para envío a domicilio. Coincide con
        // el CHECK ventas_tipo_estado_entrega_check de la base.
        const puedeCambiar =
            permitirTransicionEntrega(
                venta.tipo_entrega,
                venta.estado_entrega,
                nuevoEstado
            );

        if (!puedeCambiar) {
            throw Object.assign(new Error(
                `No se puede cambiar el pedido de "${venta.estado_entrega}" a "${nuevoEstado}"`
            ), { status: 400 });
        }

        const [resultado] =
            await connection.query(`
                UPDATE ventas
                SET estado_entrega = ?, estado = CASE WHEN ? = 'entregado' THEN 'entregada' ELSE estado END
                WHERE id_venta = ?
            `, [
                nuevoEstado,
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
// DEVOLUCIÓN DOCUMENTAL DE UNA VENTA PAYU ELEGIBLE
// ----------------------------------------
// Solicitar registra pendiente_verificacion sin efectos comerciales.
// Confirmar exige referencia, evidencia, responsable y solicitud previa;
// actualiza venta, stock, comprobante e historial en la misma transacción.
// No ejecuta ni verifica automáticamente una devolución en PayU.
// ========================================
const reembolsar = async (id, { accion = 'confirmar', motivo, devolverStock, idUsuario, referencia = null, evidencia = null }) => {
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [ventas] = await connection.query(`
            SELECT *
            FROM ventas
            WHERE id_venta = ?
            FOR UPDATE
        `, [id]);

        if (ventas.length === 0) {
            await connection.rollback();
            return null;
        }

        const venta = ventas[0];

        if (!esReembolsoElegible(venta)) {
            throw Object.assign(new Error('La venta no tiene un pago PayU elegible o ya fue reembolsada; los cobros manuales son históricos'), { status: 409 });
        }
        if (!validarId(idUsuario) || !['solicitar', 'confirmar'].includes(accion) ||
            typeof motivo !== 'string' || motivo.trim().length < 5 || motivo.length > 255) {
            throw Object.assign(new Error('Responsable, acción o motivo de devolución inválido'), { status: 422 });
        }
        // Una referencia o transacción compartida por otra venta no es un pago
        // inequívocamente asociado. No se aceptan identificadores del cliente.
        const [otros] = await connection.query(`SELECT id_venta FROM ventas WHERE id_venta<>?
            AND (external_reference=? OR payu_payment_id=? OR payu_order_id=?) LIMIT 1`,
        [id, venta.external_reference, venta.payu_payment_id, venta.payu_order_id]);
        if (otros.length) throw Object.assign(new Error('El pago PayU está asociado a otra venta; requiere revisión'), { status: 409 });
        if (accion === 'solicitar') {
            if (venta.estado_reembolso) throw Object.assign(new Error('La devolución ya tiene una solicitud'), { status: 409 });
            await connection.query(`UPDATE ventas SET estado_reembolso='pendiente_verificacion',
                fecha_solicitud_reembolso=NOW(), reembolso_solicitado_por=?, motivo_reembolso=? WHERE id_venta=?`,
            [idUsuario, motivo.trim(), id]);
            await connection.query(`INSERT INTO historial_operaciones(id_usuario,tipo_operacion,modulo,descripcion)
                VALUES (?,'ACTUALIZAR','ventas',?)`, [idUsuario, `Devolución PayU de venta #${id} solicitada; pendiente de verificación. Motivo: ${motivo.trim()}`]);
            await connection.commit();
            return { estado: venta.estado, estado_reembolso: 'pendiente_verificacion', stock_devuelto: false, comprobante_anulado: null };
        }
        if (typeof referencia !== 'string' || referencia.trim().length < 3 || referencia.length > 100 ||
            typeof evidencia !== 'string' || evidencia.trim().length < 10 || evidencia.length > 500 ||
            /[\r\n\x00]/.test(referencia + evidencia)) {
            throw Object.assign(new Error('Para confirmar exige referencia PayU (3–100 caracteres) y evidencia verificable (10–500 caracteres)'), { status: 422 });
        }
        if (venta.estado_reembolso !== 'pendiente_verificacion') {
            throw Object.assign(new Error('Primero registra la solicitud de devolución pendiente de verificación'), { status: 409 });
        }
        const aprobacionTardia = venta.estado === 'cancelada' && venta.pago_revision_motivo === 'aprobacion_tardia';
        const yaSalio = venta.estado === 'entregada' ||
            ['en_camino', 'entregado'].includes(venta.estado_entrega);
        // Una aprobación tardía ya liberó stock al cancelar: nunca dos veces.
        const reingresar = !aprobacionTardia && (!yaSalio || Boolean(devolverStock));

        if (reingresar) {
            const [detalles] = await connection.query(`
                SELECT id_libro, cantidad
                FROM detalle_venta
                WHERE id_venta = ?
                ORDER BY id_libro
            `, [id]);

            for (const detalle of detalles) {
                await connection.query(`
                    UPDATE inventario
                    SET stock = stock + ?
                    WHERE id_libro = ?
                `, [detalle.cantidad, detalle.id_libro]);

                const [stockRows] = await connection.query(`
                    SELECT stock
                    FROM inventario
                    WHERE id_libro = ?
                `, [detalle.id_libro]);

                if (!stockRows[0]) throw Object.assign(new Error('Inventario no encontrado; no se confirmó la devolución'), { status: 409 });

                await registrarMovimiento(connection, {
                    id_libro: detalle.id_libro,
                    id_usuario: idUsuario || null,
                    tipo: 'entrada',
                    motivo: 'devolucion_venta',
                    cantidad: detalle.cantidad,
                    stock_resultante: stockRows[0].stock
                });
            }
        }

        await connection.query(`
            UPDATE ventas
            SET estado = 'reembolsada',
                motivo_reembolso = ?,
                fecha_reembolso = NOW(),
                reembolso_referencia = ?, reembolso_evidencia = ?,
                estado_reembolso = 'confirmado', reembolso_confirmado_por = ?,
                pago_revision_motivo = NULL, pago_revision_fecha = NULL,
                estado_entrega = CASE WHEN estado_entrega = 'entregado' THEN estado_entrega ELSE 'cancelado' END
            WHERE id_venta = ?
        `, [motivo.trim(), referencia.trim(), evidencia.trim(), idUsuario, id]);

        const [anulados] = await connection.query(`
            UPDATE comprobantes
            SET estado = 'anulado',
                motivo_anulacion = ?,
                fecha_anulacion = NOW()
            WHERE id_venta = ?
              AND estado = 'emitido'
            RETURNING id_comprobante, serie, numero
        `, [`Reembolso de la venta: ${motivo}`, id]);

        await connection.query(`INSERT INTO historial_operaciones(id_usuario,tipo_operacion,modulo,descripcion)
            VALUES (?,'ACTUALIZAR','ventas',?)`, [idUsuario,
            `Devolución externa PayU de venta #${id} confirmada documentalmente. Referencia: ${referencia.trim()}. Evidencia: ${evidencia.trim()}. Stock devuelto: ${reingresar}.`]);

        await connection.commit();

        return {
            estado: 'reembolsada', estado_reembolso: 'confirmado',
            estado_anterior: venta.estado,
            stock_devuelto: reingresar,
            comprobante_anulado: anulados[0] || null
        };
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
            fecha_pago,
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
            v.cobertura_entrega,
            v.canal_compra,
            v.id_zona_delivery,
            v.zona_delivery_nombre,
            v.direccion,
            v.referencia,
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
                    ? 'payu'
                    : null,
            estado_venta:
                row.estado,
            estado_pago:
                row.payu_payment_status,
            monto_total:
                Number(row.total),
            tipo_entrega:
                row.tipo_entrega,
            cobertura_entrega: row.cobertura_entrega,
            canal_compra: row.canal_compra,
            id_zona_delivery: row.id_zona_delivery,
            zona_delivery_nombre: row.zona_delivery_nombre,
            direccion: row.direccion,
            referencia: row.referencia,
            costo_envio: Number(row.costo_envio),
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
// Devuelve { canceladas, conPagoPendienteEnPayU }.
// ========================================
const TAMANO_LOTE = 50;

const cancelarOrdenesAbandonadas = async (minutos = 30, { alSincronizarPago } = {}) => {
    let canceladas = 0;
    let conPagoPendienteEnPayU = 0;

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
                AND origen = 'app'
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
                    conPagoPendienteEnPayU++;
                    const resultado = await aplicarPago({
                        externalReference: venta.external_reference,
                        reportedReference: estadoPayu.externalReference,
                        payuOrderId: estadoPayu.orderId,
                        payuPaymentId: estadoPayu.paymentId,
                        payuPaymentStatus: estadoPayu.status,
                        monto: estadoPayu.amount,
                        moneda: estadoPayu.currency
                    });
                    if (resultado?.cambio_estado && alSincronizarPago) await alSincronizarPago(resultado);
                    continue;
                }

                // Un pago pendiente/en proceso puede confirmarse después.
                // No se devuelve stock mientras PayU lo siga procesando.
                if (estadoPayu.pendiente) {
                    console.log(
                        `[venta] Orden PayU aún en proceso, no se cancela id=${venta.id_venta} (${estadoPayu.status})`
                    );
                    conPagoPendienteEnPayU++;
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
        conPagoPendienteEnPayU
    };
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    obtenerTodos,
    obtenerPorId,
    obtenerPorUsuario,
    obtenerConFiltros,
    buscarPorReferenciaExterna,
    buscarPorPayuOrderId,
    crear,
    actualizarDatosPago,
    actualizarEstado,
    actualizarEstadoEntrega,
    agruparDetalles,
    obtenerDatosPago,
    listarPagosAdmin,
    cancelarOrdenesAbandonadas,
    reembolsar,
    aplicarPago
};
