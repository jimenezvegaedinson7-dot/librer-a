const { cliente } = require('../config/culqi');
const crypto = require('crypto');

const CULQI_API_BASE = 'https://api.culqi.com/v2';

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
            'Culqi no está configurado en el servidor'
        );
        error.disableRealPayment = true;
        throw error;
    }

    const itemsOrden = [
        ...items.map((item) => ({
            description: item.title,
            unit_price: Math.round(Number(item.unit_price) * 100),
            quantity: Number(item.quantity)
        }))
    ];

    if (
        shipping &&
        Number(shipping.price) > 0
    ) {
        itemsOrden.push({
            description: shipping.title,
            unit_price: Math.round(Number(shipping.price) * 100),
            quantity: 1
        });
    }

    const total = itemsOrden
        .reduce(
            (sum, item) =>
                sum +
                item.unit_price *
                item.quantity,
            0
        );

    const body = {
        amount: total,
        currency_code: 'PEN',
        description: externalReference,
        order_number: externalReference,
        client_details: {
            first_name: payerEmail.split('@')[0],
            last_name: '',
            email: payerEmail
        },
        confirm: true,
        items: itemsOrden
    };

    if (notificationUrl) {
        body.callback_url = notificationUrl;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cliente.secretKey}`
    };

    const idempotency = idempotencyKey || String(externalReference);

    const response = await fetch(`${CULQI_API_BASE}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(
            errorData?.object === 'error'
                ? errorData.user_message || errorData.description
                : 'Error al crear la orden en Culqi'
        );
        error.paymentValidation = response.status === 400;
        throw error;
    }

    const resultado = await response.json();

    console.log('[CULQI CREATE]');
    console.log(`  order_id: ${resultado.id}`);
    console.log(`  status: ${resultado.status}`);
    console.log(`  checkout_url: ${resultado.checkout_url || resultado.short_url}`);
    console.log(`  external_reference: ${externalReference}`);
    console.log(`  amount: ${resultado.amount}`);

    return {
        id: resultado.id,
        checkout_url: resultado.checkout_url || resultado.short_url,
        status: resultado.status,
        total_amount: resultado.amount / 100
    };
};

const obtenerOrden = async (orderId) => {
    if (!cliente) {
        return null;
    }

    const headers = {
        'Authorization': `Bearer ${cliente.secretKey}`
    };

    const response = await fetch(`${CULQI_API_BASE}/orders/${orderId}`, {
        method: 'GET',
        headers
    });

    if (!response.ok) {
        return null;
    }

    return await response.json();
};

const obtenerOrdenDiagnostico = async (orderId) => {
    try {
        const orden = await obtenerOrden(orderId);
        return orden || null;
    } catch (error) {
        const causa = error?.cause || error?.error?.cause || null;
        const mensaje = error?.message || 'Error al consultar la orden';

        console.log('[CULQI STATUS] (al consultar)');
        console.log(`  order_id: ${orderId}`);
        console.log(`  error: ${mensaje}`);
        console.log(`  cause: ${causa ? JSON.stringify(causa) : '(sin cause)'}`);

        return { errorFetch: { mensaje, causa } };
    }
};

const obtenerPago = async (paymentId) => {
    if (!cliente) {
        return null;
    }

    const headers = {
        'Authorization': `Bearer ${cliente.secretKey}`
    };

    const response = await fetch(`${CULQI_API_BASE}/charges/${paymentId}`, {
        method: 'GET',
        headers
    });

    if (!response.ok) {
        return null;
    }

    return await response.json();
};

module.exports = {
    crearOrden,
    obtenerOrden,
    obtenerOrdenDiagnostico,
    obtenerPago
};