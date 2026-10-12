import { test, expect } from '@playwright/test';

const admin = { id_usuario: 1, nombre: 'Admin A', apellido: 'Prueba', rol: 'administrador', estado: 1 };
const cliente = { id_usuario: 7, nombre: 'Cliente A', apellido: 'Prueba', email: 'a@example.test', rol: 'cliente', estado: 1 };
const otraCuenta = { ...cliente, id_usuario: 8, nombre: 'Cliente B' };
const venta = { id_venta: 51, id_usuario: 7, estado: 'pendiente', estado_entrega: 'pendiente', tipo_entrega: 'tienda',
    origen: 'app', canal_compra: 'web', external_reference: 'ref-51', total: 25, costo_envio: 0,
    detalle: [{ id_libro: 1, titulo: 'Libro de prueba', cantidad: 1, subtotal: 25 }] };
const diferida = () => { let resolver; const promesa = new Promise(r => { resolver = r; }); return { promesa, resolver }; };
const responder = (route, data) => route.fulfill({ json: { success: true, data, anuncio: null } });

async function preparar(context, manejar = () => false) {
    // Todo destino externo y toda API están interceptados antes de navegar.
    await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) {
            if (await manejar(route, url.pathname)) return;
            return responder(route, url.pathname === '/api/usuarios/perfil'
                ? (route.request().headers().authorization === 'Bearer cliente-b' ? otraCuenta : cliente) : []);
        }
        if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
        return route.continue();
    });
}
async function sembrarCliente(page, intento = false) {
    await page.goto('/catalogo');
    await page.evaluate(({ cliente, intento }) => {
        localStorage.setItem('libreria-web-cliente-v1', JSON.stringify({ usuario: cliente, token: 'cliente-a', generacion: 'a' }));
        localStorage.setItem('libreria-web-carrito-7', JSON.stringify({ items: [{ id_libro: 1, cantidad: 1, linea: 'original' }], confirmadas: [] }));
        if (intento) localStorage.setItem('libreria-web-intento-7', JSON.stringify({ id_usuario: 7,
            cuerpo: { items: [{ id_libro: 1, cantidad: 1 }], idempotencia_clave: 'misma-clave' },
            carrito: [{ id_libro: 1, cantidad: 1, linea: 'original' }], orden: { id_venta: 51 } }));
    }, { cliente, intento });
}

for (const tipo of ['401', 'revocada', 'perfil', 'login', 'login-invitado']) {
    test(`panel: respuesta ${tipo} anterior se descarta y conserva la sesión nueva`, async ({ page, context }) => {
        const espera = diferida(); let enviada = false;
        await preparar(context, async (r, p) => {
            if (p !== '/api/prueba-panel' && p !== '/api/auth/login') return false;
            enviada = true; expect(r.request().headers().authorization).toBe(tipo === 'login-invitado' ? undefined : 'Bearer token-anterior');
            await espera.promesa;
            await r.fulfill({ status: tipo === '401' ? 401 : 200, json: tipo === '401'
                ? { success: false, mensaje: 'El token ha expirado' }
                : { success: true, sesiones_revocadas: tipo === 'revocada', token: 'token-anterior', data: admin } });
            return true;
        });
        await page.goto('/catalogo');
        await page.evaluate(async ({ admin, tipo }) => {
            if (tipo !== 'login-invitado') {
                localStorage.setItem('token', 'token-anterior'); localStorage.setItem('usuario', JSON.stringify(admin));
            }
            const { default: client } = await import('/src/lib/api/client.js');
            window.resultadoPanel = null;
            const solicitud = tipo.startsWith('login') ? client.post('/auth/login', {}) : client.get('/prueba-panel');
            solicitud.then(res => {
                localStorage.setItem('usuario', JSON.stringify(res.data));
                window.resultadoPanel = { consumida: true };
            }).catch(e => { window.resultadoPanel = { nombre: e.name }; });
        }, { admin, tipo });
        await expect.poll(() => enviada).toBe(true);
        const otra = await context.newPage(); await otra.goto('/catalogo');
        await otra.evaluate(u => {
            localStorage.setItem('token', 'token-nuevo'); localStorage.setItem('usuario', JSON.stringify(u));
        }, { ...admin, id_usuario: 2, nombre: 'Admin B' });
        espera.resolver();
        await expect.poll(() => page.evaluate(() => window.resultadoPanel)).toEqual({ nombre: 'SesionCambiada' });
        expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('token-nuevo');
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('usuario')).id_usuario)).toBe(2);
        await expect(page).toHaveURL(/\/catalogo$/);
    });
}

