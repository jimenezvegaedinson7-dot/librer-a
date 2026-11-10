import test from 'node:test';
import assert from 'node:assert/strict';
import { crearAnalitica, itemAnalitica, resolverMedicion } from '../src/web/lib/analitica.js';

const libro = { id: 7, titulo: 'Lecturas de prueba', autor: 'Autora pública', categoria: 'Novela', precioFinal: 35.55, email: 'no-exportar@example.test', token: 'privado' };
const venta = {
    id_venta: 25,
    estado: 'pagada',
    canal_compra: 'web',
    total: 80,
    costo_envio: 5,
    direccion: 'No exportar',
    cliente_documento: '12345678',
    detalle: [{ id_libro: 7, titulo: libro.titulo, precio_unitario: '25.00', cantidad: 3 }]
};

test('la propiedad oficial solo se activa automáticamente en el dominio de producción', () => {
    for (const hostname of ['libreria.my', 'www.libreria.my']) {
        assert.equal(resolverMedicion({ produccion: true, hostname }), 'G-5SG4L6QMEN');
        assert.equal(resolverMedicion({ produccion: false, hostname }), '');
    }
    for (const hostname of ['localhost', '127.0.0.1', 'librer-a-zeta.vercel.app', 'preview.vercel.app', 'libreria.my.otro.test']) {
        assert.equal(resolverMedicion({ produccion: true, hostname }), '');
    }
});

test('la configuración de Vercel permite cambiar el flujo o desactivarlo con un valor vacío', () => {
    assert.equal(resolverMedicion({ configurada: ' G-TEST123456 ', produccion: true, hostname: 'libreria.my' }), 'G-TEST123456');
    assert.equal(resolverMedicion({ configurada: '', produccion: true, hostname: 'libreria.my' }), '');
});
function entorno({ medicion = 'G-TEST123456', privacidad = false, bloquear = false } = {}) {
    const almacen = new Map();
    const scripts = [];
    const ventana = {
        location: { origin: 'https://libreria.test', pathname: '/mis-compras', search: '?token=no-exportar&email=privado' },
        navigator: { globalPrivacyControl: privacidad },
        document: {
            referrer: 'https://buscador.test/buscar?correo=no-exportar',
            getElementById: () => scripts[0] || null,
            createElement: () => ({}),
            head: {
                appendChild: (script) => {
                    if (bloquear) throw new Error('bloqueado');
                    scripts.push(script);
                }
            }
        },
        localStorage: { getItem: (k) => almacen.get(k) || null, setItem: (k, v) => almacen.set(k, v) }
    };
    return {
        ventana,
        almacen,
        scripts,
        analitica: crearAnalitica({ medicion, ventana }),
        eventos: () => (ventana.dataLayer || []).map((x) => [...x]).filter((x) => x[0] === 'event')
    };
}

test('sin ID válido y con privacidad global no descarga Google ni registra eventos', () => {
    for (const opciones of [{ medicion: '' }, { medicion: 'incorrecto' }, { privacidad: true }]) {
        const e = entorno(opciones);
        assert.equal(e.analitica.pagina('Mis compras', 'uno'), false);
        assert.equal(e.scripts.length, 0);
        assert.equal(e.eventos().length, 0);
    }
});

test('carga una sola etiqueta y evita duplicar efectos de navegación y fichas', () => {
    const e = entorno();
    assert.equal(e.analitica.pagina('Mis compras', 'uno'), true);
    assert.equal(e.analitica.pagina('Mis compras', 'uno'), false);
    e.analitica.libro(libro, 'uno');
    e.analitica.libro(libro, 'uno');
    e.analitica.libro(libro, 'dos');
    assert.equal(e.scripts.length, 1);
    assert.equal(e.eventos().filter((x) => x[1] === 'view_item').length, 2);
    const config = [...e.ventana.dataLayer.find((x) => x[0] === 'config')][2];
    assert.equal(config.send_page_view, false);
    assert.equal(config.allow_google_signals, false);
});

test('los productos solo incluyen campos públicos y la URL elimina parámetros privados', () => {
    const e = entorno();
    e.analitica.agregar(libro, 2);
    const datos = e.eventos()[0][2];
    assert.equal(datos.currency, 'PEN');
    assert.equal(datos.value, 71.1);
    assert.equal(datos.page_location, 'https://libreria.test/mis-compras');
    assert.equal(datos.page_referrer, 'https://buscador.test');
    assert.deepEqual(datos.items[0], { item_id: '7', item_name: libro.titulo, autor_libro: libro.autor, item_category: 'Novela', price: 35.55, quantity: 2 });
    assert.ok(!JSON.stringify(datos).includes('no-exportar'));
});

test('compras confirmadas usan el precio histórico, separan el envío y se deduplican entre recargas', () => {
    const e = entorno();
    assert.equal(e.analitica.compra(venta, [libro]), true);
    assert.equal(e.analitica.compra({ ...venta, estado: 'entregada' }, [libro]), false);
    const siguiente = crearAnalitica({ medicion: 'G-TEST123456', ventana: e.ventana });
    assert.equal(siguiente.compra(venta, [libro]), false);
    const datos = e.eventos()[0][2];
    assert.equal(datos.transaction_id, 'MATIDANA-25');
    assert.equal(datos.value, 75);
    assert.equal(datos.shipping, 5);
    assert.equal(datos.items[0].price, 25);
    assert.ok(!JSON.stringify(datos).includes('12345678'));
    assert.ok(!JSON.stringify(datos).includes('No exportar'));
});

test('pendientes, cancelaciones, reembolsos y compras de app no se cuentan como compra web', () => {
    const e = entorno();
    for (const estado of ['pendiente', 'cancelada', 'reembolsada']) assert.equal(e.analitica.compra({ ...venta, estado }), false);
    assert.equal(e.analitica.compra({ ...venta, canal_compra: 'app' }), false);
    assert.equal(e.eventos().length, 0);
});

test('cantidades y precios inválidos no generan importes ficticios', () => {
    assert.equal(itemAnalitica(libro, -1), null);
    assert.equal(itemAnalitica({ ...libro, precioFinal: NaN }), null);
    const e = entorno();
    assert.equal(e.analitica.compra({ ...venta, detalle: [{ id_libro: 7, cantidad: 1 }] }), false);
});

test('un bloqueo de la etiqueta no interrumpe las acciones de la tienda', () => {
    const e = entorno({ bloquear: true });
    assert.doesNotThrow(() => e.analitica.agregar(libro, 1));
    assert.equal(e.analitica.compra(venta), false);
});
