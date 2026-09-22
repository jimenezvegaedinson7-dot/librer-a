import {
    obtenerResumen,
    obtenerLibrosMasVendidos,
    obtenerVentasPorEstado,
    obtenerReservasPorEstado,
    obtenerVentasPorMes,
    obtenerVentasPorDia,
    obtenerIndicadoresVentas,
    obtenerStockBajo,
} from '../reportes/reportesService';

import { listarLibros } from '../libros/librosService';

export async function obtenerLibros() {
    return listarLibros();
}

export {
    obtenerResumen,
    obtenerLibrosMasVendidos,
    obtenerVentasPorEstado,
    obtenerReservasPorEstado,
    obtenerVentasPorMes,
    obtenerVentasPorDia,
    obtenerIndicadoresVentas,
    obtenerStockBajo,
};
