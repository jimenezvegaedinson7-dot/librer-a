// ============================================================
// UTILIDAD DE CORREO (Resend HTTP como canal principal + SMTP fallback)
// ============================================================
// Envía correos transaccionales como el código de verificación
// de email en el registro.
//
// Canal principal: Resend (API REST por HTTPS/puerto 443). Render
// bloquea el tráfico SMTP saliente (25/465/587) en instancias donde
// no hay ruta, por lo que Gmail SMTP da timeout. Resend sale por 443.
//
// Si no hay RESEND_API_KEY, se intenta SMTP (nodemailer) y, si tampoco
// hay credenciales SMTP, se registra en consola solo destinatario y
// asunto (NUNCA el código OTP ni el cuerpo) para probar el flujo local.
// ============================================================

const nodemailer = require('nodemailer');
const { resolve4 } = require('dns').promises;

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || 'jimenezvegaedinson7@gmail.com';

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.EMAIL_RESEND_API_KEY;

const SMTP_HOST = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || process.env.EMAIL_SECURE || 'false') === 'true';
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const MAIL_FROM = process.env.MAIL_FROM || process.env.EMAIL_FROM || SMTP_USER;
const MAIL_FROM_NAME = 'Librería';

// ¿Está configurado algún canal? Si no, el sistema funciona en "modo consola".
const resendConfigurado = Boolean(RESEND_API_KEY);
const brevoConfigurado = Boolean(BREVO_API_KEY);
const smtpConfigurado = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter = null;

const resendHeaders = RESEND_API_KEY
    ? {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
      }
    : null;

const brevoHeaders = BREVO_API_KEY
    ? {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
      }
    : null;

async function enviarPorBrevo({ destinatario, asunto, html, texto }) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: brevoHeaders,
        body: JSON.stringify({
            sender: { name: MAIL_FROM_NAME, email: BREVO_SENDER_EMAIL },
            to: [{ email: destinatario }],
            subject: asunto,
            textContent: texto || undefined,
            htmlContent: html,
        }),
    });
    const cuerpo = await res.json().catch(() => null);
    if (![200, 201].includes(res.status)) {
        throw new Error(
            `Brevo HTTP ${res.status}: ${(cuerpo && cuerpo.message) || JSON.stringify(cuerpo)}`
        );
    }
    return cuerpo;
}

// Dirección visible del remitente. Sin dominio verificado, Resend solo
// acepta "onboarding@resend.dev" (entrega únicamente al correo dueño de
// la cuenta). Con dominio verificado, usar algo como no-reply@misdominio.com
// vía RESEND_FROM.
const RESEND_FROM =
    process.env.RESEND_FROM || 'onboarding@resend.dev';

async function enviarPorResend({ destinatario, asunto, html, texto }) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: resendHeaders,
        body: JSON.stringify({
            from: `${MAIL_FROM_NAME} <${RESEND_FROM}>`,
            to: [destinatario],
            subject: asunto,
            text: texto || undefined,
            html,
        }),
    });
    const cuerpo = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(
            `Resend HTTP ${res.status}: ${(cuerpo && (cuerpo.message || cuerpo.error)) || JSON.stringify(cuerpo)}`
        );
    }
    return cuerpo;
}

// Resuelve (una sola vez) la dirección IPv4 del host SMTP. Gmail publica
// A + AAAA y Render no tiene ruta IPv6; conectar a la IP IPv4 literal
// desactiva el sorteo A/AAAA de nodemailer y evita ENETUNREACH.
let smtpResolver = null;
async function hostIpv4() {
    if (smtpResolver !== null) return smtpResolver;
    if (!SMTP_HOST || require('net').isIP(SMTP_HOST)) {
        smtpResolver = SMTP_HOST;
        return smtpResolver;
    }
    try {
        const direcciones = await resolve4(SMTP_HOST);
        smtpResolver = direcciones[0];
        if (!smtpResolver) throw new Error('sin registros A');
    } catch (error) {
        console.error(`[MAIL] No se pudo resolver IPv4 de ${SMTP_HOST}: ${error.message} (se usara el hostname)`);
        smtpResolver = SMTP_HOST;
    }
    return smtpResolver;
}

