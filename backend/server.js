const { cargarEntorno } = require('./src/config/entorno');
cargarEntorno();

const { iniciar } = require('./src/app/iniciar');

if (require.main === module) {
    iniciar().catch((error) => {
        console.error('[bootstrap] Arranque abortado:', error.message);
        process.exit(1);
    });
}

module.exports = { iniciar };
