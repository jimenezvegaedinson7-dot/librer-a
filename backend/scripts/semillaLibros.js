// ============================================================
// SEMILLA DE CATÁLOGO DE LIBROS (utilidad CLI de mantenimiento)
// ============================================================
// Inserta el catálogo verificado de `database/seeds/libros-catalogo.json`
// SOLO para los libros que falten. Nunca modifica libros existentes.
//
// USO (desde backend/):
//   node scripts/semillaLibros.js --dry-run
//   node scripts/semillaLibros.js --confirmar
//   node scripts/semillaLibros.js --dry-run --categoria "Misterio / Suspenso"
//
// OPCIONES:
//   --dry-run           Simula y muestra el plan SIN escribir nada.
//   --confirmar         Omite la confirmación interactiva (scripts/CI).
//   --categoria <n>     Limita la siembra a una categoría exacta.
//   --autor <n>         Limita la siembra a un autor exacto.
//   --help              Muestra esta ayuda.
//
// SEGURIDAD:
//   - TRANSACCIÓN ÚNICA: si un libro falla, no se inserta ninguno.
//   - Idempotente: reejecutarlo no duplica nada (dedupe por ISBN y por
//     título normalizado + autor).
//   - No crea autores ni categorías: si falta alguno, falla y lo reporta.
//   - No toca libros ni inventarios que ya existen.
//   - No inventa metadatos: el JSON es la única fuente de ISBN/editorial.
// ============================================================

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { stdin, stdout } = require('process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = require('../src/config/database');
const CATALOGO = path.join(__dirname, '..', 'database', 'seeds', 'libros-catalogo.json');
const STOCK_MINIMO = 5;

// ------------------------------------------------------------
// Normalización para comparar autores y categorías.
// ------------------------------------------------------------
const normalizar = (texto) =>
    String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.]/g, ' ')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

function parsearArgumentos(argv) {
    const opciones = { dryRun: false, confirmar: false, categoria: null, autor: null, ayuda: false };
    const args = argv.slice(2);
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--dry-run':
            case '--dryRun':
                opciones.dryRun = true;
                break;
            case '--confirmar':
            case '--yes':
            case '-y':
                opciones.confirmar = true;
                break;
            case '--categoria':
                opciones.categoria = args[++i];
                break;
            case '--autor':
                opciones.autor = args[++i];
                break;
            case '--help':
            case '-h':
                opciones.ayuda = true;
                break;
            default:
                console.error(`Argumento desconocido: ${arg}`);
                process.exit(1);
        }
    }
    return opciones;
}

async function pedirConfirmacion(mensaje) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const r = await new Promise((resolve) => rl.question(mensaje, (respuesta) => resolve(respuesta.trim().toLowerCase())));
    rl.close();
    return ['s', 'si', 'sí', 'y', 'yes'].includes(r);
}

const isbn13Valido = (valor) => {
    const s = String(valor || '').replace(/[^0-9]/g, '');
    if (!/^\d{13}$/.test(s)) return false;
    let suma = 0;
    for (let i = 0; i < 12; i++) suma += Number(s[i]) * (i % 2 === 0 ? 1 : 3);
    return (10 - (suma % 10)) % 10 === Number(s[12]);
};

function validarCatalogo(catalogo) {
    const errores = [];
    const vistos = new Set();

    for (const [i, libro] of catalogo.libros.entries()) {
        const donde = `libros[${i}] "${libro.titulo}"`;
        if (!isbn13Valido(libro.isbn)) errores.push(`${donde}: ISBN-13 inválido (${libro.isbn})`);
        if (vistos.has(libro.isbn)) errores.push(`${donde}: ISBN repetido en el catálogo (${libro.isbn})`);
        vistos.add(libro.isbn);
        if (!libro.autor) errores.push(`${donde}: falta autor`);
        if (!libro.categoria) errores.push(`${donde}: falta categoría`);
        if (!(Number(libro.precio) > 0)) errores.push(`${donde}: precio inválido`);
        if (libro.descuento_porcentaje != null) {
            const d = Number(libro.descuento_porcentaje);
            if (!(d >= 1 && d <= 99)) errores.push(`${donde}: descuento fuera de 1..99`);
        }
    }
    return errores;
}