async function obtenerTransporter() {
    if (!smtpConfigurado) return null;
    if (!transporter) {
        const rechazarNoAutorizado =
            String(process.env.SMTP_REJECT_UNAUTHORIZED || 'true').trim().toLowerCase() === 'true';

        transporter = nodemailer.createTransport({
            host: await hostIpv4(),
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            requireTLS: !SMTP_SECURE,
            servername: SMTP_HOST,
            family: 4,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: rechazarNoAutorizado,
                servername: SMTP_HOST,
            },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 30000,
        });
    }
    return transporter;
}

// ============================================================
// ENVIAR CORREO
// Devuelve { enviado: boolean, consola: boolean }
// ============================================================
async function enviarCorreo({
    destinatario,
    asunto,
    html,
    texto = null,
}) {
    // Modo consola: no hay ningún canal configurado.
    if (!brevoConfigurado && !resendConfigurado && !smtpConfigurado) {
        console.log(
            `[MAIL·CONSOLA] to=${destinatario} subject=${asunto} ok=false (sin canal configurado)`
        );
        return { enviado: false, consola: true };
    }

    let ultimoError = null;

    // Canal 1: Brevo (HTTPS). Permite enviar a cualquier destinatario con un
    // remitente verificado (correo, sin necesidad de dominio).
    if (brevoConfigurado) {
        try {
            const control = setTimeout(() => { throw new Error('Brevo timeout'); }, 20000);
            const res = await enviarPorBrevo({ destinatario, asunto, html, texto }).finally(() => clearTimeout(control));
            if (res && (res.messageId || res.id)) {
                return { enviado: true, consola: false, canal: 'brevo' };
            }
            throw new Error('Brevo no devolvio messageId');
        } catch (error) {
            ultimoError = error.message;
            console.error(`[MAIL] Brevo falló: ${error.message}`);
        }
    }

    // Canal 2: Resend (HTTPS).
    if (resendConfigurado) {
        try {
            const control = setTimeout(() => { throw new Error('Resend timeout'); }, 20000);
            const res = await enviarPorResend({ destinatario, asunto, html, texto }).finally(() => clearTimeout(control));
            if (res && res.id) {
                return { enviado: true, consola: false, canal: 'resend' };
            }
            throw new Error('Resend no devolvio id');
        } catch (error) {
            ultimoError = error.message;
            console.error(`[MAIL] Resend falló: ${error.message}`);
        }
    }

    // Canal 2: SMTP. Hasta 3 intentos con backoff.
    if (smtpConfigurado) {
        const MAX_INTENTOS = 3;
        for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
            // Transporter nuevo en cada intento para no reutilizar un socket dañado.
            transporter = null;

            const intentoRemitente = await obtenerTransporter();
            if (!intentoRemitente) break;

            try {
                await intentoRemitente.sendMail({
                    from: `"${MAIL_FROM_NAME}" <${MAIL_FROM}>`,
                    to: destinatario,
                    subject: asunto,
                    text: texto,
                    html,
                });
                return { enviado: true, consola: false, canal: 'smtp' };
            } catch (error) {
                ultimoError = error.message;
                console.error(`[MAIL] SMTP Intento ${intento}/${MAX_INTENTOS} falló: ${error.message}`);
                if (intento < MAX_INTENTOS) {
                    await new Promise((r) => setTimeout(r, 1500 * intento));
                }
            }
        }
    }

    // Si fallan los canales reales, registramos solo destinatario/asunto y
    // el error (sin imprimir el cuerpo ni el código OTP).
    console.log(
        `[MAIL·FALLBACK] to=${destinatario} subject=${asunto} ok=false error=${ultimoError || '(desconocido)'}`
    );
    return { enviado: false, consola: true, error: ultimoError };
}

