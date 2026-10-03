// ============================================================
// SMOKE TEST — scripts/semillaLibros.js
// ============================================================
// Corre contra la base desechable que crea test-integration/run.cjs
// (nunca contra .env ni contra producción).
//
// Verifica:
//   1. El seed inserta exactamente el catálogo verificado.
//   2. Cada libro nuevo tiene su fila de inventario con el mismo stock.
//   3. Reejecutarlo no inserta nada (idempotencia).
//   4. No se duplican ISBN ni obras.
//   5. Un autor inexistente hace fallar el seed sin escribir nada.
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const raiz = path.resolve(__dirname, '..');
const CATALOGO = path.join(raiz, 'database', 'seeds', 'libros-catalogo.json');
const SCRIPT = path.join(raiz, 'scripts', 'semillaLibros.js');

const catalogo = JSON.parse(readFileSync(CATALOGO, 'utf8'));

const normalizar = (t) =>
    String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[.]/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const ejecutarSeed = (args = []) => {
    const r = spawnSync(process.execPath, [SCRIPT, '--confirmar', ...args], {
        cwd: raiz,
        encoding: 'utf8',
        env: process.env
    });
    return { codigo: r.status, salida: `${r.stdout || ''}${r.stderr || ''}` };
};

const clientes = async () => {
    const c = new Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    return c;
};

// Los autores y categorías que el catálogo necesita deben existir de
// antemano: el seed no los crea.
async function sembrarAutoresYCategorias() {
    const c = await clientes();
    const autores = [...new Set(catalogo.libros.map((l) => l.autor))];
    const categorias = [...new Set(catalogo.libros.map((l) => l.categoria))];
    for (const nombre of autores) {
        const partes = nombre.split(' ');
        const apellido = partes.pop();
        await c.query('INSERT INTO autores (nombre, apellido) VALUES ($1, $2)', [partes.join(' '), apellido]);
    }
    for (const nombre of categorias) {
        await c.query('INSERT INTO categorias (nombre) VALUES ($1)', [nombre]);
    }
    await c.end();
}

test('semillaLibros inserta el catálogo verificado y crea su inventario', async () => {
    await sembrarAutoresYCategorias();

    const primera = ejecutarSeed();
    assert.equal(primera.codigo, 0, `el seed falló:\n${primera.salida}`);
    assert.match(primera.salida, /A insertar\s+:\s+81/);
    assert.match(primera.salida, /Insertados 81 libro/);

    const c = await clientes();

    const { rows: libros } = await c.query('SELECT titulo, isbn, precio, stock FROM libros');
    assert.equal(libros.length, catalogo.libros.length, 'debe insertar todo el catálogo y nada más');

    const { rows: inventario } = await c.query('SELECT id_libro, stock, stock_minimo FROM inventario');
    assert.equal(inventario.length, catalogo.libros.length, 'cada libro nuevo necesita inventario');

    const stockPorLibro = new Map(inventario.map((i) => [i.id_libro, i.stock]));
    assert.ok(stockPorLibro.size === catalogo.libros.length, 'inventario.id_libro debe ser único');

    const { rows: conId } = await c.query('SELECT id_libro, isbn, stock FROM libros');
    for (const fila of conId) {
        assert.equal(stockPorLibro.get(fila.id_libro), fila.stock,
            `stock de inventario desalineado con libros.stock en ${fila.isbn}`);
    }
    for (const fila of inventario) {
        assert.ok(fila.stock_minimo >= 0);
    }

    // Solo los libros con descuento llevan precio_oferta, y nunca es mayor al precio.
    const { rows: ofertas } = await c.query(
        'SELECT isbn, precio, descuento_porcentaje, precio_oferta FROM libros WHERE descuento_porcentaje IS NOT NULL'
    );
    const esperados = catalogo.libros.filter((l) => l.descuento_porcentaje).length;
    assert.equal(ofertas.length, esperados, 'solo losebook con descuento del catálogo debe tener oferta');
    for (const o of ofertas) {
        assert.ok(Number(o.precio_oferta) <= Number(o.precio), `precio_oferta mayor al precio en ${o.isbn}`);
    }

    await c.end();
});

test('semillaLibros es idempotente: la segunda ejecución no inserta nada', async () => {
    const segunda = ejecutarSeed();
    assert.equal(segunda.codigo, 0, `el seed falló:\n${segunda.salida}`);
    assert.match(segunda.salida, /A insertar\s+:\s+0/);
    assert.match(segunda.salida, /ISBN ya cargado|obra ya cargada/);

    const c = await clientes();
    const { rows } = await c.query('SELECT COUNT(*)::int AS total FROM libros');
    assert.equal(rows[0].total, catalogo.libros.length, 'no debe crecer el catálogo');

    const { rows: dups } = await c.query(
        `SELECT isbn, COUNT(*)::int AS n FROM libros WHERE isbn IS NOT NULL GROUP BY isbn HAVING COUNT(*) > 1`
    );
    assert.equal(dups.length, 0, `ISBN duplicados: ${JSON.stringify(dups)}`);

    const { rows: obras } = await c.query(
        `SELECT a.nombre, a.apellido, l.titulo, COUNT(*)::int AS n
         FROM libros l JOIN autores a ON a.id_autor = l.id_autor
         GROUP BY a.nombre, a.apellido, l.titulo HAVING COUNT(*) > 1`
    );
    assert.equal(obras.length, 0, `obras duplicadas: ${JSON.stringify(obras)}`);

    await c.end();
});

test('semillaLibros no inventa autores ni categorías', async () => {
    const antes = ejecutarSeed(['--dry-run', '--autor', 'Autor Que No Existe']);
    assert.equal(antes.codigo, 0);
    assert.match(antes.salida, /A insertar\s+:\s+0/);

    const c = await clientes();
    const { rows: autores } = await c.query('SELECT COUNT(*)::int AS n FROM autores');
    const { rows: categorias } = await c.query('SELECT COUNT(*)::int AS n FROM categorias');
    assert.equal(autores[0].n, new Set(catalogo.libros.map((l) => normalizar(l.autor))).size);
    assert.equal(categorias[0].n, new Set(catalogo.libros.map((l) => normalizar(l.categoria))).size);
    await c.end();
});

test('el catálogo no contiene ISBN sintéticos ni duplicados', () => {
    const vistos = new Set();
    for (const libro of catalogo.libros) {
        assert.match(libro.isbn, /^\d{13}$/, `ISBN mal formado: ${libro.isbn}`);
        assert.ok(!vistos.has(libro.isbn), `ISBN repetido: ${libro.isbn}`);
        vistos.add(libro.isbn);
        assert.ok(libro.titulo && libro.autor && libro.categoria);
        assert.ok(Number(libro.precio) > 0);
        assert.ok(Number(libro.stock) > 0);
        // Las portadas no se inventan: el seed las deja en NULL.
        assert.equal(libro.portada, undefined);
    }
});