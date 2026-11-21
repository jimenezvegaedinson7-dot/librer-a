const { crearApp } = require('./app');
const pool = require('../config/database');
const { aplicarMigraciones, aplicarMigracionesDatos, MIGRACIONES_DATOS_EXTRA } = require('../config/migraciones');
const { iniciarJobs } = require('../jobs/limpieza');

async function iniciar({ puerto = process.env.PORT || 3000 } = {}) {
    if (process.env.NODE_ENV !== 'test') {
        await aplicarMigraciones(pool);
        await aplicarMigracionesDatos(pool);
        await aplicarMigracionesDatos(pool, { lista: MIGRACIONES_DATOS_EXTRA });
    }

    const app = crearApp();
    const servidor = await new Promise((resolve, reject) => {
        const http = app.listen(puerto, (error) => error ? reject(error) : resolve(http));
        http.once('error', reject);
    });
    const detenerJobs = iniciarJobs();
    console.log(`Servidor ejecutándose en http://localhost:${servidor.address().port}`);
    return { app, servidor, detenerJobs };
}

module.exports = { iniciar };
