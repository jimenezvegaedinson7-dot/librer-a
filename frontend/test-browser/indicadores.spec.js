import { test, expect } from '@playwright/test';

const admin = { id_usuario: 1, nombre: 'Audit', apellido: 'Admin', rol: 'administrador', estado: 1 };
const pagosResumen = { pagado: 9, pendiente: 2, cancelado: 5, ingresos: 883 };
const comprobantesResumen = { boletas: 8, facturas: 0, ingresos: 574, anulados: 0 };

async function preparar(page, { falloResumen = false, falloLista = false } = {}) {
    const control = { falloResumen, falloLista, escrituras: [], errores: [] };
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.setFixedTime(new Date('2026-10-06T17:00:00Z'));
    await page.addInitScript(usuario => {
        localStorage.setItem('token', 'audit-token');
        localStorage.setItem('usuario', JSON.stringify(usuario));
    }, admin);
    page.on('pageerror', error => control.errores.push(error.message));
    await page.route('http://127.0.0.1:59999/api/**', route => {
        const req = route.request();
        const url = new URL(req.url());
        const path = url.pathname;
        if (req.method() !== 'GET') {
            control.escrituras.push(path);
            return route.abort();
        }
        if (path.endsWith('/usuarios/perfil')) return route.fulfill({ json: { success: true, data: admin } });
        if (path === '/api/usuarios') return route.fulfill({ json: { success: true, data: [
            admin, { id_usuario: 2, nombre: 'Lector', apellido: 'Prueba', rol: 'cliente', estado: 1 },
        ] } });
        if (path === '/api/reportes/ventas-por-dia') return route.fulfill({ json: { success: true, data: [
            { fecha: '2026-10-05', total_vendido: 50, cantidad_ventas: 1 },
            { fecha: '2026-10-06', total_vendido: 100, cantidad_ventas: 2 },
        ] } });
        if (path === '/api/reclamaciones/resumen') return route.fulfill({ json: { success: true,
            data: { total: 0, pendientes: 0, vencidos: 0, por_vencer: 0 } } });
        if (path === '/api/zonas-delivery/todos') return route.fulfill({ json: { success: true, data: [
            { id_zona: 1, nombre: 'Zona A', tarifa: 6, estado: 1 },
            { id_zona: 2, nombre: 'Zona B', tarifa: 12, estado: 1 },
            { id_zona: 3, nombre: 'Zona C', tarifa: 18, estado: 1 },
            { id_zona: 4, nombre: 'Zona inactiva', tarifa: 99, estado: 0 },
        ] } });
        if (path === '/api/pagos/resumen' || path === '/api/comprobantes/resumen') {
            if (control.falloResumen) return route.fulfill({ status: 429, json: { mensaje: 'Demasiadas solicitudes' } });
            return route.fulfill({ json: { success: true, ...(path.includes('/pagos/') ? pagosResumen : comprobantesResumen) } });
        }
        if (path === '/api/pagos' || path === '/api/comprobantes') {
            if (control.falloLista) return route.fulfill({ status: 429, json: { mensaje: 'Demasiadas solicitudes' } });
            const esPago = path === '/api/pagos';
            const filtrado = url.searchParams.has('estado') || url.searchParams.has('tipo') || url.searchParams.has('q');
            return route.fulfill({ json: { success: true, [esPago ? 'pagos' : 'comprobantes']: [],
                total: filtrado ? 1 : esPago ? 18 : 8, paginas: 1 } });
        }
        return route.fulfill({ json: { success: true, data: [] } });
    });
    return control;
}

function tarjeta(page, titulo) {
    return page.locator('.indicador-tarjeta').filter({ has: page.locator('.kpi-label', { hasText: new RegExp(`^${titulo}$`) }) });
}

