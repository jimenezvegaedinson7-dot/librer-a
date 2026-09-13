const { cliente, PAYU_API_BASE } = require('../config/payu');
const crypto = require('crypto');

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
            'PayU no está configurado en el servidor'
        );
        error.disableRealPayment = true;
        throw error;
    }

    const itemsOrden = [
        ...items.map((item) => ({
            description: item.title,
            value: Math.round(Number(item.unit_price) * 100),
            quantity: Number(item.quantity)
        }))
    ];

    if (
        shipping &&
        Number(shipping.price) > 0
    ) {
        itemsOrden.push({
            description: shipping.title,
            value: Math.round(Number(shipping.price) * 100),
            quantity: 1
        });
    }

    const total = itemsOrden
        .reduce(
            (sum, item) =>
                sum +
                item.value *
                item.quantity,
            0
        );

    const referenceCode = externalReference;
    const signature = crypto
        .createHash('md5')
        .update(`${cliente.apiKey}~${cliente.merchantId}~${referenceCode}~${total}~PEN`)
        .digest('hex');

    const body = {
        language: 'es',
        command: 'SUBMIT_TRANSACTION',
        merchant: {
            apiLogin: cliente.apiLogin,
            apiKey: cliente.apiKey
        },
        transaction: {
            order: {
                accountId: cliente.accountId,
                referenceCode,
                description: referenceCode,
                language: 'es',
                signature,
                notifyUrl: notificationUrl,
                additionalValues: {
                    TX_VALUE: {
                        value: total / 100,
                        currency: 'PEN'
                    },
                    TX_TAX: {
                        value: 0,
                        currency: 'PEN'
                    },
                    TX_TAX_RETURN_BASE: {
                        value: 0,
                        currency: 'PEN'
                    }
                },
                buyer: {
                    emailAddress: payerEmail,
                    fullName: payerEmail.split('@')[0]
                },
                shipping: shipping ? {
                    address: shipping.title,
                    city: 'Lima',
                    country: 'PE',
                    phone: '',
                    name: shipping.title
                } : undefined
            },
            creditCard: null,
            extraParameters: {},
            payer: {
                emailAddress: payerEmail,
                fullName: payerEmail.split('@')[0]
            },
            test: cliente.test
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    const response = await fetch(`${PAYU_API_BASE}/payments-api/4.0/service.cgi`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(
            errorData?.transactionResponse?.responseMessage ||
            errorData?.message ||
            'Error al crear la orden en PayU'
        );
        error.paymentValidation = response.status === 400;
        throw error;
    }

    const resultado = await response.json();

    console.log('[PAYU CREATE]');
    console.log(`  order_id: ${resultado?.transactionResponse?.orderId}`);
    console.log(`  status: ${resultado?.transactionResponse?.state}`);
    console.log(`  payment_url: ${resultado?.transactionResponse?.paymentUrl}`);
    console.log(`  external_reference: ${externalReference}`);
    console.log(`  amount: ${total / 100}`);

    return {
        id: resultado?.transactionResponse?.orderId,
        checkout_url: resultado?.transactionResponse?.paymentUrl,
        status: resultado?.transactionResponse?.state,
        total_amount: total / 100,
        transactionResponse: resultado?.transactionResponse
    };
};

const obtenerOrden = async (orderId) => {
    if (!cliente) {
        return null;
    }

    const queryUrl = `${PAYU_API_BASE}/reports-api/4.0/service.cgi?apiLogin=${cliente.apiLogin}&apiKey=${cliente.apiKey}&command=ORDER_DETAIL&orderId=${orderId}&test=${cliente.test}`;

    const response = await fetch(queryUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
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

        console.log('[PAYU STATUS] (al consultar)');
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

    const queryUrl = `${PAYU_API_BASE}/reports-api/4.0/service.cgi?apiLogin=${cliente.apiLogin}&apiKey=${cliente.apiKey}&command=TRANSACTION_DETAIL&transactionId=${paymentId}&test=${cliente.test}`;

    const response = await fetch(queryUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
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