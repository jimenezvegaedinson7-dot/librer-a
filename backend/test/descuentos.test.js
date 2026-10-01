// ============================================================
// TESTS DE DESCUENTOS
// ============================================================
// Sin dependencia de la BD: las reglas de negocio de las promociones
// viven en src/utils/descuentos.js, que es el mismo modulo que usan el
// alta y la edicion. Si estas reglas se rompen, la web publica puede
// terminar anunciando un descuento que no rebaja el precio.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    validarDescuentos,
    parsePorcentaje,
    parsePrecioOferta,
    parseFecha,
    hoyEnLima,
    MAXIMO_PORCENTAJE
} = require('../src/utils/descuentos');

// ============================================================
// PORCENTAJE
// ============================================================

test('acepta porcentajes enteros dentro del rango', () => {
    assert.deepEqual(parsePorcentaje(1).valor, 1);
    assert.deepEqual(parsePorcentaje(50).valor, 50);
    assert.deepEqual(parsePorcentaje('20').valor, 20);
    assert.deepEqual(
        parsePorcentaje(MAXIMO_PORCENTAJE).valor,
        MAXIMO_PORCENTAJE
    );
});

test('rechaza porcentajes fuera de 1..99', () => {
    // El 100% queda fuera a proposito: un libro gratis no se descuenta.
    assert.ok(parsePorcentaje(0).error);
    assert.ok(parsePorcentaje(100).error);
    assert.ok(parsePorcentaje(-5).error);
    assert.ok(parsePorcentaje(150).error);
});

test('rechaza porcentajes decimales o no numericos', () => {
    assert.ok(parsePorcentaje(12.5).error);
    assert.ok(parsePorcentaje('abc').error);
    assert.ok(parsePorcentaje(NaN).error);
});

test('distingue "no lo mande" de "quitalo"', () => {
    // undefined = no tocar. null o '' = limpiar.
    assert.equal(parsePorcentaje(undefined).valor, undefined);
    assert.equal(parsePorcentaje(null).valor, null);
    assert.equal(parsePorcentaje('').valor, null);
});

// ============================================================
// PRECIO DE OFERTA
// ============================================================

test('acepta una oferta mayor que 0 y menor que el precio de lista', () => {
    assert.deepEqual(parsePrecioOferta(60, 100).valor, 60);
    assert.deepEqual(parsePrecioOferta(99.99, 100).valor, 99.99);
});

test('rechaza una oferta igual al precio de lista o de S/ 0', () => {
    // Igual al precio no rebaja nada; 0 regala el libro.
    assert.match(parsePrecioOferta(100, 100).error, /menor que el precio normal/);
    assert.ok(parsePrecioOferta(0, 100).error);
});

test('rechaza una oferta mas cara que el precio de lista', () => {
    const r = parsePrecioOferta(250, 100);
    assert.ok(r.error);
    assert.match(r.error, /menor que el precio normal/);
});

test('rechaza ofertas negativas o no numericas', () => {
    assert.ok(parsePrecioOferta(-1, 100).error);
    assert.ok(parsePrecioOferta('mucho', 100).error);
    assert.ok(parsePrecioOferta(Infinity, 100).error);
});

test('sin precio de lista conocido solo valida el rango', () => {
    // En el alta el precio puede venir despues; lo que no se permite es
    // un numero negativo o absurdo.
    assert.deepEqual(parsePrecioOferta(150, undefined).valor, 150);
    assert.ok(parsePrecioOferta(-1, undefined).error);
});

// ============================================================
// FECHA
// ============================================================

test('acepta una fecha real en formato AAAA-MM-DD', () => {
    assert.deepEqual(parseFecha('2027-12-31').valor, '2027-12-31');
    assert.deepEqual(parseFecha(' 2027-01-01 ').valor, '2027-01-01');
});

test('rechaza una fecha con formato incorrecto', () => {
    assert.ok(parseFecha('31/12/2027').error);
    assert.ok(parseFecha('2027-1-1').error);
    assert.ok(parseFecha('mañana').error);
});

test('rechaza fechas que existen en el formato pero no en el calendario', () => {
    // Pasa el regex, no existe como dia. Sin esta comprobacion la
    // promo duraria un dia menos de lo que el admin escribio.
    assert.ok(parseFecha('2027-02-31').error);
    assert.ok(parseFecha('2027-13-01').error);
    assert.ok(parseFecha('2027-00-10').error);
    // Y el caso de un 29 de febrero en año que no es bisiesto.
    assert.ok(parseFecha('2027-02-29').error);
    assert.deepEqual(parseFecha('2028-02-29').valor, '2028-02-29');
});

// ============================================================
// EL CONJUNTO
// ============================================================

