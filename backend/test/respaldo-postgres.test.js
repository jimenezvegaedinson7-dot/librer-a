const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { esCopiaDeHoy, elegirConservadas, semanaIso, esManifiestoPropio, aplicarRetencion } = require('../scripts/respaldarPostgres');

const copia = (fecha, id = '00000000') => ({ version: 1, origen: 'libreria-postgresql', creadoEn: fecha,
    archivo: `libreria-${fecha.replace(/[-:]/g, '').replace('.000Z', 'Z')}-${id}.dump`, bytes: 6,
    fuente: 'b'.repeat(64), sha256: 'a'.repeat(64), verificacion: { archivoCompleto: true } });

test('retención conserva siete días distintos y una copia de cada una de las últimas cuatro semanas', () => {
    const copias = Array.from({ length: 40 }, (_, i) => copia(new Date(Date.UTC(2026, 9, 13 - i, 3)).toISOString()));
    const elegidas = elegirConservadas(copias);
    for (const diaria of copias.slice(0, 7)) assert.ok(elegidas.has(diaria.archivo));
    const semanas = new Set(copias.filter(c => elegidas.has(c.archivo)).map(c => semanaIso(c.creadoEn)));
    assert.equal(semanas.size, 4);
    assert.ok(elegidas.size <= 11);
    assert.equal(elegidas.has(copias[39].archivo), false);
});

test('dos copias del mismo día conservan la más reciente sin gastar dos días de retención', () => {
    const a = copia('2026-10-13T08:00:00.000Z'), b = copia('2026-10-13T13:00:00.000Z', '11111111');
    assert.deepEqual([...elegirConservadas([a, b])], [b.archivo]);
});

test('el disparo diario crea una copia cada día peruano, aunque no hayan pasado 24 horas', () => {
    const c = copia('2026-10-13T20:00:00.000Z');
    assert.equal(esCopiaDeHoy(c, '2026-10-14T03:00:00.000Z', c.fuente), true);
    assert.equal(esCopiaDeHoy(c, '2026-10-14T08:00:00.000Z', c.fuente), false);
    assert.equal(esCopiaDeHoy(c, '2026-10-13T21:00:00.000Z', 'c'.repeat(64)), false);
    assert.equal(esCopiaDeHoy(c, '2026-10-13T19:00:00.000Z', c.fuente), false);
});

test('las semanas ISO conservan correctamente el cambio de año', () => {
    assert.equal(semanaIso('2026-01-01T00:00:00.000Z'), '2026-1');
    assert.equal(semanaIso('2025-12-31T00:00:00.000Z'), '2026-1');
    assert.equal(semanaIso('2026-01-05T00:00:00.000Z'), '2026-2');
});

test('una copia ajena, incompleta o que apunta fuera de la carpeta nunca es gestionada', () => {
    const c = copia('2026-10-13T03:00:00.000Z');
    assert.equal(esManifiestoPropio(c, c.archivo), true);
    for (const extra of [{ origen: 'otra-base' }, { archivo: '../manual.dump' }, { verificacion: {} }, { creadoEn: 'inválido' }, { bytes: 0 }]) {
        assert.equal(esManifiestoPropio({ ...c, ...extra }, c.archivo), false);
    }
});

test('la purga solo toca copias propias verificadas; conserva manuales, parciales y manifiestos dañados', () => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'respaldo-retencion-'));
    try {
        for (let i = 0; i < 40; i++) {
            const c = copia(new Date(Date.UTC(2026, 9, 13 - i, 3)).toISOString());
            fs.writeFileSync(path.join(directorio, c.archivo), 'PGDMPx');
            fs.writeFileSync(path.join(directorio, c.archivo + '.json'), JSON.stringify(c));
        }
        const ajena = copia('2024-01-01T03:00:00.000Z');
        fs.writeFileSync(path.join(directorio, ajena.archivo), 'PGDMPx');
        fs.writeFileSync(path.join(directorio, ajena.archivo + '.json'), '{dañado');
        for (const nombre of ['manual.sql', 'copia.dump', 'trabajo.partial', '.conexion.dpapi']) fs.writeFileSync(path.join(directorio, nombre), 'conservar');
        const resultado = aplicarRetencion(directorio);
        assert.ok(resultado.eliminadas > 20);
        assert.ok(resultado.conservadas >= 7);
        for (const nombre of [ajena.archivo, ajena.archivo + '.json', 'manual.sql', 'copia.dump', 'trabajo.partial', '.conexion.dpapi']) assert.ok(fs.existsSync(path.join(directorio, nombre)), nombre);
    } finally { fs.rmSync(directorio, { recursive: true, force: true }); }
});