async function comprobarTextos(page) {
    await page.evaluate(() => document.fonts.ready);
    const cortados = await page.locator('.indicador-tarjeta .kpi-label, .indicador-tarjeta .kpi-descripcion, .indicador-tarjeta .kpi-valor').evaluateAll(nodos =>
        nodos.filter(n => n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1).map(n => n.textContent));
    expect(cortados).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

for (const width of [320, 390, 1440]) {
    test(`indicadores ${width}px: títulos completos y reparto sobre el total real`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 1000 });
        const control = await preparar(page);
        await page.goto('/pagos');
        const resumen = page.getByRole('region', { name: 'Resumen de pagos' });
        await expect(resumen).not.toHaveAttribute('aria-busy', 'true');
        await expect(tarjeta(page, 'Pagados').locator('.kpi-anillo-cifra')).toHaveText('50%');
        await expect(tarjeta(page, 'Pagados').getByRole('meter')).toHaveAttribute('aria-valuenow', '9');
        await expect(tarjeta(page, 'Pagados').getByRole('meter')).toHaveAttribute('aria-valuemax', '18');
        const principal = tarjeta(page, 'Pagos');
        await expect(principal.locator('.grafico-composicion__leyenda')).toContainText('Otros 2');
        // Las columnas representan cada conteo; la leyenda conserva el total
        // completo, incluido el resto que no está en las tarjetas por estado.
        await expect(principal.getByRole('img')).toHaveAttribute('aria-label', 'Reparto del total: Pagados 9, Pendientes 2, Cancelados 5, Otros 2');
        await expect(principal.locator('.kpi-tendencia-barra')).toHaveCount(4);
        const ingresos = tarjeta(page, 'Ingresos');
        await expect(ingresos.locator('.kpi-tendencia-barra')).toHaveCount(14);
        const alturas = await ingresos.locator('.kpi-tendencia-barra').evaluateAll(nodos => nodos.map(n => n.style.height));
        expect(alturas.slice(-2)).toEqual(['50%', '100%']);
        expect(alturas.slice(0, -2).every(h => h === '')).toBe(true);
        await comprobarTextos(page);
        await page.screenshot({ path: info.outputPath('pagos.png'), fullPage: true });

        await page.goto('/comprobantes');
        await expect(tarjeta(page, 'Boletas').locator('.kpi-anillo-cifra')).toHaveText('100%');
        await expect(tarjeta(page, 'Comprobantes').locator('.grafico-composicion__leyenda')).not.toContainText('Otros');
        await comprobarTextos(page);
        await page.screenshot({ path: info.outputPath('comprobantes.png'), fullPage: true });

        await page.goto('/usuarios');
        await expect(tarjeta(page, 'Administradores').locator('.kpi-valor')).toHaveText('1');
        await comprobarTextos(page);
        await page.screenshot({ path: info.outputPath('usuarios.png'), fullPage: true });
        expect(control.errores).toEqual([]);
        expect(control.escrituras).toEqual([]);
    });
}

for (const width of [390, 1440]) {
    test(`tarifas ${width}px: gráficos del Dashboard con zonas activas y precios reales`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 1000 });
        const control = await preparar(page);
        await page.goto('/tarifas-envio');
        const resumen = page.getByRole('region', { name: 'Resumen de tarifas' });
        await expect(resumen).toBeVisible();
        await expect(resumen.getByRole('meter', { name: 'Zonas con tarifa mínima sobre el total' })).toHaveAttribute('aria-valuenow', '1');
        await expect(resumen.getByRole('meter', { name: 'Zonas con tarifa máxima sobre el total' })).toHaveAttribute('aria-valuemax', '3');
        await expect(resumen.locator('.kpi-anillo-cifra')).toHaveText(['33%', '33%']);
        await expect(resumen.getByRole('img', { name: 'Tarifas de las zonas activas de Pallasca' }).locator('.kpi-tendencia-barra')).toHaveCount(3);
        expect(control.errores).toEqual([]);
        expect(control.escrituras).toEqual([]);
        await page.screenshot({ path: info.outputPath('tarifas.png'), fullPage: true });
    });
}

test('las demás secciones usan los gráficos comunes y no dibujan ondas decorativas', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    const control = await preparar(page);
    for (const ruta of ['/libros', '/autores', '/categorias', '/inventario', '/pedidos', '/reservas', '/historial', '/reclamaciones', '/usuarios?vista=clientes', '/anuncios']) {
        await page.goto(ruta);
        if (ruta === '/anuncios') await page.getByRole('tab', { name: 'Anuncios en video' }).click();
        const indicadores = page.locator('.indicadores');
        await expect(indicadores).toBeVisible();
        await expect(indicadores).not.toHaveAttribute('aria-busy', 'true');
        const tarjetas = indicadores.locator('.indicador-tarjeta');
        const total = await tarjetas.count();
        expect(total).toBeGreaterThan(0);
        await expect(indicadores.locator('.onda-decorativa')).toHaveCount(0);
        await expect(indicadores.locator('.grafico-anillo, .grafico-linea, .grafico-escala, .grafico-segmentos')).toHaveCount(0);
        await comprobarTextos(page);
    }
    expect(control.errores).toEqual([]);
    expect(control.escrituras).toEqual([]);
});

