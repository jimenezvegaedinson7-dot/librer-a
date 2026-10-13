// Política de compras nuevas. Las ventas existentes conservan su instantánea.
const ENTREGA_PALLASCA = Object.freeze({
    nombre: 'Ciudad de Pallasca',
    direccion_recojo: 'Plaza de Armas, Jr. Marañón 161, Pallasca 02835',
    alcance: 'Solo dentro de la ciudad de Pallasca; no incluye anexos ni otros distritos.',
});
// NUMERIC(10,2): evitar coerciones de booleanos, arrays y decimales fuera de rango.
const importeTarifa = valor => {
    if (typeof valor !== 'number' && (typeof valor !== 'string' || !valor.trim())) return null;
    const n = Number(valor);
    return Number.isFinite(n) && n >= 0.01 && n <= 99999999.99 &&
        Math.abs(n * 100 - Math.round(n * 100)) < 0.00001 ? Math.round(n * 100) / 100 : null;
};
module.exports = { ENTREGA_PALLASCA, importeTarifa };
