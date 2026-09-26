const test = require('node:test');
const assert = require('node:assert/strict');

const {
    calcularTributos,
    librosExonerados
} = require('../src/utils/impuestos');

const afecta = {
    aplica_igv: 1,
    libros_exonerados: 1,
    exoneracion_libros_hasta: '2026-10-17',
    tasa_igv: '18.00'
};

const suma = (t) => Math.round((t.op_gravada + t.op_exonerada + t.igv) * 100) / 100;

test('empresa no afecta al IGV: sin IGV, todo no gravado', () => {
    const t = calcularTributos({ subtotalLibros: 80, costoEnvio: 10, empresa: { aplica_igv: 0 } });
    assert.deepEqual(
        { g: t.op_gravada, e: t.op_exonerada, i: t.igv, total: t.total },
        { g: 0, e: 90, i: 0, total: 90 }
    );
});

test('libros exonerados y envío gravado mientras rige la exoneración', () => {
    const t = calcularTributos({
        subtotalLibros: 80,
        costoEnvio: 11.8,
        empresa: afecta,
        ahora: new Date('2026-09-26T15:00:00Z')
    });
    assert.equal(t.op_exonerada, 80);
    assert.equal(t.op_gravada, 10);
    assert.equal(t.igv, 1.8);
    assert.equal(t.total, 91.8);
    assert.equal(suma(t), t.total);
});

test('sin envío (recojo en tienda) y libros exonerados: IGV cero', () => {
    const t = calcularTributos({ subtotalLibros: 40, costoEnvio: 0, empresa: afecta, ahora: new Date('2026-10-01T12:00:00Z') });
    assert.deepEqual([t.op_gravada, t.op_exonerada, t.igv], [0, 40, 0]);
});

test('después de la fecha límite los libros pasan a gravados', () => {
    const t = calcularTributos({
        subtotalLibros: 118,
        costoEnvio: 0,
        empresa: afecta,
        ahora: new Date('2026-10-18T17:00:00Z')
    });
    assert.equal(t.op_exonerada, 0);
    assert.equal(t.op_gravada, 100);
    assert.equal(t.igv, 18);
});

test('el último día de la exoneración (hora de Perú) todavía exonera', () => {
    // 17/10/2026 23:30 en Lima = 18/10/2026 04:30 UTC
    assert.equal(librosExonerados(afecta, new Date('2026-10-18T04:30:00Z')), true);
    assert.equal(librosExonerados(afecta, new Date('2026-10-18T05:30:00Z')), false);
});

test('exoneración desactivada en la configuración', () => {
    assert.equal(librosExonerados({ ...afecta, libros_exonerados: 0 }), false);
});

test('fecha límite como Date de PostgreSQL', () => {
    const empresa = { ...afecta, exoneracion_libros_hasta: new Date(2026, 9, 17) };
    assert.equal(librosExonerados(empresa, new Date('2026-10-17T20:00:00Z')), true);
});

test('los importes siempre cuadran con el total (redondeo)', () => {
    for (const [libros, envio] of [[33.33, 7.77], [19.9, 12.5], [0.01, 0.01], [999.99, 25]]) {
        for (const ahora of [new Date('2026-09-26T12:00:00Z'), new Date('2026-12-01T12:00:00Z')]) {
            const t = calcularTributos({ subtotalLibros: libros, costoEnvio: envio, empresa: afecta, ahora });
            assert.equal(suma(t), t.total, `libros=${libros} envio=${envio}`);
        }
    }
});
