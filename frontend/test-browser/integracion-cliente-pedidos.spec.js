import { test, expect } from '@playwright/test';
const API = 'http://127.0.0.1:59999/api';
const cliente = { id_usuario: 7, nombre: 'Cliente', apellido: 'Prueba', email: 'cliente@example.invalid', telefono: '900000000', rol: 'cliente', estado: 1 };
const admin = { id_usuario: 1, nombre: 'Admin', apellido: 'Prueba', rol: 'administrador', estado: 1 };
const compra = { id_venta: 11, id_usuario: 7, estado: 'pagada', tipo_entrega: 'domicilio', direccion: 'Dirección de prueba en Pallasca', cliente_documento: '01234567', cliente_tipo_documento: 'DNI' };
async function clienteLocal(page) {
    await page.addInitScript(({ cliente, admin }) => {
        localStorage.setItem('libreria-web-cliente-v1', JSON.stringify({ token: 'token-cliente', usuario: cliente, generacion: 'local-7' }));
        localStorage.setItem('token', 'token-admin'); localStorage.setItem('usuario', JSON.stringify(admin));
    }, { cliente, admin });
}
for (const width of [390, 1440]) {
    test(`reclamaciones ${width}px: perfil y última compra propios, edición y envío sin credencial administrativa`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 1000 });
        await clienteLocal(page);
        let enviada;
        await page.route(`${API}/**`, route => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/api/usuarios/perfil' || path === '/api/ventas/mis-ventas') {
                expect(route.request().headers().authorization).toBe('Bearer token-cliente');
                return route.fulfill({ json: { success: true, data: path.includes('/usuarios/') ? cliente : [compra] } });
            }
            if (path === '/api/reclamaciones') {
                enviada = route.request().postDataJSON(); expect(route.request().headers().authorization).toBeUndefined();
                return route.fulfill({ status: 201, json: { success: true, mensaje: 'Hoja registrada', data: { numero: 'LOCAL-1' } } });
            }
            return route.fulfill({ json: { success: true, data: [] } });
        });
        await page.goto('/libro-de-reclamaciones');
        await expect(page.locator('[name="consumidor_nombre"]')).toHaveValue('Cliente Prueba');
        await expect(page.locator('[name="consumidor_email"]')).toHaveValue(cliente.email);
        await expect(page.locator('[name="consumidor_telefono"]')).toHaveValue(cliente.telefono);
        await expect(page.locator('[name="consumidor_documento"]')).toHaveValue('01234567');
        await expect(page.locator('[name="consumidor_domicilio"]')).toHaveValue(compra.direccion);
        await page.locator('[name="consumidor_telefono"]').fill('911111111');
        await page.locator('[name="bien_descripcion"]').fill('Libro de prueba');
        await page.locator('[name="detalle"]').fill('Detalle de una reclamación de prueba');
        await page.locator('[name="pedido"]').fill('Solicito revisar mi compra');
        await page.getByRole('checkbox', { name: /Declaro que los datos/ }).check();
        await page.screenshot({ path: info.outputPath('reclamaciones-autocompletadas.png'), fullPage: true });
        await page.getByRole('button', { name: 'Registrar hoja', exact: true }).click();
        await expect(page.getByText('Hoja N.° LOCAL-1')).toBeVisible();
        expect(enviada).toMatchObject({ consumidor_nombre: 'Cliente Prueba', consumidor_telefono: '911111111', consumidor_email: cliente.email });
    });
}
test('reclamaciones: un perfil tardío no pisa datos editados; visitante sigue pudiendo registrar', async ({ page }) => {
    await clienteLocal(page);
    let liberar;
    const espera = new Promise(resolve => { liberar = resolve; });
    await page.route(`${API}/**`, async route => {
        if (new URL(route.request().url()).pathname === '/api/usuarios/perfil') { await espera; return route.fulfill({ json: { success: true, data: cliente } }); }
        return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/libro-de-reclamaciones');
    await page.locator('[name="consumidor_nombre"]').fill('Nombre corregido');
    liberar();
    await expect(page.locator('[name="consumidor_email"]')).toHaveValue(cliente.email);
    await expect(page.locator('[name="consumidor_nombre"]')).toHaveValue('Nombre corregido');
    await page.evaluate(() => { localStorage.removeItem('libreria-web-cliente-v1'); window.dispatchEvent(new Event('focus')); });
    await expect(page.locator('[name="consumidor_nombre"]')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Registrar hoja', exact: true })).toBeEnabled();
});
test('recuperación web: primero verifica código y después pide la nueva contraseña', async ({ page }) => {
    const llamadas = [];
    await page.route(`${API}/**`, route => {
        const path = new URL(route.request().url()).pathname;
        if (path.startsWith('/api/auth/')) {
            llamadas.push({ path, body: route.request().postDataJSON() });
            return route.fulfill({ json: { success: true, mensaje: 'Solicitud correcta', ...(path.endsWith('/verificar-reseteo') ? { reset_token: 'permiso-local' } : {}) } });
        }
        return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/cuenta');
    await page.getByRole('button', { name: 'Olvidé mi contraseña' }).click();
    await page.getByLabel('Correo electrónico', { exact: true }).fill(cliente.email);
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(page.getByLabel('Código de seis dígitos')).toBeVisible();
    await expect(page.getByLabel('Confirmar contraseña', { exact: true })).toHaveCount(0);
    await page.getByLabel('Código de seis dígitos').fill('123456');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(page.getByLabel('Código de seis dígitos')).toHaveCount(0);
    await page.getByLabel('Contraseña', { exact: true }).fill('NuevaClave123');
    await page.getByLabel('Confirmar contraseña', { exact: true }).fill('NuevaClave123');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    expect(llamadas.map(x => x.path)).toEqual(['/api/auth/solicitar-reseteo', '/api/auth/verificar-reseteo', '/api/auth/reestablecer-contrasena']);
    expect(llamadas[2].body).toEqual({ email: cliente.email, reset_token: 'permiso-local', password: 'NuevaClave123' });
});
for (const width of [390, 1440]) {
    test(`pedidos ${width}px: dos acciones claras, pago confirmado y entrega sincronizada`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript(u => { localStorage.setItem('token', 'token-admin'); localStorage.setItem('usuario', JSON.stringify(u)); }, admin);
        const pedidos = [
            { ...compra, origen: 'app', external_reference: 'ref-11', estado_entrega: 'pendiente', tipo_entrega: 'tienda', total: 30, nombre_usuario: 'Cliente', apellido_usuario: 'Prueba' },
            { ...compra, id_venta: 12, origen: 'app', external_reference: 'ref-12', estado_entrega: 'pendiente', estado: 'pendiente', total: 40 },
        ];
        const cambios = [];
        await page.route(`${API}/**`, route => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/api/usuarios/perfil') return route.fulfill({ json: { success: true, data: admin } });
            if (path.startsWith('/api/pedidos/')) {
                const pedido = pedidos.find(p => p.id_venta === Number(path.split('/')[3]));
                if (route.request().method() === 'PUT') {
                    const body = route.request().postDataJSON(); cambios.push(body); pedido.estado_entrega = body.estado;
                    if (body.estado === 'entregado') pedido.estado = 'entregada';
                }
                return route.fulfill({ json: { success: true, data: pedido } });
            }
            return route.fulfill({ json: { success: true, data: path === '/api/pedidos' ? pedidos : [] } });
        });
        await page.goto('/pedidos');
        // Recojo en tienda: preparar → listo para recoger (avisa) → entregar.
        await expect(page.getByRole('button', { name: 'Empezar preparación', exact: true })).toHaveCount(1);
        await expect(page.getByText('Esperando pago', { exact: true })).toBeVisible();
        await page.screenshot({ path: info.outputPath('pedidos-simplificados.png'), fullPage: true });
        await page.getByRole('button', { name: 'Empezar preparación', exact: true }).click();
        await page.getByRole('button', { name: 'Listo para recoger', exact: true }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Sí, avisar al cliente', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Entregar al cliente', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Despachar pedido', exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: 'Entregar al cliente', exact: true }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Sí, el cliente lo recogió', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Entregar al cliente', exact: true })).toHaveCount(0);
        expect(cambios).toEqual([{ estado: 'preparando' }, { estado: 'listo_recojo' }, { estado: 'entregado' }]);
        expect(pedidos[0]).toMatchObject({ total: 30, estado: 'entregada', estado_entrega: 'entregado' });
        expect(pedidos[1].estado_entrega).toBe('pendiente');
    });
}