async function cargarIndices(conexion) {
    const [autores] = await conexion.query('SELECT id_autor, nombre, apellido, estado FROM autores');
    const [categorias] = await conexion.query('SELECT id_categoria, nombre, estado FROM categorias');
    const mapaAutores = new Map();
    for (const a of autores) {
        mapaAutores.set(normalizar(`${a.nombre} ${a.apellido}`), a);
    }
    const mapaCategorias = new Map();
    for (const c of categorias) {
        mapaCategorias.set(normalizar(c.nombre), c);
    }
    return { mapaAutores, mapaCategorias };
}

async function cargarExistentes(conexion) {
    const [porIsbn] = await conexion.query(
        `SELECT l.id_libro, l.titulo, l.isbn, l.id_autor, a.nombre, a.apellido
         FROM libros l
         JOIN autores a ON a.id_autor = l.id_autor
         WHERE l.isbn IS NOT NULL`
    );
    const [porObra] = await conexion.query(
        `SELECT l.id_libro, l.titulo, l.isbn, l.id_autor, a.nombre, a.apellido
         FROM libros l
         JOIN autores a ON a.id_autor = l.id_autor`
    );
    return {
        isbns: new Set(porIsbn.map((f) => String(f.isbn).replace(/[^0-9]/g, ''))),
        obras: new Set(porObra.map((f) => `${normalizar(`${f.nombre} ${f.apellido}`)}|${normalizar(f.titulo)}`)),
    };
}