test('panel: una edición de perfil de la misma identidad no invalida la respuesta', async ({ page, context }) => {
    await preparar(context, async (r, p) => {
        if (p !== '/api/prueba-panel') return false;
        await responder(r, { resultado: 'vigente' }); return true;
    });
    await page.goto('/catalogo');
    const resultado = await page.evaluate(async u => {
        localStorage.setItem('token', 'token-vigente'); localStorage.setItem('usuario', JSON.stringify(u));
        const { default: client } = await import('/src/lib/api/client.js');
        const solicitud = client.get('/prueba-panel');
        localStorage.setItem('usuario', JSON.stringify({ ...u, nombre: 'Nombre corregido' }));
        return solicitud;
    }, admin);
    expect(resultado.data.resultado).toBe('vigente');
});

for (const tipo of ['401', 'revocada']) {
    test(`panel: respuesta ${tipo} de la sesión vigente sí revoca y conserva al cliente`, async ({ page, context }) => {
        await preparar(context, async (r, p) => {
            if (p !== '/api/prueba-panel') return false;
            await r.fulfill({ status: tipo === '401' ? 401 : 200, json: tipo === '401'
                ? { success: false, mensaje: 'El token ha expirado' } : { success: true, sesiones_revocadas: true, data: admin } });
            return true;
        });
        await page.goto('/catalogo');
        await page.evaluate(async ({ admin, cliente }) => {
            localStorage.setItem('token', 'token-vigente'); localStorage.setItem('usuario', JSON.stringify(admin));
            localStorage.setItem('libreria-web-cliente-v1', JSON.stringify({ usuario: cliente, token: 'cliente-a', generacion: 'a' }));
            const { default: client } = await import('/src/lib/api/client.js');
            void client.get('/prueba-panel').catch(() => {});
        }, { admin, cliente });
        await page.waitForURL('**/admin/login');
        expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('libreria-web-cliente-v1')).token)).toBe('cliente-a');
    });
}

test('panel: 401 de contraseña incorrecta conserva la sesión vigente', async ({ page, context }) => {
    await preparar(context, async (r, p) => {
        if (p !== '/api/usuarios/password') return false;
        await r.fulfill({ status: 401, json: { success: false, mensaje: 'Contraseña actual incorrecta' } }); return true;
    });
    await page.goto('/catalogo');
    const estado = await page.evaluate(async u => {
        localStorage.setItem('token', 'token-vigente'); localStorage.setItem('usuario', JSON.stringify(u));
        const { default: client } = await import('/src/lib/api/client.js');
        try { await client.put('/usuarios/password', {}); } catch (e) { return { status: e.response?.status, token: localStorage.getItem('token') }; }
    }, admin);
    expect(estado).toEqual({ status: 401, token: 'token-vigente' });
});

