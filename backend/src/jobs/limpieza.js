const ventaModel = require('../models/venta.model');

const INTERVALO_MS = 5 * 60 * 1000;

const ejecutarLimpieza = async () => {
    try {
        const resultado = await ventaModel.cancelarOrdenesAbandonadas(30, {
            alSincronizarPago: (resultado) => require('../controllers/pago.controller').notificarResultadoPago(resultado)
        });

        if (resultado.canceladas > 0) {
            console.log(`[jobs] Ventas abandonadas canceladas: ${resultado.canceladas}`);
        }

        if (resultado.conPagoPendienteEnPayU > 0) {
            console.log(`[jobs] Ventas con orden PayU pagada detectadas (no canceladas): ${resultado.conPagoPendienteEnPayU}`);
        }
    } catch (error) {
        console.error('[jobs] Error al cancelar ventas abandonadas:', error.message);
    }
};

const iniciarJobs = () => {
    setInterval(ejecutarLimpieza, INTERVALO_MS);

    console.log(`[jobs] Limpieza programada cada ${INTERVALO_MS / 60000} minutos`);
};

module.exports = { iniciarJobs };
