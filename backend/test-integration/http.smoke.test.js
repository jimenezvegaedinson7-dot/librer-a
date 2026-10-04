const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const pool = require('../src/config/database');

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

test('smoke HTTP de rutas públicas y administrativas', async () => {
    const email =
        `smoke-${crypto.randomUUID()}@example.test`;
    let idUsuario = null;
    let idCliente = null;

    try {
        const [resultado] = await pool.query(`
            INSERT INTO usuarios
                (nombre, apellido, email, password, rol, estado)
            VALUES
                ('Smoke', 'CI', ?, 'no-login', 'administrador', 1)
            RETURNING id_usuario
        `, [email]);
        idUsuario = resultado[0]?.id_usuario;

        const token = jwt.sign(
            { id_usuario: idUsuario },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
        );
        const autorizacion = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const api = await fetch(`${baseUrl}/api`);
        assert.equal(api.status, 200);

        const sinToken = await fetch(
            `${baseUrl}/api/pagos/crear-orden`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: [] })
            }
        );
        assert.equal(sinToken.status, 401);

        for (const ruta of [
            '/api/test-db',
            '/api/pagos/resumen',
            '/api/comprobantes/resumen'
        ]) {
            const respuesta = await fetch(
                `${baseUrl}${ruta}`,
                { headers: autorizacion }
            );
            assert.equal(
                respuesta.status,
                200,
                `${ruta} devolvió ${respuesta.status}`
            );
        }

        const sinIdempotencia = await fetch(
            `${baseUrl}/api/pagos/crear-orden`,
            {
                method: 'POST',
                headers: autorizacion,
                body: JSON.stringify({ items: [] })
            }
        );
        assert.equal(sinIdempotencia.status, 403, 'El administrador no compra simulando el canal app');
        const [cliente] = await pool.query("INSERT INTO usuarios(nombre,apellido,email,password,rol) VALUES ('Cliente','CI',?,'no-login','cliente')", [`cliente-${crypto.randomUUID()}@example.test`]);
        idCliente = cliente.insertId;
        const intentoCliente = await fetch(`${baseUrl}/api/pagos/crear-orden`, {method: 'POST',
            headers: {'Content-Type':'application/json',Authorization:`Bearer ${jwt.sign({id_usuario:idCliente},process.env.JWT_SECRET)}`},
            body:JSON.stringify({items:[]})});
        assert.equal(intentoCliente.status, 400);
        const errorIdempotencia =
            await intentoCliente.json();
        assert.match(
            errorIdempotencia.mensaje,
            /idempotencia_clave es obligatoria/i
        );

        // PayU firma con MD5; sin PAYU_API_KEY configurado
        // la verificación falla en modo fail-closed (401).
        const webhook = await fetch(
            `${baseUrl}/api/pagos/webhook`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    referenceCode: 'smoke',
                    state: 'APPROVED'
                })
            }
        );
        assert.equal(webhook.status, 401);
    } finally {
        if (idCliente) await pool.query('DELETE FROM usuarios WHERE id_usuario=?', [idCliente]);
        if (idUsuario) {
            await pool.query(
                'DELETE FROM usuarios WHERE id_usuario = ?',
                [idUsuario]
            );
        }
        await pool.end();
    }
});
