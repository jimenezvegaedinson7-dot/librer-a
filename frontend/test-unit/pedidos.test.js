import { test } from 'node:test';
import assert from 'node:assert/strict';
import backend from '../../backend/src/utils/pedidos.js';
import { resumirPedidos, estadoContabilizable } from '../src/compartido/lib/utils/estadoEntrega.js';
import { accionSiguiente, etiquetaEntregaPedido, FLUJO } from '../src/panel/pedidos/estadosPedido.js';
import { seguimientoPedido } from '../src/compartido/lib/utils/seguimientoPedido.js';
const p = (id, tipo, estado, extra = {}) => ({ id_venta: id, origen: 'app', estado: 'pagada', external_reference: `ref-${id}`, tipo_entrega: tipo, estado_entrega: estado, payu_payment_status: 'APPROVED', ...extra });

test('panel y backend clasifican igual todas las combinaciones de estados y tipos', () => {
    const filas = [];
    for (const tipo of ['tienda', 'domicilio', 'agencia', null]) for (const entrega of ['pendiente', 'preparando', 'listo_recojo', 'en_camino', 'entregado', 'cancelado', null]) {
        for (const comercial of ['pendiente', 'pagada', 'entregada', 'cancelada', 'reembolsada']) {
            const fila = p(filas.length + 1, tipo, entrega, { estado: comercial });
            assert.equal(estadoContabilizable(fila), backend.estadoContabilizable(fila));
            filas.push(fila);
        }
    }
    const a = resumirPedidos(filas), b = backend.resumirPedidos(filas);
    assert.deepEqual(a, { total: b.total, conteos: b.conteos, porcentajes: b.porcentajes });
});

test('las acciones del panel saltan el paso redundante sin cruzar métodos de entrega', () => {
    assert.equal(etiquetaEntregaPedido(p(1, 'tienda', 'pendiente')), 'Por preparar');
    assert.equal(etiquetaEntregaPedido(p(2, 'domicilio', 'en_camino')), 'En camino');
    assert.equal(accionSiguiente('domicilio', 'pendiente').destino, 'en_camino');
    assert.equal(accionSiguiente('tienda', 'preparando').destino, 'listo_recojo');
    for (const tipo of ['tienda', 'domicilio']) {
        assert.equal(FLUJO[tipo].pasos.length, 3);
        assert.equal(FLUJO[tipo].etiquetas.entregado, 'Entregado');
        assert.equal(accionSiguiente(tipo, 'entregado'), null);
        for (const accion of Object.values(FLUJO[tipo].acciones)) assert.ok(accion.confirmar);
    }
});

test('seguimiento no inventa una entrega desde el estado comercial histórico', () => {
    assert.deepEqual(seguimientoPedido(p(1, 'tienda', null, { estado: 'entregada' })).pasos, []);
    const inicial = seguimientoPedido(p(2, 'domicilio', 'preparando'));
    assert.deepEqual(inicial.pasos.map(x => x.etiqueta), ['Por preparar', 'En camino', 'Entregado']);
    assert.equal(inicial.pasos.filter(x => x.actual).length, 1);
    assert.equal(inicial.pasos.some(x => x.hecho), false);
});

test('recojo solo muestra sus pasos y conserva entrega histórica junto al reembolso', () => {
    const listo = seguimientoPedido(p(3, 'tienda', 'listo_recojo'));
    assert.deepEqual(listo.pasos.map(x => x.etiqueta), ['Por preparar', 'Listo para recoger', 'Entregado']);
    assert.equal(listo.pasos.filter(x => x.hecho).length, 1);
    const reembolsada = seguimientoPedido(p(4, 'tienda', 'entregado', { estado: 'reembolsada', estado_reembolso: 'confirmado' }));
    assert.equal(reembolsada.titulo, 'Entregado');
    assert.equal(reembolsada.pasos.filter(x => x.hecho).length, 3);
    assert.equal(resumirPedidos([p(4, 'tienda', 'entregado', { estado: 'reembolsada' })]).total, 0);
});
