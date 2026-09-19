// ============================================================
// RESETEAR PRECIOS DE LIBROS (utilidad CLI de mantenimiento)
// ============================================================
// Actualiza `precio` de la tabla `libros` (PostgreSQL vía pool
// compatible con mysql2, igual que el resto del backend).
//
// USO (desde backend/, sin importar carpeta actual):
//   node scripts/resetearPrecios.js --all     --precio 29.90
//   node scripts/resetearPrecios.js --all     --precio 29.90 --dry-run
//   node scripts/resetearPrecios.js --destacado --precio 29.90 [--top 5]
//
// OPCIONES:
//   --all             Afecta TODOS los libros.
//   --destacado       Afecta SOLO los libros más vendidos (criterio idéntico
//                     al reporte "libros más vendidos": ventas pagadas
//                     agrupadas por libro, ordenadas por cantidad desc).
//   --precio <n>      Nuevo precio unitario (obligatorio, número > 0).
//   --top <n>         Cuántos destacados (solo con --destacado). Por defecto 5.
//   --dry-run         Muestra qué se va a actualizar SIN escribir en la BD.
//   --confirmar       Omite la confirmación interactiva (para scripts/CI).
//
// SEGURIDAD:
//   - TRANSACCIÓN atómica: si algo falla a mitad, se revierte todo.
//   - Por defecto pide confirmación en pantalla antes de escribir.
//   - --dry-run es 100% seguro (solo consultas SELECT).
// ============================================================

const path = require('path');
const readline = require('readline');
const { stdin, stdout } = require('process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Mismo pool compatible con mysql2 que usa todo el backend
const pool = require('../src/config/database');

// ============================================================
// 1. PARSEO DE ARGUMENTOS
// ============================================================
function parsearArgumentos(argv) {
    const opciones = {
        all: false,
        destacado: false,
        precio: null,
        top: 5,
        dryRun: false,
        confirmar: false,
        ayuda: false
    };

    const args = argv.slice(2); // quita node + ruta del script
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--all':
                opciones.all = true;
                break;
            case '--destacado':
                opciones.destacado = true;
                break;
            case '--dry-run':
            case '--dryRun':
                opciones.dryRun = true;
                break;
            case '--confirmar':
            case '--yes':
            case '-y':
                opciones.confirmar = true;
                break;
            case '--precio':
                opciones.precio = Number(args[++i]);
                break;
            case '--top':
                opciones.top = Number(args[++i]);
                break;
            case '--help':
            case '-h':
                opciones.ayuda = true;
                break;
            default:
                if (arg.startsWith('--precio=')) {
                    opciones.precio = Number(arg.split('=')[1]);
                } else if (arg.startsWith('--top=')) {
                    opciones.top = Number(arg.split('=')[1]);
                } else if (arg?.startsWith?.('-')) {
                    console.error(`Argumento desconocido: ${arg}`);
                    process.exit(1);
                } else {
                    // argumento posicional no esperado
                    console.error(`Argumento inesperado: ${arg}`);
                    process.exit(1);
                }
        }
    }

    return opciones;
}

async function pedirConfirmacion(mensaje) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const respuesta = await new Promise((resolve) => {
        rl.question(mensaje, (r) => resolve(r.trim().toLowerCase()));
    });
    rl.close();
    return ['s', 'si', 'sí', 'y', 'yes'].includes(respuesta);
}

// ============================================================
// 2. OBTENER IDS DE DESTACADOS (más vendidos)
// ============================================================
// Usa EXACTAMENTE el mismo criterio del reporte "libros más vendidos"
// del backend (reporte.model.js → obtenerLibrosMasVendidos):
//   SUM(detalle_venta.cantidad) con ventas pagadas, agrupadas por libro.
// Aquí agregamos el tope (`--top`), ya que la utilidad es de mantenimiento.
async function obtenerIdsDestacados(tope) {
    const [filas] = await pool.query(
        `SELECT
            l.id_libro,
            l.titulo,
            SUM(d.cantidad) AS vendidos
        FROM detalle_venta d
        INNER JOIN ventas v ON d.id_venta = v.id_venta
        INNER JOIN libros l ON d.id_libro = l.id_libro
        WHERE v.estado = 'pagada'
        GROUP BY l.id_libro, l.titulo
        ORDER BY vendidos DESC, l.titulo ASC
        LIMIT ?`,
        [tope]
    );
    return filas;
}

