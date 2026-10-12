// Descubrimiento de todos los tests unitarios, separado del runner de integración.
const { readdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const archivos = readdirSync(path.join(raiz, 'test')).filter(f => f.endsWith('.test.js')).sort().map(f => `test/${f}`);
if (!archivos.length) throw new Error('No se encontraron pruebas unitarias');
const resultado = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...process.argv.slice(2), ...archivos], {
    cwd: raiz, stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://unit:unit@127.0.0.1:1/unit', DB_SSL: 'false',
        JWT_SECRET: 'unit-jwt-key-not-for-production', TWO_FACTOR_ENCRYPTION_KEY: 'unit-two-factor-key-not-for-production',
        SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', RESEND_API_KEY: '', EMAIL_RESEND_API_KEY: '', BREVO_API_KEY: '',
        CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '', GEMINI_API_KEY: '',
        PAYU_API_KEY: '', PAYU_API_LOGIN: '', PAYU_MERCHANT_ID: '', PAYU_ACCOUNT_ID: '', PAYU_PUBLIC_KEY: '',
    },
});
if (resultado.error) throw resultado.error;
process.exitCode = resultado.status ?? 1;