// ============================================================
// CORREO DE VERIFICACIÓN DE EMAIL
// ============================================================
async function enviarCodigoVerificacion({ destinatario, codigo, nombre }) {
    const asunto = 'Verifica tu cuenta en Librería';
    const texto =
        `Hola ${nombre},\n\n` +
        `Gracias por registrarte en Librería.\n\n` +
        `Tu código de verificación es:\n\n` +
        `${codigo}\n\n` +
        `Ingresa este código en la aplicación para activar tu cuenta. ` +
        `El código es válido por 10 minutos.\n\n` +
        `Si no solicitaste esta verificación, ignora este correo.\n`;

    const html =
        `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">` +
        `<div style="background:#4f46e5;color:#fff;padding:20px;text-align:center">` +
        `<h1 style="margin:0;font-size:20px">Librería</h1>` +
        `<p style="margin:4px 0 0;font-size:13px;opacity:.9">Verificación de cuenta</p>` +
        `</div>` +
        `<div style="padding:28px;color:#1e293b;font-size:15px">` +
        `<p>Hola <strong>${nombre}</strong>,</p>` +
        `<p>Gracias por registrarte en Librería. Para activar tu cuenta, ingresa el siguiente código de verificación en la aplicación:</p>` +
        `<div style="margin:22px 0;text-align:center">` +
        `<span style="display:inline-block;padding:14px 28px;background:#eef2ff;color:#4338ca;font-size:28px;font-weight:bold;letter-spacing:8px;border-radius:10px">${codigo}</span>` +
        `</div>` +
        `<p style="color:#64748b;font-size:13px">El código es válido por <strong>10 minutos</strong>.</p>` +
        `<p style="color:#64748b;font-size:13px">Si no solicitaste esta verificación, puedes ignorar este correo.</p>` +
        `</div>` +
        `</div>`;

    return enviarCorreo({ destinatario, asunto, html, texto });
}

// ============================================================
// CORREO DE CÓDIGO PARA RESTABLECER CONTRASEÑA
// ============================================================
async function enviarCodigoReseteo({ destinatario, codigo, nombre }) {
    const asunto = 'Restablece tu contraseña en Librería';
    const texto =
        `Hola ${nombre},\n\n` +
        `Recibimos una solicitud para restablecer tu contraseña.\n\n` +
        `Tu código de verificación es:\n\n` +
        `${codigo}\n\n` +
        `Ingresa este código en la aplicación para crear una nueva contraseña. ` +
        `El código es válido por 10 minutos.\n\n` +
        `Si no solicitaste este cambio, ignora este correo y tu contraseña seguirá igual.\n`;

    const html =
        `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">` +
        `<div style="background:#4f46e5;color:#fff;padding:20px;text-align:center">` +
        `<h1 style="margin:0;font-size:20px">Librería</h1>` +
        `<p style="margin:4px 0 0;font-size:13px;opacity:.9">Restablecer contraseña</p>` +
        `</div>` +
        `<div style="padding:28px;color:#1e293b;font-size:15px">` +
        `<p>Hola <strong>${nombre}</strong>,</p>` +
        `<p>Recibimos una solicitud para restablecer tu contraseña. Ingresa el siguiente código en la aplicación:</p>` +
        `<div style="margin:22px 0;text-align:center">` +
        `<span style="display:inline-block;padding:14px 28px;background:#eef2ff;color:#4338ca;font-size:28px;font-weight:bold;letter-spacing:8px;border-radius:10px">${codigo}</span>` +
        `</div>` +
        `<p style="color:#64748b;font-size:13px">El código es válido por <strong>10 minutos</strong>.</p>` +
        `<p style="color:#64748b;font-size:13px">Si no solicitaste este cambio, ignora este correo y tu contraseña seguirá igual.</p>` +
        `</div>` +
        `</div>`;

    return enviarCorreo({ destinatario, asunto, html, texto });
}

// ============================================================
// ESCAPAR HTML (para títulos, nombres, etc. en correos transaccionales)
// ============================================================
const htmlEscape = (valor) =>
    String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

// ============================================================
// PLANTILLA BASE DE CORREO
// ============================================================
const plantillaBase = ({
    tituloCabecera,
    asunto,
    cuerpoHtml
}) => {
    const html =
        `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">` +
        `<div style="background:#4f46e5;color:#fff;padding:20px;text-align:center">` +
        `<h1 style="margin:0;font-size:20px">Librería</h1>` +
        `<p style="margin:4px 0 0;font-size:13px;opacity:.9">${htmlEscape(tituloCabecera)}</p>` +
        `</div>` +
        `<div style="padding:28px;color:#1e293b;font-size:15px">` +
        cuerpoHtml +
        `</div>` +
        `</div>`;

    return { asunto, html };
};

const etiquetaTipoEntrega = (tipoEntrega) => {
    if (tipoEntrega === 'domicilio') return 'Envío a domicilio';
    if (tipoEntrega === 'agencia') return 'Envío por agencia';
    return 'Recojo en tienda';
};

