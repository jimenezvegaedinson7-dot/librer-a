const test = require('node:test');
const assert = require('node:assert/strict');

const { validarHoja } = require('../src/controllers/reclamacion.controller');

const valida = {
    tipo: 'reclamo',
    consumidor_nombre: 'María López',
    consumidor_tipo_documento: 'DNI',
    consumidor_documento: '44556677',
    consumidor_domicilio: 'Jr. Lima 123, Pallasca',
    consumidor_email: 'maria@example.com',
    bien_tipo: 'producto',
    bien_descripcion: 'Cien años de soledad',
    monto_reclamado: '40',
    detalle: 'El libro llegó con páginas rotas.',
    pedido: 'Cambio del libro'
};

test('hoja completa es válida y normaliza el monto', () => {
    const { datos, error } = validarHoja(valida);
    assert.equal(error, undefined);
    assert.equal(datos.monto_reclamado, 40);
    assert.equal(datos.apoderado_nombre, '');
});

test('exige reclamo o queja', () => {
    assert.match(validarHoja({ ...valida, tipo: 'otro' }).error, /reclamo o una queja/);
});

test('DNI de 8 dígitos', () => {
    assert.match(validarHoja({ ...valida, consumidor_documento: '123' }).error, /8 dígitos/);
});

test('correo obligatorio (copia y respuesta)', () => {
    assert.match(validarHoja({ ...valida, consumidor_email: 'no-es-correo' }).error, /correo válido/);
});

test('menor de edad exige padre, madre o apoderado', () => {
    assert.match(validarHoja({ ...valida, es_menor: true }).error, /apoderado/);
    assert.equal(validarHoja({ ...valida, es_menor: true, apoderado_nombre: 'Rosa López' }).error, undefined);
});

test('detalle y pedido mínimos', () => {
    assert.match(validarHoja({ ...valida, detalle: 'corto' }).error, /detalle/);
    assert.match(validarHoja({ ...valida, pedido: '' }).error, /solicitas/);
});

test('monto y pedido opcionales no válidos', () => {
    assert.match(validarHoja({ ...valida, monto_reclamado: '-5' }).error, /Monto/);
    assert.match(validarHoja({ ...valida, id_venta: 'abc' }).error, /pedido no válido/);
});
