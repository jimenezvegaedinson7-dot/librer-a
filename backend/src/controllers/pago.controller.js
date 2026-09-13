const payuService = require('../services/payu.service');
const ventaModel = require('../models/venta.model');
const ubicacionModel = require('../models/ubicacion.model');
const agenciaModel = require('../models/agencia.model');
const pool = require('../config/database');
const crypto = require('crypto');
const { validarId } = require('../utils/validaciones');
const {
    extraerEstadoOrdenPayu,
    montoPagoCoincide
} = require('../utils/payuStatus');

// ========================================
// DEDUPLICACIÓN DE EVENTOS DE WEBHOOK (memoria)
// Evita reprocesar el mismo evento de Mercado Pago
// (pagos/órdenes duplicados). Clave: "type:data.id".
// TTL 5 minutos; los eventos viejos se limpian en cada evento.
// ========================================
const eventosWebhookProcesados = new Map();
const TTL_EVENTO_WEBHOOK_MS = 5 * 60 * 1000;

const eventoWebhookYaProcesado = (clave) => {
    const ahora = Date.now();

    for (const [claveGuardada, ts] of eventosWebhookProcesados) {
        if (ahora - ts > TTL_EVENTO_WEBHOOK_MS) {
            eventosWebhookProcesados.delete(claveGuardada);
        }
    }

    return eventosWebhookProcesados.has(clave);
};

// ========================================
// TIPOS DE ENTREGA SOPORTADOS
// ========================================
const ListaTipoEntrega = [
    'domicilio',
    'agencia'
];

const construirRespuestaOrdenExistente = async (venta) => {
    let orden = null;

    if (venta.payu_order_id) {
        const resultado =
            await payuService.obtenerOrdenDiagnostico(
                venta.payu_order_id
            );

        if (resultado && !resultado.errorFetch) {
            orden = resultado;
        }
    }

    const estadoPayu = orden
        ? extraerEstadoOrdenPayu(orden)
        : null;
    const checkoutUrl =
        orden?.transactionResponse?.paymentUrl ||
        orden?.paymentUrl ||
        null;

    return {
        success: true,
        ya_existia: true,
        venta,
        preferencia: venta.payu_order_id
            ? {
                id: venta.payu_order_id,
                checkout_url: checkoutUrl
            }
            : null,
        data: {
            id_venta: venta.id_venta,
            order_id: venta.payu_order_id || null,
            checkout_url: checkoutUrl,
            status:
                estadoPayu?.status ||
                venta.payu_payment_status ||
                venta.estado,
            total: Number(venta.total || 0),
            costo_envio: Number(
                venta.costo_envio || 0
            )
        }
    };
};

