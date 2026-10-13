import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const admin = { id_usuario: 1, nombre: 'Admin', apellido: 'Prueba', rol: 'administrador', estado: 1 };
const cliente = { id_usuario: 7, nombre: 'Cliente', apellido: 'Prueba', rol: 'cliente', estado: 1 };
for (const width of [390, 1440]) {
    test(`cancelación ${width}px: panel y comprador muestran el mismo resultado sin promesas de devolución falsa`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript(u => {
            localStorage.setItem('token', 'token-admin');
            localStorage.setItem('usuario', JSON.stringify(u));
        }, admin);
        const pedidos = [
            { id_venta: 51, estado: 'pagada', estado_entrega: 'listo_recojo', tipo_entrega: 'tienda' },
            { id_venta: 52, estado: 'pendiente', estado_entrega: 'pendiente', tipo_entrega: 'domicilio' },
        ].map(p => ({ ...p, id_usuario: 7, origen: 'app', canal_compra: 'web', external_reference: `ref-${p.id_venta}`, total: 25,
            nombre_usuario: 'Cliente', apellido_usuario: 'Prueba', detalle: [{ id_libro: 1, titulo: 'Libro de prueba', cantidad: 1, subtotal: 25 }] }));
        const cambios = [];
        await page.route(`${API}/**`, route => {
            const req = route.request(), path = new URL(req.url()).pathname;
            if (path === '/api/usuarios/perfil') return route.fulfill({ json: { success: true, data: req.headers().authorization === 'Bearer token-cliente' ? cliente : admin } });
            if (path.startsWith('/api/pedidos/')) {
                const pedido = pedidos.find(p => p.id_venta === Number(path.split('/')[3]));
                if (req.method() === 'PUT') {
                    cambios.push(pedido.id_venta);
                    pedido.estado_entrega = 'cancelado';
                    if (pedido.estado === 'pendiente') pedido.estado = 'cancelada';
                }
                return route.fulfill({ json: { success: true, data: pedido } });
            }
            if (path === '/api/pedidos' || path === '/api/ventas/mis-ventas') return route.fulfill({ json: { success: true, data: pedidos } });
            if (path === '/api/libros') return route.fulfill({ json: { success: true, data: [{ id_libro: 1, titulo: 'Libro de prueba', precio: 25, stock: 5, estado: 1 }] } });
            return route.fulfill({ json: { success: true, data: [] } });
        });
        await page.goto('/pedidos');
        const fila = id => page.locator('.data-table-shell tbody tr').filter({ hasText: `#${id}` });
        await fila(52).getByRole('button', { name: 'Cancelar pedido', exact: true }).click();
        await expect(page.getByRole('dialog')).toContainText('su enlace de pago se cerrará');
        await page.getByRole('dialog').getByRole('button', { name: 'Sí, cancelar', exact: true }).click();
        await expect(fila(52)).toContainText('Cancelada');
        await expect(fila(52)).not.toContainText('Esperando pago');
        await fila(51).getByRole('button', { name: 'No lo recogió', exact: true }).click();
        await expect(page.getByRole('dialog')).toContainText('no devuelve dinero ni libera existencias');
        await expect(page.getByRole('dialog')).not.toContainText('los libros vuelven a estar disponibles');
        await page.getByRole('dialog').getByRole('button', { name: 'Sí, cancelar', exact: true }).click();
        await expect(fila(51)).toContainText('Confirmado · PayU');
        await expect(fila(51)).toContainText('Pedido cancelado');
        expect(cambios).toEqual([52, 51]);
        await page.evaluate(u => {
            localStorage.setItem('libreria-web-cliente-v1', JSON.stringify({ token: 'token-cliente', usuario: u, generacion: 'cliente-7' }));
            localStorage.setItem('libreria-web-carrito-7', JSON.stringify({ items: [{ id_libro: 1, cantidad: 1 }], confirmadas: [] }));
            localStorage.setItem('libreria-web-intento-7', JSON.stringify({ id_usuario: 7, cuerpo: { idempotencia_clave: 'intento-cancelado', items: [{ id_libro: 1, cantidad: 1 }] }, orden: { id_venta: 52 } }));
        }, cliente);
        await page.goto('/mis-compras');
        const compra = id => page.locator('.compra-registro').filter({ has: page.getByRole('heading', { name: `Compra #${id}`, exact: true }) });
        await expect(compra(52).locator('.compra-estado')).toHaveText('Cancelada');
        await expect(compra(52)).not.toContainText('Continuar el pago');
        await expect(compra(51).locator('.compra-estado')).toHaveText('Pagada');
        await expect(compra(51)).toContainText('Pedido cancelado');
        await expect.poll(() => page.evaluate(() => localStorage.getItem('libreria-web-intento-7'))).toBe(null);
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('libreria-web-carrito-7')).items[0].cantidad)).toBe(1);
    });
}
