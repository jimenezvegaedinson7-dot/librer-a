const payuService = require('../services/payu.service');
const ventaModel = require('../models/venta.model');
const { PRECIO_FINAL_SQL } = require('../models/libro.model');
const usuarioModel = require('../models/usuario.model');
const zonaDeliveryModel = require('../models/zonaDelivery.model');
const pool = require('../config/database');
const crypto = require('crypto');
const { validarId, esEmailValido } = require('../utils/validaciones');
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
const { esPersonalInterno } = require('../utils/roles');
const { TIPOS_ENTREGA } = require('../utils/transiciones');

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

    let regreso = '<p>Puedes cerrar esta página y volver a la aplicación para verificar el estado de tu pedido.</p>';
    try {
        const venta = await ventaModel.buscarPorReferenciaExterna(externalReference);
        if (venta?.canal_compra === 'web') {
            const web = new URL(process.env.WEB_PUBLIC_URL || 'https://librer-a-zeta.vercel.app');
            if (!['https:', 'http:'].includes(web.protocol)) throw new Error('URL web no válida');
            regreso = `<p><a href="${escapeHtml(`${web.origin}/mis-compras?orden=${encodeURIComponent(externalReference)}`)}">Volver a mis compras en la web</a></p>`;
        }
    } catch (error) { console.error('No se pudo preparar el enlace de regreso:', error.message); }

    return res
        .status(200)
        .type('html')
        .send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Pago procesado</title></head>
<body style="font-family:sans-serif;text-align:center;margin-top:80px;color:#333">
  <h2>Gracias por tu compra</h2>
  <p>Tu pago (referencia ${escapeHtml(externalReference)}) está siendo confirmado.</p>
  ${regreso}
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
// El dominio es 'domicilio' | 'tienda' y vive en utils/transiciones
// para que backend, panel y app no se desincronicen.
// El envío por agencia ya no se ofrece: solo se entrega en Lima.
// ========================================

