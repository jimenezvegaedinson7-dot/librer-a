const { cliente, PAYU_API_BASE, PAYU_CHECKOUT_BASE, PUBLIC_BASE_URL } = require('../config/payu');
const crypto = require('crypto');

const generarFirmaCheckout = ({ referenceCode, amount }) => {
    return crypto.createHash('md5').update(`${cliente.apiKey}~${cliente.merchantId}~${referenceCode}~${amount}~PEN`).digest('hex');
};

const construirFormularioCheckout = ({ externalReference, total, buyerEmail }) => {
    if (!cliente) {
        const error = new Error('PayU no está configurado en el servidor');
        error.disableRealPayment = true;
        throw error;
    }

    if (!buyerEmail || typeof buyerEmail !== 'string' || !buyerEmail.includes('@')) {
        const error = new Error('El email del comprador no es válido: es requerido para el pago');
        error.paymentValidation = true;
        throw error;
    }

    const cantidadCents = Math.round(Number(total) * 100);

    if (!Number.isFinite(cantidadCents) || cantidadCents <= 0) {
        const error = new Error('El total de la venta no es válido');
        error.paymentValidation = true;
        throw error;
    }

    const amount = (cantidadCents / 100).toFixed(2);

    const campos = {
        merchantId: String(cliente.merchantId),
        accountId: String(cliente.accountId),
        description: String(externalReference),
        referenceCode: String(externalReference),
        amount,
        tax: '0',
        taxReturnBase: '0',
        currency: 'PEN',
        signature: generarFirmaCheckout({ referenceCode: String(externalReference), amount }),
        test: cliente.test ? '1' : '0',
        buyerEmail,
        responseUrl: `${PUBLIC_BASE_URL}/api/pagos/respuesta/${encodeURIComponent(String(externalReference))}`,
        confirmationUrl: process.env.PAYU_NOTIFICATION_URL || `${PUBLIC_BASE_URL}/api/pagos/webhook`
    };

    return { action: PAYU_CHECKOUT_BASE, campos };
};

const crearOrden = async ({ externalReference, items, payerEmail, idempotencyKey }) => {
    if (!payerEmail || typeof payerEmail !== 'string' || !payerEmail.includes('@')) {
        const error = new Error('El email del comprador (payerEmail) no es válido: es requerido para crear la orden');
        error.paymentValidation = true;
        throw error;
    }

    if (!cliente) {
        const error = new Error('PayU no está configurado en el servidor');
        error.disableRealPayment = true;
        throw error;
    }

    const itemsOrden = [...items.map((item) => ({ description: item.title, value: Math.round(Number(item.unit_price) * 100), quantity: Number(item.quantity) }))];

    const total = itemsOrden.reduce((sum, item) => sum + item.value * item.quantity, 0);

    console.log('[PAYU CREATE] (WebCheckout)');
    console.log(`  external_reference: ${externalReference}`);
    console.log(`  amount: ${total / 100}`);
    console.log(`  idempotency_key: ${idempotencyKey || '(sin clave)'}`);

    return {
        id: null,
        checkout_url: `${PUBLIC_BASE_URL}/api/pagos/checkout/${encodeURIComponent(externalReference)}`,
        status: 'PENDING',
        total_amount: total / 100,
        transactionResponse: null
    };
};

const consultarReporte = async (command, details) => {
    if (!cliente) {
        return null;
    }

    const body = { test: cliente.test, language: 'en', command, merchant: { apiLogin: cliente.apiLogin, apiKey: cliente.apiKey }, details };

    const response = await fetch(`${PAYU_API_BASE}/reports-api/4.0/service.cgi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
        const error = new Error(`PayU reports API error: ${response.status} ${response.statusText}`);
        error.cause = { status: response.status, statusText: response.statusText };
        throw error;
    }

    const reporte = await response.json();
    if (reporte?.code !== 'SUCCESS') {
        throw new Error('PayU reports API: respuesta no exitosa');
    }
    return reporte;
};

const normalizarOrdenReports = (payload = {}) => {
    const transactions = payload.transactions || [];
    const transaction =
        transactions.find((t) => ['APPROVED', 'CAPTURED'].includes(t.transactionResponse?.state)) ||
        transactions.find((t) => String(t.transactionResponse?.state || '').startsWith('PENDING')) ||
        transactions[0];
    const tx = transaction?.transactionResponse || {};
    const value = transaction?.additionalValues?.TX_VALUE || payload.additionalValues?.TX_VALUE;
    const txValue = value?.value == null ? null : Number(value.value);
    const estado = ['REFUNDED', 'CHARGED_BACK', 'CAPTURED', 'APPROVED'].includes(payload.status) ? payload.status : tx.state || payload.status || null;

    return {
        id: payload.id ?? null,
        status: estado,
        referenceCode: payload.referenceCode ?? null,
        external_reference: payload.referenceCode ?? null,
        transactionResponse: {
            state: estado,
            transactionId: transaction?.id || tx.transactionId || null,
            orderId: payload.id ?? null,
            referenceCode: payload.referenceCode ?? null,
            pendingReason: tx.pendingReason || null,
            responseMessage: tx.responseMessage || null,
            value: txValue == null ? null : txValue * 100,
            currency: value?.currency || null,
            buyer: null
        }
    };
};

const obtenerOrden = async (orderId) => {
    if (!cliente) {
        return null;
    }

    const consulta = await consultarReporte('ORDER_DETAIL', { orderId: Number(orderId) });

    const payload = consulta?.result?.payload;

    if (!payload) {
        return null;
    }

    return elegirOrdenReports(payload);
};

const obtenerOrdenPorReferencia = async (referenceCode) => {
    if (!cliente) {
        return null;
    }

    const consulta = await consultarReporte('ORDER_DETAIL_BY_REFERENCE_CODE', { referenceCode: String(referenceCode) });

    const payload = consulta?.result?.payload;
    return elegirOrdenReports(payload);
};

const obtenerOrdenDiagnostico = async (orderId, externalReference = null) => {
    try {
        const orden = externalReference ? await obtenerOrdenPorReferencia(externalReference) : await obtenerOrden(orderId);
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

const elegirOrdenReports = (payload) => {
    const ordenes = (Array.isArray(payload) ? payload : payload ? [payload] : []).map(normalizarOrdenReports);
    return ordenes.find((o) => ['APPROVED', 'CAPTURED'].includes(o.status)) || ordenes.find((o) => String(o.status || '').startsWith('PENDING')) || ordenes[0] || null;
};

module.exports = { crearOrden, construirFormularioCheckout, consultarReporte, obtenerOrden, obtenerOrdenDiagnostico, elegirOrdenReports };
