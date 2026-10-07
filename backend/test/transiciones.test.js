// ============================================================
// TESTS DE TRANSICIONES DE ESTADO (VENTA Y RESERVA)
// ============================================================
// Sin BD: solo lógica pura de la máquina de estados unificada
// (src/utils/transiciones.js).
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    VENTA,
    RESERVA,
    ENTREGA,
    ESTADO_POR_TIPO,
    esTipoEntregaValido,
    permitirTransicion,
    permitirTransicionEntrega,
    estadosValidos
} = require('../src/utils/transiciones');

// ----------------------------------------
// VENTA
// ----------------------------------------
test('venta: pendiente -> pagada es permitido', () => {
    assert.equal(
        permitirTransicion(VENTA, 'pendiente', 'pagada'),
        true
    );
});

test('venta: pendiente -> cancelada es permitido', () => {
    assert.equal(
        permitirTransicion(VENTA, 'pendiente', 'cancelada'),
        true
    );
});

test('venta: pagada -> entregada es permitido', () => {
    assert.equal(
        permitirTransicion(VENTA, 'pagada', 'entregada'),
        true
    );
});

test('venta: entregada -> cancelada es FALSO (FASE 5)', () => {
    assert.equal(
        permitirTransicion(VENTA, 'entregada', 'cancelada'),
        false
    );
});

test('venta: entregada solo puede pasar a reembolsada (devolución)', () => {
    assert.ok(estadosValidos(VENTA).includes('entregada'));
    assert.deepEqual(VENTA.entregada, ['reembolsada']);
});

test('venta: reembolsada es estado final', () => {
    assert.deepEqual(VENTA.reembolsada, []);
    assert.equal(permitirTransicion(VENTA, 'reembolsada', 'pagada'), false);
});

test('venta: cancelada es estado final y no regresa', () => {
    assert.equal(
        permitirTransicion(VENTA, 'cancelada', 'pendiente'),
        false
    );
    assert.equal(
        permitirTransicion(VENTA, 'cancelada', 'pagada'),
        false
    );
});

test('venta: pendiente -> entregada salta etapa y es FALSO', () => {
    assert.equal(
        permitirTransicion(VENTA, 'pendiente', 'entregada'),
        false
    );
});

// ----------------------------------------
// RESERVA
// ----------------------------------------
test('reserva: pendiente -> confirmada está retirado', () => {
    assert.equal(
        permitirTransicion(RESERVA, 'pendiente', 'confirmada'),
        false
    );
});

test('reserva: confirmada -> completada no genera cobros nuevos', () => {
    assert.equal(
        permitirTransicion(RESERVA, 'confirmada', 'completada'),
        false
    );
});

test('reserva: completada ya no se puede cancelar', () => {
    assert.equal(
        permitirTransicion(RESERVA, 'completada', 'cancelada'),
        false
    );
});

test('reserva: cancelada es estado final', () => {
    assert.equal(
        permitirTransicion(RESERVA, 'cancelada', 'confirmada'),
        false
    );
    assert.deepEqual(RESERVA.cancelada, []);
});

// ----------------------------------------
// ENTREGA (máquina general, sin tipo)
// ----------------------------------------
test('entrega: la máquina general admite ambos caminos', () => {
    assert.equal(permitirTransicion(ENTREGA, 'pendiente', 'preparando'), true);
    assert.equal(permitirTransicion(ENTREGA, 'preparando', 'listo_recojo'), true);
    assert.equal(permitirTransicion(ENTREGA, 'preparando', 'en_camino'), true);
});

test('entrega: entregado y cancelado son finales', () => {
    assert.deepEqual(ENTREGA.entregado, []);
    assert.deepEqual(ENTREGA.cancelado, []);
    assert.equal(permitirTransicion(ENTREGA, 'entregado', 'preparando'), false);
});

// ----------------------------------------
// ENTREGA consciente del tipo de entrega
// ----------------------------------------
test('entrega: delivery recorre en_camino', () => {
    assert.equal(permitirTransicionEntrega('domicilio', 'pendiente', 'preparando'), true);
    assert.equal(permitirTransicionEntrega('domicilio', 'preparando', 'en_camino'), true);
    assert.equal(permitirTransicionEntrega('domicilio', 'en_camino', 'entregado'), true);
});

test('entrega: recojo en tienda recorre listo_recojo', () => {
    assert.equal(permitirTransicionEntrega('tienda', 'pendiente', 'preparando'), true);
    assert.equal(permitirTransicionEntrega('tienda', 'preparando', 'listo_recojo'), true);
    assert.equal(permitirTransicionEntrega('tienda', 'listo_recojo', 'entregado'), true);
});

test('entrega: un delivery NO puede pasar por listo_recojo', () => {
    // Sin esto el pedido quedaría en un estado que el panel no sabe
    // avanzar: el botón de siguiente paso no existiría.
    assert.equal(
        permitirTransicionEntrega('domicilio', 'preparando', 'listo_recojo'),
        false
    );
});

