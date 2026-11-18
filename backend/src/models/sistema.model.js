const pool = require('../config/database');

async function comprobarConexion() {
    const [rows] = await pool.query('SELECT 1 AS resultado');
    return rows[0].resultado;
}

module.exports = { comprobarConexion };