// ========================================
// CREAR ORDEN DE PAGO (Checkout Pro)
// ========================================
const crearOrden = async (req, res) => {
    try {
        const id_usuario =
            req.usuario.id_usuario;

        const {
            items,
            tipo_entrega,
            direccion,
            correo_compra,
            id_distrito,
            id_agencia,
            idempotencia_clave
        } = req.body;

        // ========================================
        // CLAVE DE IDEMPOTENCIA (obligatoria)
        // Evita el doble descuento de stock si el cliente
        // reintenta crear la misma orden. Máx. 64 caracteres.
        // ========================================
        let idempotenciaClave = null;

        if (
            idempotencia_clave !== undefined &&
            idempotencia_clave !== null &&
            idempotencia_clave !== ''
        ) {
            if (
                typeof idempotencia_clave !== 'string'
            ) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        'idempotencia_clave debe ser un texto'
                });
            }

            idempotenciaClave =
                idempotencia_clave.trim();

            if (idempotenciaClave.length > 64) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        'idempotencia_clave no puede superar los 64 caracteres'
                });
            }
        }

        if (!idempotenciaClave) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'idempotencia_clave es obligatoria'
            });
        }

        // Un reintento debe recuperar la orden antes de volver a validar stock
        // o entrega. La primera solicitud pudo completarse aunque su respuesta
        // no llegara al cliente.
        const [ventasPrevias] =
            await pool.query(`
                SELECT
                    id_venta,
                    id_usuario,
                    estado,
                    total,
                    costo_envio,
                    external_reference,
                    mp_preference_id,
                    mp_payment_id,
                    mp_payment_status,
                    mp_payer_email,
                    correo_compra
                FROM ventas
                WHERE idempotencia_clave = ?
                AND id_usuario = ?
                LIMIT 1
            `, [
                idempotenciaClave,
                req.usuario.id_usuario
            ]);

        if (ventasPrevias.length > 0) {
            return res.status(200).json(
                await construirRespuestaOrdenExistente(
                    ventasPrevias[0]
                )
            );
        }

        // ========================================
        // NORMALIZAR TIPO DE ENTREGA (domicilio | agencia | tienda)
        // ========================================
        const tipoEntrega =
            ListaTipoEntrega.includes(
                tipo_entrega
            )
                ? tipo_entrega
                : 'tienda';

        // ========================================
        // VALIDAR DATOS DE ENVÍO SEGÚN TIPO
        // Y CALCULAR COSTO DE ENVÍO
        // ========================================
        let costoEnvio = 0;
        let distritoEntrega = null;
        let agenciaEntrega = null;

        if (
            tipoEntrega === 'domicilio'
        ) {
            distritoEntrega =
                await ubicacionModel
                    .existeDistrito(
                        validarId(id_distrito)
                    );

            if (!distritoEntrega) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        mensaje:
                            'Selecciona un distrito válido de Lima'
                    });
            }

            if (
                !direccion ||
                typeof direccion !== 'string' ||
                direccion.trim().length < 5
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        mensaje:
                            'Indica una dirección de entrega válida'
                    });
            }

            costoEnvio = Number(
                distritoEntrega.tarifa_envio
            ) || 0;
        } else if (
            tipoEntrega === 'agencia'
        ) {
            agenciaEntrega =
                await agenciaModel
                    .obtenerPorId(
                        validarId(id_agencia)
                    );

            if (
                !agenciaEntrega ||
                Number(agenciaEntrega.estado) !== 1
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        mensaje:
                            'Selecciona una agencia de envío válida'
                    });
            }

            costoEnvio = Number(
                agenciaEntrega.tarifa_base
            ) || 0;
        }

        // ========================================
        // VALIDAR ITEMS
        // ========================================
        if (
            !items ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'Se debe enviar al menos un libro'
            });
        }

        for (const item of items) {
            const id_libro =
                Number(item.id_libro);
            const cantidad =
                Number(item.cantidad);

            if (
                !Number.isInteger(id_libro) ||
                id_libro <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        'El id del libro no es válido'
                });
            }

            if (
                !Number.isInteger(cantidad) ||
                cantidad <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        'La cantidad debe ser un número entero mayor a 0'
                });
            }
        }

        // ========================================
        // AGRUPAR LIBROS DUPLICADOS
        // ========================================
        const agrupados = new Map();

        for (const item of items) {
            const id_libro =
                Number(item.id_libro);
            const cantidad =
                Number(item.cantidad);

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

        // ========================================
        // CONSULTAR LIBROS Y STOCK REALES
        // ========================================
        const orderItems = [];
        let total = 0;

        for (const [
            id_libro,
            cantidad
        ] of agrupados) {
            const [libros] =
                await pool.query(`
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
                return res.status(400).json({
                    success: false,
                    mensaje:
                        `El libro ${id_libro} no existe`
                });
            }

            const libro = libros[0];

            if (Number(libro.estado) !== 1) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        `El libro "${libro.titulo}" se encuentra inactivo`
                });
            }

            const precioUnitario =
                Number(libro.precio);

            if (
                !Number.isFinite(precioUnitario) ||
                precioUnitario < 0
            ) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        `El precio del libro "${libro.titulo}" no es válido`
                });
            }

            // ========================================
            // VERIFICAR STOCK REAL
            // ========================================
            const [inventario] =
                await pool.query(`
                    SELECT
                        stock
                    FROM inventario
                    WHERE id_libro = ?
                `, [id_libro]);

            if (
                inventario.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        `El libro "${libro.titulo}" no tiene inventario`
                });
            }

            const stockActual =
                Number(inventario[0].stock);

            if (stockActual < cantidad) {
                return res.status(400).json({
                    success: false,
                    mensaje:
                        `Stock insuficiente para "${libro.titulo}". Disponible: ${stockActual}`
                });
            }

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

            orderItems.push({
                title: libro.titulo,
                unit_price:
                    precioUnitario.toFixed(2),
                quantity: cantidad
            });
        }

        // ========================================
        // REFERENCIA EXTERNA (MÁX. 64 CARACTERES)
        // ========================================
        const culqiIdempotencyKey = crypto
            .createHash('sha256')
            .update(
                `${id_usuario}:${idempotenciaClave}`
            )
            .digest('hex');
        const externalReference =
            `orden_${id_usuario}_${culqiIdempotencyKey.slice(0, 40)}`;

        // ========================================
        // COSTO DE ENVÍO Y TOTAL FINAL
        // ========================================
        costoEnvio = Number(
            costoEnvio.toFixed(2)
        );

        total = Number(
            (
                total +
                costoEnvio
            ).toFixed(2)
        );

        const shippingTitulo =
            tipoEntrega === 'domicilio'
                ? `Envío a domicilio (${distritoEntrega.provincia} - ${distritoEntrega.nombre})`
                : tipoEntrega === 'agencia'
                    ? `Envío por agencia (${agenciaEntrega.nombre})`
                    : null;

        // ========================================
        // CREAR ORDEN EN PAYU
        // ========================================
        const resultado =
            await payuService.crearOrden({
                externalReference,
                items: orderItems,
                payerEmail:
                    req.usuario.email,
                notificationUrl:
                    process.env
                        .PAYU_NOTIFICATION_URL ||
                    undefined,
                shipping: shippingTitulo
                    ? {
                        title: shippingTitulo,
                        price: costoEnvio
                    }
                    : null,
                idempotencyKey:
                    culqiIdempotencyKey
            });

        // ========================================
        // CREAR VENTA EN ESTADO PENDIENTE
        // (ligada a la orden para confirmarla por webhook)
        // ========================================
        let ventaCreada;

        try {
            ventaCreada = await ventaModel.crear({
                id_usuario,
                detalles: Array.from(
                    agrupados,
                    ([id_libro, cantidad]) => ({
                        id_libro,
                        cantidad
                    })
                ),
                tipo_entrega: tipoEntrega,
                direccion: direccion || null,
                id_distrito:
                    tipoEntrega === 'domicilio'
                        ? validarId(id_distrito)
                        : null,
                id_agencia:
                    tipoEntrega === 'agencia'
                        ? validarId(id_agencia)
                        : null,
                correo_compra:
                    correo_compra ||
                    req.usuario.email,
                external_reference:
                    externalReference,
                payu_order_id:
                    resultado.id,
                idempotencia_clave:
                    idempotenciaClave,
                costo_envio: costoEnvio,
                estado: 'pendiente'
            });
        } catch (errorVenta) {
            // Otra solicitud con la misma clave puede haber terminado mientras
            // esta esperaba los locks de inventario. Se consulta siempre antes
            // de propagar el error (también cubre stock insuficiente en la
            // solicitud perdedora, no solo ER_DUP_ENTRY).
            const [ventasDuplicadas] =
                await pool.query(`
                    SELECT
                        id_venta,
                        id_usuario,
                        estado,
                        total,
                        costo_envio,
                        external_reference,
                        mp_preference_id,
                        mp_payment_id,
                        mp_payment_status,
                        mp_payer_email,
                        correo_compra
                    FROM ventas
                    WHERE idempotencia_clave = ?
                    AND id_usuario = ?
                    LIMIT 1
                `, [
                    idempotenciaClave,
                    req.usuario.id_usuario
                ]);

            if (ventasDuplicadas.length > 0) {
                return res.status(200).json(
                    await construirRespuestaOrdenExistente(
                        ventasDuplicadas[0]
                    )
                );
            }

            throw errorVenta;
        }

        return res.status(201).json({
            success: true,
            ya_existia: false,
            mensaje:
                'Orden de pago creada correctamente',
            data: {
                id_venta:
                    ventaCreada.id_venta,
                order_id: resultado.id,
                checkout_url:
                    resultado.checkout_url,
                status: resultado.status,
                total: total,
                costo_envio: costoEnvio
            }
        });

    } catch (error) {
        console.error(
            'Error al crear orden de pago:',
            error
        );

        const mensaje =
            error.message ||
            'Error al crear la orden de pago';

        if (
            mensaje.includes(
                'Stock insuficiente'
            ) ||
            mensaje.includes(
                'no tiene inventario'
            ) ||
            mensaje.includes(
                'no existe'
            ) ||
            mensaje.includes(
                'cantidad'
            ) ||
            mensaje.includes(
                'no es válido'
            )
        ) {
            return res.status(400).json({
                success: false,
                mensaje
            });
        }

        if (error.paymentValidation) {
            return res.status(400).json({
                success: false,
                mensaje
            });
        }

        if (
            error.disableRealPayment
        ) {
            return res.status(503).json({
                success: false,
                mensaje:
                    'El pago real no está disponible'
            });
        }

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al crear la orden de pago',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// OBTENER ESTADO DE UNA ORDEN
// ========================================
const obtenerOrden = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'El ID de la orden es requerido'
            });
        }

        const ordenResultado =
            await payuService.obtenerOrdenDiagnostico(
                orderId
            );

        if (ordenResultado?.errorFetch) {
            return res.status(502).json({
                success: false,
                mensaje:
                    'No se pudo consultar la orden de pago'
            });
        }

        const orden = ordenResultado;

        if (!orden || !orden.id) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Orden no encontrada en PayU'
            });
        }

        // ========================================
        // [LOG TEMPORAL] STATUS de la orden consultada
        // ========================================
        const estadoPayu =
            extraerEstadoOrdenPayu(orden);
        const statusDetail =
            orden.transactionResponse?.pendingReason ||
            orden.transactionResponse?.responseMessage ||
            null;
        const paymentStatus =
            estadoPayu.paymentStatus;
        const paymentStatusDetail =
            estadoPayu.paymentStatusDetail;

        console.log('[PAYU STATUS]');
        console.log(`  order_id: ${orden.id}`);
        console.log(`  status: ${estadoPayu.status}`);
        console.log(`  status_detail: ${statusDetail}`);
        console.log(`  payment_status: ${paymentStatus}`);
        console.log(`  payment_status_detail: ${paymentStatusDetail}`);
        console.log(`  error: ${(orden.error && JSON.stringify(orden.error)) || '(sin error en la orden)'}`);
        console.log(`  cause: ${(orden.cause && JSON.stringify(orden.cause)) || '(sin cause en la orden)'}`);

        // ========================================
        // VERIFICAR PROPIEDAD DE LA VENTA (IDOR)
        // ========================================
        const externalReference =
            orden.external_reference ||
            null;

        let ventaPago = null;
        const esAdmin =
            String(
                req.usuario?.rol || ''
            ).toLowerCase() ===
            'administrador';

        if (externalReference) {
            ventaPago =
                await ventaModel
                    .buscarPorReferenciaExterna(
                        externalReference
                    );

            if (ventaPago) {
                if (
                    Number(ventaPago.id_usuario) !==
                        Number(
                            req.usuario?.id_usuario
                        ) &&
                    !esAdmin
                ) {
                    return res.status(403).json({
                        success: false,
                        mensaje:
                            'No tienes permisos para consultar esta orden'
                    });
                }
            }
        }

        if (!ventaPago) {
            ventaPago =
                await ventaModel.buscarPorPayuOrderId(
                    orden.id
                );
        }

        if (
            ventaPago &&
            Number(ventaPago.id_usuario) !==
                Number(req.usuario?.id_usuario) &&
            !esAdmin
        ) {
            return res.status(403).json({
                success: false,
                mensaje:
                    'No tienes permisos para consultar esta orden'
            });
        }

        if (!ventaPago && !esAdmin) {
            return res.status(404).json({
                success: false,
                mensaje:
                    'Orden no encontrada'
            });
        }

        if (ventaPago && estadoPayu.pagado) {
            if (
                !montoPagoCoincide(
                    estadoPayu.amount,
                    ventaPago.total
                )
            ) {
                console.error(
                    `[pago] Monto de orden ${orden.id} (${estadoPayu.amount}) difiere de venta ${ventaPago.id_venta} (${ventaPago.total})`
                );

                return res.status(409).json({
                    success: false,
                    mensaje:
                        'El monto del pago no coincide con la venta'
                });
            }
        }

        // ========================================
        // REFRESCAR VENTA SI EL PAGO YA SUCEDIÓ
        // (aunque el webhook aún no haya llegado)
        // Solo para el dueño de la venta o admin.
        // ========================================
        if (ventaPago) {
            await aplicarEstadoPagoAVenta({
                externalReference:
                    externalReference ||
                    ventaPago.external_reference,
                payuOrderId: orden.id,
                payuPaymentId:
                    estadoPayu.paymentId,
                payuPaymentStatus:
                    estadoPayu.status,
                payuPayerEmail:
                    orden.transactionResponse?.buyer?.email ||
                    null,
                estadoVenta:
                    estadoVentaDesdePayu(
                        estadoPayu.status
                    )
            });
        }

        // ========================================
        // EXPONER SOLO CAMPOS NECESARIOS PARA EL CLIENTE
        // ========================================
        const respuesta = {
            success: true,
            data: {
                id: orden.id,
                status: estadoPayu.status,
                order_status:
                    estadoPayu.orderStatus,
                status_detail: statusDetail,
                external_reference:
                    orden.transactionResponse?.referenceCode ||
                    orden.external_reference,
                payment_status: paymentStatus,
                payment_status_detail: paymentStatusDetail,
                total_amount:
                    orden.transactionResponse?.value ? orden.transactionResponse.value / 100 : undefined
            }
        };

        return res.json(respuesta);

    } catch (error) {
        console.error(
            'Error al obtener orden:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener la orden',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// APLICAR ESTADO DE PAGO A LA VENTA
// ========================================
const aplicarEstadoPagoAVenta = async ({
    externalReference,
    payuOrderId,
    payuPaymentId,
    payuPaymentStatus,
    payuPayerEmail,
    estadoVenta
}) => {
    if (!externalReference) {
        return false;
    }

    const venta =
        await ventaModel.buscarPorReferenciaExterna(
            externalReference
        );

    if (!venta) {
        console.log(
            `[webhook] No se encontró venta para external_reference=${externalReference}`
        );
        return false;
    }

    // ========================================
    // GUARDAR DATOS DE PAGO
    // ========================================
    await ventaModel.actualizarDatosPago({
        external_reference:
            externalReference,
        payu_order_id:
            payuOrderId ?? null,
        payu_payment_id:
            payuPaymentId ?? null,
        payu_payment_status:
            payuPaymentStatus ?? null,
        payu_payer_email:
            payuPayerEmail ?? null
    });

    // Una devolución/contracargo posterior se registra en los datos MP, pero
    // no cambia automáticamente la venta ni devuelve stock: requiere revisión
    // contable y logística manual.
    if (
        venta.estado === 'pagada' ||
        venta.estado === 'entregada'
    ) {
        if (
            estadoVenta === 'cancelada' &&
            actualizarEstadoMp
        ) {
            console.error(
                `[webhook] ALERTA: Pago de venta ${venta.id_venta} cambió a ${payuPaymentStatus}; requiere revisión manual`
            );
        }

        return true;
    }

    // Una venta cancelada es final. Si el pago aparece aprobado después, se
    // conserva el dato MP y se alerta para realizar la devolución manual.
    if (
        venta.estado === 'cancelada' &&
        estadoVenta === 'pagada'
    ) {
        console.error(
            `[webhook] ALERTA: Pago aprobado sobre venta cancelada ${venta.id_venta} — requiere devolución manual`
        );
        return true;
    }

    // ========================================
    // CAMBIAR ESTADO DE LA VENTA
    // ========================================
    if (
        estadoVenta &&
        estadoVenta !== venta.estado
    ) {
        try {
            await ventaModel.actualizarEstado(
                venta.id_venta,
                estadoVenta
            );
        } catch (error) {
            // Estado ya aplicado o venta cancelada: no es crítico.
            console.log(
                `[webhook] No se actualizó estado de venta ${venta.id_venta}: ${error.message}`
            );
        }
    }

    return true;
};

// ========================================
// MAPEAR ESTADO PAYU -> ESTADO DE VENTA
// ========================================
const estadoVentaDesdePayu = (statusMp) => {
    const pagados = [
        'APPROVED'
    ];
    const cancelados = [
        'DECLINED',
        'ERROR',
        'EXPIRED',
        'VOIDED',
        'REFUNDED'
    ];

    if (pagados.includes(statusMp)) {
        return 'pagada';
    }

    if (cancelados.includes(statusMp)) {
        return 'cancelada';
    }

    return 'pendiente';
};

// ========================================
// VERIFICAR FIRMA DEL WEBHOOK (PAYU)
// ========================================
// FAIL-CLOSED: si PAYU_API_KEY no está configurado,
// la verificación FALLA (devuelve false). webhookPago no procesa
// ningún evento sin secret (responde 503 para permitir reintentos).
// PayU firma con MD5: apiKey~merchantId~referenceCode~amount~currency~state
// ========================================
const verificarFirmaWebhook = (req) => {
    const apiKey = process.env.PAYU_API_KEY;

    if (!apiKey) {
        console.error(
            '[webhook] PAYU_API_KEY no configurado. Firma NO verificada (fail-closed).'
        );
        return false;
    }

    const body = req.body;
    
    // PayU envía los datos en el body
    const referenceCode = body?.referenceCode;
    const amount = body?.amount;
    const currency = body?.currency;
    const state = body?.state;
    const receivedSignature = body?.signature;

    if (!referenceCode || !amount || !currency || !state || !receivedSignature) {
        return false;
    }

    // PayU firma: apiKey~merchantId~referenceCode~amount~currency~state
    const merchantId = process.env.PAYU_MERCHANT_ID;
    const expectedSignature = crypto
        .createHash('md5')
        .update(`${apiKey}~${merchantId}~${referenceCode}~${amount}~${currency}~${state}`)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(receivedSignature)
    );
};
        bufferRecibido.length
    ) {
        return false;
    }

    return crypto.timingSafeEqual(
        bufferEsperado,
        bufferRecibido
    );
};

// ========================================
// WEBHOOK DE MERCADO PAGO
// ========================================
const webhookPago = async (req, res) => {
    let claveEvento = null;

    try {
        // ========================================
        // FAIL-CLOSED: sin secret no se procesa ningún evento y se informa
        // indisponibilidad para que Mercado Pago pueda reintentarlo.
        // ========================================
        if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
            console.error(
                '[webhook] MERCADOPAGO_WEBHOOK_SECRET no configurado. Webhook IGNORADO (fail-closed): configura el secret para procesar pagos.'
            );
            return res.status(503).json({
                success: false,
                mensaje:
                    'Webhook no configurado'
            });
        }

        // ========================================
        // VERIFICAR FIRMA (obligatoria)
        // ========================================
        if (!verificarFirmaWebhook(req)) {
            return res.status(401).json({
                success: false,
                mensaje: 'Firma de webhook inválida'
            });
        }

        const { type, data } =
            req.body;

        if (!['payment', 'order'].includes(type)) {
            return res.status(200).json({
                success: true,
                ignorado: true
            });
        }

        // ========================================
        // [LOG TEMPORAL] WEBHOOK RECIBIDO
        // ========================================
        console.log('[PAYU WEBHOOK]');
        console.log(`  referenceCode: ${req.body?.referenceCode}`);
        console.log(`  state: ${req.body?.state}`);
        console.log(`  amount: ${req.body?.amount}`);

        const referenceCode = req.body?.referenceCode;
        const state = req.body?.state;
        const amount = req.body?.amount;

        if (!referenceCode || !state) {
            console.log(
                '[webhook] Evento sin referenceCode o state, ignorado.'
            );
            return res.status(200).json({
                success: true,
                ignorado: true
            });
        }

        const eventId = referenceCode;

        // ========================================
        // DEDUPLICACIÓN: si el evento ya se procesó en los
        // últimos 5 minutos, se responde 200 sin reprocesar.
        // ========================================
        const requestId =
            req.headers['x-request-id'];
        claveEvento = requestId
            ? `payu:${eventId}:${requestId}`
            : `payu:${eventId}:${state}`;

        if (
            eventoWebhookYaProcesado(
                claveEvento
            )
        ) {
            console.log(
                `[webhook] Evento duplicado omitido: ${claveEvento}`
            );
            return res.status(200).json({
                success: true,
                duplicado: true
            });
        }

        eventosWebhookProcesados.set(
            claveEvento,
            Date.now()
        );

        // ========================================
        // CONSULTAR ESTADO REAL EN PAYU
        // ========================================
        let datos = null;

        const resultado =
            await payuService.obtenerOrdenDiagnostico(
                eventId
            );
        if (resultado?.errorFetch) {
            eventosWebhookProcesados.delete(
                claveEvento
            );
            console.log('[PAYU STATUS] (error desde webhook)');
            console.log(`  order_id: ${eventId}`);
            console.log(`  error: ${resultado.errorFetch.mensaje}`);
            console.log(`  cause: ${resultado.errorFetch.causa ? JSON.stringify(resultado.errorFetch.causa) : '(sin cause)'}`);
            return res.status(503).json({
                success: false,
                mensaje:
                    'No se pudo consultar PayU'
            });
        }
        datos = resultado;

        if (!datos) {
            eventosWebhookProcesados.delete(
                claveEvento
            );
            console.log(
                `[webhook] No se pudo obtener datos para ${eventId}`
            );
            return res.status(503).json({
                success: false,
                mensaje:
                    'No se pudo consultar PayU'
            });
        }

        const estadoPayu =
            extraerEstadoOrdenPayu(datos);
        const statusMp =
            estadoPayu.status ||
            'desconocido';

        const statusDetail =
            estadoPayu.paymentStatusDetail ||
            datos.transactionResponse?.pendingReason ||
            null;

        const paymentStatus =
            estadoPayu.paymentStatus;

        const paymentStatusDetail =
            estadoPayu.paymentStatusDetail;

        const externalReference =
            datos.transactionResponse?.referenceCode ||
            referenceCode ||
            null;

        // ========================================
        // [LOG TEMPORAL] STATUS — MUESTRA CAUSA REAL SI HAY RECHAZO
        // ========================================
        console.log('[PAYU STATUS]');
        console.log(`  order_id: ${datos.id || eventId}`);
        console.log(`  status: ${statusMp}`);
        console.log(`  status_detail: ${statusDetail}`);
        console.log(`  payment_status: ${paymentStatus}`);
        console.log(`  payment_status_detail: ${paymentStatusDetail}`);
        console.log(`  error: ${(datos.error && JSON.stringify(datos.error)) || '(sin error)'}`);
        console.log(`  cause: ${(datos.cause && JSON.stringify(datos.cause)) || '(sin cause)'}`);
        console.log(`  external_reference: ${externalReference || 'desconocida'}`);

        // ========================================
        // VALIDACIONES PARA PAGOS APROBADOS
        // El monto del pago debe coincidir con venta.total
        //    (tolerancia ±0.02); si difiere, NO se confirma.
        // ========================================
        if (
            estadoPayu.pagado
        ) {
            const ventaDelPago =
                externalReference
                    ? await ventaModel
                        .buscarPorReferenciaExterna(
                            externalReference
                        )
                    : null;

            if (!ventaDelPago) {
                eventosWebhookProcesados.delete(
                    claveEvento
                );
                console.warn(
                    `[webhook] Pago ${eventId} aprobado sin venta local (external_reference=${externalReference || 'desconocida'}). No se confirma nada.`
                );
                return res.status(503).json({
                    success: false,
                    mensaje:
                        'La venta aún no está disponible'
                });
            }

            // Validar monto contra venta.total
            if (
                !montoPagoCoincide(
                    estadoMp.amount,
                    ventaDelPago.total
                )
            ) {
                console.error(
                    `[webhook] ALERTA: Monto del pago ${eventId} (${estadoMp.amount}) difiere del total de la venta ${ventaDelPago.id_venta} (${ventaDelPago.total}). Pago NO confirmado.`
                );
                return res.status(200).json({
                    success: true,
                    ignorado: true
                });
            }
        }

        // ========================================
        // PERSISTIR EN LA VENTA
        // ========================================
        const procesado =
            await aplicarEstadoPagoAVenta({
                externalReference,
                payuOrderId: datos.id || eventId,
                payuPaymentId: estadoPayu.paymentId,
                payuPaymentStatus: statusMp,
                payuPayerEmail:
                    datos.transactionResponse?.buyer?.email ||
                    null,
                estadoVenta:
                    estadoVentaDesdePayu(statusMp)
            });

        if (!procesado) {
            eventosWebhookProcesados.delete(
                claveEvento
            );

            return res.status(503).json({
                success: false,
                mensaje:
                    'La venta aún no está disponible'
            });
        }

        // ========================================
        // LOG NO SENSIBLE
        // ========================================
        console.log(
            `[webhook] type=payu id=${eventId} status=${statusMp} reference=${externalReference || 'desconocida'} venta=${procesado ? 'actualizada' : 'no_encontrada'}`
        );

        return res.status(200).json({
            success: true,
            procesado: true
        });

    } catch (error) {
        if (claveEvento) {
            eventosWebhookProcesados.delete(
                claveEvento
            );
        }

        console.error(
            '[webhook] Error al procesar webhook:',
            error.message
        );

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                mensaje:
                    'Error al procesar el webhook'
            });
        }

        return undefined;
    }
};

// ========================================
// LISTAR PAGOS (ADMIN)
// GET /api/pagos
// Devuelve las ventas con sus datos de pago.
// ========================================
const listarPagosAdmin = async (req, res) => {
    try {
        const {
            estado,
            q,
            pagina,
            por_pagina
        } = req.query;

        const resultado =
            await ventaModel.listarPagosAdmin({
                estado,
                q,
                pagina,
                porPagina: por_pagina
            });

        return res.json({
            success: true,
            pagos: resultado.pagos,
            total: resultado.total,
            paginas: resultado.paginas
        });

    } catch (error) {
        console.error(
            'Error al listar pagos:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al listar los pagos',
            error: 'Error interno del servidor'
        });
    }
};

// ========================================
// EXPORTAR
// ========================================
module.exports = {
    crearOrden,
    obtenerOrden,
    webhookPago,
    listarPagosAdmin
};
