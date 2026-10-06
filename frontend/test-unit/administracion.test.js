import test from 'node:test';
import assert from 'node:assert/strict';
import { cambiosInventario } from '../src/features/inventario/cambiosInventario.js';
import { emisorHistorico } from '../src/features/comprobantes/emisorHistorico.js';
import { es401DeCredencial } from '../src/features/auth/erroresSesion.js';
const previo = { stock: 10, stock_minimo: 5, ubicacion: 'A' };
test('cambiar ubicación no reenvía stock leído al abrir', () => {
    assert.deepEqual(cambiosInventario({ stock: '10', stock_minimo: '5', ubicacion: ' B ' }, previo), { ubicacion: 'B' });
});
test('cambiar stock adjunta el valor esperado y no otros campos', () => {
    assert.deepEqual(cambiosInventario({ stock: '12', stock_minimo: '5', ubicacion: 'A' }, previo), { stock: 12, stock_esperado: 10 });
});
test('borrado explícito de ubicación y formulario sin cambios', () => {
    assert.deepEqual(cambiosInventario({ ...previo, ubicacion: '' }, previo), { ubicacion: null });
    assert.deepEqual(cambiosInventario(previo, previo), {});
});
test('un comprobante conserva el emisor histórico incluso con valores vacíos', () => {
    const antiguo = { ruc: '11111111111', razon_social: 'Anterior', emisor_nombre_comercial: '', emisor_direccion: 'Dirección histórica' };
    const actual = { ruc: '22222222222', razon_social: 'Actual', nombre_comercial: 'Marca actual', direccion: 'Nueva' };
    assert.deepEqual(emisorHistorico(antiguo, actual), { ruc: '11111111111', razon_social: 'Anterior', nombre_comercial: '', direccion: 'Dirección histórica' });
});
test('contraseña de borrado errónea no vence sesión; token inválido sí', () => {
    const error = (url, mensaje, method = 'delete') => ({ config: { url, method }, response: { data: { mensaje } } });
    for (const modulo of ['libros', 'autores', 'categorias', 'anuncios']) {
        assert.equal(es401DeCredencial(error(`/${modulo}/4`, 'Contraseña incorrecta')), true);
        assert.equal(es401DeCredencial(error(`/${modulo}/4`, 'Token inválido')), false);
    }
    assert.equal(es401DeCredencial(error('/libros', 'Token inválido', 'get')), false);
});
