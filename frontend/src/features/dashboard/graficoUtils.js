// Utilidades de presentación para las gráficas del resumen. No hacen peticiones.

export const num = (valor) => {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
};

const pad = (n) => String(n).padStart(2, '0');
const claveFecha = (fecha) => `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;

const formatoDia = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
const formatoMes = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' });
const formatoMesCorto = new Intl.DateTimeFormat('es-PE', { month: 'short' });

const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Últimos `dias` días hasta hoy; los días sin ventas quedan en cero.
export function serieDiaria(ventasPorDia = [], dias = 14, hoy = new Date()) {
    const porClave = new Map(
        (Array.isArray(ventasPorDia) ? ventasPorDia : []).map((d) => [String(d.fecha).slice(0, 10), d]),
    );
    const serie = [];
    for (let i = dias - 1; i >= 0; i--) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
        const clave = claveFecha(fecha);
        const dato = porClave.get(clave);
        serie.push({
            clave,
            etiqueta: String(fecha.getDate()),
            etiquetaLarga: mayuscula(formatoDia.format(fecha)),
            total: num(dato?.total_vendido),
            cantidad: num(dato?.cantidad_ventas),
            actual: i === 0,
        });
    }
    return serie;
}

// Últimos `meses` meses hasta el actual; los meses sin ventas quedan en cero.
export function serieMensual(ventasPorMes = [], meses = 6, hoy = new Date()) {
    const porClave = new Map(
        (Array.isArray(ventasPorMes) ? ventasPorMes : []).map((m) => [`${num(m.anio)}-${num(m.mes_numero)}`, m]),
    );
    const serie = [];
    for (let i = meses - 1; i >= 0; i--) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const clave = `${fecha.getFullYear()}-${fecha.getMonth() + 1}`;
        const dato = porClave.get(clave);
        const corto = formatoMesCorto.format(fecha).replace('.', '');
        serie.push({
            clave,
            etiqueta: mayuscula(corto),
            etiquetaLarga: mayuscula(formatoMes.format(fecha)),
            total: num(dato?.total_vendido),
            cantidad: num(dato?.cantidad_ventas),
            actual: i === 0,
        });
    }
    return serie;
}

// Marcas de eje "limpias" (1, 2, 2.5, 5 × 10^n) que cubren el máximo.
export function marcasEje(maximo, cantidad = 4) {
    if (!(maximo > 0)) return { tope: 1, marcas: [0, 1] };
    const bruto = maximo / cantidad;
    const magnitud = 10 ** Math.floor(Math.log10(bruto));
    const paso = [1, 2, 2.5, 5, 10].map((f) => f * magnitud).find((p) => p >= bruto) || 10 * magnitud;
    const tope = Math.ceil(maximo / paso) * paso;
    const marcas = [];
    for (let v = 0; v <= tope + paso / 2; v += paso) marcas.push(Math.round(v * 100) / 100);
    return { tope, marcas };
}

export const formatoEje = (valor) =>
    valor >= 1000 ? `${(valor / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })} mil` : valor.toLocaleString('es-PE');

// Variación porcentual; null si no hay base para comparar.
export function variacion(actual, anterior) {
    if (!(anterior > 0)) return null;
    return ((actual - anterior) / anterior) * 100;
}
