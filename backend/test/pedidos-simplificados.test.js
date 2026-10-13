const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarEstadoEntrega, permitirTransicionEntrega } = require('../src/utils/transiciones');
const { resumirPedidos, estadoContabilizable } = require('../src/utils/pedidos');
const pedido = (id, tipo, entrega, extra = {}) => ({ id_venta: id, origen: 'app', external_reference: `ref-${id}`,
    tipo_entrega: tipo, estado_entrega: entrega, estado: 'pagada', payu_payment_status: 'APPROVED', ...extra });

test('delivery y recojo avanzan en tres tramos; el alias antiguo no permite crear otro paso', () => {
    for (const [tipo, intermedio] of [['domicilio', 'en_camino'], ['tienda', 'listo_recojo']]) {
        for (const inicial of ['pendiente', 'preparando']) {
            assert.equal(normalizarEstadoEntrega(inicial), 'pendiente');
            assert.equal(permitirTransicionEntrega(tipo, inicial, intermedio), true);
            assert.equal(permitirTransicionEntrega(tipo, inicial, 'preparando'), false);
            assert.equal(permitirTransicionEntrega(tipo, inicial, 'entregado'), false);
        }
        assert.equal(permitirTransicionEntrega(tipo, intermedio, 'entregado'), true);
        assert.equal(permitirTransicionEntrega(tipo, 'entregado', 'cancelado'), false);
        assert.equal(permitirTransicionEntrega(tipo, 'entregado', 'pendiente'), false);
    }
    assert.equal(permitirTransicionEntrega('tienda', 'pendiente', 'en_camino'), false);
    assert.equal(permitirTransicionEntrega('domicilio', 'pendiente', 'listo_recojo'), false);
});

test('el escenario auditado excluye una entrega reembolsada y dos canceladas', () => {
    const r = resumirPedidos([
        pedido(1, 'tienda', 'entregado', { estado: 'reembolsada', estado_reembolso: 'confirmado' }),
        pedido(2, 'tienda', 'cancelado', { estado: 'cancelada' }), pedido(3, 'tienda', 'cancelado', { estado: 'cancelada' }),
        pedido(4, 'tienda', 'entregado', { estado: 'entregada', payu_payment_status: 'CAPTURED' }), pedido(5, 'domicilio', 'pendiente'),
    ]);
    assert.equal(r.total, 2);
    assert.deepEqual(r.conteos, { pendiente: 1, listo_recojo: 0, en_camino: 0, entregado: 1 });
    assert.deepEqual(r.porcentajes, { pendiente: 50, listo_recojo: 0, en_camino: 0, entregado: 50 });
});

test('revisiones, pagos inciertos, devoluciones, históricos y tipos incompatibles no son operativos', () => {
    const casos = [
        pedido(1, 'tienda', 'pendiente', { estado: 'pendiente' }), pedido(2, 'tienda', 'pendiente', { payu_payment_status: 'PENDING' }),
        pedido(3, 'tienda', 'pendiente', { pago_revision_motivo: 'reversion_payu' }), pedido(4, 'tienda', 'pendiente', { requiere_revision: true }),
        pedido(5, 'tienda', 'pendiente', { estado_reembolso: 'pendiente_verificacion' }), pedido(6, 'tienda', 'en_camino'),
        pedido(7, 'domicilio', 'listo_recojo'), pedido(8, null, 'pendiente'), pedido(9, 'tienda', null),
        pedido(10, 'tienda', 'pendiente', { id_reserva: 20 }), pedido(11, 'tienda', 'pendiente', { origen: 'panel' }),
        pedido(12, 'tienda', 'cancelado'), pedido(13, 'tienda', 'pendiente', { payu_payment_status: 'REFUNDED' }),
    ];
    for (const p of casos) assert.equal(estadoContabilizable(p), null, p.id_venta);
    assert.equal(resumirPedidos(casos).total, 0);
});

test('cada ID cuenta una vez y la distribución redondeada usa una base común', () => {
    const a = pedido(1, 'tienda', 'preparando'), b = pedido(2, 'tienda', 'listo_recojo'), c = pedido(3, 'domicilio', 'en_camino');
    const r = resumirPedidos([a, a, b, c]);
    assert.equal(r.total, 3);
    assert.equal(Object.values(r.conteos).reduce((s, n) => s + n), 3);
    assert.equal(Object.values(r.porcentajes).reduce((s, n) => s + Math.round(n * 10), 0), 1000);
    assert.deepEqual(resumirPedidos([]).porcentajes, { pendiente: 0, listo_recojo: 0, en_camino: 0, entregado: 0 });
});
