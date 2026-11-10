import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amortiguarProgreso, estadoCinematico } from '../src/web/secciones/portada3d/cinematografia.js';

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

test('el suavizado recorre la misma distancia a 30, 60 y 120 cuadros por segundo', () => {
    const resultados = [30, 60, 120].map((fps) => {
        let progreso = 0;
        for (let cuadro = 0; cuadro < fps / 2; cuadro++) progreso = amortiguarProgreso(progreso, 1, 1 / fps);
        return progreso;
    });
    for (const resultado of resultados) {
        assert.ok(resultado > 0.99 && resultado < 1);
        assert.ok(Math.abs(resultado - resultados[0]) < 1e-6);
    }
});

test('el recorrido responde al gesto e invierte su dirección sin sobrepasar el destino', () => {
    let progreso = 0;
    for (let cuadro = 0; cuadro < 15; cuadro++) progreso = amortiguarProgreso(progreso, 1, 1 / 60);
    assert.ok(progreso > 0.94);
    for (let cuadro = 0; cuadro < 48; cuadro++) {
        const anterior = progreso;
        progreso = amortiguarProgreso(progreso, 0, 1 / 60);
        assert.ok(progreso >= 0 && progreso <= anterior);
    }
    assert.equal(progreso, 0);
    assert.ok(Number.isFinite(amortiguarProgreso(NaN, Infinity, NaN)));
});

test('las novedades llegan cuando el libro ya ha cedido la escena', () => {
    for (let paso = 0; paso <= 100; paso++) {
        const estado = estadoCinematico(paso / 100);
        if (estado.presentacionFinal > 0.25) assert.ok(estado.disolucion > 0.8);
    }
});
