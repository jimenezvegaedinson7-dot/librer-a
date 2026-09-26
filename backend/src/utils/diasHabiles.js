// ========================================
// DÍAS HÁBILES (PERÚ)
// ========================================
// Plazo del Libro de Reclamaciones: la respuesta se debe dar en un plazo
// no mayor a 15 días hábiles (D.S. 011-2011-PCM, modificado por el
// D.S. 101-2022-PCM). No cuentan sábados, domingos ni feriados nacionales.
//
// Feriados fijos (Ley 31513 y normas vigentes) + Jueves y Viernes Santo
// (móviles). Si el Gobierno declara un feriado extraordinario, el plazo
// calculado queda un día antes: es el lado seguro.
// ========================================

const FERIADOS_FIJOS = [
    '01-01', // Año Nuevo
    '05-01', // Día del Trabajo
    '06-07', // Batalla de Arica y Día de la Bandera
    '06-29', // San Pedro y San Pablo
    '07-23', // Fuerza Aérea del Perú
    '07-28', // Fiestas Patrias
    '07-29', // Fiestas Patrias
    '08-06', // Batalla de Junín
    '08-30', // Santa Rosa de Lima
    '10-08', // Combate de Angamos
    '11-01', // Todos los Santos
    '12-08', // Inmaculada Concepción
    '12-09', // Batalla de Ayacucho
    '12-25' // Navidad
];

// Domingo de Pascua (algoritmo anónimo gregoriano).
const domingoDePascua = (anio) => {
    const a = anio % 19;
    const b = Math.floor(anio / 100);
    const c = anio % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(anio, mes - 1, dia));
};

const iso = (fecha) => fecha.toISOString().slice(0, 10);

const feriadosDelAnio = (anio) => {
    const pascua = domingoDePascua(anio);
    const jueves = new Date(pascua.getTime() - 3 * 86400000);
    const viernes = new Date(pascua.getTime() - 2 * 86400000);
    return new Set([
        ...FERIADOS_FIJOS.map((md) => `${anio}-${md}`),
        iso(jueves),
        iso(viernes)
    ]);
};

const esDiaHabil = (fecha) => {
    const dia = fecha.getUTCDay();
    if (dia === 0 || dia === 6) {
        return false;
    }
    return !feriadosDelAnio(fecha.getUTCFullYear()).has(iso(fecha));
};

// Fecha de hoy en Perú (UTC-5) como Date UTC a medianoche.
const hoyEnPeru = (ahora = new Date()) => {
    const peru = new Date(ahora.getTime() - 5 * 3600 * 1000);
    return new Date(Date.UTC(peru.getUTCFullYear(), peru.getUTCMonth(), peru.getUTCDate()));
};

// Suma `dias` hábiles a partir del día siguiente a `desde` (el día del
// reclamo no cuenta). Devuelve "YYYY-MM-DD".
const sumarDiasHabiles = (desde, dias) => {
    let fecha = new Date(desde.getTime());
    let contados = 0;
    while (contados < dias) {
        fecha = new Date(fecha.getTime() + 86400000);
        if (esDiaHabil(fecha)) {
            contados++;
        }
    }
    return iso(fecha);
};

module.exports = {
    PLAZO_RECLAMO_DIAS_HABILES: 15,
    domingoDePascua,
    esDiaHabil,
    hoyEnPeru,
    sumarDiasHabiles
};
