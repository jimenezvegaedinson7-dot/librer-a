// Respaldo lógico consistente; no modifica la base de origen.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { Client } = require('pg');

const DIRECTORIO = path.resolve(__dirname, '../../backups/postgresql');
const ORIGEN = 'libreria-postgresql';
const PATRON = /^libreria-\d{8}T\d{6}Z-[a-f0-9]{8}\.dump$/;
const IDENT = valor => '"' + valor.replaceAll('"', '""') + '"';

function diaEnPeru(fecha) {
    const partes = new Intl.DateTimeFormat('en', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(fecha));
    const valor = tipo => partes.find(parte => parte.type === tipo).value;
    return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

function esCopiaDeHoy(copia, ahora, fuente) {
    return Boolean(copia && copia.fuente === fuente && Date.parse(copia.creadoEn) <= new Date(ahora).getTime() && diaEnPeru(copia.creadoEn) === diaEnPeru(ahora));
}

function semanaIso(fecha) {
    const d = new Date(fecha);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return `${d.getUTCFullYear()}-${Math.ceil((((d - inicio) / 86400000) + 1) / 7)}`;
}

function elegirConservadas(copias, diarios = 7, semanas = 4) {
    const ordenadas = [...copias].sort((a, b) => Date.parse(b.creadoEn) - Date.parse(a.creadoEn));
    const dias = new Set(), grupos = new Set(), conservar = new Set();
    for (const copia of ordenadas) {
        const dia = diaEnPeru(copia.creadoEn), semana = semanaIso(copia.creadoEn);
        if (!dias.has(dia) && dias.size < diarios) { dias.add(dia); conservar.add(copia.archivo); }
        if (!grupos.has(semana) && grupos.size < semanas) { grupos.add(semana); conservar.add(copia.archivo); }
    }
    return conservar;
}

function esManifiestoPropio(datos, archivo) {
    return datos?.version === 1 && datos.origen === ORIGEN && datos.archivo === archivo && PATRON.test(archivo) &&
        /^\d{4}-\d{2}-\d{2}T/.test(datos.creadoEn || '') && Number.isFinite(Date.parse(datos.creadoEn)) &&
        /^[a-f0-9]{64}$/.test(datos.sha256 || '') && /^[a-f0-9]{64}$/.test(datos.fuente || '') && Number.isSafeInteger(datos.bytes) && datos.bytes > 5 &&
        datos.verificacion?.archivoCompleto === true;
}

function cargarCopias(directorio) {
    if (!fs.existsSync(directorio)) return [];
    const copias = [];
    for (const nombre of fs.readdirSync(directorio)) {
        if (!nombre.endsWith('.dump.json')) continue;
        const archivo = nombre.slice(0, -5);
        if (!PATRON.test(archivo)) continue;
        try {
            const datos = JSON.parse(fs.readFileSync(path.join(directorio, nombre), 'utf8'));
            const destino = path.join(directorio, archivo);
            if (esManifiestoPropio(datos, archivo) && fs.lstatSync(destino).isFile() && fs.statSync(destino).size === datos.bytes) copias.push(datos);
        } catch { /* Las copias ajenas, incompletas o dañadas no se purgan. */ }
    }
    return copias;
}

function aplicarRetencion(directorio) {
    const copias = cargarCopias(directorio), conservar = elegirConservadas(copias);
    let eliminadas = 0;
    for (const copia of copias) if (!conservar.has(copia.archivo)) {
        fs.unlinkSync(path.join(directorio, copia.archivo));
        fs.unlinkSync(path.join(directorio, copia.archivo + '.json'));
        eliminadas++;
    }
    return { conservadas: conservar.size, eliminadas };
}

function ejecutar(comando, argumentos, env = {}, capturar = false) {
    return new Promise((resolve, reject) => {
        const proceso = spawn(comando, argumentos, { env: { ...process.env, ...env }, windowsHide: true, stdio: ['ignore', capturar ? 'pipe' : 'ignore', 'ignore'] });
        let salida = '';
        let agotado = false;
        const reloj = setTimeout(() => { agotado = true; proceso.kill(); }, 20 * 60000);
        if (capturar) proceso.stdout.on('data', parte => { salida += parte; });
        proceso.on('error', () => { clearTimeout(reloj); reject(new Error('No se pudo ejecutar una herramienta de PostgreSQL')); });
        proceso.on('exit', codigo => {
            clearTimeout(reloj);
            if (agotado) reject(new Error('La herramienta de respaldo agotó el tiempo disponible'));
            else if (codigo !== 0) reject(new Error(`La herramienta de PostgreSQL terminó con código ${codigo}`));
            else resolve(salida);
        });
    });
}

async function hashArchivo(archivo) {
    const hash = crypto.createHash('sha256');
    for await (const parte of fs.createReadStream(archivo)) hash.update(parte);
    return hash.digest('hex');
}

async function verificarArchivo(archivo, pgRestore) {
    const descriptor = fs.openSync(archivo, 'r');
    const cabecera = Buffer.alloc(5);
    try { fs.readSync(descriptor, cabecera, 0, 5, 0); }
    finally { fs.closeSync(descriptor); }
    if (cabecera.toString() !== 'PGDMP') throw new Error('El archivo no es un respaldo PostgreSQL custom');
    const listado = await ejecutar(pgRestore, ['--list', archivo], {}, true);
    if (!listado.includes('TABLE DATA')) throw new Error('El archivo no contiene entradas de datos');
    // Leer y descomprimir TODO el archivo sin imprimir datos ni conectarse a una base.
    await ejecutar(pgRestore, ['--no-owner', '--no-privileges', '--file', process.platform === 'win32' ? 'NUL' : '/dev/null', archivo]);
}

function adquirirCandado(directorio) {
    const archivo = path.join(directorio, '.respaldo.lock');
    try { fs.writeFileSync(archivo, JSON.stringify({ pid: process.pid }), { flag: 'wx' }); }
    catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const anterior = JSON.parse(fs.readFileSync(archivo, 'utf8'));
        let vivo = true;
        try { process.kill(anterior.pid, 0); } catch (e) { vivo = e.code !== 'ESRCH'; }
        if (vivo) throw new Error('Ya hay un respaldo en ejecución');
        fs.unlinkSync(archivo);
        fs.writeFileSync(archivo, JSON.stringify({ pid: process.pid }), { flag: 'wx' });
    }
    return () => fs.unlinkSync(archivo);
}