const money = (valor) =>
    `S/ ${Number(valor || 0).toFixed(2)}`;

// ============================================================
// CORREO: PEDIDO CREADO (pendiente de pago)
// ============================================================
async function enviarCorreoOrdenCreada({
    destinatario,
    nombre,
    idVenta,
    items,
    total,
    costoEnvio,
    tipoEntrega
}) {
    const filas = (items || [])
        .map((item) => {
            const subtotal = Number(
                Number(item.unit_price) * Number(item.quantity)
            ).toFixed(2);

            return (
                `<tr>` +
                `<td style="padding:8px 0;border-bottom:1px solid #eef2f7;color:#1e293b">` +
                `${htmlEscape(item.title)} <span style="color:#64748b">× ${htmlEscape(item.quantity)}</span>` +
                `</td>` +
                `<td style="padding:8px 0;border-bottom:1px solid #eef2f7;text-align:right;color:#1e293b">` +
                `${money(subtotal)}` +
                `</td>` +
                `</tr>`
            );
        })
        .join('');

    const cuerpoHtml =
        `<p>Hola <strong>${htmlEscape(nombre)}</strong>,</p>` +
        `<p>Recibimos tu pedido <strong>#${htmlEscape(idVenta)}</strong> en Librería. ` +
        `Tu pedido está <strong>pendiente de pago</strong>; completa el pago en la pasarela para confirmarlo.</p>` +
        `<table style="width:100%;border-collapse:collapse;margin:18px 0">` +
        filas +
        `<tr>` +
        `<td style="padding:8px 0;color:#64748b">Costo de envío</td>` +
        `<td style="padding:8px 0;text-align:right;color:#1e293b">${money(costoEnvio)}</td>` +
        `</tr>` +
        `<tr>` +
        `<td style="padding:8px 0;font-weight:bold;color:#17181c">Total</td>` +
        `<td style="padding:8px 0;text-align:right;font-weight:bold;color:#17181c">${money(total)}</td>` +
        `</tr>` +
        `</table>` +
        `<p style="color:#64748b;font-size:13px">Entrega: <strong>${htmlEscape(etiquetaTipoEntrega(tipoEntrega))}</strong>.</p>` +
        `<p style="color:#64748b;font-size:13px">Si no realizaste este pedido, ignora este correo.</p>`;

    const { asunto, html } = plantillaBase({
        tituloCabecera: 'Confirmación de pedido',
        cuerpoHtml
    });

    return enviarCorreo({ destinatario, asunto, html });
}

// ============================================================
// CORREO: PAGO CONFIRMADO
// ============================================================
async function enviarCorreoPagoConfirmado({
    destinatario,
    nombre,
    idVenta,
    total,
    externalReference
}) {
    const cuerpoHtml =
        `<p>Hola <strong>${htmlEscape(nombre)}</strong>,</p>` +
        `<p>¡Tu pago fue <strong>aprobado</strong>! Ya estamos preparando tu pedido <strong>#${htmlEscape(idVenta)}</strong>.</p>` +
        `<div style="margin:22px 0;text-align:center">` +
        `<span style="display:inline-block;padding:14px 28px;background:#ecfdf5;color:#047857;font-size:22px;font-weight:bold;border-radius:10px">${money(total)}</span>` +
        `</div>` +
        `<p style="color:#64748b;font-size:13px">Referencia del pago: <strong>${htmlEscape(externalReference || '—')}</strong>.</p>` +
        `<p style="color:#64748b;font-size:13px">Puedes revisar el estado de tu pedido en la aplicación en «Mis compras».</p>`;

    const { asunto, html } = plantillaBase({
        tituloCabecera: 'Pago confirmado',
        cuerpoHtml
    });

    return enviarCorreo({ destinatario, asunto, html });
}