for (const status of [201, 422]) {
    test(`compra: cuerpo ${status} incompleto agota timeout, libera Web Lock y conserva el intento`, async ({ page, context }) => {
        await preparar(context); await sembrarCliente(page); await page.clock.install();
        await page.evaluate(async status => {
            const { leerIntento, conExclusionCliente, enviarIntento } = await import('/src/public-site/tienda/persistenciaCompra.js');
            const { CLAVE_CLIENTE, leer } = await import('/src/public-site/tienda/clienteApi.js');
            const sesion = leer(CLAVE_CLIENTE);
            const intento = { id_usuario: 7, cuerpo: { idempotencia_clave: 'timeout-misma-clave', items: [{ id_libro: 1, cantidad: 1 }] } };
            const original = window.fetch;
            window.fetch = async (_url, opciones) => new Response(new ReadableStream({ start(c) {
                c.enqueue(new TextEncoder().encode('{"success":'));
                opciones.signal.addEventListener('abort', () => c.error(new DOMException('Abortado', 'AbortError')), { once: true });
            } }), { status, headers: { 'Content-Type': 'application/json' } });
            window.resultadoTimeout = null; window.segundoBloqueo = false;
            void conExclusionCliente(7, () => enviarIntento(intento, sesion)).catch(e => {
                window.resultadoTimeout = { nombre: e.name, intento: leerIntento(7) }; window.fetch = original;
            });
            void conExclusionCliente(7, () => { window.segundoBloqueo = true; });
        }, status);
        await expect.poll(() => page.evaluate(async () => (await navigator.locks.query()).held.map(l => l.name))).toContain('libreria-web-operacion-7');
        expect(await page.evaluate(() => window.segundoBloqueo)).toBe(false);
        await page.clock.fastForward(120001);
        await expect.poll(() => page.evaluate(() => window.resultadoTimeout?.nombre)).toBe('TimeoutError');
        await expect.poll(() => page.evaluate(() => window.segundoBloqueo)).toBe(true);
        expect(await page.evaluate(() => window.resultadoTimeout.intento.cuerpo.idempotencia_clave)).toBe('timeout-misma-clave');
        expect(await page.evaluate(() => window.resultadoTimeout.intento.orden)).toBeUndefined();
        const recuperado = await page.evaluate(async () => {
            const { leerIntento, conExclusionCliente, enviarIntento } = await import('/src/public-site/tienda/persistenciaCompra.js');
            const { CLAVE_CLIENTE, leer } = await import('/src/public-site/tienda/clienteApi.js');
            const original = window.fetch;
            window.fetch = async () => new Response(JSON.stringify({ success: true, data: { id_venta: 51, total: 25 } }));
            try { return await conExclusionCliente(7, () => enviarIntento(leerIntento(7), leer(CLAVE_CLIENTE))); }
            finally { window.fetch = original; }
        });
        expect(recuperado.envios).toBe(2); expect(recuperado.orden.id_venta).toBe(51);
        expect(recuperado.cuerpo.idempotencia_clave).toBe('timeout-misma-clave');
    });
}

test('Mis compras: una lista antigua no sustituye una respuesta pagada más reciente', async ({ page, context }) => {
    const espera = diferida(); let consultas = 0;
    await preparar(context, async (r, p) => {
        if (p !== '/api/ventas/mis-ventas') return false;
        consultas++; if (consultas === 1) { await espera.promesa; await responder(r, [venta]); }
        else await responder(r, [{ ...venta, estado: 'pagada' }]);
        return true;
    });
    await sembrarCliente(page); await page.goto('/mis-compras');
    await expect.poll(() => consultas).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.locator('.compra-estado')).toHaveText('Pagada');
    const respuesta = page.waitForResponse(r => r.url().endsWith('/ventas/mis-ventas'));
    espera.resolver(); await respuesta;
    await expect(page.locator('.compra-estado')).toHaveText('Pagada');
    await expect(page.getByRole('button', { name: 'Continuar pago de compra #51' })).toHaveCount(0);
});