test('las columnas del Dashboard revelan su trazo al pasar el mouse en las otras tarjetas', async ({ page }) => {
    await preparar(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/pagos');
    const ingresos = tarjeta(page, 'Ingresos');
    await expect(ingresos.locator('.kpi-tendencia-barra')).toHaveCount(14);
    await expect(ingresos.locator('.kpi-trazo')).toHaveCSS('opacity', '0');
    await ingresos.hover();
    await expect(ingresos.locator('.kpi-trazo')).toHaveCSS('opacity', '1');
    await page.mouse.move(0, 0);
    await expect(ingresos.locator('.kpi-trazo')).toHaveCSS('opacity', '0');
});

test('tarifas: una única zona gratuita conserva gráficos válidos sin inventar una serie', async ({ page }) => {
    await preparar(page);
    await page.route('**/api/zonas-delivery/todos', route => route.fulfill({ json: { success: true,
        data: [{ id_zona: 1, nombre: 'Zona gratuita', tarifa: 0, estado: 1 }] } }));
    await page.goto('/tarifas-envio');
    const resumen = page.getByRole('region', { name: 'Resumen de tarifas' });
    await expect(resumen.locator('.kpi-valor')).toHaveText(['S/ 0.00', 'S/ 0.00', 'S/ 0.00']);
    await expect(resumen.locator('.kpi-anillo-cifra')).toHaveText(['100%', '100%', '100%']);
    await expect(resumen.getByRole('meter', { name: 'Zonas incluidas en el promedio' })).toHaveAttribute('aria-valuemax', '1');
    await expect(resumen.locator('.kpi-tendencia')).toHaveCount(0);
});

for (const ruta of ['/pagos', '/comprobantes']) {
    test(`${ruta}: filtros no comparan un resumen global con el total filtrado`, async ({ page }) => {
        await preparar(page);
        await page.goto(ruta);
        await expect(page.locator('.kpi-anillo-cifra').first()).toBeVisible();
        if (ruta === '/pagos') await page.locator('select').first().selectOption('pendiente');
        else await page.locator('select').first().selectOption('factura');
        await expect(page.locator('.indicador-tarjeta').first().locator('.kpi-valor')).toHaveText('1');
        await expect(page.locator('.indicador-tarjeta .kpi-anillo')).toHaveCount(0);
        await expect(page.locator('.grafico-composicion')).toHaveCount(0);
        await expect(page.locator('.indicador-tarjeta .kpi-descripcion').filter({ hasText: 'global' }).first()).toBeVisible();
    });

    test(`${ruta}: un 429 del resumen se muestra como no disponible y Actualizar recupera las cifras`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 1000 });
        const control = await preparar(page, { falloResumen: true });
        await page.goto(ruta);
        await expect(page.getByText(/No se pudo cargar el resumen de/)).toBeVisible();
        const valores = page.locator('.kpi-valor');
        await expect(valores.first()).toHaveText(ruta === '/pagos' ? '18' : '8');
        await expect(valores.nth(1)).toHaveText('No disponible');
        await expect(valores.last()).toHaveText('No disponible');
        await expect(page.locator('.indicador-tarjeta .kpi-anillo, .grafico-composicion, .indicador-tarjeta .kpi-tendencia')).toHaveCount(0);
        await comprobarTextos(page);
        control.falloResumen = false;
        await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
        await expect(valores.nth(1)).toHaveText(ruta === '/pagos' ? '9' : '8');
        await expect(valores.last()).toHaveText(ruta === '/pagos' ? 'S/ 883.00' : 'S/ 574.00');
        await expect(page.getByText(/No se pudo cargar el resumen de/)).toHaveCount(0);
        expect(control.errores).toEqual([]);
        expect(control.escrituras).toEqual([]);
    });

    test(`${ruta}: lista no disponible no se presenta como cero pagos o comprobantes`, async ({ page }) => {
        await preparar(page, { falloLista: true });
        await page.goto(ruta);
        await expect(page.locator('.indicador-tarjeta').first().locator('.kpi-valor')).toHaveText('No disponible');
        await expect(page.getByText('Demasiadas solicitudes')).toBeVisible();
        await expect(page.locator('.indicador-tarjeta .kpi-anillo, .grafico-composicion')).toHaveCount(0);
    });
}
