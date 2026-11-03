const pool = require('../config/database');

const listarResumen = async () => {
    const [filas] = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN estado = 'pagada' THEN 1 ELSE 0 END), 0) AS pagado, COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS pendiente, COALESCE(SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END), 0) AS cancelado, COALESCE(SUM(CASE WHEN estado IN ('pagada', 'entregada') THEN total ELSE 0 END), 0) AS ingresos FROM ventas`
    );

    const fila = filas[0] || {};

    return { pagado: Number(fila.pagado || 0), pendiente: Number(fila.pendiente || 0), cancelado: Number(fila.cancelado || 0), ingresos: Number(fila.ingresos || 0) };
};

module.exports = { listarResumen };
