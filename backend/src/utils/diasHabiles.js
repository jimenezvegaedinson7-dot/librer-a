const FERIADOS_FIJOS = ['01-01', '05-01', '06-07', '06-29', '07-23', '07-28', '07-29', '08-06', '08-30', '10-08', '11-01', '12-08', '12-09', '12-25'];

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
    return new Set([...FERIADOS_FIJOS.map((md) => `${anio}-${md}`), iso(jueves), iso(viernes)]);
};

const esDiaHabil = (fecha) => {
    const dia = fecha.getUTCDay();
    if (dia === 0 || dia === 6) {
        return false;
    }
    return !feriadosDelAnio(fecha.getUTCFullYear()).has(iso(fecha));
};

const hoyEnPeru = (ahora = new Date()) => {
    const peru = new Date(ahora.getTime() - 5 * 3600 * 1000);
    return new Date(Date.UTC(peru.getUTCFullYear(), peru.getUTCMonth(), peru.getUTCDate()));
};

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

module.exports = { PLAZO_RECLAMO_DIAS_HABILES: 15, domingoDePascua, esDiaHabil, hoyEnPeru, sumarDiasHabiles };
