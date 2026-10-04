import { test } from 'node:test';
import assert from 'node:assert/strict';
import { descontarCompra, estadoCarrito } from '../src/public-site/tienda/carritoCompra.js';

const intento={carrito:[{id_libro:1,cantidad:3,linea:'original',retiradas:0}]};
const venta={id_venta:10,detalle:[{id_libro:1,cantidad:3}]};
test('conserva unidades nuevas incluso después de reducir y volver a aumentar',()=>{
    const carrito=estadoCarrito({items:[{id_libro:1,cantidad:5,linea:'original',retiradas:2},{id_libro:2,cantidad:1,linea:'otro'}]});
    const resultado=descontarCompra(carrito,intento,venta);
    assert.equal(resultado.items[0].cantidad,4);assert.equal(resultado.items[1].cantidad,1);
    assert.deepEqual(descontarCompra(resultado,intento,venta),resultado);
});
test('una línea retirada y reemplazada por el mismo libro se conserva',()=>{
    const estado=estadoCarrito({items:[{id_libro:1,cantidad:2,linea:'nueva',retiradas:0}]});
    assert.equal(descontarCompra(estado,intento,venta).items[0].cantidad,2);
});
test('migra carritos anteriores y no descuenta más que el detalle confirmado',()=>{
    const estado=estadoCarrito([{id_libro:1,cantidad:5}]);
    const resultado=descontarCompra(estado,{items:[{id_libro:1,cantidad:3}]},{id_venta:10,detalle:[{id_libro:1,cantidad:2}]});
    assert.equal(resultado.items[0].cantidad,3);
});
test('una respuesta incompleta no elimina unidades ni marca una deducción',()=>{
    const estado=estadoCarrito([{id_libro:1,cantidad:3}]);
    assert.throws(()=>descontarCompra(estado,intento,{id_venta:10}),/detalle confirmado/);
    assert.equal(estado.items[0].cantidad,3);assert.deepEqual(estado.confirmadas,[]);
});
