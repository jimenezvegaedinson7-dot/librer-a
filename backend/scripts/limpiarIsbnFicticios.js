// ============================================================
// LIMPIEZA DE ISBN FICTICIOS (utilidad CLI de mantenimiento)
// ============================================================
// Pone `isbn = NULL` ÚNICAMENTE en los libros originales cuyos ISBN
// son ficticios. No sustituye ISBN por ediciones reales: esa decision
// requiere identificar la edicion concreta de cada libro y se hara
// aparte. Aqui solo se retira el dato falso.
//
// USO (desde backend/):
//   node scripts/limpiarIsbnFicticios.js --dry-run
//   node scripts/limpiarIsbnFicticios.js --confirmar
//   node scripts/limpiarIsbnFicticios.js --help
//
// GARANTIAS:
//   - Solo toca `libros.isbn` de los IDs de la lista blanca.
//   - El UPDATE lleva condiciones de seguridad (patron de ISBN
//     ficticio + exclusion explicita del ISBN confirmado de Runaway)
//     y se aborta si el numero de filas afectadas no es el esperado.
//   - Todo dentro de UNA transaccion: cualquier fallo -> ROLLBACK.
//   - Huella md5 de todas las demas tablas y de `libros` sin `isbn`
//     antes y despues: si algo mas cambia, se revierte.
//   - Idempotente: si se ejecuta dos veces, la segunda no cambia nada.
//   - No modifica IDs, titulo, autor, categoria, precios, descripcion,
//     portada, estado, inventario, stock, promociones ni ventas.
// ============================================================

const path = require('path');
const readline = require('readline');
const { stdin, stdout } = require('process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/database');

// ------------------------------------------------------------
// Lista blanca: exactamente estos 25 ids, nada mas.
// ------------------------------------------------------------
const IDS_OBJETIVO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
const ISBN_CONFIRMADO = '9781400077915';   // Runaway (Alice Munro), id 27
const ID_RUNAWAY = 27;
const PREFIJO_FICTICIO = '9786124000';     // titular 978-612-4000, publications 01..25
const ESPERADOS = IDS_OBJETIVO.length;

// Tablas cuyo contenido no debe cambiar ni en un byte.
const TABLAS_PROTEGIDAS = [
    'usuarios', 'categorias', 'autores', 'provincias_lima', 'distritos_lima',
    'agencias_courier', 'anuncios', 'inventario', 'movimientos_inventario',
    'reservas', 'zonas_delivery_pallasca', 'ventas', 'detalle_venta',
    'favoritos', 'historial_operaciones', 'empresa', 'comprobantes', 'reclamaciones'
];

function parsearArgumentos(argv) {
    const o = { dryRun: false, confirmar: false, ayuda: false };
    for (const arg of argv.slice(2)) {
        if (arg === '--dry-run' || arg === '--dryRun') o.dryRun = true;
        else if (arg === '--confirmar' || arg === '--yes' || arg === '-y') o.confirmar = true;
        else if (arg === '--help' || arg === '-h') o.ayuda = true;
        else { console.error(`Argumento desconocido: ${arg}`); process.exit(1); }
    }
    return o;
}

async function pedirConfirmacion(mensaje) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const r = await new Promise((res) => rl.question(mensaje, (a) => res(a.trim().toLowerCase())));
    rl.close();
    return ['s', 'si', 'sí', 'y', 'yes'].includes(r);
}

// Huella de una tabla completa (independiente del orden de filas).
// Se usa `pgQuery` porque devuelve el Result nativo de `pg` (con `rowCount`
// real); el `query` del wrapper de database.js devuelve [rows, fields].
const huellaTabla = (c, tabla) =>
    c.pgQuery(`SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS h FROM ${tabla} t`)
        .then((r) => r.rows[0].h || 'vacia');

// Huella de `libros` excluyendo `isbn`: si cambia, se toco otra columna.
const huellaLibrosSinIsbn = (c) =>
    c.pgQuery(`SELECT md5(string_agg((to_jsonb(l) - 'isbn')::text, '|' ORDER BY id_libro)) AS h FROM libros l`)
        .then((r) => r.rows[0].h || 'vacia');

async function tomarHuellas(c) {
    const h = {};
    for (const t of TABLAS_PROTEGIDAS) h[t] = await huellaTabla(c, t);
    h['libros(sin isbn)'] = await huellaLibrosSinIsbn(c);
    return h;
}

