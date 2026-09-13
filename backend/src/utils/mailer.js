// ============================================================
// UTILIDAD DE CORREO (nodemailer + SMTP Gmail)
// ============================================================
// Envía correos transaccionales como el código de verificación
// de email en el registro. La configuración se lee del .env.
// En desarrollo, si no hay credenciales, registra en consola solo
// destinatario y asunto (NUNCA el código OTP ni el cuerpo) para
// permitir probar el flujo sin enviarlo de verdad.
// ============================================================

const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'true') === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;

// ¿Está configurado el SMTP? Si no, el sistema funciona en "modo consola".
const smtpConfigurado =
    SMTP_HOST && SMTP_USER && SMTP_PASS;

let transporter = null;

function obtenerTransporter() {
    if (!smtpConfigurado) return null;
    if (!transporter) {
        // Por defecto se validan los certificados TLS. En entornos de desarrollo
        // con proxies/antivirus que inyectan certificados autofirmados (p. ej.
        // "self-signed certificate in certificate chain") se puede desactivar
        // la validación con SMTP_REJECT_UNAUTHORIZED=false.
        const rechazarNoAutorizado =
            String(process.env.SMTP_REJECT_UNAUTHORIZED || 'true').trim().toLowerCase() === 'true';

        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: rechazarNoAutorizado,
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
    // Modo consola: no hay SMTP configurado.
    if (!smtpConfigurado) {
        console.log(
            `[MAIL·CONSOLA] to=${destinatario} subject=${asunto} ok=false (sin SMTP configurado)`
        );
        return { enviado: false, consola: true };
    }

    // Reintentos: la conexión TLS hacia el SMTP es intermitente, así que se
    // intenta hasta 3 veces con backoff antes de caer al modo consola. El envío
    // es fire-and-forget en el llamador, por lo que esto no bloquea la respuesta.
    const MAX_INTENTOS = 3;
    let ultimoError = null;

    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
        // Transporter nuevo en cada intento para no reutilizar un socket dañado.
        transporter = null;

        const intentoRemitente = obtenerTransporter();
        if (!intentoRemitente) {
            return { enviado: false, consola: true };
        }

        try {
            await intentoRemitente.sendMail({
                from: `"Librería" <${MAIL_FROM}>`,
                to: destinatario,
                subject: asunto,
                text: texto,
                html,
            });
            return { enviado: true, consola: false };
        } catch (error) {
            ultimoError = error.message;
            console.error(`[MAIL] Intento ${intento}/${MAX_INTENTOS} falló: ${error.message}`);
            if (intento < MAX_INTENTOS) {
                await new Promise((r) => setTimeout(r, 1500 * intento));
            }
        }
    }

    // Si falla el envío real tras los reintentos, registramos solo
    // destinatario/asunto y el error (sin imprimir el cuerpo ni el
    // código OTP para no exponer secretos en logs).
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

module.exports = {
    enviarCorreo,
    enviarCodigoVerificacion,
    smtpConfigurado,
};
