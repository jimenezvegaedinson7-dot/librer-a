const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
process.env.BREVO_API_KEY='audit-only';
process.env.RESEND_API_KEY=''; process.env.EMAIL_RESEND_API_KEY='';
process.env.SMTP_USER=''; process.env.EMAIL_USER='';
const {enviarCorreo}=require('../src/utils/mailer');
test('timeout HTTP de correo es capturado y no derriba el proceso',async () => {
    const upstream=http.createServer(() => {}).listen(0,'127.0.0.1');
    await new Promise(r => upstream.once('listening',r));
    const real=global.fetch;
    let acotado=false;
    global.fetch=(url,options) => {
        acotado=options.signal instanceof AbortSignal;
        return real(`http://127.0.0.1:${upstream.address().port}`,{...options,signal:AbortSignal.timeout(30)});
    };
    try {
        const resultado=await enviarCorreo({destinatario:'audit@example.test',asunto:'Audit',html:'Audit'});
        assert.equal(acotado,true); assert.equal(resultado.enviado,false); assert.match(resultado.error,/timeout/i);
    } finally { global.fetch=real; upstream.closeAllConnections(); await new Promise(r => upstream.close(r)); }
});