async function main() {
    const opciones = parsearArgumentos(process.argv);

    if (opciones.ayuda) {
        console.log(`
USO:
  node scripts/semillaLibros.js [--dry-run] [--confirmar] [--categoria <n>] [--autor <n>]

Ejemplos:
  node scripts/semillaLibros.js --dry-run
  node scripts/semillaLibros.js --confirmar
  node scripts/semillaLibros.js --dry-run --autor "Pablo Neruda"
`);
        await pool.end();
        return;
    }

    if (!fs.existsSync(CATALOGO)) {
        console.error(`❌ No existe el catálogo: ${CATALOGO}`);
        process.exit(1);
    }

    const catalogo = JSON.parse(fs.readFileSync(CATALOGO, 'utf8'));
    const errores = validarCatalogo(catalogo);
    if (errores.length) {
        console.error(`❌ El catálogo tiene ${errores.length} problema(s):`);
        errores.slice(0, 20).forEach((e) => console.error(`   - ${e}`));
        process.exit(1);
    }

    let candidatos = catalogo.libros;
    if (opciones.categoria) {
        const objetivo = normalizar(opciones.categoria);
        candidatos = candidatos.filter((l) => normalizar(l.categoria) === objetivo);
    }
    if (opciones.autor) {
        const objetivo = normalizar(opciones.autor);
        candidatos = candidatos.filter((l) => normalizar(l.autor) === objetivo);
    }

    console.log(`\n📚 Catálogo: ${catalogo.libros.length} libro(s) verificados`);
    if (candidatos.length !== catalogo.libros.length) {
        console.log(`   filtrado a ${candidatos.length} por los argumentos`);
    }

    const conexion = await pool.getConnection();
    try {
        const { mapaAutores, mapaCategorias } = await cargarIndices(conexion);
        const existentes = await cargarExistentes(conexion);

        const faltantesAutores = new Set();
        const faltantesCategorias = new Set();
        const yaPresentes = [];
        const aInsertar = [];

        for (const libro of candidatos) {
            const autor = mapaAutores.get(normalizar(libro.autor));
            const categoria = mapaCategorias.get(normalizar(libro.categoria));

            if (!autor) faltantesAutores.add(libro.autor);
            if (!categoria) faltantesCategorias.add(libro.categoria);
            if (!autor || !categoria) continue;

            if (autor.estado === 0 || categoria.estado === 0) {
                yaPresentes.push({ ...libro, motivo: 'autor o categoría inactivo' });
                continue;
            }

            const isbn = String(libro.isbn).replace(/[^0-9]/g, '');
            const claveObra = `${normalizar(libro.autor)}|${normalizar(libro.titulo)}`;

            if (existentes.isbns.has(isbn)) {
                yaPresentes.push({ ...libro, motivo: 'ISBN ya cargado' });
                continue;
            }
            if (existentes.obras.has(claveObra)) {
                yaPresentes.push({ ...libro, motivo: 'obra ya cargada (mismo autor y título)' });
                continue;
            }

            aInsertar.push({ ...libro, isbn, id_autor: autor.id_autor, id_categoria: categoria.id_categoria });
        }

        if (faltantesAutores.size || faltantesCategorias.size) {
            console.error('\n❌ El catálogo referencia autores/categorías que no existen:');
            for (const a of faltantesAutores) console.error(`   - autor: "${a}"`);
            for (const c of faltantesCategorias) console.error(`   - categoría: "${c}"`);
            console.error('   Este script NO crea autores ni categorías. Corrige el catálogo o la base.');
            process.exitCode = 1;
            return;
        }

        console.log(`\n➕ A insertar   : ${aInsertar.length}`);
        console.log(`⏭️  Ya existentes: ${yaPresentes.length}`);
        if (yaPresentes.length) {
            const motivos = {};
            for (const p of yaPresentes) motivos[p.motivo] = (motivos[p.motivo] || 0) + 1;
            for (const [motivo, n] of Object.entries(motivos)) console.log(`     · ${motivo}: ${n}`);
        }

        if (aInsertar.length) {
            console.log('\n   Primeros 10:');
            aInsertar.slice(0, 10).forEach((l) => {
                console.log(`     • ${l.titulo} — ${l.autor} [${l.categoria}] S/ ${Number(l.precio).toFixed(2)} stock ${l.stock}`);
            });
            if (aInsertar.length > 10) console.log(`     … y ${aInsertar.length - 10} más`);
        }

        if (opciones.dryRun) {
            console.log(`\n🐞 DRY-RUN: no se escribió nada. Habría insertado ${aInsertar.length} libro(s).`);
            return;
        }

        if (!aInsertar.length) {
            console.log('\n✅ Nada que hacer: el catálogo ya está completo.');
            return;
        }

        if (!opciones.confirmar) {
            const ok = await pedirConfirmacion(`\n⚠️  ¿Confirmas insertar ${aInsertar.length} libro(s)? (sí/no): `);
            if (!ok) {
                console.log('✋ Cancelado por el usuario.');
                return;
            }
        }

        await conexion.beginTransaction();
        let insertados = 0;
        try {
            for (const l of aInsertar) {
                const precioOferta = l.descuento_porcentaje
                    ? (Number(l.precio) * (1 - Number(l.descuento_porcentaje) / 100)).toFixed(2)
                    : null;
                const [res] = await conexion.query(
                    `INSERT INTO libros
                        (titulo, isbn, descripcion, precio, stock, portada, id_autor, id_categoria,
                         descuento_porcentaje, precio_oferta)
                     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
                     RETURNING id_libro`,
                    [l.titulo, l.isbn, l.descripcion, l.precio, l.stock, l.id_autor, l.id_categoria,
                        l.descuento_porcentaje || null, precioOferta]
                );
                const idLibro = res.insertId;
                await conexion.query(
                    `INSERT INTO inventario (id_libro, stock, stock_minimo)
                     VALUES (?, ?, ?)
                     ON CONFLICT (id_libro) DO NOTHING`,
                    [idLibro, l.stock, STOCK_MINIMO]
                );
                insertados++;
            }
            await conexion.commit();
            console.log(`\n✅ Insertados ${insertados} libro(s) con inventario. (Transacción confirmada.)`);
        } catch (error) {
            await conexion.rollback();
            console.error('\n❌ Error al insertar. Se revirtió toda la transacción:', error.message);
            process.exitCode = 1;
            return;
        }
    } catch (error) {
        console.error('❌ Error inesperado:', error.message);
        process.exitCode = 1;
    } finally {
        conexion.release();
        await pool.end();
    }
}

main().catch(async (error) => {
    console.error('❌ Error inesperado:', error.message);
    try { await pool.end(); } catch {}
    process.exit(1);
});