// ============================================================
// 3. LÓGICA PRINCIPAL
// ============================================================
async function main() {
    const opciones = parsearArgumentos(process.argv);

    if (opciones.ayuda) {
        console.log(`
USO:
  node scripts/resetearPrecios.js --all --precio <n> [--dry-run] [--confirmar]
  node scripts/resetearPrecios.js --destacado --precio <n> [--top N] [--dry-run] [--confirmar]

Ejemplos:
  node scripts/resetearPrecios.js --all --precio 29.90 --dry-run
  node scripts/resetearPrecios.js --destacado --precio 39.90 --top 10 --confirmar
`);
        await pool.end();
        return;
    }

    // Validación de modo
    const modo = opciones.all ? 'all' : opciones.destacado ? 'destacado' : null;
    if (!modo) {
        console.error('❌ Debes indicar --all o --destacado.');
        process.exit(1);
    }
    if (opciones.all && opciones.destacado) {
        console.error('❌ --all y --destacado son mutuamente excluyentes.');
        process.exit(1);
    }

    // Validación de precio
    const precio = opciones.precio;
    if (precio === null || Number.isNaN(precio)) {
        console.error('❌ Falta --precio <n> (número mayor a 0).');
        process.exit(1);
    }
    if (precio <= 0) {
        console.error('❌ --precio debe ser mayor a 0.');
        process.exit(1);
    }

    // Validación de top
    const top = Math.floor(opciones.top);
    if ((opciones.destacado && Number.isNaN(top)) || top <= 0) {
        console.error('❌ --top debe ser un entero > 0 (número de destacados).');
        process.exit(1);
    }

    const modoEtiqueta = modo === 'all' ? 'TODOS los libros' : `los ${top} MÁS VENDIDOS`;

    // ---- Resolver alcance ----
    let ids = null; // null = todos
    if (modo === 'destacado') {
        const destacados = await obtenerIdsDestacados(top);
        if (destacados.length === 0) {
            console.log('⚠️  No hay libros vendidos (sin ventas pagadas). Nada que actualizar.');
            await pool.end();
            return;
        }
        ids = destacados.map((l) => l.id_libroOutputRow);
    }

    // ---- Vista previa (siempre con los datos reales de la BD) ----
    const [previa] = ids
        ? await pool.query(
              `SELECT id_libro, titulo, precio
               FROM libros
               WHERE id_libro = ANY(?::int[])
               ORDER BY titulo`,
              [ids]
          )
        : await pool.query(
              `SELECT id_libro, titulo, precio
               FROM libros
               ORDER BY titulo`
          );

    console.log(`\n🎯 Alcance  : ${modoEtiqueta}`);
    console.log(`💵 Precio   : S/ ${precio.toFixed(2)}`);
    console.log(`📚 Afecta  : ${previa.length} libro(s)\n`);

    previa.slice(0, 12).forEach((l) => {
        console.log(`   • ${l.titulo}  (S/ ${Number(l.precio).toFixed(2)} → S/ ${precio.toFixed(2)})`);
    });
    if (previa.length > 12) console.log(`   … y ${previa.length - 12} más`);

    if (opciones.dryRun) {
        console.log(`\n🐞 DRY-RUN: no se escribió nada. Habría actualizado ${previa.length} libro(s).`);
        await pool.end();
        return;
    }

    if (!opciones.confirmar) {
        const ok = await pedirConfirmacion('\n⚠️  ¿Confirmas la actualización? (sí/no): ');
        if (!ok) {
            console.log('✋ Cancelado por el usuario.');
            await pool.end();
            return;
        }
    }

    // ---- Transacción atómica ----
    const conexion = await pool.getConnection();
    try {
        await conexion.beginTransaction();
        const params = ids ? [ids, precio] : [precio];
        const [resultado] = ids
            ? await conexion.query(
                  `UPDATE libros
                   SET precio = ?
                   WHERE id_libro = ANY(?::int[])`,
                  [precio, ids]
              )
            : await conexion.query(`UPDATE libros SET precio = ?`, [precio]);

        await conexion.commit();

        const afectados = Number(resultado?.affectedRows ?? resultado?.rowCount ?? 0);
        console.log(`\n✅ Precios actualizados: ${afectados} libro(s). (Transacción confirmada.)`);
    } catch (error) {
        await conexion.rollback();
        console.error('\n❌ Error al actualizar. Se revirtió la transacción:', error.message);
        process.exitCode = 1;
    } finally {
        conexion.release();
    }

    await pool.end();
}

main().catch(async (error) => {
    console.error('❌ Error inesperado:', error.message);
    try { await pool.end(); } catch {}
    process.exit(1);
});
