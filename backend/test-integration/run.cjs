// Base desechable y servidor locales: nunca usa la conexión de .env.
const { spawn, spawnSync } = require('node:child_process');
const { readFileSync, readdirSync } = require('node:fs');
const { randomUUID, randomBytes } = require('node:crypto');
const net = require('node:net');
const { Client } = require('pg');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const puertoLibre = () => new Promise(resolve => {
    const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
});
async function main() {
    const nombre = `libreria-audit-${randomUUID().slice(0, 8)}`;
    const dbPort = await puertoLibre();
    const port = await puertoLibre();
    const password = randomBytes(24).toString('hex');
    let server;
    let cliente;
    let correo;
    try {
        const docker = spawnSync('docker', ['run', '--rm', '-d', '--name', nombre,
            '-e', `POSTGRES_PASSWORD=${password}`, '-e', 'POSTGRES_DB=audit',
            '-p', `127.0.0.1:${dbPort}:5432`, 'postgres:16-alpine'], { encoding: 'utf8' });
        if (docker.status !== 0) throw new Error(docker.stderr || 'Docker no inició');
        correo = await require('./local-smtp.cjs')();
        const env = { ...process.env, NODE_ENV: 'test', DB_SSL: 'false',
            DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${dbPort}/audit`,
            PORT: String(port), TEST_BASE_URL: `http://127.0.0.1:${port}`,
            JWT_SECRET: randomBytes(32).toString('hex'), TWO_FACTOR_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
            FRONTEND_ORIGINS: 'http://localhost:5173,https://librer-a-zeta.vercel.app', RATE_LIMIT_GENERAL: '10000',
            FRONTEND_ORIGINS_REGEX: '^https://libreria-[a-z0-9-]+-jimenezvegaedinson7-dot\\.vercel\\.app$',
            PAYU_API_KEY: 'audit-only-key', PAYU_API_LOGIN: 'audit-only-login', PAYU_MERCHANT_ID: 'audit-merchant',
            PAYU_ACCOUNT_ID: 'audit-account', PAYU_TEST: 'true', PUBLIC_BASE_URL: `http://127.0.0.1:${port}`,
            PAYU_NOTIFICATION_URL: '', SMTP_HOST:'127.0.0.1', SMTP_PORT:String(correo.port), SMTP_SECURE:'false',
            SMTP_USER:'audit', SMTP_PASS:'audit', SMTP_REQUIRE_TLS:'false', MAIL_FROM:'audit@example.test', SMTP_TEST_URL:correo.url,
            RESEND_API_KEY:'', EMAIL_RESEND_API_KEY:'', BREVO_API_KEY:'',
            CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '' };
        for (let i = 0; i < 60; i++) {
            cliente = new Client({ connectionString: env.DATABASE_URL });
            try { await cliente.connect(); break; } catch { await cliente.end().catch(() => {}); cliente = null; await new Promise(r => setTimeout(r, 500)); }
        }
        if (!cliente) throw new Error('PostgreSQL desechable no disponible');
        await cliente.query(readFileSync(path.join(raiz, 'database/schema.sql'), 'utf8'));
        await cliente.end(); cliente = null;
        server = spawn(process.execPath, ['server.js'], { cwd: raiz, env, stdio: ['ignore', 'pipe', 'pipe'] });
        let salida = '';
        server.stdout.on('data', d => { salida += d; }); server.stderr.on('data', d => { salida += d; });
        let listo = false;
        for (let i = 0; i < 60; i++) {
            try { listo = (await fetch(`${env.TEST_BASE_URL}/api`)).ok; } catch { /* arranque */ }
            if (listo || server.exitCode !== null) break;
            await new Promise(r => setTimeout(r, 250));
        }
        if (!listo) throw new Error(`Servidor de test no disponible: ${salida}`);
        const archivos = process.argv.slice(2);
        const pruebas = spawn(process.execPath, ['--test', '--test-concurrency=1', '--test-timeout=180000',
            ...(archivos.length ? archivos : readdirSync(__dirname).filter(f => f.endsWith('.test.js')).map(f => `test-integration/${f}`))], { cwd: raiz, env, stdio: 'inherit' });
        const codigo = await new Promise(resolve => pruebas.on('exit', resolve));
        process.exitCode = codigo ?? 1;
        if (codigo) console.error(salida);
    } finally {
        if (cliente) await cliente.end();
        if (server) { server.kill(); await new Promise(r => server.once('exit', r)); }
        spawnSync('docker', ['rm', '-f', nombre], { stdio: 'ignore' });
        if (correo) await correo.close();
    }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
