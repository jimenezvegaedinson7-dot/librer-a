const {
    cliente,
    PAYU_API_BASE,
    PAYU_CHECKOUT_BASE,
    PUBLIC_BASE_URL
} = require('../config/payu');
const crypto = require('crypto');

// ========================================
// GENERAR FIRMA DEL WEBCHECKOUT (Payment Form)
// MD5(apiKey~merchantId~referenceCode~amount~currency)
// El `amount` del formulario va en SOLES con 2 decimales (ej. "25.00"):
// PayU WebCheckout lo cobra tal cual. La firma usa exactamente ese texto.
// ========================================
const generarFirmaCheckout = ({
    referenceCode,
    amount
}) => {
    return crypto
        .createHash('md5')
        .update(`${cliente.apiKey}~${cliente.merchantId}~${referenceCode}~${amount}~PEN`)
        .digest('hex');
};

// ========================================
// CONSTRUIR CAMPOS DEL FORMULARIO WebCheckout
// Devuelve { action, campos }. El HTML del form lo renderiza el
// controlador en GET /api/pagos/checkout/:externalReference.
// ========================================
const construirFormularioCheckout = ({
    externalReference,
    total,
    buyerEmail
}) => {
    if (!cliente) {
        const error = new Error(
            'PayU no está configurado en el servidor'
        );
        error.disableRealPayment = true;
        throw error;
    }

    if (
        !buyerEmail ||
        typeof buyerEmail !== 'string' ||
        !buyerEmail.includes('@')
    ) {
        const error = new Error(
            'El email del comprador no es válido: es requerido para el pago'
        );
        error.paymentValidation = true;
        throw error;
    }

    const cantidadCents = Math.round(
        Number(total) * 100
    );

    if (!Number.isFinite(cantidadCents) || cantidadCents <= 0) {
        const error = new Error(
            'El total de la venta no es válido'
        );
        error.paymentValidation = true;
        throw error;
    }

    // En soles con 2 decimales (S/ 40.00 → "40.00"). Antes se enviaban
    // céntimos ("4000") y PayU cobraba 100 veces el total.
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
        signature: generarFirmaCheckout({
            referenceCode: String(externalReference),
            amount
        }),
        test: cliente.test ? '1' : '0',
        buyerEmail,
        responseUrl: `${PUBLIC_BASE_URL}/api/pagos/respuesta/${encodeURIComponent(String(externalReference))}`,
        confirmationUrl:
            process.env.PAYU_NOTIFICATION_URL ||
            `${PUBLIC_BASE_URL}/api/pagos/webhook`
    };

    return {
        action: PAYU_CHECKOUT_BASE,
        campos
    };
};

// ========================================
// CREAR ORDEN DE PAGO (WebCheckout)
// Ya NO se llama a la Payments API (su sandbox de Perú no devuelve
// paymentUrl sin tarjeta). El checkout_url apunta a una página propia
// del backend que auto-envía el formulario firmado al gateway de PayU.
// El id de orden de PayU se desconoce hasta el pago; se obtiene en el
// webhook vía reference_pol.
// ========================================
const crearOrden = async ({
    externalReference,
    items,
    payerEmail,
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

    const total = itemsOrden
        .reduce(
            (sum, item) =>
                sum +
                item.value *
                item.quantity,
            0
        );

    console.log('[PAYU CREATE] (WebCheckout)');
    console.log(`  external_reference: ${externalReference}`);
    console.log(`  amount: ${total / 100}`);
    console.log(`  idempotency_key: ${idempotencyKey || '(sin clave)'}`);

    return {
        // El id local por ahora es la referencia externa; el id real de
        // PayU (reference_pol) llega con el webhook.
        id: null,
        checkout_url: `${PUBLIC_BASE_URL}/api/pagos/checkout/${encodeURIComponent(externalReference)}`,
        status: 'PENDING',
        total_amount: total / 100,
        transactionResponse: null
    };
};

// ========================================
// CONSULTAR REPORTS API (POST JSON)
// La Reports API requiere POST; GET devuelve 405.
// ========================================
const consultarReporte = async (command, details) => {
    if (!cliente) {
        return null;
    }

    const body = {
        test: cliente.test,
        language: 'en',
        command,
        merchant: {
            apiLogin: cliente.apiLogin,
            apiKey: cliente.apiKey
        },
        details
    };

    const response = await fetch(`${PAYU_API_BASE}/reports-api/4.0/service.cgi`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        return null;
    }

    return response.json();
};

// ========================================
// NORMALIZAR UNA ORDEN DEL REPORTS API
// Deja el estado en formato que consume extraerEstadoOrdenPayu.
// ========================================
const normalizarOrdenReports = (payload = {}) => {
    const tx = payload.transactions?.[0]?.transactionResponse || {};
    const txId = payload.transactions?.[0]?.id || null;
    const txValue = Number(
        payload?.additionalValues?.TX_VALUE?.value ?? 0
    );

    return {
        id: payload.id ?? null,
        status: payload.status ?? tx.state ?? null,
        referenceCode: payload.referenceCode ?? null,
        external_reference: payload.referenceCode ?? null,
        transactionResponse: {
            state: payload.status ?? tx.state ?? null,
            transactionId: txId,
            referenceCode: payload.referenceCode ?? null,
            pendingReason: tx.pendingReason || null,
            responseMessage: tx.responseMessage || null,
            value: txValue * 100,
            buyer: null
        }
    };
};

// ========================================
// OBTENER ORDEN POR ID DE PAYU (ORDER_DETAIL)
// ========================================
const obtenerOrden = async (orderId) => {
    if (!cliente) {
        return null;
    }

    const consulta = await consultarReporte('ORDER_DETAIL', {
        orderId: Number(orderId)
    });

    const payload = consulta?.result?.payload;

    if (!payload) {
        return null;
    }

    return normalizarOrdenReports(payload);
};

// ========================================
// OBTENER ORDEN POR REFERENCIA EXTERNA
// (ORDER_DETAIL_BY_REFERENCE_CODE)
// ========================================
const obtenerOrdenPorReferencia = async (referenceCode) => {
    if (!cliente) {
        return null;
    }

    const consulta = await consultarReporte('ORDER_DETAIL_BY_REFERENCE_CODE', {
        referenceCode: String(referenceCode)
    });

    const payload = consulta?.result?.payload;
    const orden = Array.isArray(payload)
        ? payload[0]
        : payload;

    if (!orden) {
        return null;
    }

    return normalizarOrdenReports(orden);
};

// ========================================
// OBTENER PAGO POR ID DE TRANSACCIÓN
// ========================================
const obtenerPago = async (paymentId) => {
    if (!cliente) {
        return null;
    }

    const consulta = await consultarReporte('TRANSACTION_RESPONSE_DETAIL', {
        transactionId: Number(paymentId)
    });

    return consulta?.result?.payload ?? null;
};

// ========================================
// DIAGNÓSTICO (nunca lanza; devuelve { errorFetch })
// ========================================
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

module.exports = {
    crearOrden,
    construirFormularioCheckout,
    consultarReporte,
    obtenerOrden,
    obtenerOrdenPorReferencia,
    obtenerOrdenDiagnostico,
    obtenerPago
};