const test = require('node:test');
const assert = require('node:assert/strict');
const { avisoPedido } = require('../src/utils/mailer');

test('recojo avisa "listo para recoger" y "recogido"; nunca "en camino"', () => {
    assert.equal(avisoPedido('tienda', 'listo_recojo').titulo, 'Tu pedido está listo para recoger');
    assert.match(avisoPedido('tienda', 'listo_recojo').texto(7), /#7/);
    assert.equal(avisoPedido('tienda', 'entregado').titulo, 'Recogiste tu pedido');
    assert.equal(avisoPedido('tienda', 'en_camino'), null);
});

test('delivery avisa "en camino" con la dirección y "entregado"; nunca "listo para recoger"', () => {
    assert.equal(avisoPedido('domicilio', 'en_camino').titulo, 'Tu pedido va en camino');
    assert.match(avisoPedido('domicilio', 'en_camino').texto(8, 'Jr. <Lima> 12'), /Jr\. &lt;Lima&gt; 12/);
    assert.equal(avisoPedido('domicilio', 'entregado').titulo, 'Pedido entregado');
    assert.equal(avisoPedido('domicilio', 'listo_recojo'), null);
});

test('preparar o cancelar no envía aviso; un tipo desconocido tampoco', () => {
    for (const tipo of ['tienda', 'domicilio']) {
        assert.equal(avisoPedido(tipo, 'preparando'), null);
        assert.equal(avisoPedido(tipo, 'cancelado'), null);
    }
    assert.equal(avisoPedido('agencia', 'entregado'), null);
});