test('devuelve solo las claves que el cliente mando', () => {
    // El UPDATE usa esta forma para no pisar lo que no se toco.
    const r = validarDescuentos({ descuento_porcentaje: 20 }, 100);

    assert.deepEqual(r.mensaje, undefined);
    assert.deepEqual(r.valor, { descuento_porcentaje: 20 });
});

test('limpiar porcentaje y oferta limpia tambien la fecha', () => {
    // Si la fecha se quedara puesta seria un vencimiento huerfano que
    // el admin no puede ver ni quitar desde el formulario.
    const r = validarDescuentos(
        {
            descuento_porcentaje: '',
            precio_oferta: '',
            descuento_hasta: '2027-12-31'
        },
        100
    );

    assert.deepEqual(r.valor, {
        descuento_porcentaje: null,
        precio_oferta: null,
        descuento_hasta: null
    });
});

test('conserva la fecha si sigue habiendo descuento', () => {
    const r = validarDescuentos(
        { descuento_porcentaje: 20, descuento_hasta: '2027-12-31' },
        100
    );

    assert.deepEqual(r.valor, {
        descuento_porcentaje: 20,
        descuento_hasta: '2027-12-31'
    });
});

test('una oferta sola es una promocion valida', () => {
    // El 2x1 o el monto fijo no se expresan como porcentaje.
    const r = validarDescuentos(
        { precio_oferta: 75, descuento_hasta: '2027-12-31' },
        100
    );

    assert.deepEqual(r.valor, {
        precio_oferta: 75,
        descuento_hasta: '2027-12-31'
    });
});

test('sin campos de descuento devuelve un objeto vacio', () => {
    const r = validarDescuentos({}, 100);
    assert.deepEqual(r.valor, {});
});

test('corta en el primer error y no guarda nada a medias', () => {
    // Si el porcentaje es invalido, la oferta no debe colarse igual.
    const r = validarDescuentos(
        { descuento_porcentaje: 200, precio_oferta: 50 },
        100
    );

    assert.match(r.mensaje, /entre 1 y 99/);
    assert.equal(r.valor, undefined);
});

test('valida la oferta contra el precio final vigente, no contra el enviado', () => {
    // Al editar, si el admin baja el precio normal por debajo de la
    // oferta que ya existia, guardar solo el porcentaje nuevo no puede
    // dejar la oferta mas cara que el precio.
    const r = validarDescuentos(
        { descuento_porcentaje: 10 },
        40
    );

    assert.deepEqual(r.valor, { descuento_porcentaje: 10 });
});

// ============================================================
// REGLAS DE CONJUNTO
// ============================================================

test('no acepta porcentaje y precio de oferta a la vez', () => {
    const r = validarDescuentos({ descuento_porcentaje: 20, precio_oferta: 70 }, 100);
    assert.match(r.mensaje, /no los dos/);
});

test('una fecha sin porcentaje ni oferta no es una promocion', () => {
    const r = validarDescuentos({ descuento_hasta: '2099-01-01' }, 100, null, '2026-10-01');
    assert.match(r.mensaje, /antes de poner la fecha/);
});

test('rechaza una fecha de fin ya vencida', () => {
    const r = validarDescuentos(
        { descuento_porcentaje: 10, descuento_hasta: '2026-09-30' },
        100, null, '2026-10-01'
    );
    assert.match(r.mensaje, /anterior a hoy/);
});

test('acepta como fecha de fin el dia de hoy', () => {
    const r = validarDescuentos(
        { descuento_porcentaje: 10, descuento_hasta: '2026-10-01' },
        100, null, '2026-10-01'
    );
    assert.equal(r.mensaje, undefined);
});

test('editar un libro con una promocion ya vencida no bloquea el guardado', () => {
    const guardado = { descuento_porcentaje: 10, precio_oferta: null, descuento_hasta: '2026-09-01' };
    const r = validarDescuentos(
        { descuento_porcentaje: '10', precio_oferta: '', descuento_hasta: '2026-09-01' },
        100, guardado, '2026-10-01'
    );
    assert.equal(r.mensaje, undefined);
});

test('en una edicion, cambiar a precio de oferta exige vaciar el porcentaje guardado', () => {
    const guardado = { descuento_porcentaje: 10, precio_oferta: null, descuento_hasta: null };
    assert.match(validarDescuentos({ precio_oferta: 80 }, 100, guardado).mensaje, /no los dos/);
    assert.equal(validarDescuentos({ precio_oferta: 80, descuento_porcentaje: '' }, 100, guardado).mensaje, undefined);
});

test('hoyEnLima usa la zona horaria de Lima, no la del servidor', () => {
    // 2026-10-02 01:00 UTC = 2026-10-01 20:00 en Lima.
    assert.equal(hoyEnLima(new Date('2026-10-02T01:00:00Z')), '2026-10-01');
});
