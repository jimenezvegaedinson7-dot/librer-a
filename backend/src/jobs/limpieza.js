// ============================================================
// JOBS DE LIMPIEZA / MANTENIMIENTO
// ============================================================
// Se ejecuta cada 5 minutos:
//   1. Cancela reservas vencidas (pendiente/confirmada que
//      superaron fecha_vencimiento) y devuelve stock.
//   2. Cancela órdenes de venta abandonadas (pendientes con
//      más de 30 minutos de antigüedad) y devuelve stock.
// ============================================================

const reservaModel = require('../models/reserva.model');
const ventaModel = require('../models/venta.model');

const INTERVALO_MS = 5 * 60 * 1000;

// ========================================
// EJECUTAR LIMPIEZA
// ========================================
const ejecutarLimpieza = async () => {
    // ========================================
    // RESERVAS VENCIDAS
    // ========================================
    try {
        const reservasCanceladas =
            await reservaModel.cancelarVencidas();

        if (reservasCanceladas > 0) {
            console.log(
                `[jobs] Reservas vencidas canceladas: ${reservasCanceladas}`
            );
        }
    } catch (error) {
        console.error(
            '[jobs] Error al cancelar reservas vencidas:',
            error.message
        );
    }

    // ========================================
    // VENTAS ABANDONADAS
    // ========================================
    try {
        const resultado =
            await ventaModel.cancelarOrdenesAbandonadas(30);

        if (resultado.canceladas > 0) {
            console.log(
                `[jobs] Ventas abandonadas canceladas: ${resultado.canceladas}`
            );
        }

        if (resultado.conPagoPendienteEnPayU > 0) {
            console.log(
                `[jobs] Ventas con orden PayU pagada detectadas (no canceladas): ${resultado.conPagoPendienteEnPayU}`
            );
        }
    } catch (error) {
        console.error(
            '[jobs] Error al cancelar ventas abandonadas:',
            error.message
        );
    }
};

// ========================================
// INICIAR JOBS
// ========================================
const iniciarJobs = () => {
    setInterval(
        ejecutarLimpieza,
        INTERVALO_MS
    );

    console.log(
        `[jobs] Limpieza programada cada ${INTERVALO_MS / 60000} minutos`
    );
};

module.exports = {
    iniciarJobs
};