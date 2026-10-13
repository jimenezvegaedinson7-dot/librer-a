import { test, expect } from '@playwright/test';
const API = 'http://127.0.0.1:59999/api';
const admin = { id_usuario: 1, nombre: 'Admin', rol: 'administrador', estado: 1 };
async function preparar(page) {
    const control = { tarifa: 5, fallar: false, escrituras: [] };
    await page.addInitScript(u => { localStorage.setItem('token', 'token-admin'); localStorage.setItem('usuario', JSON.stringify(u)); }, admin);
    await page.route(`${API}/**`, async r => {
        const p = new URL(r.request().url()).pathname;
        if (p === '/api/usuarios/perfil') return r.fulfill({ json: { success: true, data: admin } });
        const cobertura = () => ({ id_zona: 1, nombre: 'Ciudad de Pallasca', tarifa: control.tarifa, estado: 1 });
        if (p === '/api/zonas-delivery/todos') return r.fulfill({ json: { success: true, data: [cobertura()] } });
        if (p === '/api/zonas-delivery/1' && r.request().method() === 'PUT') {
            const body = r.request().postDataJSON(); control.escrituras.push(body);
            if (control.fallar) return r.fulfill({ status: 500, json: { mensaje: 'No se pudo guardar la tarifa.' } });
            if (body.tarifa_anterior !== control.tarifa) return r.fulfill({ status: 409, json: { mensaje: 'La tarifa fue modificada por otro administrador. Actualiza el formulario antes de guardar.' } });
            control.tarifa = body.tarifa;
            return r.fulfill({ json: { success: true, data: cobertura() } });
        }
        return r.fulfill({ json: { success: true, data: [] } });
    });
    return control;
}
for (const width of [390, 1440]) test(`Tarifa ${width}px: edición, moneda, unidad de cobro y alcance técnico`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const c = await preparar(page);
    await page.goto('/tarifas-envio');
    await expect(page.getByRole('heading', { name: 'Configuración de entrega', exact: true })).toBeVisible();
    await expect(page.getByText('S/ 5.00 por pedido', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar tarifa', exact: true })).toBeDisabled();
    await page.getByLabel('Tarifa de delivery (S/)').fill('7.50');
    await expect(page.locator('main')).toContainText('PEN (soles)');
    await expect(page.locator('main')).toContainText('no recalcula pedidos existentes');
    await expect(page.locator('main')).toContainText('no genera cargos adicionales');
    await page.getByRole('button', { name: 'Guardar tarifa', exact: true }).click();
    await expect(page.getByText('S/ 7.50 por pedido', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Tarifa de delivery (S/)')).toHaveValue('7.50');
    await expect(page.getByRole('button', { name: 'Guardar tarifa', exact: true })).toBeDisabled();
    expect(c.escrituras).toEqual([{ tarifa: 7.5, tarifa_anterior: 5 }]);
    await expect(page.getByText('Gratis · S/ 0.00', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('tarifa-editable.png'), fullPage: true });
});
test('Tarifa: valores inválidos no escriben; fallo conserva borrador y permite reintentar', async ({ page }) => {
    const c = await preparar(page); await page.goto('/tarifas-envio');
    const campo = page.getByLabel('Tarifa de delivery (S/)'), guardar = page.getByRole('button', { name: 'Guardar tarifa', exact: true });
    await expect(campo).toHaveValue('5.00');
    for (const valor of ['0', '-1', '1.234', '100000000', '']) {
        await campo.fill(valor); await expect(guardar).toBeDisabled();
    }
    expect(c.escrituras).toEqual([]);
    await campo.fill('7.50'); c.fallar = true; await guardar.click();
    await expect(page.getByRole('alert')).toContainText('No se pudo guardar la tarifa');
    await expect(campo).toHaveValue('7.50');
    await expect(page.getByText('S/ 5.00 por pedido', { exact: true })).toBeVisible();
    c.fallar = false; await guardar.click();
    await expect(page.getByText('S/ 7.50 por pedido', { exact: true })).toBeVisible();
    expect(c.escrituras).toEqual([{ tarifa: 7.5, tarifa_anterior: 5 }, { tarifa: 7.5, tarifa_anterior: 5 }]);
});
test('Tarifa: conflicto requiere consultar el valor vigente antes de guardar', async ({ page }) => {
    const c = await preparar(page); await page.goto('/tarifas-envio');
    const campo = page.getByLabel('Tarifa de delivery (S/)');
    await expect(campo).toHaveValue('5.00'); await campo.fill('8.00');
    c.tarifa = 7;
    await page.getByRole('button', { name: 'Guardar tarifa', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('otro administrador');
    await expect(campo).toHaveValue('8.00');
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    await expect(campo).toHaveValue('7.00');
    await campo.fill('8.00'); await page.getByRole('button', { name: 'Guardar tarifa', exact: true }).click();
    await expect(page.getByText('S/ 8.00 por pedido', { exact: true })).toBeVisible();
    expect(c.escrituras).toEqual([{ tarifa: 8, tarifa_anterior: 5 }, { tarifa: 8, tarifa_anterior: 7 }]);
});
