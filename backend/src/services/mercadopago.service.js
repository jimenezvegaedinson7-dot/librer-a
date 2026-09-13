const { Order, Payment } = require('mercadopago');
const { cliente } = require('../config/mercadopago');

const crearOrden = async ({
    externalReference,
    items,
    payerEmail,
    notificationUrl,
    successUrl,
    failureUrl,
    pendingUrl,
    shipping,
    idempotencyKey
}) => {
    if (!payerEmail || typeof payerEmail !== 'string' || !payerEmail.includes('@')) {
        const error = new Error(
            'El email del comprador (payerEmail) no es válido: es requerido para crear la orden'
        );
        error.paymentValidation = true;
        throw error;
    }

    if (!cliente) {
        const error = new Error(
            'Mercado Pago no está configurado en el servidor'
        );
        error.disableRealPayment = true;
        throw error;
    }

    const order = new Order(cliente);

    // ========================================
    // ARRAY DE ÍTEMS FINAL (libros + envío)
    // ========================================
    const itemsOrden = [
        ...items.map((item) => ({
            title: item.title,
            unit_price: Number(item.unit_price).toFixed(2),
            quantity: Number(item.quantity)
        }))
    ];

    if (
        shipping &&
        Number(shipping.price) > 0
    ) {
        itemsOrden.push({
            title: shipping.title,
            unit_price: Number(shipping.price).toFixed(2),
            quantity: 1
        });
    }

    const total = itemsOrden
        .reduce(
            (sum, item) =>
                sum +
                Number(item.unit_price) *
                Number(item.quantity),
            0
        )
        .toFixed(2);

    const body = {
        type: 'online',
        processing_mode: 'manual',
        total_amount: total,
        external_reference: String(externalReference),
        payer: {
            email: payerEmail
        },
        items: itemsOrden
    };

    if (notificationUrl || successUrl || failureUrl || pendingUrl) {
        body.config = {
            online: {}
        };

        if (notificationUrl) {
            body.config.online.callback_url = notificationUrl;
        }

        if (successUrl) {
            body.config.online.success_url = successUrl;
        }

        if (failureUrl) {
            body.config.online.failure_url = failureUrl;
        }

        if (pendingUrl) {
            body.config.online.pending_url = pendingUrl;
        }
    }

    const resultado = await order.create({
        body,
        requestOptions: {
            idempotencyKey:
                idempotencyKey ||
                String(externalReference)
        }
    });

    // ========================================
    // [LOG TEMPORAL] CREAR ORDEN — NO SENSIBLE
    // ========================================
    console.log('[MERCADOPAGO CREATE]');
    console.log(`  order_id: ${resultado.id}`);
    console.log(`  status: ${resultado.status}`);
    console.log(`  status_detail: ${resultado.status_detail || '(sin status_detail)'}`);
    console.log(`  checkout_url: ${resultado.checkout_url}`);
    console.log(`  external_reference: ${externalReference}`);
    console.log(`  total_amount: ${resultado.total_amount ?? total}`);

    return {
        id: resultado.id,
        checkout_url: resultado.checkout_url,
        status: resultado.status,
        total_amount: resultado.total_amount
    };
};

const obtenerOrden = async (orderId) => {
    if (!cliente) {
        return null;
    }

    const order = new Order(cliente);
    return await order.get({ id: orderId });
};

const obtenerOrdenDiagnostico = async (orderId) => {
    try {
        const orden = await obtenerOrden(orderId);
        return orden || null;
    } catch (error) {
        // Error de MP al consultar; exponer la causa real del rechazo.
        const causa = error?.cause || error?.error?.cause || null;
        const mensaje = error?.message || 'Error al consultar la orden';

        // ========================================
        // [LOG TEMPORAL] STATUS — NO SENSIBLE
        // ========================================
        console.log('[MERCADOPAGO STATUS] (al consultar)');
        console.log(`  order_id: ${orderId}`);
        console.log(`  status: ${error?.status || '(n/a)'}`);
        console.log(`  status_detail: ${error?.status_detail || '(n/a)'}`);
        console.log(`  payment_status: ${error?.payment_status || '(n/a)'}`);
        console.log(`  payment_status_detail: ${error?.payment_status_detail || '(n/a)'}`);
        console.log(`  error: ${mensaje}`);
        console.log(`  cause: ${causa ? JSON.stringify(causa) : '(sin cause)'}`);

        return { errorFetch: { mensaje, causa } };
    }
};

const obtenerPago = async (paymentId) => {
    if (!cliente) {
        return null;
    }

    const payment = new Payment(cliente);
    return await payment.get({ id: paymentId });
};

module.exports = {
    crearOrden,
    obtenerOrden,
    obtenerOrdenDiagnostico,
    obtenerPago
};
