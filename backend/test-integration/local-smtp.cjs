// Servidor SMTP local para comprobar envío/reenvío sin proveedores reales.
const net = require('node:net');
const http = require('node:http');
module.exports = async function iniciarCorreo() {
    const mensajes = []; const sockets = new Set(); let fallar = false;
    const smtp = net.createServer(socket => {
        sockets.add(socket); socket.on('close',() => sockets.delete(socket));
        socket.write('220 audit.local ESMTP\r\n');
        let buffer = '', datos = null;
        socket.on('data', chunk => {
            buffer += chunk;
            let fin;
            while ((fin = buffer.indexOf('\r\n')) >= 0) {
                const linea = buffer.slice(0,fin); buffer = buffer.slice(fin+2);
                if (datos !== null) {
                    if (linea === '.') { mensajes.push(datos.join('\r\n')); datos = null; socket.write('250 Accepted\r\n'); }
                    else datos.push(linea);
                    continue;
                }
                if (/^(EHLO|HELO)/i.test(linea)) socket.write('250-audit.local\r\n250 AUTH PLAIN\r\n');
                else if (/^AUTH/i.test(linea)) socket.write('235 Authenticated\r\n');
                else if (/^MAIL/i.test(linea) && fallar) socket.write('550 audit delivery failed\r\n');
                else if (/^DATA/i.test(linea)) { datos = []; socket.write('354 End with dot\r\n'); }
                else if (/^QUIT/i.test(linea)) socket.end('221 Bye\r\n');
                else socket.write('250 OK\r\n');
            }
        });
        socket.on('error',() => {});
    }).listen(0,'127.0.0.1');
    await new Promise(r => smtp.once('listening',r));
    const control = http.createServer((req,res) => {
        if (req.method === 'POST') fallar = req.url === '/fail';
        res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({mensajes,fallar}));
    }).listen(0,'127.0.0.1');
    await new Promise(r => control.once('listening',r));
    return { port:smtp.address().port, url:`http://127.0.0.1:${control.address().port}`,
        async close() { for (const s of sockets) s.destroy(); await Promise.all([new Promise(r => smtp.close(r)),new Promise(r => control.close(r))]); } };
};
