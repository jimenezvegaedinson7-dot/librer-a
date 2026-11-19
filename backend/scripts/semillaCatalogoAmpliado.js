const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { stdin, stdout } = require('process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = require('../src/config/database');

const CATALOGOS = [
    path.join(__dirname, '..', 'database', 'seeds', 'libros-catalogo.json'),
    path.join(__dirname, '..', 'database', 'seeds', 'libros-catalogo-ampliado.json')
];
const STOCK_MINIMO = 5;

const normalizar = (texto) =>
    String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.]/g, ' ')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const dividirAutor = (nombreCompleto) => {
    const partes = String(nombreCompleto || '').trim().split(/\s+/);
    return { nombre: partes[0] || '', apellido: partes.slice(1).join(' ') || '' };
};

const digitoControl = (doceDigitos) => {
    let suma = 0;
    for (let i = 0; i < 12; i++) suma += Number(doceDigitos[i]) * (i % 2 === 0 ? 1 : 3);
    return (10 - (suma % 10)) % 10;
};

const esbnValido = (valor) => {
    const digitos = String(valor || '').replace(/[^0-9]/g, '');
    return /^\d{13}$/.test(digitos) && digitoControl(digitos.slice(0, 12)) === Number(digitos[12]);
};

function parsearArgumentos(argv) {
    const opciones = { dryRun: false, confirmar: false, categoria: null, autor: null, ayuda: false };
    const args = argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
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
                console.error(`Argumento desconocido: ${args[i]}`);
                process.exit(1);
        }
    }

    return opciones;
}

async function pedirConfirmacion(mensaje) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const respuesta = await new Promise((resolve) => rl.question(mensaje, (valor) => resolve(valor.trim().toLowerCase())));
    rl.close();
    return ['s', 'si', 'sí', 'y', 'yes'].includes(respuesta);
}

function validarCatalogos(catalogos) {
    const errores = [];
    const isbns = new Set();

    for (const catalogo of catalogos) {
        for (const [indice, libro] of catalogo.libros.entries()) {
            const donde = `${path.basename(catalogo.archivo)} libros[${indice}] "${libro.titulo}"`;
            if (!esbnValido(libro.isbn)) errores.push(`${donde}: ISBN-13 inválido (${libro.isbn})`);
            if (isbns.has(libro.isbn)) errores.push(`${donde}: ISBN repetido (${libro.isbn})`);
            isbns.add(libro.isbn);
            if (!dividirAutor(libro.autor).nombre) errores.push(`${donde}: falta autor`);
            if (!libro.categoria) errores.push(`${donde}: falta categoría`);
            if (!(Number(libro.precio) > 0)) errores.push(`${donde}: precio inválido`);
            if (libro.descuento_porcentaje != null) {
                const descuento = Number(libro.descuento_porcentaje);
                if (!(descuento >= 1 && descuento <= 99)) errores.push(`${donde}: descuento fuera de 1..99`);
            }
        }
    }

    return errores;
}

async function cargarIndices(conexion) {
    const [autores] = await conexion.query('SELECT id_autor, nombre, apellido, estado FROM autores');
    const [categorias] = await conexion.query('SELECT id_categoria, nombre, estado FROM categorias');
    const mapaAutores = new Map();
    const mapaCategorias = new Map();

    for (const autor of autores) mapaAutores.set(normalizar(`${autor.nombre} ${autor.apellido}`), autor);
    for (const categoria of categorias) mapaCategorias.set(normalizar(categoria.nombre), categoria);

    return { mapaAutores, mapaCategorias };
}

async function cargarExistentes(conexion) {
    const [filas] = await conexion.query(
        `SELECT l.id_libro, l.titulo, l.isbn, l.id_autor, a.nombre, a.apellido FROM libros l JOIN autores a ON a.id_autor = l.id_autor`
    );

    return {
        isbns: new Set(filas.map((f) => String(f.isbn || '').replace(/[^0-9]/g, ''))),
        obras: new Set(filas.map((f) => `${normalizar(`${f.nombre} ${f.apellido}`)}|${normalizar(f.titulo)}`))
    };
}

