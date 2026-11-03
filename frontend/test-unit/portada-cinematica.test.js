import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoCinematico } from '../src/web/secciones/portada3d/cinematografia.js';

test('la coreografía conserva estados válidos al recorrerla, invertirla o recibir un progreso fuera de rango', () => {
    for (const p of [-1, NaN, Infinity, ...Array.from({ length: 101 }, (_, i) => i / 100), 3]) {
        const estado = estadoCinematico(p);
        for (const valor of Object.values(estado)) assert.ok(Number.isFinite(valor) && valor >= 0 && valor <= 1);
    }
    assert.equal(estadoCinematico(0.25).disolucion, 0);
});
test('la ficha comercial aparece antes de abrir o disolver el libro', () => {
    for (const p of [0.26, 0.3, 0.36]) {
        const estado = estadoCinematico(p);
        assert.ok(estado.acercamiento > 0);
        assert.equal(estado.apertura, 0);
        assert.equal(estado.disolucion, 0);
    }
});
test('la energía precede a la disolución y el escenario termina sin un destello blanco', () => {
    const previo = estadoCinematico(0.67),
        final = estadoCinematico(1);
    assert.ok(previo.energia > 0);
    assert.equal(previo.disolucion, 0);
    assert.equal(final.disolucion, 1);
    assert.equal(final.salida, 1);
    assert.equal(estadoCinematico(0, 0).entrada, 0);
});

test('el primer desplazamiento habilita la navegación antes de abrir el libro', () => {
    assert.equal(estadoCinematico(0).navegacion, 0);
    const desliza = estadoCinematico(0.025);
    assert.ok(desliza.navegacion > 0);
    assert.equal(desliza.apertura, 0);
    assert.equal(estadoCinematico(0.1).navegacion, 1);
    assert.equal(estadoCinematico(1).navegacion, 1);
});