// ============================================================
// CORREO: PAGO RECHAZADO
// ============================================================
async function enviarCorreoPagoRechazado({
    destinatario,
    nombre,
    idVenta,
    total,
    estado
}) {
    const cuerpoHtml =
        `<p>Hola <strong>${htmlEscape(nombre)}</strong>,</p>` +
        `<p>El pago de tu pedido <strong>#${htmlEscape(idVenta)}</strong> no pudo completarse (${htmlEscape(estado || 'rechazado')}).</p>` +
        `<p>No se realizó ningún cargo. El pedido queda <strong>cancelado</strong> y puedes volver a intentarlo cuando quieras.</p>` +
        `<p style="color:#64748b;font-size:13px">Monto del pedido: <strong>${money(total)}</strong>.</p>` +
        `<p style="color:#64748b;font-size:13px">Si tienes dudas, escríbenos respondiendo este correo.</p>`;

    const { asunto, html } = plantillaBase({
        tituloCabecera: 'Pago no procesado',
        cuerpoHtml
    });

    return enviarCorreo({ destinatario, asunto, html });
}

// ============================================================
// CORREO: PEDIDO ENTREGADO
// ============================================================
async function enviarCorreoPedidoEntregado({
    destinatario,
    nombre,
    idVenta,
    tipoEntrega
}) {
    const cuerpoHtml =
        `<p>Hola <strong>${htmlEscape(nombre)}</strong>,</p>` +
        `<p>Tu pedido <strong>#${htmlEscape(idVenta)}</strong> fue <strong>entregado</strong>. ¡Gracias por tu compra!</p>` +
        `<div style="margin:22px 0;text-align:center">` +
        `<span style="display:inline-block;padding:14px 28px;background:#ecfdf5;color:#047857;font-size:18px;font-weight:bold;border-radius:10px">✓ Pedido entregado</span>` +
        `</div>` +
        `<p style="color:#64748b;font-size:13px">Entrega: <strong>${htmlEscape(etiquetaTipoEntrega(tipoEntrega))}</strong>.</p>` +
        `<p style="color:#64748b;font-size:13px">Si compraste como invitado o tienes dudas, responde este correo y te ayudamos.</p>`;

    const { asunto, html } = plantillaBase({
        tituloCabecera: 'Pedido entregado',
        cuerpoHtml
    });

    return enviarCorreo({ destinatario, asunto, html });
}

// ============================================================
// CORREO: RESERVA CREADA
// ============================================================
async function enviarCorreoReservaCreada({
    destinatario,
    nombre,
    idReserva,
    titulo,
    cantidad,
    fechaVencimiento
}) {
    const cuerpoHtml =
        `<p>Hola <strong>${htmlEscape(nombre)}</strong>,</p>` +
        `<p>Tu reserva <strong>#${htmlEscape(idReserva)}</strong> fue confirmada:</p>` +
        `<div style="margin:18px 0;padding:16px;background:#f8fafc;border-radius:10px;text-align:center">` +
        `<p style="margin:0;font-size:17px;font-weight:bold;color:#17181c">${htmlEscape(titulo || 'Libro')}</p>` +
        `<p style="margin:6px 0 0;color:#64748b;font-size:13px">Cantidad reservada: <strong>${htmlEscape(cantidad)}</strong></p>` +
        `</div>` +
        `<p style="color:#64748b;font-size:13px">La reserva vence el <strong>${htmlEscape(fechaVencimiento || '—')}</strong>. ` +
        `Pasa a recoger el libro antes de esa fecha.</p>` +
        `<p style="color:#64748b;font-size:13px">Si no realizaste esta reserva, ignora este correo.</p>`;

    const { asunto, html } = plantillaBase({
        tituloCabecera: 'Reserva confirmada',
        cuerpoHtml
    });

    return enviarCorreo({ destinatario, asunto, html });
}

