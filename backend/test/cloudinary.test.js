const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const variables = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const anteriores = Object.fromEntries(variables.map((nombre) => [nombre, process.env[nombre]]));
const fetchOriginal = global.fetch;
const modulo = require.resolve('../src/utils/cloudinary');

test.after(() => {
    global.fetch = fetchOriginal;
    for (const nombre of variables) {
        if (anteriores[nombre] === undefined) delete process.env[nombre];
        else process.env[nombre] = anteriores[nombre];
    }
    delete require.cache[modulo];
});

for (const tipo of ['image', 'video', 'raw']) {
    test(`Cloudinary elimina ${tipo} en su endpoint y firma la solicitud`, async () => {
        process.env.CLOUDINARY_CLOUD_NAME = 'audit-cloud';
        process.env.CLOUDINARY_API_KEY = 'audit-key';
        process.env.CLOUDINARY_API_SECRET = 'audit-secret';
        delete require.cache[modulo];
        const cloudinary = require(modulo);
        global.fetch = async (url, opciones) => {
            assert.equal(url, `https://api.cloudinary.com/v1_1/audit-cloud/${tipo}/destroy`);
            assert.equal(opciones.method, 'POST');
            assert.equal(opciones.body.get('public_id'), 'catalogo/portada');
            assert.equal(opciones.body.get('api_key'), 'audit-key');
            const timestamp = opciones.body.get('timestamp');
            const firma = createHash('sha1').update(`public_id=catalogo/portada&timestamp=${timestamp}audit-secret`).digest('hex');
            assert.equal(opciones.body.get('signature'), firma);
            return { json: async () => ({ result: 'ok' }) };
        };
        const resultado = tipo === 'image' ? await cloudinary.eliminarImagen('catalogo/portada') : await cloudinary.eliminarRecurso('catalogo/portada', tipo);
        assert.equal(resultado, true);
    });
}

test('Cloudinary sin configuración no intenta eliminar recursos remotos', async () => {
    for (const nombre of variables) delete process.env[nombre];
    delete require.cache[modulo];
    const cloudinary = require(modulo);
    global.fetch = async () => assert.fail('No debe haber una petición remota');
    assert.equal(await cloudinary.eliminarRecurso('catalogo/portada', 'video'), false);
    assert.equal(await cloudinary.eliminarImagen('catalogo/portada'), false);
});