async function main() {
    const opciones = parsearArgumentos(process.argv);

    if (opciones.ayuda) {
        console.log(`
USO:
  node scripts/semillaCatalogoAmpliado.js [--dry-run] [--confirmar] [--categoria <n>] [--autor <n>]

Ejemplos:
  node scripts/semillaCatalogoAmpliado.js --dry-run
  node scripts/semillaCatalogoAmpliado.js --confirmar
  node scripts/semillaCatalogoAmpliado.js --dry-run --categoria "Cómic y Manga"
`);
        await pool.end();
        return;
    }

    const catalogos = CATALOGOS.map((archivo) => ({ ...JSON.parse(fs.readFileSync(archivo, 'utf8')), archivo }));
    const errores = validarCatalogos(catalogos);
    if (errores.length) {
        console.error(`❌ Los catálogos tienen ${errores.length} problema(s):`);
        errores.slice(0, 20).forEach((error) => console.error(`   - ${error}`));
        process.exitCode = 1;
        return;
    }

    let candidatos = catalogos.flatMap((catalogo) => catalogo.libros);
    if (opciones.categoria) {
        const objetivo = normalizar(opciones.categoria);
        candidatos = candidatos.filter((libro) => normalizar(libro.categoria) === objetivo);
    }
    if (opciones.autor) {
        const objetivo = normalizar(opciones.autor);
        candidatos = candidatos.filter((libro) => normalizar(libro.autor) === objetivo);
    }

    console.log(`\n📚 Catálogos: ${catalogos.map((c) => c.total).join(' + ')} libro(s) verificados`);
    if (candidatos.length !== catalogos.reduce((suma, c) => suma + c.total, 0)) {
        console.log(`   filtrado a ${candidatos.length} por los argumentos`);
    }

    const conexion = await pool.getConnection();

    try {
        const { mapaAutores, mapaCategorias } = await cargarIndices(conexion);
        const existentes = await cargarExistentes(conexion);
        const autoresNuevos = new Map();
        const categoriasNuevas = new Map();
        const aInsertar = [];
        const yaPresentes = [];

        for (const libro of candidatos) {
            const nombreAutor = normalizar(libro.autor);
            const nombreCategoria = normalizar(libro.categoria);

            if (!mapaAutores.has(nombreAutor) && !autoresNuevos.has(nombreAutor)) {
                autoresNuevos.set(nombreAutor, dividirAutor(libro.autor));
            }
            if (!mapaCategorias.has(nombreCategoria) && !categoriasNuevas.has(nombreCategoria)) {
                categoriasNuevas.set(nombreCategoria, libro.categoria);
            }
        }

        for (const [clave, autor] of autoresNuevos) {
            if (!autor.nombre || !autor.apellido) {
                console.error(`❌ Autor no válido: ${clave}`);
                process.exitCode = 1;
                return;
            }
        }

        for (const libro of candidatos) {
            const autor = mapaAutores.get(normalizar(libro.autor));
            const categoria = mapaCategorias.get(normalizar(libro.categoria));
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

            aInsertar.push({
                ...libro,
                isbn,
                id_autor: autor ? autor.id_autor : null,
                id_categoria: categoria ? categoria.id_categoria : null,
                autorNuevo: autor ? null : normalizar(libro.autor),
                categoriaNueva: categoria ? null : normalizar(libro.categoria)
            });
        }

        console.log(`\n👤 Autores nuevos   : ${autoresNuevos.size}`);
        console.log(`🏷️  Categorías nuevas: ${categoriasNuevas.size}`);
        console.log(`➕ Libros a insertar : ${aInsertar.length}`);
        console.log(`⏭️  Ya existentes    : ${yaPresentes.length}`);

        const porCategoria = {};
        for (const libro of aInsertar) porCategoria[libro.categoria] = (porCategoria[libro.categoria] || 0) + 1;
        console.log('\nPor categoría:');
        Object.entries(porCategoria).sort((a, b) => a[0].localeCompare(b[0], 'es')).forEach(([nombre, cantidad]) => {
            console.log(`   ${nombre}: ${cantidad}`);
        });

        if (opciones.dryRun) {
            console.log(`\n🐞 DRY-RUN: no se escribió nada. Habría insertado ${aInsertar.length} libro(s).`);
            return;
        }

        if (!aInsertar.length && !autoresNuevos.size && !categoriasNuevas.size) {
            console.log('\n✅ Nada que hacer: el catálogo ya está completo.');
            return;
        }

        if (!opciones.confirmar) {
            const ok = await pedirConfirmacion(`\n⚠️  ¿Confirmas insertar ${aInsertar.length} libro(s), ${autoresNuevos.size} autor(es) y ${categoriasNuevas.size} categoría(s)? (sí/no): `);
            if (!ok) {
                console.log('✋ Cancelado por el usuario.');
                return;
            }
        }

        await conexion.beginTransaction();

        try {
            const autoresUsados = new Set(aInsertar.map((libro) => libro.autorNuevo || normalizar(libro.autor)));
            const categoriasUsadas = new Set(aInsertar.map((libro) => libro.categoriaNueva || normalizar(libro.categoria)));

            for (const clave of autoresUsados) {
                const autor = mapaAutores.get(clave);
                if (autor && autor.estado === 0) await conexion.query(`UPDATE autores SET estado = 1 WHERE id_autor = ?`, [autor.id_autor]);
            }
            for (const clave of categoriasUsadas) {
                const categoria = mapaCategorias.get(clave);
                if (categoria && categoria.estado === 0) await conexion.query(`UPDATE categorias SET estado = 1 WHERE id_categoria = ?`, [categoria.id_categoria]);
            }

            for (const [clave, datos] of autoresNuevos) {
                const [filas] = await conexion.query(
                    `INSERT INTO autores (nombre, apellido, estado) VALUES (?, ?, 1) RETURNING id_autor`,
                    [datos.nombre, datos.apellido]
                );
                mapaAutores.set(clave, { id_autor: filas.insertId, estado: 1 });
            }

            for (const [clave, nombre] of categoriasNuevas) {
                const [filas] = await conexion.query(
                    `INSERT INTO categorias (nombre, estado) VALUES (?, 1) RETURNING id_categoria`,
                    [nombre]
                );
                mapaCategorias.set(clave, { id_categoria: filas.insertId, estado: 1 });
            }

            let insertados = 0;
            const loteLibros = [];
            const TAMANO_LOTE = 100;

            const vaciarLote = async () => {
                if (!loteLibros.length) return;

                const valores = [];
                const filas = loteLibros.map((libro, indice) => {
                    const base = indice * 9;
                    valores.push(
                        libro.titulo,
                        libro.isbn,
                        libro.descripcion || null,
                        libro.precio,
                        libro.stock ?? 10,
                        libro.id_autor,
                        libro.id_categoria,
                        libro.descuento_porcentaje || null,
                        libro.precioOferta
                    );
                    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, NULL, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
                });

                await conexion.query(
                    `INSERT INTO libros (titulo, isbn, descripcion, precio, stock, portada, id_autor, id_categoria, descuento_porcentaje, precio_oferta)
                     VALUES ${filas.join(', ')}`,
                    valores
                );

                await conexion.query(
                    `INSERT INTO inventario (id_libro, stock, stock_minimo)
                     SELECT l.id_libro, u.stock, $3
                     FROM unnest($1::text[], $2::int[]) AS u(isbn, stock)
                     JOIN libros l ON l.isbn = u.isbn
                     ON CONFLICT (id_libro) DO NOTHING`,
                    [loteLibros.map((libro) => libro.isbn), loteLibros.map((libro) => libro.stock ?? 10), STOCK_MINIMO]
                );

                insertados += loteLibros.length;
                loteLibros.length = 0;
            };

            for (const libro of aInsertar) {
                libro.id_autor = mapaAutores.get(libro.autorNuevo || normalizar(libro.autor)).id_autor;
                libro.id_categoria = mapaCategorias.get(libro.categoriaNueva || normalizar(libro.categoria)).id_categoria;

                const precioOferta = libro.descuento_porcentaje
                    ? (Number(libro.precio) * (1 - Number(libro.descuento_porcentaje) / 100)).toFixed(2)
                    : null;

                loteLibros.push({ ...libro, precioOferta });
                if (loteLibros.length >= TAMANO_LOTE) await vaciarLote();
            }
            await vaciarLote();

            await conexion.commit();
            console.log(`\n✅ Insertados ${insertados} libro(s) con inventario, ${autoresNuevos.size} autor(es) y ${categoriasNuevas.size} categoría(s).`);
        } catch (error) {
            await conexion.rollback();
            console.error('\n❌ Error al insertar. Se revirtió toda la transacción:', error.message);
            process.exitCode = 1;
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
    try {
        await pool.end();
    } catch {}
    process.exit(1);
});
