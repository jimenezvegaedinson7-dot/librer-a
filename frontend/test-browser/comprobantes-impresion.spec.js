import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const admin = { id_usuario: 1, nombre: 'Admin', rol: 'administrador', estado: 1 };
const empresa = {
    ruc: '20123456789',
    razon_social: 'Empresa de prueba',
    nombre_comercial: 'Librería de prueba',
    direccion: 'Dirección de prueba',
    aplica_igv: 1,
    tasa_igv: 18,
    libros_exonerados: 0,
    exoneracion_libros_hasta: '2026-10-17'
};
const base = {
    id_comprobante: 11,
    id_venta: 51,
    tipo: 'boleta',
    serie: 'B001',
    numero: 125,
    estado: 'emitido',
    cliente_nombre: 'Ana Lectora',
    cliente_tipo_documento: 'DNI',
    cliente_dni_ruc: '12345678',
    total: 118,
    subtotal: 100,
    igv: 18,
    op_gravada: 100,
    op_exonerada: 0,
    fecha_emision: '2026-11-01T14:00:00Z',
    numero_sunat: 'EB01-125',
    nota_credito_sunat: 'BC01-2',
    detalle: [{ id_detalle: 1, id_libro: 1, titulo: 'Libro de prueba', cantidad: 1, precio_unitario: 118, subtotal: 118, descuento: 0 }]
};

async function preparar(page, { lineas = 1, falloDetalle = false } = {}) {
    const control = { lecturas: [], escrituras: [], errores: [], anulados: new Set() };
    page.on('pageerror', (e) => control.errores.push(e.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((u) => {
        localStorage.setItem('token', 'token-prueba');
        localStorage.setItem('usuario', JSON.stringify(u));
        window.__impresiones = 0;
        window.print = () => {
            window.__impresiones++;
        };
    }, admin);
    await page.route(`${API}/**`, (route) => {
        const req = route.request(),
            p = new URL(req.url()).pathname;
        if (req.method() !== 'GET') {
            control.escrituras.push({ ruta: p, cuerpo: req.postDataJSON() });
            if (p === '/api/empresa') return route.fulfill({ json: { success: true, empresa: { ...empresa, ...req.postDataJSON() } } });
            if (/^\/api\/comprobantes\/\d+\/anular$/.test(p)) {
                control.anulados.add(Number(p.split('/')[3]));
                return route.fulfill({ json: { success: true, comprobante: { ...base, estado: 'anulado' } } });
            }
            return route.abort();
        }
        control.lecturas.push(p);
        if (p.endsWith('/usuarios/perfil')) return route.fulfill({ json: { success: true, data: admin } });
        if (p === '/api/empresa') return route.fulfill({ json: { success: true, empresa } });
        if (p === '/api/comprobantes/resumen') return route.fulfill({ json: { success: true, boletas: 10, facturas: 0, ingresos: 1180 } });
        if (p === '/api/comprobantes')
            return route.fulfill({
                json: {
                    success: true,
                    comprobantes: Array.from({ length: 10 }, (_, i) => ({
                        ...base,
                        id_comprobante: 11 + i,
                        numero: 125 + i,
                        estado: control.anulados.has(11 + i) ? 'anulado' : 'emitido'
                    })),
                    total: 10,
                    paginas: 1
                }
            });
        if (/^\/api\/comprobantes\/\d+$/.test(p)) {
            if (falloDetalle) return route.fulfill({ status: 503, json: { mensaje: 'Comprobante temporalmente no disponible' } });
            const id = Number(p.split('/').at(-1));
            return route.fulfill({
                json: {
                    success: true,
                    comprobante: {
                        ...base,
                        id_comprobante: id,
                        numero: 125 + id - 11,
                        detalle: Array.from({ length: lineas }, (_, i) => ({ ...base.detalle[0], id_detalle: i + 1, titulo: `Libro de prueba ${i + 1}` }))
                    }
                }
            });
        }
        if (p === '/api/pagos') return route.fulfill({ json: { success: true, pagos: [], total: 0, paginas: 1 } });
        return route.fulfill({ json: { success: true, data: [] } });
    });
    return control;
}

function numeroPaginas(pdf) {
    const paginas = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || [];
    expect(paginas.length).toBeGreaterThan(0);
    return paginas.length;
}

test('boleta corta: una orden de impresión y una sola página aunque el listado sea largo', async ({ page }, info) => {
    await preparar(page);
    await page.goto('/ventas/comprobantes');
    await page.getByRole('button', { name: 'Imprimir comprobante', exact: true }).first().click();
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(1);
    await expect(page.locator('.documento-impresion')).toContainText('B001-00000125');
    await expect(page.locator('.documento-impresion')).not.toContainText(/IGV|Op\. Gravada|SUNAT/);
    await expect(page.locator('.documento-impresion')).toContainText('S/ 118.00');
    const pdf = await page.pdf({ path: info.outputPath('boleta.pdf'), format: 'A4', printBackground: true });
    expect(numeroPaginas(pdf)).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(page.locator('.documento-impresion')).toHaveCount(0);
});

test('impresión manual: doble clic y temporizador automático no generan dos órdenes', async ({ page }) => {
    await preparar(page);
    await page.goto('/ventas/comprobantes');
    await page.getByRole('button', { name: 'Ver comprobante', exact: true }).first().click();
    const boton = page.getByRole('dialog').getByRole('button', { name: 'Imprimir', exact: true });
    await expect(boton).toBeEnabled();
    await boton.evaluate((el) => {
        el.click();
        el.click();
    });
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(page.locator('.documento-impresion')).toHaveCount(0);
    await expect(boton).toBeEnabled();
    await boton.click();
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(2);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).last().click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Imprimir comprobante', exact: true }).nth(1).click();
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(3);
    await expect(page.locator('.documento-impresion')).toContainText('B001-00000126');
    await expect(page.locator('.documento-impresion')).not.toContainText('B001-00000125');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
});

test('impresión automática: una orden manual temprana consume la impresión pendiente', async ({ page }) => {
    await preparar(page);
    await page.goto('/ventas/comprobantes');
    await page.getByRole('button', { name: 'Imprimir comprobante', exact: true }).first().click();
    const boton = page.getByRole('dialog').getByRole('button', { name: 'Imprimir', exact: true });
    await expect(boton).toBeEnabled();
    await boton.evaluate((el) => el.click());
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => window.__impresiones)).toBe(1);
});

