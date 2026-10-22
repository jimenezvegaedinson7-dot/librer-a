import { useEffect, useState } from 'react';

import { obtenerVentasPorDia } from './reportesService';
import { serieDiaria } from '../dashboard/graficoUtils';

// Ventas reales por día de los últimos `dias` días (la misma fuente que el
// dashboard). Devuelve los totales en orden, o undefined si no hay datos.
export function useVentasDiarias(dias = 14) {
    const [serie, setSerie] = useState(undefined);
    useEffect(() => {
        let activo = true;
        obtenerVentasPorDia()
            .then((datos) => {
                if (!activo) return;
                const lista = Array.isArray(datos) ? datos : Array.isArray(datos?.data) ? datos.data : [];
                setSerie(serieDiaria(lista, dias).map((d) => d.total));
            })
            .catch(() => { if (activo) setSerie(undefined); });
        return () => { activo = false; };
    }, [dias]);
    return serie;
}