async function respaldar({ conexion, directorio = DIRECTORIO, siCorresponde = false,
    pgDump = process.env.LIBRERIA_PG_DUMP || 'pg_dump', pgRestore = process.env.LIBRERIA_PG_RESTORE || 'pg_restore',
    ssl = process.env.LIBRERIA_BACKUP_SSL || 'require' } = {}) {
    if (!conexion) throw new Error('Falta la conexión protegida del respaldo');
    const url = new URL(conexion);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['require', 'disable'].includes(ssl)) throw new Error('Configuración de PostgreSQL no válida');
    if (url.hostname.startsWith('dpg-') && !url.hostname.includes('.')) url.hostname += '.oregon-postgres.render.com';
    const fuente = crypto.createHash('sha256').update(url.hostname + url.pathname).digest('hex');
    fs.mkdirSync(directorio, { recursive: true });
    const liberar = adquirirCandado(directorio);
    let temporal, client;
    try {
        const ultima = cargarCopias(directorio).filter(copia => copia.fuente === fuente).sort((a, b) => Date.parse(b.creadoEn) - Date.parse(a.creadoEn))[0];
        const env = { PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username),
            PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGSSLMODE: ssl, PGCONNECT_TIMEOUT: '15' };
        client = new Client({ connectionString: url.href, ssl: ssl === 'require' ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 15000 });
        await client.connect();
        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        const momento = (await client.query('SELECT clock_timestamp() AS fecha, pg_export_snapshot() AS snapshot')).rows[0];
        if (siCorresponde && esCopiaDeHoy(ultima, momento.fecha, fuente) && await hashArchivo(path.join(directorio, ultima.archivo)) === ultima.sha256) {
            await client.query('COMMIT');
            return { creado: false, motivo: 'Ya hay una copia verificada de hoy', archivo: ultima.archivo };
        }
        const creadoEn = momento.fecha.toISOString();
        const nombre = `libreria-${creadoEn.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}-${crypto.randomBytes(4).toString('hex')}.dump`;
        if (!PATRON.test(nombre)) throw new Error('Nombre de respaldo inválido');
        const archivo = path.join(directorio, nombre);
        temporal = archivo + '.partial';
        fs.closeSync(fs.openSync(temporal, 'wx'));
        const tablas = (await client.query("SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_schema,table_name")).rows;
        const conteos = {};
        for (const tabla of tablas) conteos[`${tabla.table_schema}.${tabla.table_name}`] = (await client.query(`SELECT count(*)::text AS n FROM ${IDENT(tabla.table_schema)}.${IDENT(tabla.table_name)}`)).rows[0].n;
        await ejecutar(pgDump, ['--format=custom', '--no-owner', '--no-privileges', '--no-password', '--snapshot', momento.snapshot, '--file', temporal], env);
        await client.query('COMMIT');
        await verificarArchivo(temporal, pgRestore);
        const datos = { version: 1, origen: ORIGEN, fuente, archivo: nombre, creadoEn, bytes: fs.statSync(temporal).size,
            sha256: await hashArchivo(temporal), tablas: conteos, verificacion: { archivoCompleto: true } };
        fs.renameSync(temporal, archivo);
        temporal = null;
        fs.writeFileSync(archivo + '.json', JSON.stringify(datos, null, 2) + '\n', { flag: 'wx' });
        const retencion = aplicarRetencion(directorio);
        return { creado: true, archivo, tablas: tablas.length, bytes: datos.bytes, sha256: datos.sha256, ...retencion };
    } catch (error) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        if (client) await client.end();
        if (temporal) fs.rmSync(temporal, { force: true });
        liberar();
    }
}

module.exports = { diaEnPeru, esCopiaDeHoy, semanaIso, elegirConservadas, esManifiestoPropio, cargarCopias, aplicarRetencion, hashArchivo, verificarArchivo, respaldar };
if (require.main === module) respaldar({ conexion: process.env.LIBRERIA_BACKUP_DATABASE_URL, siCorresponde: process.argv.includes('--si-corresponde') })
    .then(resultado => console.log(JSON.stringify(resultado)))
    .catch(error => { console.error(`Respaldo no completado: ${error.code || error.message}`); process.exitCode = 1; });