test('entrega: un recojo en tienda NO puede pasar por en_camino', () => {
    assert.equal(
        permitirTransicionEntrega('tienda', 'preparando', 'en_camino'),
        false
    );
});

test('entrega: cancelar sigue permitido en ambos tipos', () => {
    for (const tipo of ['domicilio', 'tienda']) {
        assert.equal(permitirTransicionEntrega(tipo, 'pendiente', 'cancelado'), true);
        assert.equal(permitirTransicionEntrega(tipo, 'preparando', 'cancelado'), true);
        assert.equal(permitirTransicionEntrega(tipo, 'en_camino', 'cancelado'), true);
        assert.equal(permitirTransicionEntrega(tipo, 'listo_recojo', 'cancelado'), true);
    }
});

test('entrega: el tipo no salta etapas ni revive estados finales', () => {
    assert.equal(permitirTransicionEntrega('domicilio', 'pendiente', 'entregado'), false);
    assert.equal(permitirTransicionEntrega('tienda', 'pendiente', 'entregado'), false);
    assert.equal(permitirTransicionEntrega('domicilio', 'entregado', 'en_camino'), false);
    assert.equal(permitirTransicionEntrega('tienda', 'cancelado', 'preparando'), false);
});

test('entrega: un tipo desconocido NO adivina la ruta', () => {
    // 'cancelado' es válido para un tipo reconocido, así que el único motivo
    // posible del false es el tipo: no se confunde "tipo inválido" con
    // "salto inválido". Adivinar dejaría pedidos en estados sin salida.
    assert.equal(permitirTransicionEntrega('otro', 'pendiente', 'cancelado'), false);
    assert.equal(permitirTransicionEntrega('agencia', 'pendiente', 'cancelado'), false);
});

test('entrega: un tipo ausente (NULL) tampoco se enruta', () => {
    assert.equal(permitirTransicionEntrega(null, 'pendiente', 'preparando'), false);
    assert.equal(permitirTransicionEntrega(undefined, 'pendiente', 'cancelado'), false);
    assert.equal(permitirTransicionEntrega('', 'pendiente', 'preparando'), false);
});

test('entrega: esTipoEntregaValido es sensible a mayúsculas y rechaza lo ausente', () => {
    // El CHECK de la base también es case-sensitive, y el controlador hace
    // trim() pero no lowerCase(): este test fija esa garantía. La
    // normalización por trim vive en los controladores, no aquí.
    assert.equal(esTipoEntregaValido('DOMICILIO'), false);
    assert.equal(esTipoEntregaValido('Tienda'), false);
    assert.equal(esTipoEntregaValido(null), false);
    assert.equal(esTipoEntregaValido(undefined), false);
    assert.equal(esTipoEntregaValido(123), false);
    assert.equal(esTipoEntregaValido(['domicilio']), false);
});

test('entrega: el dominio coincide con el CHECK ventas_tipo_estado_entrega_check', () => {
    // ESTADO_POR_TIPO y el CHECK de database/schema.sql describen el mismo
    // conjunto. Si divergen, la API aceptaría escrituras que la base
    // rechaza (23514) o la base admitía estados que el panel no ofrece.
    assert.deepEqual(
        [...ESTADO_POR_TIPO.domicilio].sort(),
        ['cancelado', 'en_camino', 'entregado', 'pendiente', 'preparando']
    );
    assert.deepEqual(
        [...ESTADO_POR_TIPO.tienda].sort(),
        ['cancelado', 'entregado', 'listo_recojo', 'pendiente', 'preparando']
    );

    // Cada estado exclusivo pertenece a un solo tipo: es la propiedad que
    // hace que el panel nunca ofrezca un botón que no exista.
    assert.equal(
        ESTADO_POR_TIPO.domicilio.includes('listo_recojo'),
        false,
        'listo_recojo es exclusivo de tienda'
    );
    assert.equal(
        ESTADO_POR_TIPO.tienda.includes('en_camino'),
        false,
        'en_camino es exclusivo de domicilio'
    );
    assert.equal(
        ESTADO_POR_TIPO.domicilio.includes('en_camino'),
        true
    );
    assert.equal(
        ESTADO_POR_TIPO.tienda.includes('listo_recojo'),
        true
    );
});

test('entrega simplificada: desde pendiente puede quedar listo o despacharse según el tipo', () => {
    assert.equal(permitirTransicionEntrega('tienda', 'pendiente', 'listo_recojo'), true);
    assert.equal(permitirTransicionEntrega('domicilio', 'pendiente', 'en_camino'), true);
    assert.equal(permitirTransicionEntrega('tienda', 'pendiente', 'en_camino'), false);
    assert.equal(permitirTransicionEntrega('domicilio', 'pendiente', 'listo_recojo'), false);
});