function compararHuellas(antes, despues) {
    return Object.keys(antes).filter((k) => antes[k] !== despues[k]);
}

function imprimirPlan(filas) {
    console.log('\nID  | Título                                       | ISBN actual     | ISBN nuevo');
    console.log('----+----------------------------------------------+-----------------+------------');
    for (const f of filas) {
        const tit = f.titulo.length > 44 ? f.titulo.slice(0, 43) + '…' : f.titulo;
        console.log(`${String(f.id_libro).padStart(3)} | ${tit.padEnd(44)} | ${f.isbn} | NULL`);
    }
}

async function main() {
    const opciones = parsearArgumentos(process.argv);

    if (opciones.ayuda) {
        console.log(`
USO:
  node scripts/limpiarIsbnFicticios.js [--dry-run] [--confirmar]

Retira el ISBN ficticio (isbn = NULL) de los ${ESPERADOS} libros originales de la lista blanca.
No sustituye ISBN por ediciones reales y no toca ningun otro dato.
`);
        await pool.end();
        return;
    }

    const c = await pool.getConnection();
    try {
        // ---------------- VALIDACIONES PREVIAS ----------------
        const objetivo = (await c.pgQuery(
            `SELECT id_libro, titulo, isbn FROM libros WHERE id_libro = ANY($1::int[]) ORDER BY id_libro`,
            [IDS_OBJETIVO]
        )).rows;
        const runaway = (await c.pgQuery('SELECT id_libro, titulo, isbn FROM libros WHERE id_libro = $1', [ID_RUNAWAY])).rows;
        const totalAntes = (await c.pgQuery('SELECT COUNT(*)::int AS total FROM libros')).rows[0].total;

        console.log(`\n🔍 Objetivo: poner isbn = NULL en ${ESPERADOS} libros`);

        const fallos = [];
        if (objetivo.length !== ESPERADOS) {
            fallos.push(`la lista blanca espera ${ESPERADOS} libros y la base tiene ${objetivo.length} (ids: ${objetivo.map((l) => l.id_libro).join(',')})`);
        }
        const noFicticios = objetivo.filter((l) => !String(l.isbn || '').startsWith(PREFIJO_FICTICIO));
        if (noFicticios.length) {
            fallos.push(`estos ids NO tienen ISBN del patron ficticio ${PREFIJO_FICTICIO}*: ` +
                noFicticios.map((l) => `${l.id_libro}="${l.titulo}" (${l.isbn})`).join(' | '));
        }
        if (!runaway.length) fallos.push(`no existe el libro id=${ID_RUNAWAY} (Runaway), no se puede proteger su ISBN`);
        else if (runaway[0].isbn !== ISBN_CONFIRMADO) fallos.push(`Runaway (id=${ID_RUNAWAY}) tiene ISBN ${runaway[0].isbn}, se esperaba ${ISBN_CONFIRMADO}`);
        if (objetivo.some((l) => l.id_libro === ID_RUNAWAY)) fallos.push('Runaway aparece en la lista blanca: peligro');

        // Books outside the whitelist that still carry the fictitious prefix:
        // evidence that the whitelist is wrong, not something to expand silently.
        const fueraDeLista = (await c.pgQuery(
            `SELECT id_libro, titulo, isbn FROM libros
             WHERE isbn LIKE $1 AND NOT (id_libro = ANY($2::int[])) ORDER BY id_libro`,
            [`${PREFIJO_FICTICIO}%`, IDS_OBJETIVO]
        )).rows;
        if (fueraDeLista.length) {
            fallos.push(`hay ${fueraDeLista.length} libro(s) con ISBN del patron ficticio FUERA de la lista blanca: ` +
                fueraDeLista.map((l) => `${l.id_libro}="${l.titulo}"`).join(' | '));
        }

        if (fallos.length) {
            console.error('\n❌ Validación previa fallida. NO se escribe nada:');
            fallos.forEach((f) => console.error(`   - ${f}`));
            process.exitCode = 1;
            return;
        }

        console.log(`   ✓ ${ESPERADOS} registros, todos con ISBN del patrón ${PREFIJO_FICTICIO}*`);
        console.log(`   ✓ Runaway (id=${ID_RUNAWAY}) intacto con ISBN ${ISBN_CONFIRMADO}`);
        console.log(`   ✓ Ningún libro fuera de la lista blanca usa el patrón ficticio`);
        console.log(`   ✓ Total de libros en la base: ${totalAntes}`);

        const pendientes = objetivo.filter((l) => l.isbn !== null);
        if (pendientes.length !== ESPERADOS) {
            console.log(`\nℹ️  ${ESPERADOS - pendientes.length} de ${ESPERADOS} ya tienen isbn = NULL (ejecución previa).`);
        }

        imprimirPlan(objetivo);
        console.log(`\n   libros que NO se tocan: ${totalAntes - objetivo.length} (incluido Runaway id=${ID_RUNAWAY})`);

        if (opciones.dryRun) {
            console.log(`\n🐞 DRY-RUN: no se escribió nada. Habría puesto isbn = NULL en ${ESPERADOS} libros.`);
            return;
        }

        if (!opciones.confirmar) {
            const ok = await pedirConfirmacion(`\n⚠️  ¿Confirmas poner isbn = NULL en ${ESPERADOS} libros? (sí/no): `);
            if (!ok) { console.log('✋ Cancelado por el usuario.'); return; }
        }

        // ---------------- TRANSACCIÓN ----------------
        console.log('\n🔒 Iniciando transacción...');
        const huellasAntes = await tomarHuellas(c);
        await c.beginTransaction();
        let afectadas;
        try {
            const res = await c.pgQuery(
                `UPDATE libros SET isbn = NULL
                 WHERE id_libro = ANY($1::int[])
                   AND isbn IS NOT NULL
                   AND isbn LIKE $2
                   AND isbn <> $3`,
                [IDS_OBJETIVO, `${PREFIJO_FICTICIO}%`, ISBN_CONFIRMADO]
            );
            afectadas = res.rowCount;

            if (afectadas !== ESPERADOS) {
                throw new Error(`se esperaban ${ESPERADOS} filas afectadas y hubo ${afectadas}`);
            }

            // Verificación DENTRO de la transacción, antes del commit.
            const quedan = (await c.pgQuery(
                `SELECT COUNT(*)::int AS n FROM libros
                 WHERE id_libro = ANY($1::int[]) AND isbn IS NOT NULL`,
                [IDS_OBJETIVO]
            )).rows[0].n;
            if (quedan !== 0) throw new Error(`quedan ${quedan} libros del objetivo con ISBN`);

            const rw = (await c.pgQuery('SELECT isbn FROM libros WHERE id_libro = $1', [ID_RUNAWAY])).rows;
            if (!rw.length || rw[0].isbn !== ISBN_CONFIRMADO) {
                throw new Error(`Runaway (id=${ID_RUNAWAY}) quedo con ISBN ${rw[0] ? rw[0].isbn : 'inexistente'}`);
            }

            const tras = (await c.pgQuery('SELECT COUNT(*)::int AS total FROM libros')).rows[0].total;
            if (tras !== totalAntes) throw new Error(`el total de libros cambio: ${totalAntes} -> ${tras}`);

            const huellasDespues = await tomarHuellas(c);
            const cambiadas = compararHuellas(huellasAntes, huellasDespues);
            if (cambiadas.length) {
                throw new Error(`cambio fuera de libros.isbn en: ${cambiadas.join(', ')}`);
            }

            await c.commit();
            console.log(`   ✓ ${afectadas} filas actualizadas`);
            console.log(`   ✓ Runaway conserva ${ISBN_CONFIRMADO}`);
            console.log(`   ✓ Total de libros sigue en ${totalAntes}`);
            console.log(`   ✓ Sin cambios en ${TABLAS_PROTEGIDAS.length} tablas protegidas ni en el resto de libros`);
            console.log('\n✅ Transacción confirmada.');
        } catch (error) {
            await c.rollback();
            console.error(`\n❌ ${error.message}`);
            console.error('   Se revirtió TODA la transacción. La base quedó como estaba.');
            process.exitCode = 1;
            return;
        }
    } catch (error) {
        console.error('❌ Error inesperado:', error && (error.stack || error.message) || error);
        process.exitCode = 1;
    } finally {
        c.release();
        await pool.end();
    }
}

main().catch(async (e) => {
    console.error('❌ Error inesperado:', (e && (e.stack || e.message)) || e);
    try { await pool.end(); } catch { /* ignorado */ }
    process.exit(1);
});