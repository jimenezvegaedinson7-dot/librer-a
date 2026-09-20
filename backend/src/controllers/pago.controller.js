const payuService = require('../services/payu.service');
const ventaModel = require('../models/venta.model');
const usuarioModel = require('../models/usuario.model');
const ubicacionModel = require('../models/ubicacion.model');
const agenciaModel = require('../models/agencia.model');
const pool = require('../config/database');
const crypto = require('crypto');
const { validarId } = require('../utils/validaciones');
const {
    extraerEstadoOrdenPayu,
    montoPagoCoincide
} = require('../utils/payuStatus');
const {
    enviarCorreoOrdenCreada,
    enviarCorreoPagoConfirmado,
    enviarCorreoPagoRechazado
} = require('../utils/mailer');
const { PUBLIC_BASE_URL } = require('../config/payu');

// ========================================
// CORREOS TRANSACCIONALES (fire-and-forget)
// Nunca bloquean ni rompen el flujo principal: cualquier error de
// envío solo se registra en consola.
// ========================================
const notificarOrdenCreada = async ({
    idUsuario,
    correoCompra,
    idVenta,
    items,
    total,
    costoEnvio,
    tipoEntrega
}) => {
    if (!correoCompra) return;

    const usuario =
        await usuarioModel.buscarPorId(idUsuario);

    await enviarCorreoOrdenCreada({
        destinatario: correoCompra,
        nombre: usuario?.nombre || '',
        idVenta,
        items,
        total,
        costoEnvio,
        tipoEntrega
    });
};

const notificarPagoConfirmado = async (venta) => {
    const destinatario = venta.correo_compra;

    if (!destinatario) return;

    const usuario =
        await usuarioModel.buscarPorId(venta.id_usuario);

    await enviarCorreoPagoConfirmado({
        destinatario,
        nombre: usuario?.nombre || '',
        idVenta: venta.id_venta,
        total: venta.total,
        externalReference: venta.external_reference
    });
};

const notificarPagoRechazado = async (venta, estadoPayu) => {
    const destinatario = venta.correo_compra;

    if (!destinatario) return;

    const usuario =
        await usuarioModel.buscarPorId(venta.id_usuario);

    await enviarCorreoPagoRechazado({
        destinatario,
        nombre: usuario?.nombre || '',
        idVenta: venta.id_venta,
        total: venta.total,
        estado: estadoPayu || venta.payu_payment_status || 'rechazado'
    });
};

// ========================================
// URL DE LA PÁGINA DE CHECKOUT PROPIA (auto-submit del form PayU)
// ========================================
const construirCheckoutUrl = (externalReference) =>
    externalReference
        ? `${PUBLIC_BASE_URL}/api/pagos/checkout/${encodeURIComponent(externalReference)}`
        : null;

const escapeHtml = (valor) =>
    String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

// ========================================
// PÁGINA DE CHECKOUT (PÚBLICA, auto-submit del form WebCheckout)
// Se abre en el navegador vía launchUrl y reenvía el formulario
// firmado al gateway de PayU.
// ========================================
const renderCheckoutPage = async (req, res) => {
    try {
        const externalReference = String(
            req.params.externalReference || ''
        ).trim();

        if (!externalReference) {
            return res.status(400).send(
                'Parámetro inválido.'
            );
        }

        const venta =
            await ventaModel.buscarPorReferenciaExterna(
                externalReference
            );

        if (!venta) {
            return res.status(404).send(
                'Orden no encontrada.'
            );
        }

        if (venta.estado !== 'pendiente') {
            return res
                .status(200)
                .type('html')
                .send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Orden procesada</title></head>
<body style="font-family:sans-serif;text-align:center;margin-top:80px;color:#333">
  <h2>Tu orden ya fue procesada</h2>
  <p>Estado actual: <strong>${escapeHtml(venta.estado)}</strong>.</p>
  <p>Puedes cerrar esta página y revisar tu pedido en la aplicación.</p>
</body>
</html>`);
        }

        const formulario =
            payuService.construirFormularioCheckout({
                externalReference,
                total: venta.total,
                buyerEmail:
                    venta.correo_compra || ''
            });

        const inputs = Object.entries(
            formulario.campos
        ).map(([nombre, valor]) =>
            `  <input type="hidden" name="${escapeHtml(nombre)}" value="${escapeHtml(valor)}">`
        ).join('\n');

        return res
            .status(200)
            .type('html')
            .send(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Procesando el pago...</title>
</head>
<body onload="document.getElementById('payu-form').submit()" style="font-family:sans-serif;text-align:center;margin-top:80px;color:#333">
  <p>Conectando con la pasarela de pago... Si la página no avanza, presiona el botón.</p>
  <form id="payu-form" method="post" action="${escapeHtml(formulario.action)}">
${inputs}
    <noscript>
      <button type="submit">Continuar al pago</button>
    </noscript>
  </form>
</body>
</html>`);

    } catch (error) {
        console.error(
            'Error al renderizar el checkout:',
            error.message
        );
        return res.status(500).send(
            'No se pudo preparar el pago.'
        );
    }
};

