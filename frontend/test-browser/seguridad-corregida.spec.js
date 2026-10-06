import { test, expect } from '@playwright/test';

const imagen = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const libros = Array.from({ length: 20 }, (_, i) => ({ id_libro: i + 1,
    titulo: i % 2 ? `Título ${i + 1} con palabras adicionales para comprobar la alineación de la tarjeta` : `Libro ${i + 1}`,
    autor: 'Autor de prueba', categoria: 'Novela', precio: 100, precio_final: i < 8 ? 80 : 100,
    descuento_vigente: i < 8 ? 1 : 0, descuento_porcentaje_efectivo: i < 8 ? 20 : 0,
    es_nuevo: 1, mas_vendido: i >= 8 ? 1 : 0, stock: 5, estado: 1, portada: imagen }));
async function preparar(page) {
    await page.route('http://127.0.0.1:59999/api/**', route => {
        const pathname = new URL(route.request().url()).pathname;
        return route.fulfill({ json: pathname === '/api/libros' ? { success: true, data: libros }
            : pathname === '/api/anuncios' ? { success: true, anuncio: null } : { success: true, data: [] } });
    });
}
test('ofertas: sin botón de pausa; al pasar el mouse se detiene y restaura scroll-snap', async ({ page }) => {
    await preparar(page); await page.goto('/');
    await page.locator('.oferta-tarjeta').first().waitFor();
    const pista = page.locator('#ofertas-lista');
    await pista.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
    await page.waitForFunction(() => document.getElementById('ofertas-lista')?.style.scrollSnapType === 'none');
    await pista.hover();
    await expect(pista).toHaveCSS('scroll-snap-type', 'x mandatory');
    await expect(page.getByRole('button', { name: /Pausar|Reanudar/ })).toHaveCount(0);
    const antes = await pista.evaluate(e => e.scrollLeft);
    await page.waitForTimeout(3000);
    expect(await pista.evaluate(e => e.scrollLeft)).toBeCloseTo(antes, 0);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://libreria.my/');
});
test('ofertas y estantes móviles mantienen alturas iguales, sin botones de pausa', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1000 }); await preparar(page); await page.goto('/');
    await page.locator('.oferta-tarjeta').first().waitFor();
    const alturas = await page.locator('.oferta-tarjeta').evaluateAll(list => list.map(e => e.getBoundingClientRect().height));
    expect(Math.max(...alturas) - Math.min(...alturas)).toBeLessThanOrEqual(1);
    await page.goto('/catalogo');
    await expect(page.getByRole('heading', { name: 'En descuento', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Pausar|Reanudar/ })).toHaveCount(0);
    const estante = page.locator('.catalogo-estante').filter({ has: page.getByRole('heading', { name: 'En descuento', exact: true }) });
    const medidas = await estante.locator('.tarjeta-libro').evaluateAll(list => list.map(e => e.getBoundingClientRect().height));
    // Los estantes del catálogo no avanzan solos.
    const lista = estante.locator('.rejilla-libros');
    const inicio = await lista.evaluate(e => e.scrollLeft);
    await page.waitForTimeout(3500);
    expect(await lista.evaluate(e => e.scrollLeft)).toBe(inicio);
    expect(Math.max(...medidas) - Math.min(...medidas)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('estantes-390.png'), fullPage: true });
});
