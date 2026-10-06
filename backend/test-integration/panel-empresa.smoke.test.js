const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

test('Empresa: el panel simplificado guarda impuestos sin borrar metadatos históricos', async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.match(process.env.DATABASE_URL, /@127\.0\.0\.1:\d+\/audit$/);
    let id;
    const [anteriores] = await pool.query('SELECT * FROM empresa WHERE id=1');
    const anterior = anteriores[0];
    try {
        const [usuario] = await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol,email_verified_at) VALUES ('Panel','Audit',?,'no-login','administrador',NOW())", [randomUUID()+'@example.test']);
        id = usuario.insertId;
        await pool.query("UPDATE empresa SET tipo_documento='CE',documento_identidad='HIST-0001',fecha_inicio='2020-01-01' WHERE id=1");
        const token = jwt.sign({ id_usuario: id }, process.env.JWT_SECRET);
        const guardar = body => fetch(`${process.env.TEST_BASE_URL}/api/empresa`, { method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        for (const aplica_igv of [0, 1]) {
            const res = await guardar({ ruc: '20123456789', razon_social: 'Empresa de demostración', nombre_comercial: 'Marca de prueba',
                direccion: 'Dirección ficticia local', aplica_igv, libros_exonerados: 1, exoneracion_libros_hasta: '2026-10-17', tasa_igv: '18' });
            assert.equal(res.status, 200);
            const empresa = (await res.json()).empresa;
            assert.equal(empresa.aplica_igv, aplica_igv);
            assert.equal(empresa.libros_exonerados, 1);
            assert.equal(empresa.tipo_documento, 'CE');
            assert.equal(empresa.documento_identidad, 'HIST-0001');
            assert.equal(new Date(empresa.fecha_inicio).toISOString().slice(0,10), '2020-01-01');
        }
    } finally {
        if (anterior) {
            const campos = ['ruc','razon_social','nombre_comercial','direccion','tipo_documento','documento_identidad',
                'fecha_inicio','aplica_igv','libros_exonerados','exoneracion_libros_hasta','tasa_igv','updated_at'];
            await pool.query(`UPDATE empresa SET ${campos.map(c=>`${c}=?`).join(',')} WHERE id=1`, campos.map(c=>anterior[c]));
        }
        if (id) {
            await pool.query('DELETE FROM historial_operaciones WHERE id_usuario=?', [id]);
            await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [id]);
        }
        await pool.end();
    }
});