// ============================================================
// CORREO: COMPROBANTE ELECTRÓNICO
// ============================================================
async function enviarComprobantePorEmail({
    destinatario,
    nombre,
    tipo,
    serie,
    numero,
    clienteDniRuc,
    clienteTipoDocumento,
    subtotal,
    igv,
    costoEnvio,
    total,
    items,
    empresaRazon,
    empresaRuc
}) {
    const tipoLabel = tipo === 'factura' ? 'FACTURA' : 'BOLETA';
    const serieNumero = `${serie}-${String(numero).padStart(3, '0')}`;

    const filas = (items || [])
        .map((item) => {
            const sub = Number(item.cantidad || 0) * Number(item.precio_unitario || 0);
            return (
                `<tr>` +
                `<td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#1e293b">${htmlEscape(item.titulo || item.titulo_libro || 'Libro')}</td>` +
                `<td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b">${htmlEscape(item.cantidad)}</td>` +
                `<td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;color:#1e293b">${money(item.precio_unitario)}</td>` +
                `<td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;color:#1e293b">${money(sub)}</td>` +
                `</tr>`
            );
        })
        .join('');

    const documentoLine = clienteDniRuc
        ? `<p style="color:#64748b;font-size:13px">${htmlEscape(clienteTipoDocumento || 'DNI')}: <strong>${htmlEscape(clienteDniRuc)}</strong></p>`
        : '';

    const igvLine = Number(igv || 0) > 0
        ? `<tr><td style="padding:6px 0;color:#64748b">IGV (18%)</td><td style="padding:6px 0;text-align:right;color:#1e293b">${money(igv)}</td></tr>`
        : '';

    const envioLine = Number(costoEnvio || 0) > 0
        ? `<tr><td style="padding:6px 0;color:#64748b">Costo de envío</td><td style="padding:6px 0;text-align:right;color:#1e293b">${money(costoEnvio)}</td></tr>`
        : '';

    const cuerpoHtml =
        `<p>Hola <strong>${htmlEscape(nombre || 'Cliente')}</strong>,</p>` +
        `<p>Tu <strong>${tipoLabel} ${serieNumero}</strong> ha sido emitida correctamente.</p>` +
        `<div style="margin:18px 0;padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0">` +
        `<p style="margin:0 0 6px;font-size:16px;font-weight:bold;color:#17181c">${tipoLabel} ${serieNumero}</p>` +
        documentoLine +
        `<p style="margin:4px 0 0;color:#64748b;font-size:13px">Fecha: <strong>${htmlEscape(new Date().toLocaleDateString('es-PE'))}</strong></p>` +
        `</div>` +
        `<table style="width:100%;border-collapse:collapse;margin:16px 0">` +
        `<thead><tr>` +
        `<th style="padding:6px 0;border-bottom:2px solid #e2e8f0;text-align:left;color:#64748b;font-size:13px">Libro</th>` +
        `<th style="padding:6px 0;border-bottom:2px solid #e2e8f0;text-align:center;color:#64748b;font-size:13px">Cant.</th>` +
        `<th style="padding:6px 0;border-bottom:2px solid #e2e8f0;text-align:right;color:#64748b;font-size:13px">P. Unit.</th>` +
        `<th style="padding:6px 0;border-bottom:2px solid #e2e8f0;text-align:right;color:#64748b;font-size:13px">Subtotal</th>` +
        `</tr></thead>` +
        `<tbody>${filas}</tbody>` +
        `</table>` +
        `<table style="width:100%;border-collapse:collapse;margin:10px 0">` +
        `<tr><td style="padding:4px 0;color:#64748b">Subtotal</td><td style="padding:4px 0;text-align:right;color:#1e293b">${money(subtotal)}</td></tr>` +
        igvLine +
        envioLine +
        `<tr><td style="padding:8px 0;font-weight:bold;color:#17181c;font-size:16px;border-top:2px solid #e2e8f0">Total</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#17181c;font-size:16px;border-top:2px solid #e2e8f0">${money(total)}</td></tr>` +
        `</table>` +
        `<p style="color:#64748b;font-size:12px;margin-top:18px">Emisor: ${htmlEscape(empresaRazon || 'Librería')} — RUC: ${htmlEscape(empresaRuc || '—')}</p>` +
        `<p style="color:#64748b;font-size:12px">Si no realizaste esta compra, ignora este correo.</p>`;

    const { asunto, html } = plantillaBase({
        tituloCabecera: `${tipoLabel} ${serieNumero}`,
        asunto: `${tipoLabel} ${serieNumero} — Librería`,
        cuerpoHtml
    });

    return enviarCorreo({ destinatario, asunto, html });
}

module.exports = {
    enviarCorreo,
    enviarCodigoVerificacion,
    enviarCodigoReseteo,
    enviarCorreoOrdenCreada,
    enviarCorreoPagoConfirmado,
    enviarCorreoPagoRechazado,
    enviarCorreoReservaCreada,
    enviarCorreoPedidoEntregado,
    enviarComprobantePorEmail,
    smtpConfigurado,
    resendConfigurado,
    brevoConfigurado,
};