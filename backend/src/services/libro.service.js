const pool = require('../config/database');
const libroModel = require('../models/libro.model');
const inventarioModel = require('../models/inventario.model');

async function eliminarConInventario(idLibro) {
    if (await libroModel.tieneVentasRelacionadas(idLibro)) {
        throw Object.assign(new Error('No se puede eliminar este libro porque tiene ventas relacionadas. Puedes cambiarlo a estado Inactivo.'), { status: 409 });
    }

    const conexion = await pool.getConnection();
    try {
        await conexion.beginTransaction();
        await inventarioModel.eliminarMovimientosPorLibro(idLibro, conexion);
        await inventarioModel.eliminarPorLibro(idLibro, conexion);
        const filasAfectadas = await libroModel.eliminar(idLibro, conexion);
        await conexion.commit();
        return filasAfectadas;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

module.exports = { eliminarConInventario };
