const reporteModel = require('../models/reporte.model');

// ========================================
// OBTENER RESUMEN GENERAL
// ========================================
const obtenerResumenGeneral = async (req, res) => {
    try {
        const resumen =
            await reporteModel.obtenerResumenGeneral();

        return res.json({
            success: true,
            data: resumen
        });

    } catch (error) {
        console.error(
            'Error al obtener resumen general:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener el resumen general'
        });
    }
};

// ========================================
// OBTENER LIBROS MÁS VENDIDOS
// ========================================
const obtenerLibrosMasVendidos = async (req, res) => {
    try {
        const libros =
            await reporteModel.obtenerLibrosMasVendidos();

        return res.json({
            success: true,
            data: libros
        });

    } catch (error) {
        console.error(
            'Error al obtener libros más vendidos:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener los libros más vendidos'
        });
    }
};

// ========================================
// OBTENER VENTAS POR ESTADO
// ========================================
const obtenerVentasPorEstado = async (req, res) => {
    try {
        const ventas =
            await reporteModel.obtenerVentasPorEstado();

        return res.json({
            success: true,
            data: ventas
        });

    } catch (error) {
        console.error(
            'Error al obtener ventas por estado:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener las ventas por estado'
        });
    }
};

// ========================================
// OBTENER RESERVAS POR ESTADO
// ========================================
const obtenerReservasPorEstado = async (req, res) => {
    try {
        const reservas =
            await reporteModel.obtenerReservasPorEstado();

        return res.json({
            success: true,
            data: reservas
        });

    } catch (error) {
        console.error(
            'Error al obtener reservas por estado:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener las reservas por estado'
        });
    }
};

// ========================================
// OBTENER STOCK BAJO
// ========================================
const obtenerStockBajo = async (req, res) => {
    try {
        const libros =
            await reporteModel.obtenerStockBajo();

        return res.json({
            success: true,
            data: libros
        });

    } catch (error) {
        console.error(
            'Error al obtener stock bajo:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener el reporte de stock bajo'
        });
    }
};

// ========================================
// OBTENER VENTAS POR MES
// ========================================
const obtenerVentasPorMes = async (req, res) => {
    try {
        const ventas =
            await reporteModel.obtenerVentasPorMes();

        return res.json({
            success: true,
            data: ventas
        });

    } catch (error) {
        console.error(
            'Error al obtener ventas por mes:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener las ventas por mes'
        });
    }
};

// ========================================
// OBTENER VENTAS POR DÍA
// ========================================
const obtenerVentasPorDia = async (req, res) => {
    try {
        const ventas =
            await reporteModel.obtenerVentasPorDia();

        return res.json({
            success: true,
            data: ventas
        });

    } catch (error) {
        console.error(
            'Error al obtener ventas por día:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener las ventas por día'
        });
    }
};

// ========================================
// OBTENER INDICADORES DE VENTAS
// ========================================
const obtenerIndicadoresVentas = async (req, res) => {
    try {
        const indicadores =
            await reporteModel.obtenerIndicadoresVentas();

        return res.json({
            success: true,
            data: indicadores
        });

    } catch (error) {
        console.error(
            'Error al obtener indicadores de ventas:',
            error
        );

        return res.status(500).json({
            success: false,
            mensaje:
                'Error al obtener los indicadores de ventas'
        });
    }
};

// ========================================
// EXPORTAR CONTROLADORES
// ========================================
module.exports = {
    obtenerResumenGeneral,
    obtenerLibrosMasVendidos,
    obtenerVentasPorEstado,
    obtenerReservasPorEstado,
    obtenerStockBajo,
    obtenerVentasPorMes,
    obtenerVentasPorDia,
    obtenerIndicadoresVentas
};