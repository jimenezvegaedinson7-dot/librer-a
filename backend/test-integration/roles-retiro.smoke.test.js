const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const { MIGRACIONES } = require('../src/config/migraciones');
const sql = fs.readFileSync(path.join(__dirname,'../database/migrations/029_retirar_rol_obsoleto.sql'),'utf8');
const ids = [];
let venta;
test.after(async () => {
    if (venta) await pool.query('DELETE FROM ventas WHERE id_venta=?',[venta]);
    for (const id of ids) await pool.query('DELETE FROM usuarios WHERE id_usuario=?',[id]);
    await pool.end();
});

test('esquema limpio rechaza el rol retirado y el arranque no vuelve a habilitarlo',async () => {
    assert.ok(!MIGRACIONES.includes('025_rol_cajero.sql'));
    assert.ok(MIGRACIONES.includes('029_retirar_rol_obsoleto.sql'));
    await assert.rejects(pool.query("INSERT INTO usuarios (nombre,apellido,email,password,rol) VALUES ('Retirado','Audit',?,'x','cajero')",[`${crypto.randomUUID()}@example.test`]),error => error.code==='23514');
});

test('migración conserva cuentas y compras, desactiva el rol retirado y es idempotente',async () => {
    const conn = await pool.getConnection();
    try {
        // Reproduce una base de la versión anterior, con CHECK personalizado.
        await conn.pgQuery("ALTER TABLE usuarios DROP CONSTRAINT usuarios_rol_check; ALTER TABLE usuarios ADD CONSTRAINT roles_anteriores_check CHECK (rol IN ('administrador','cliente','cajero')); ALTER TABLE usuarios ADD CONSTRAINT audit_estado_check CHECK (estado IN (0,1))");
        const filas=[];
        for (const rol of ['administrador','cliente','cajero']) {
            const [u]=await conn.query("INSERT INTO usuarios (nombre,apellido,email,password,rol,estado) VALUES ('Rol','Audit',?,'x',?,1)",[`${crypto.randomUUID()}@example.test`,rol]);
            ids.push(u.insertId); filas.push({id:u.insertId,rol});
        }
        const antiguo=filas[2].id;
        const tokenViejo=jwt.sign({id_usuario:antiguo,rol:'cajero'},process.env.JWT_SECRET);
        const [v]=await conn.query("INSERT INTO ventas (id_usuario,total,tipo_entrega) VALUES (?,9.99,'tienda')",[antiguo]); venta=v.insertId;
        const [antes]=await conn.query('SELECT * FROM usuarios WHERE id_usuario=?',[antiguo]);
        await conn.pgQuery(sql);
        await conn.pgQuery(sql);
        const [despues]=await conn.query('SELECT * FROM usuarios WHERE id_usuario=?',[antiguo]);
        assert.deepEqual(despues[0],{...antes[0],rol:'cliente',estado:0});
        for (const fila of filas.slice(0,2)) {
            const [u]=await conn.query('SELECT rol,estado FROM usuarios WHERE id_usuario=?',[fila.id]); assert.deepEqual(u[0],{rol:fila.rol,estado:1});
        }
        const [compras]=await conn.query('SELECT id_usuario,total FROM ventas WHERE id_venta=?',[venta]);
        assert.equal(compras[0].id_usuario,antiguo); assert.equal(Number(compras[0].total),9.99);
        const [otros]=await conn.query("SELECT conname FROM pg_constraint WHERE conrelid='usuarios'::regclass AND conname='audit_estado_check'"); assert.equal(otros.length,1);
        const res=await fetch(`${process.env.TEST_BASE_URL}/api/usuarios/perfil`,{headers:{Authorization:`Bearer ${tokenViejo}`}}); assert.equal(res.status,401);
        await assert.rejects(conn.query('UPDATE usuarios SET rol=? WHERE id_usuario=?',['cajero',antiguo]),error => error.code==='23514');
    } finally {
        await conn.pgQuery('ROLLBACK');
        await conn.pgQuery('ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS audit_estado_check');
        conn.release();
    }
});

test('un rol desconocido aborta la migración sin convertir cuentas ni quitar restricciones',async () => {
    const conn=await pool.getConnection();
    try {
        await conn.pgQuery("CREATE TEMP TABLE usuarios (rol TEXT NOT NULL CHECK (rol IN ('cliente','administrador','cajero','desconocido')), estado INT NOT NULL); INSERT INTO usuarios VALUES ('cajero',1),('desconocido',1)");
        await assert.rejects(conn.pgQuery(sql),/rol desconocido/);
        await conn.pgQuery('ROLLBACK');
        const [rows]=await conn.query('SELECT rol,estado FROM usuarios ORDER BY rol');
        assert.deepEqual(rows.map(row => ({...row})),[{rol:'cajero',estado:1},{rol:'desconocido',estado:1}]);
        const [constraints]=await conn.query("SELECT conname FROM pg_constraint WHERE conrelid='usuarios'::regclass AND contype='c'"); assert.equal(constraints.length,1);
    } finally { await conn.pgQuery('ROLLBACK'); await conn.pgQuery('DROP TABLE IF EXISTS pg_temp.usuarios'); conn.release(); }
});
