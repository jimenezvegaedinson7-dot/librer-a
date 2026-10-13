import { test, expect } from '@playwright/test';

const admin = { id_usuario: 1, nombre: 'Admin', rol: 'administrador', estado: 1 };
for (const width of [390, 1440]) {
    test(`reservas eliminadas ${width}px: sin menú, contadores, notificaciones ni consultas`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript(usuario => {
            localStorage.setItem('token', 'audit-admin');
            localStorage.setItem('usuario', JSON.stringify(usuario));
        }, admin);
        const consultas = [];
        await page.route('http://127.0.0.1:59999/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            consultas.push(path);
            const data = path === '/api/usuarios/perfil' ? admin
                : path === '/api/reportes/resumen' ? { total_libros: 0, total_ventas: 0, total_vendido: 0, total_reservas: 999, libros_stock_bajo: 0 }
                : path === '/api/reportes/indicadores-ventas' ? { vendido_hoy: 0, total_vendido: 0 }
                : [];
            return route.fulfill({ json: { success: true, data } });
        });
        await page.goto('/reservas');
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(page.getByRole('heading', { name: 'Resumen', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: /Reservas/i })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: /Reservas/i })).toHaveCount(0);
        await expect(page.getByText('999', { exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: /Notificaciones/i }).click();
        const panel = page.getByRole('dialog', { name: 'Notificaciones' });
        await expect(panel).toBeVisible();
        await expect(panel.getByRole('tab', { name: /Reservas/i })).toHaveCount(0);
        await expect(panel).not.toContainText(/reservas/i);
        expect(consultas.some(path => /reservas/.test(path))).toBe(false);
    });
}

test('la presentación pública no ofrece reservas ni su historial', async ({ page }) => {
    await page.route('http://127.0.0.1:59999/api/**', route => route.fulfill({ json: { success: true, data: [] } }));
    for (const ruta of ['/aplicacion', '/caracteristicas', '/descargar']) {
        await page.goto(ruta);
        expect(new URL(page.url()).pathname).toBe(ruta);
        await expect(page.locator('main h1').first()).toBeVisible();
        await expect(page.locator('main').getByText(/reservas anteriores|historial de reservas|reservar libros/i)).toHaveCount(0);
        await expect(page.locator('img[alt*="Reservar"]')).toHaveCount(0);
    }
});
