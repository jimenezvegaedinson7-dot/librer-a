const test = require('node:test');
const assert = require('node:assert/strict');

const {
    domingoDePascua,
    esDiaHabil,
    hoyEnPeru,
    sumarDiasHabiles
} = require('../src/utils/diasHabiles');

const d = (texto) => new Date(`${texto}T00:00:00Z`);

test('domingo de Pascua conocido', () => {
    assert.equal(domingoDePascua(2026).toISOString().slice(0, 10), '2026-04-05');
    assert.equal(domingoDePascua(2027).toISOString().slice(0, 10), '2027-03-28');
});

test('fines de semana, feriados fijos y Semana Santa no son hábiles', () => {
    assert.equal(esDiaHabil(d('2026-09-26')), false); // sábado
    assert.equal(esDiaHabil(d('2026-09-27')), false); // domingo
    assert.equal(esDiaHabil(d('2026-10-08')), false); // Angamos (jueves)
    assert.equal(esDiaHabil(d('2026-04-02')), false); // Jueves Santo
    assert.equal(esDiaHabil(d('2026-04-03')), false); // Viernes Santo
    assert.equal(esDiaHabil(d('2026-09-28')), true); // lunes
});

test('15 días hábiles desde el viernes 25/09/2026 (con el feriado del 8/10)', () => {
    // 28,29,30/9 · 1,2 · 5,6,7 · (8 feriado) · 9 · 12..16 · 19 → el 15.º es el 19/10
    assert.equal(sumarDiasHabiles(d('2026-09-25'), 15), '2026-10-19');
});

test('el día del reclamo no cuenta', () => {
    assert.equal(sumarDiasHabiles(d('2026-09-28'), 1), '2026-09-29');
});

test('hoy en Perú a las 23:30 del día anterior en UTC', () => {
    assert.equal(hoyEnPeru(new Date('2026-09-27T04:30:00Z')).toISOString().slice(0, 10), '2026-09-26');
});
