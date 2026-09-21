const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://libreria_usuarios:VbVcE7vbNqLW5TXijbNr@dpg-d2mgs0u3k7is73d1fb10-a.oregon-postgres.render.com:5432/libreria?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        await client.connect();
        console.log('Connected to Render PostgreSQL');

        const result = await client.query(
            'ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_documento VARCHAR(20) NULL, ADD COLUMN IF NOT EXISTS cliente_tipo_documento VARCHAR(10) NULL'
        );
        console.log('Migration 021 OK:', result.command);

        const check = await client.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'ventas' AND column_name IN ('cliente_documento', 'cliente_tipo_documento')"
        );
        console.log('Columns:', check.rows.map(r => r.column_name).join(', '));
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await client.end();
    }
})();