for (const fallo of [false, true]) {
    test(`Mis compras: verificar pago invalida la carga anterior (${fallo ? 'error' : 'pendiente'})`, async ({ page, context }) => {
        const espera = diferida(); let consultas = 0;
        await preparar(context, async (r, p) => {
            if (p === '/api/pagos/ref-51') { await responder(r, { status: 'APPROVED' }); return true; }
            if (p !== '/api/ventas/mis-ventas') return false;
            consultas++;
            if (consultas === 2) { await espera.promesa; await r.fulfill({ status: fallo ? 503 : 200,
                json: fallo ? { success: false, mensaje: 'Error antiguo' } : { success: true, data: [venta] } }); }
            else await responder(r, [{ ...venta, estado: consultas >= 3 ? 'pagada' : 'pendiente' }]);
            return true;
        });
        await sembrarCliente(page); await page.goto('/mis-compras');
        await expect(page.locator('.compra-estado')).toHaveText('Pendiente de pago');
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await expect.poll(() => consultas).toBe(2);
        await page.getByRole('button', { name: 'Verificar pago de compra #51' }).click();
        await expect(page.locator('.compra-estado')).toHaveText('Pagada');
        const respuesta = page.waitForResponse(r => r.url().endsWith('/ventas/mis-ventas'));
        espera.resolver(); await respuesta;
        await expect(page.locator('.compra-estado')).toHaveText('Pagada');
        await expect(page.getByText('Error antiguo', { exact: true })).toHaveCount(0);
        await expect(page.getByText('Consultamos el estado del pago con el servidor.', { exact: true })).toBeVisible();
    });
}

test('Mis compras: una respuesta después de desmontar no confirma ni descuenta el carrito', async ({ page, context }) => {
    const espera = diferida(); let consultada = false;
    await preparar(context, async (r, p) => {
        if (p === '/api/ventas/51') { await responder(r, venta); return true; }
        if (p !== '/api/ventas/mis-ventas') return false;
        consultada = true; await espera.promesa; await responder(r, [{ ...venta, estado: 'pagada' }]); return true;
    });
    await sembrarCliente(page, true); await page.goto('/mis-compras');
    await expect.poll(() => consultada).toBe(true);
    await page.getByRole('link', { name: 'Catálogo', exact: true }).first().click();
    await expect(page).toHaveURL(/\/catalogo$/);
    await expect(page.getByRole('heading', { name: 'Catálogo', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mis compras', exact: true })).toHaveCount(0);
    const respuesta = page.waitForResponse(r => r.url().endsWith('/ventas/mis-ventas'));
    espera.resolver(); await respuesta;
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('libreria-web-intento-7')).orden.id_venta)).toBe(51);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('libreria-web-carrito-7')).confirmadas)).toEqual([]);
});

test('Mis compras: verificación tardía de A no actualiza la cuenta B ni inicia otra carga de A', async ({ page, context }) => {
    const espera = diferida(); let verificando = false; let cargasA = 0;
    await preparar(context, async (r, p) => {
        if (p === '/api/pagos/ref-51') { verificando = true; await espera.promesa; await responder(r, { status: 'APPROVED' }); return true; }
        if (p !== '/api/ventas/mis-ventas') return false;
        const esB = r.request().headers().authorization === 'Bearer cliente-b';
        if (!esB) cargasA++;
        await responder(r, esB ? [{ ...venta, id_usuario: 8, id_venta: 52 }] : [venta]); return true;
    });
    await sembrarCliente(page); await page.goto('/mis-compras');
    await page.getByRole('button', { name: 'Verificar pago de compra #51' }).click();
    await expect.poll(() => verificando).toBe(true);
    const otra = await context.newPage(); await otra.goto('/catalogo');
    await otra.evaluate(u => localStorage.setItem('libreria-web-cliente-v1', JSON.stringify({ usuario: u, token: 'cliente-b', generacion: 'b' })), otraCuenta);
    await expect(page.getByRole('heading', { name: 'Compra #52', exact: true })).toBeVisible();
    const antes = cargasA;
    const respuesta = page.waitForResponse(r => r.url().endsWith('/pagos/ref-51'));
    espera.resolver(); await respuesta;
    await expect(page.getByRole('heading', { name: 'Compra #51', exact: true })).toHaveCount(0);
    await expect(page.getByText('Consultamos el estado del pago con el servidor.', { exact: true })).toHaveCount(0);
    expect(cargasA).toBe(antes);
});