// ========================================
// PÁGINA DE RETORNO (PÚBLICA, responseUrl del WebCheckout)
// ========================================
const renderRespuestaPage = async (req, res) => {
    const externalReference = String(
        req.params.externalReference || ''
    ).trim();

    return res
        .status(200)
        .type('html')
        .send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Pago procesado</title></head>
<body style="font-family:sans-serif;text-align:center;margin-top:80px;color:#333">
  <h2>Gracias por tu compra</h2>
  <p>Tu pago (referencia ${escapeHtml(externalReference)}) está siendo confirmado.</p>
  <p>Puedes cerrar esta página y volver a la aplicación para verificar el estado de tu pedido.</p>
</body>
</html>`);
};

// ========================================
// DEDUPLICACIÓN DE EVENTOS DE WEBHOOK (memoria)
// Evita reprocesar el mismo evento de PayU
// (órdenes duplicadas). Clave: "payu:reference_sale:state_pol:transaction_id".
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
    // Con WebCheckout el checkout_url apunta a la página propia que
    // auto-envía el form a PayU; sólo se reenvía mientras la venta
    // siga pendiente.
    const checkoutUrl =
        venta.estado === 'pendiente'
            ? construirCheckoutUrl(
                venta.external_reference
            )
            : null;

    const estadoDesdeVenta =
        venta.estado === 'pagada'
            ? 'APPROVED'
            : venta.estado === 'cancelada'
                ? 'DECLINED'
                : 'PENDING';

    const status =
        venta.payu_payment_status ||
        estadoDesdeVenta;

    return {
        success: true,
        ya_existia: true,
        venta,
        preferencia: venta.external_reference
            ? {
                id: venta.external_reference,
                checkout_url: checkoutUrl
            }
            : null,
        data: {
            id_venta: venta.id_venta,
            order_id:
                venta.external_reference ||
                venta.payu_order_id ||
                null,
            checkout_url: checkoutUrl,
            status,
            total: Number(venta.total || 0),
            costo_envio: Number(
                venta.costo_envio || 0
            )
        }
    };
};

// ========================================
// CREAR ORDEN DE PAGO (PayU Checkout)
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
                    payu_order_id,
                    payu_payment_id,
                    payu_payment_status,
                    payu_payer_email,
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
                const stockLibro =
                    Number(libro.stock || 0);

                if (stockLibro < cantidad) {
                    return res.status(400).json({
                        success: false,
                        mensaje:
                            `Stock insuficiente para "${libro.titulo}". Disponible: ${stockLibro}`
                    });
                }
            } else {
                const stockActual =
                    Number(inventario[0].stock);

                if (stockActual < cantidad) {
                    return res.status(400).json({
                        success: false,
                        mensaje:
                            `Stock insuficiente para "${libro.titulo}". Disponible: ${stockActual}`
                    });
                }
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
        const hashIdempotencia = crypto
            .createHash('sha256')
            .update(
                `${id_usuario}:${idempotenciaClave}`
            )
            .digest('hex');
        const externalReference =
            `orden_${id_usuario}_${hashIdempotencia.slice(0, 40)}`;

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
                idempotencyKey:
                    hashIdempotencia
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
                        payu_order_id,
                        payu_payment_id,
                        payu_payment_status,
                        payu_payer_email,
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

        // ========================================
        // CORREO DE PEDIDO CREADO (fire-and-forget)
        // ========================================
        notificarOrdenCreada({
            idUsuario: req.usuario.id_usuario,
            correoCompra: correo_compra || req.usuario.email,
            idVenta: ventaCreada.id_venta,
            items: orderItems,
            total,
            costoEnvio,
            tipoEntrega
        }).catch(errorCorreo => {
            console.error('No se pudo enviar el correo de orden creada:', errorCorreo.message);
        });

        return res.status(201).json({
            success: true,
            ya_existia: false,
            mensaje:
                'Orden de pago creada correctamente',
            data: {
                id_venta:
                    ventaCreada.id_venta,
                order_id: externalReference,
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

        // ========================================
        // BUSCAR LA VENTA (por referencia externa o id de PayU)
        // Con WebCheckout el cliente usa la referencia externa como
        // order_id; el id numérico de PayU llega vía webhook.
        // ========================================
        let ventaPago =
            await ventaModel.buscarPorReferenciaExterna(
                orderId
            );

        if (!ventaPago && /^\d+$/.test(orderId)) {
            ventaPago =
                await ventaModel.buscarPorPayuOrderId(
                    orderId
                );
        }

        if (!ventaPago) {
            return res.status(404).json({
                success: false,
                mensaje: 'Orden no encontrada'
            });
        }

        // ========================================
        // VERIFICAR PROPIEDAD DE LA VENTA (IDOR)
        // ========================================
        const esAdmin =
            String(
                req.usuario?.rol || ''
            ).toLowerCase() === 'administrador';

        if (
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

        // ========================================
        // ESTADO BASE DESDE LA VENTA
        // ========================================
        let statusPayu =
            ventaPago.payu_payment_status ||
            (ventaPago.estado === 'pagada'
                ? 'APPROVED'
                : ventaPago.estado === 'cancelada'
                    ? 'DECLINED'
                    : 'PENDING');
        let statusDetail = null;
        let paymentId =
            ventaPago.payu_payment_id || null;
        let amount = Number(ventaPago.total);

        // ========================================
        // REFRESCAR ESTADO REAL EN PAYU (best-effort)
        // Solo si el webhook ya dejó un order id de PayU.
        // ========================================
        if (ventaPago.payu_order_id) {
            const resultado =
                await payuService.obtenerOrdenDiagnostico(
                    ventaPago.payu_order_id
                );

            if (resultado && !resultado.errorFetch) {
                const estadoPayu =
                    extraerEstadoOrdenPayu(
                        resultado
                    );

                statusPayu =
                    estadoPayu.status || statusPayu;
                statusDetail =
                    estadoPayu.paymentStatusDetail ||
                    null;
                paymentId =
                    estadoPayu.paymentId || paymentId;
                amount =
                    estadoPayu.amount || amount;

                // Sincronizar la venta si el pago ya ocurrió en PayU
                // aunque el webhook aún no haya llegado.
                if (
                    estadoPayu.pagado ||
                    estadoPayu.cancelado
                ) {
                    await aplicarEstadoPagoAVenta({
                        externalReference:
                            ventaPago.external_reference,
                        payuOrderId:
                            ventaPago.payu_order_id,
                        payuPaymentId: paymentId,
                        payuPaymentStatus: statusPayu,
                        payuPayerEmail: null,
                        estadoVenta:
                            estadoVentaDesdePayu(
                                statusPayu
                            )
                    });

                    // Recargar la venta para devolver el estado actualizado.
                    ventaPago =
                        await ventaModel.buscarPorReferenciaExterna(
                            ventaPago.external_reference
                        ) || ventaPago;
                }
            }
        }

        // ========================================
        // VALIDAR MONTO SI EL PAGO YA SUCEDIÓ
        // ========================================
        if (statusPayu === 'APPROVED') {
            if (
                !montoPagoCoincide(
                    amount,
                    ventaPago.total
                )
            ) {
                console.warn(
                    `[pago] ALERTA: Monto (${amount}) difiere de venta ${ventaPago.id_venta} (${ventaPago.total}). PayU es la fuente de verdad; se acepta el estado APPROVED.`
                );
            }
        }

        console.log('[PAYU STATUS]');
        console.log(`  order_id: ${orderId}`);
        console.log(`  status: ${statusPayu}`);
        console.log(`  status_detail: ${statusDetail}`);
        console.log(`  external_reference: ${ventaPago.external_reference}`);

        // ========================================
        // EXPONER SOLO CAMPOS NECESARIOS PARA EL CLIENTE
        // ========================================
        return res.json({
            success: true,
            data: {
                id: orderId,
                order_id:
                    ventaPago.external_reference ||
                    orderId,
                status: statusPayu,
                order_status: statusPayu,
                status_detail: statusDetail,
                external_reference:
                    ventaPago.external_reference,
                payment_status: statusPayu,
                payment_status_detail: statusDetail,
                payment_id: paymentId,
                total_amount: amount
            }
        });

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

    // Una devolución/contracargo posterior se registra en los datos de pago,
    // pero no cambia automáticamente la venta ni devuelve stock: requiere revisión
    // contable y logística manual.
    if (
        venta.estado === 'pagada' ||
        venta.estado === 'entregada'
    ) {
        if (
            estadoVenta === 'cancelada' &&
            true
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

        // ========================================
        // CORREOS TRANSACCIONALES (fire-and-forget)
        // Solo se envían cuando el estado realmente cambió
        // (evita duplicados entre webhook y consulta de orden).
        // ========================================
        if (estadoVenta === 'pagada') {
            notificarPagoConfirmado(venta).catch(
                errorCorreo => {
                    console.error(
                        'No se pudo enviar el correo de pago confirmado:',
                        errorCorreo.message
                    );
                }
            );
        } else if (estadoVenta === 'cancelada') {
            notificarPagoRechazado(
                venta,
                payuPaymentStatus
            ).catch(errorCorreo => {
                console.error(
                    'No se pudo enviar el correo de pago rechazado:',
                    errorCorreo.message
                );
            });
        }
    }

    return true;
};

// ========================================
// MAPEAR ESTADO PAYU -> ESTADO DE VENTA
// ========================================
const estadoVentaDesdePayu = (statusMp) => {
    const pagados = [
        'APPROVED',
        'CAPTURED'
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
// REDONDEAR VALOR COMO PAYU LO FIRMA EN EL WEBHOOK
// El valor se redondea: si el segundo decimal es 0 se deja 1 decimal;
// si no, 2. Ej: 25.00 -> "25.0"; 25.50 -> "25.5"; 25.55 -> "25.55".
// ========================================
const redondearValorWebhook = (valor) => {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return null;
    }

    const conDos = numero.toFixed(2);

    return conDos.endsWith('0')
        ? numero.toFixed(1)
        : conDos;
};

// ========================================
// VERIFICAR FIRMA DEL WEBHOOK (PAYU WebCheckout / Confirmation URL)
// ========================================
// FAIL-CLOSED: si PAYU_API_KEY no está configurado,
// la verificación FALLA (devuelve false). webhookPago no procesa
// ningún evento sin secret (responde 401 para permitir reintentos).
// Firma WebCheckout: MD5(apiKey~merchant_id~reference_sale~new_value~currency~state_pol)
// new_value = valor redondeado (redondearValorWebhook).
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

    const referenceSale = body?.reference_sale;
    const value = body?.value;
    const currency = body?.currency;
    const statePol = body?.state_pol;
    const receivedSignature = body?.sign;

    if (
        !referenceSale ||
        value == null ||
        !currency ||
        statePol == null ||
        !receivedSignature
    ) {
        return false;
    }

    // Se prueban varias representaciones del valor: el redondeado según la
    // regla de PayU ("25.0"), el valor tal como se recibió ("25.00") y el
    // número puro ("25"). Todas se generan del mismo payload firmado, así que
    // aceptar cualquiera no debilita la verificación.
    const candidatosValor = new Set([
        redondearValorWebhook(value),
        String(value ?? '').trim(),
        String(Number(value))
    ].filter((v) => v !== null && v !== '' && v !== 'NaN'));

    if (candidatosValor.size === 0) {
        return false;
    }

    const merchantId = process.env.PAYU_MERCHANT_ID;
    const firmaRecibida = String(receivedSignature).trim();

    const expectedSignatures =
        [...candidatosValor].map((valor) =>
            crypto
                .createHash('md5')
                .update(`${apiKey}~${merchantId}~${referenceSale}~${valor}~${currency}~${statePol}`)
                .digest('hex')
        );

    return expectedSignatures.some((firma) =>
        firma.length === firmaRecibida.length &&
        crypto.timingSafeEqual(
            Buffer.from(firma),
            Buffer.from(firmaRecibida)
        )
    );
};

// ========================================
// WEBHOOK DE PAYU (Confirmation URL de WebCheckout)
// PayU envía application/x-www-form-urlencoded con:
// merchant_id, reference_sale, value, currency, state_pol, sign,
// transaction_id, reference_pol, email_buyer.
// ========================================
const webhookPago = async (req, res) => {
    let claveEvento = null;

    try {
        // ========================================
        // VERIFICAR FIRMA (obligatoria, fail-closed)
        // Si PAYU_API_KEY no está configurado, la verificación falla y
        // se responde 401 para que PayU pueda reintentarlo.
        // ========================================
        if (!verificarFirmaWebhook(req)) {
            return res.status(401).json({
                success: false,
                mensaje: 'Firma de webhook inválida'
            });
        }

        const body = req.body;

        const referenceSale = String(
            body?.reference_sale || ''
        ).trim();
        // PayU envía el monto en la unidad más pequeña (centavos para PEN,
        // cents para USD). Se normaliza dividiendo por 100 para comparar
        // con el total almacenado en soles.
        const rawValue = Number(body?.value);
        const value = Number.isFinite(rawValue) ? rawValue / 100 : rawValue;
        const currency = body?.currency;
        const statePol = String(
            body?.state_pol ?? ''
        ).trim();
        const transactionId = body?.transaction_id;
        const referencePol = body?.reference_pol;
        const emailBuyer = body?.email_buyer || null;

        // ========================================
        // [LOG TEMPORAL] WEBHOOK RECIBIDO
        // ========================================
        console.log('[PAYU WEBHOOK]');
        console.log(`  reference_sale: ${referenceSale}`);
        console.log(`  state_pol: ${statePol}`);
        console.log(`  value: ${value}`);
        console.log(`  currency: ${currency}`);

        if (!referenceSale || statePol === '') {
            console.log(
                '[webhook] Evento sin reference_sale o state_pol, ignorado.'
            );
            return res.status(200).json({
                success: true,
                ignorado: true
            });
        }

        // ========================================
        // DEDUPLICACIÓN: si el evento ya se procesó en los
        // últimos 5 minutos, se responde 200 sin reprocesar.
        // ========================================
        claveEvento = `payu:${referenceSale}:${statePol}:${transactionId || '?'}`;

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
        // MAPEAR state_pol (confirmation) A ESTADO PAYU
        // 4=aprobado, 5=expirado, 6=rechazado, 7=pendiente, 104=error
        // ========================================
        const mapaStatePol = {
            '4': 'APPROVED',
            '5': 'EXPIRED',
            '6': 'DECLINED',
            '7': 'PENDING',
            '104': 'ERROR'
        };

        const statusPayu =
            mapaStatePol[statePol] || 'UNKNOWN';
        const estadoVenta =
            estadoVentaDesdePayu(statusPayu);

        // ========================================
        // VENTA ASOCIADA (referencia externa)
        // ========================================
        const ventaDelPago =
            await ventaModel.buscarPorReferenciaExterna(
                referenceSale
            );

        if (!ventaDelPago) {
            eventosWebhookProcesados.delete(
                claveEvento
            );
            console.warn(
                `[webhook] Evento ${referenceSale} sin venta local (state=${statusPayu}). No se confirma nada.`
            );
            return res.status(503).json({
                success: false,
                mensaje:
                    'La venta aún no está disponible'
            });
        }

        // ========================================
        // VALIDAR MONTO PARA ESTADOS APROBADOS
        // (tolerancia ±0.02); si difiere, NO se confirma.
        // ========================================
        if (statusPayu === 'APPROVED') {
            if (
                !montoPagoCoincide(
                    Number(value),
                    ventaDelPago.total
                )
            ) {
                eventosWebhookProcesados.delete(
                    claveEvento
                );
                console.error(
                    `[webhook] ALERTA: Monto del pago ${referenceSale} (${value}) difiere del total de la venta ${ventaDelPago.id_venta} (${ventaDelPago.total}). Pago NO confirmado.`
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
                externalReference: referenceSale,
                payuOrderId:
                    referencePol ||
                    ventaDelPago.payu_order_id ||
                    null,
                payuPaymentId:
                    transactionId ||
                    ventaDelPago.payu_payment_id ||
                    null,
                payuPaymentStatus: statusPayu,
                payuPayerEmail: emailBuyer,
                estadoVenta
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
            `[webhook] type=payu reference=${referenceSale} estado=${statusPayu} transaction=${transactionId || '?'} venta=${ventaDelPago.id_venta} actualizada`
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
    renderCheckoutPage,
    renderRespuestaPage,
    listarPagosAdmin
};
