// Instala solo el navegador headless del generador PDF en builds de producción.
// No necesita contraseñas ni modifica la BD. Los entornos de desarrollo y CI
// pueden instalarlo explícitamente con: npx playwright install chromium --only-shell
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const resolverCli = () => path.join(path.dirname(require.resolve('playwright/package.json')), 'cli.js');
if (require.main === module && process.env.NODE_ENV === 'production' && process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD !== '1') {
    const install = spawnSync(process.execPath, [resolverCli(), 'install', 'chromium', '--only-shell'], {
        stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '0' }
    });
    if (install.error || install.status !== 0) {
        console.error('No se pudo preparar el navegador del generador PDF.');
        process.exit(1);
    }
}
module.exports = { resolverCli };