// Estado operativo compatible con APK anteriores: no anunciar pagado cuando
// el resultado monetario pertenece a un pedido cancelado pendiente de revisión.
const estadoPublicoPago = (venta, reportado) => venta.pago_revision_motivo ? 'REVISION'
    : venta.estado === 'reembolsada' ? 'REFUNDED'
    : reportado === 'CAPTURED' ? 'APPROVED' : reportado;

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
        estadoPublicoPago(venta, venta.payu_payment_status || estadoDesdeVenta);

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
            estado_venta: venta.estado,
            requiere_revision: Boolean(venta.pago_revision_motivo),
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
            id_zona_delivery,
            referencia,
            idempotencia_clave,
            cliente_documento,
            cliente_tipo_documento
        } = req.body;

        const canalCompra = req.body.canal_compra ?? 'app';
        if (!['app', 'web'].includes(canalCompra)) {
            return res.status(400).json({ success: false, mensaje: 'El canal de compra debe ser app o web' });
        }
        if (req.usuario.rol !== 'cliente') {
            return res.status(403).json({ success: false, mensaje: 'Inicia sesión con una cuenta de cliente para comprar' });
        }

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
                    correo_compra,
                    cliente_documento,
                    cliente_tipo_documento,
                    pago_revision_motivo
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

        const correoDefinitivo = typeof correo_compra === 'string' && correo_compra.trim()
            ? correo_compra.trim() : req.usuario.email;
        if ((correo_compra != null && typeof correo_compra !== 'string') ||
            !esEmailValido(correoDefinitivo) || correoDefinitivo.length > 255) {
            return res.status(400).json({ success: false, mensaje: 'El correo de compra no es válido' });
        }
        for (const [campo, max] of [['cliente_documento', 20], ['cliente_tipo_documento', 10]]) {
            if (req.body[campo] != null && (typeof req.body[campo] !== 'string' || req.body[campo].trim().length > max)) {
                return res.status(400).json({ success: false, mensaje: `El campo ${campo} no es válido` });
            }
        }

        // ========================================
        // NORMALIZAR TIPO DE ENTREGA (domicilio | tienda)
        // ========================================
        // Si el campo no viene, se asume recojo en tienda: es lo que
        // enviaban las apps antiguas y no conviene romperlas.
        //
        // Si viene con un valor explícito que no existe, NO se adivina.
        // Convertir en silencio un typo (p. ej. 'domiciloi') en 'tienda'
        // enviaba el pedido por una ruta que el cliente nunca eligió.
        // Solo una cadena puede ser un tipo de entrega. Un número, un
        // booleano o un array es un cliente roto, y tratarlo como
        // "no enviado" mandaba el pedido a recojo en silencio.
        if (
            tipo_entrega !== undefined &&
            tipo_entrega !== null &&
            tipo_entrega !== '' &&
            typeof tipo_entrega !== 'string'
        ) {
            return res.status(400).json({
                success: false,
                mensaje: `El tipo de entrega debe ser un texto: usa ${TIPOS_ENTREGA.map((t) => `"${t}"`).join(' o ')}.`
            });
        }

        // El trim va antes de comparar contra 'agencia', o un valor con
        // espacios (" agencia ") caería en el mensaje genérico de tipo
        // inexistente en vez de explicar que la agencia ya no existe.
        const tipoSolicitado =
            typeof tipo_entrega === 'string' ? tipo_entrega.trim() : '';

        if (tipoSolicitado === 'agencia') {
            return res
                .status(400)
                .json({
                    success: false,
                    mensaje:
                        'El envío por agencia ya no está disponible. Elige delivery dentro de Pallasca o recojo gratuito en Pallasca.'
                });
        }

        if (tipoSolicitado && !TIPOS_ENTREGA.includes(tipoSolicitado)) {
            return res.status(400).json({
                success: false,
                mensaje: `El tipo de entrega "${tipoSolicitado}" no existe. Usa ${TIPOS_ENTREGA.join(' o ')}.`
            });
        }

        const tipoEntrega = tipoSolicitado || 'tienda';

        // ========================================
        // VALIDAR DATOS DE ENVÍO SEGÚN TIPO
        // Y CALCULAR COSTO DE ENVÍO
        // ========================================
        let costoEnvio = 0;
        let zonaEntrega = null;

        if (
            tipoEntrega === 'domicilio'
        ) {
            const idZona = validarId(id_zona_delivery);
            zonaEntrega = idZona ? await zonaDeliveryModel.obtenerPorId(idZona) : null;
            if (!zonaEntrega || Number(zonaEntrega.estado) !== 1) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        mensaje:
                            'Selecciona una zona activa de delivery dentro de Pallasca'
                    });
            }

            if (
                !direccion ||
                typeof direccion !== 'string' ||
                direccion.trim().length < 5 || direccion.trim().length > 255
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        mensaje:
                            'Indica una dirección de entrega válida'
                    });
            }

            if (referencia != null && (typeof referencia !== 'string' || referencia.trim().length > 255)) {
                return res.status(400).json({ success: false, mensaje: 'La referencia de dirección debe ser un texto de hasta 255 caracteres' });
            }
            costoEnvio = Number(zonaEntrega.tarifa);
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
                        l.id_libro,
                        l.titulo,
                        l.precio,
                        l.stock,
                        l.estado,
                        ${PRECIO_FINAL_SQL}
                    FROM libros l
                    WHERE l.id_libro = ?
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
                Number(libro.precio_final);

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

        // ========================================
        // CREAR ORDEN EN PAYU
        // ========================================
        const resultado =
            await payuService.crearOrden({
                externalReference,
                items: orderItems,
                payerEmail:
                    correoDefinitivo,
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
                direccion: tipoEntrega === 'domicilio' ? direccion.trim() : null,
                referencia: tipoEntrega === 'domicilio' ? (referencia?.trim() || null) : null,
                cobertura_entrega: 'pallasca',
                canal_compra: canalCompra,
                id_zona_delivery: zonaEntrega?.id_zona || null,
                id_distrito: null,
                id_agencia: null,
                correo_compra:
                    correoDefinitivo,
                external_reference:
                    externalReference,
                payu_order_id:
                    resultado.id,
                idempotencia_clave:
                    idempotenciaClave,
                costo_envio: costoEnvio,
                cliente_documento:
                    cliente_documento || null,
                cliente_tipo_documento:
                    cliente_tipo_documento || null,
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
                        correo_compra,
                        cliente_documento,
                        cliente_tipo_documento
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
        // La transacción de venta es la fuente definitiva: precio, correo,
        // respuesta a Flutter y formulario de PayU usan la misma instantánea,
        // incluso si la promoción cambió durante la creación del pedido.
        total = Number(ventaCreada.total);
        costoEnvio = Number(ventaCreada.costo_envio);
        orderItems.splice(0, orderItems.length, ...ventaCreada.detalles.map((detalle) => ({
            title: detalle.titulo,
            unit_price: Number(detalle.precio_unitario).toFixed(2),
            quantity: detalle.cantidad
        })));

        // CORREO DE PEDIDO CREADO (fire-and-forget)
        // ========================================
        notificarOrdenCreada({
            idUsuario: req.usuario.id_usuario,
            correoCompra: correoDefinitivo,
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

        if (error.paymentValidation || error.deliveryValidation) {
            return res.status(400).json({
                success: false,
                mensaje
            });
        }

        // Violación de un CHECK de la base. Casi siempre significa que un
        // dato de entrada contradice el dominio, no que el servidor esté
        // roto: sin esto el cliente recibía un 500 y no podía saber qué
        // corregir. Se expone solo el nombre de la restricción.
        if (error.code === '23514' || error.errno === 3819) {
            return res.status(400).json({
                success: false,
                mensaje:
                    'Los datos del envío no son válidos. Revisa el tipo de entrega y la dirección.'
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
        const esStaff =
            esPersonalInterno(req.usuario?.rol);

        if (
            Number(ventaPago.id_usuario) !==
                Number(req.usuario?.id_usuario) &&
            !esStaff
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
        // La referencia permite recuperar también una compra sin webhook.
        // ========================================
        if (ventaPago.external_reference) {
            const resultado =
                await payuService.obtenerOrdenDiagnostico(
                    ventaPago.payu_order_id, ventaPago.external_reference
                );

            if (resultado && !resultado.errorFetch) {
                const estadoPayu =
                    extraerEstadoOrdenPayu(
                        resultado
                    );

                statusDetail =
                    estadoPayu.paymentStatusDetail ||
                    null;
                paymentId =
                    estadoPayu.paymentId || paymentId;

                // Sincronizar la venta si el pago ya ocurrió en PayU
                // aunque el webhook aún no haya llegado.
                if (
                    estadoPayu.pagado ||
                    estadoPayu.cancelado || estadoPayu.pendiente
                ) {
                    await aplicarEstadoPagoAVenta({
                        externalReference:
                            ventaPago.external_reference,
                        payuOrderId:
                            estadoPayu.orderId || ventaPago.payu_order_id,
                        payuPaymentId: paymentId,
                        payuPaymentStatus: estadoPayu.status,
                        payuPayerEmail: null,
                        monto: estadoPayu.amount,
                        moneda: estadoPayu.currency,
                        reportedReference: estadoPayu.externalReference,
                        estadoVenta:
                            estadoVentaDesdePayu(
                                estadoPayu.status
                            )
                    });

                    // Recargar la venta para devolver el estado actualizado.
                    ventaPago =
                        await ventaModel.buscarPorReferenciaExterna(
                            ventaPago.external_reference
                        ) || ventaPago;
                    statusPayu = ventaPago.payu_payment_status || statusPayu;
                    paymentId = ventaPago.payu_payment_id || null;
                }
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
                status: estadoPublicoPago(ventaPago, statusPayu),
                order_status: estadoPublicoPago(ventaPago, statusPayu),
                status_detail: statusDetail,
                external_reference:
                    ventaPago.external_reference,
                payment_status: estadoPublicoPago(ventaPago, statusPayu),
                payu_payment_status: statusPayu,
                payment_status_detail: statusDetail,
                payment_id: paymentId,
                total_amount: amount,
                estado_venta: ventaPago.estado,
                requiere_revision: Boolean(ventaPago.pago_revision_motivo),
                pago_revision_motivo: ventaPago.pago_revision_motivo || null,
                fecha_pago: ventaPago.fecha_pago || null
            }
        });

    } catch (error) {
        if (error.status === 409) return res.status(409).json({ success: false, mensaje: error.message });
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
    monto,
    moneda,
    reportedReference = externalReference
}) => {
    const resultado = await ventaModel.aplicarPago({ externalReference, payuOrderId,
        payuPaymentId, payuPaymentStatus, payuPayerEmail, monto, moneda, reportedReference });
    notificarResultadoPago(resultado);
    return resultado;
};

const notificarResultadoPago = (resultado) => {
    if (!resultado?.cambio_estado) return;
    const { venta } = resultado;
    const envio = venta.estado === 'pagada' ? notificarPagoConfirmado(venta)
        : venta.estado === 'cancelada' ? notificarPagoRechazado(venta, venta.payu_payment_status) : null;
    envio?.catch(error => console.error('No se pudo enviar la notificación de pago:', error.message));
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
        // PayU WebCheckout envía `value` en soles (el mismo `amount` del
        // formulario, p. ej. "40.00"): se compara directo con el total.
        const value = Number(body?.value);
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
        if (currency !== 'PEN') {
            return res.status(409).json({ success: false, mensaje: 'La moneda del pago no coincide con la compra' });
        }
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
                monto: value,
                moneda: currency
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
        eventosWebhookProcesados.set(claveEvento, Date.now());
        console.log(
            `[webhook] type=payu reference=${referenceSale} estado=${statusPayu} transaction=${transactionId || '?'} venta=${ventaDelPago.id_venta} actualizada`
        );

        return res.status(200).json({
            success: true,
            procesado: true,
            duplicado: Boolean(procesado.duplicado || procesado.ignorado),
            requiere_revision: Boolean(procesado.requiere_revision)
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
            return res.status(error.status === 409 ? 409 : 500).json({
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
const obtenerCapacidadesCompra = (_req, res) => res.json({ success: true, data: {
    compras_web: true, moneda: 'PEN', cobertura: 'pallasca'
} });
module.exports = {
    obtenerCapacidadesCompra,
    crearOrden,
    obtenerOrden,
    webhookPago,
    renderCheckoutPage,
    renderRespuestaPage,
    listarPagosAdmin,
    notificarResultadoPago
};