test('un fallo al consultar el comprobante no imprime una versión incompleta', async ({ page }) => {
    await preparar(page, { falloDetalle: true });
    await page.goto('/ventas/comprobantes');
    await page.getByRole('button', { name: 'Imprimir comprobante', exact: true }).first().click();
    await expect(page.getByRole('alert')).toContainText('Comprobante temporalmente no disponible');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Imprimir', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => window.__impresiones)).toBe(0);
});

test('un comprobante largo conserva sus líneas en varias páginas, sin forzarlo a una sola hoja', async ({ page }, info) => {
    await preparar(page, { lineas: 40 });
    await page.goto('/ventas/comprobantes');
    await page.getByRole('button', { name: 'Imprimir comprobante', exact: true }).first().click();
    await expect.poll(() => page.evaluate(() => window.__impresiones)).toBe(1);
    await expect(page.locator('.documento-impresion')).toContainText('Libro de prueba 40');
    const pdf = await page.pdf({ path: info.outputPath('boleta-larga.pdf'), format: 'A4', printBackground: true });
    expect(numeroPaginas(pdf)).toBeGreaterThan(1);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
});

for (const width of [390, 1440])
    test(`tributos ocultos ${width}px: empresa y comprobantes sin controles SUNAT ni IGV`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 1000 });
        const control = await preparar(page);
        await page.goto('/configuracion/empresa');
        await page.getByRole('button', { name: 'Editar datos', exact: true }).click();
        await expect(page.locator('main')).not.toContainText(/IGV|SUNAT|tributaria|Exonerados/);
        await page.getByLabel('Nombre comercial', { exact: true }).fill('Nombre actualizado');
        await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Editar datos', exact: true })).toBeVisible();
        expect(Object.keys(control.escrituras[0].cuerpo).sort()).toEqual(['direccion', 'nombre_comercial', 'razon_social', 'ruc']);
        await page.goto('/ventas/comprobantes');
        await page.getByRole('button', { name: 'Ver comprobante', exact: true }).first().click();
        await expect(page.locator('#boleta-documento')).toBeVisible();
        await expect(page.getByRole('dialog')).not.toContainText(/IGV|SUNAT|Op\. Gravada|Op\. Exonerada|Op\. Inafecta/);
        await expect(page.getByRole('dialog')).toContainText('S/ 118.00');
        expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.getByRole('dialog').screenshot({ path: info.outputPath(`comprobante-${width}.png`) });
        expect(control.errores).toEqual([]);
    });

test('anulación interna sigue disponible sin registrar números SUNAT', async ({ page }) => {
    const control = await preparar(page);
    await page.goto('/ventas/comprobantes');
    await page.getByRole('button', { name: 'Anular comprobante (datos errados)', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Anular comprobante', exact: true })).toBeVisible();
    const dialogo = page.getByRole('dialog', { name: 'Anular comprobante', exact: true });
    await expect(dialogo).not.toContainText('SUNAT');
    await dialogo.getByRole('textbox', { name: 'Motivo de la anulación', exact: true }).fill('Documento de cliente equivocado');
    await dialogo.getByRole('button', { name: 'Anular comprobante', exact: true }).click();
    await expect(dialogo).toHaveCount(0);
    expect(control.escrituras[0]).toEqual({ ruta: '/api/comprobantes/11/anular', cuerpo: { motivo: 'Documento de cliente equivocado' } });
});
