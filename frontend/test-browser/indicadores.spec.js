import { test, expect } from '@playwright/test';

const admin = { id_usuario: 1, nombre: 'Audit', apellido: 'Admin', rol: 'administrador', estado: 1 };
const pagosResumen = { pagado: 9, pendiente: 2, cancelado: 5, ingresos: 883 };
const comprobantesResumen = { boletas: 8, facturas: 0, ingresos: 574, anulados: 0 };

async function preparar(page, { falloResumen = false, falloLista = false } = {}) {
    const control = { falloResumen, falloLista, escrituras: [], errores: [] };
    await page.emulateMedia({ reducedMotion: 'reduce' });
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
    return page.locator('.indicador').filter({ has: page.locator('.indicador-titulo', { hasText: new RegExp(`^${titulo}$`) }) });
}

async function comprobarTextos(page) {
    await page.evaluate(() => document.fonts.ready);
    const cortados = await page.locator('.indicador-titulo, .indicador-detalle, .indicador-valor').evaluateAll(nodos =>
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
        await expect(tarjeta(page, 'Pagados').locator('.indicador-porcentaje')).toHaveText('50%');
        const principal = tarjeta(page, 'Pagos');
        await expect(principal.locator('.grafico-composicion__leyenda')).toContainText('Otros 2');
        const pesos = await principal.locator('.grafico-composicion__barra span').evaluateAll(nodos =>
            nodos.map(n => Number(getComputedStyle(n).flexGrow)));
        expect(pesos).toEqual([9, 2, 5, 2]);
        expect(pesos[0] / pesos.reduce((a, b) => a + b, 0)).toBe(0.5);
        await comprobarTextos(page);
        await page.screenshot({ path: info.outputPath('pagos.png'), fullPage: true });

        await page.goto('/comprobantes');
        await expect(tarjeta(page, 'Boletas').locator('.indicador-porcentaje')).toHaveText('100%');
        await expect(tarjeta(page, 'Comprobantes').locator('.grafico-composicion__leyenda')).not.toContainText('Otros');
        await comprobarTextos(page);
        await page.screenshot({ path: info.outputPath('comprobantes.png'), fullPage: true });

        await page.goto('/usuarios');
        await expect(tarjeta(page, 'Administradores').locator('.indicador-valor')).toHaveText('1');
        await comprobarTextos(page);
        await page.screenshot({ path: info.outputPath('usuarios.png'), fullPage: true });
        expect(control.errores).toEqual([]);
        expect(control.escrituras).toEqual([]);
    });
}

for (const ruta of ['/pagos', '/comprobantes']) {
    test(`${ruta}: filtros no comparan un resumen global con el total filtrado`, async ({ page }) => {
        await preparar(page);
        await page.goto(ruta);
        await expect(page.locator('.indicador-porcentaje').first()).toBeVisible();
        if (ruta === '/pagos') await page.locator('select').first().selectOption('pendiente');
        else await page.locator('select').first().selectOption('factura');
        await expect(page.locator('.indicador').first().locator('.indicador-valor')).toHaveText('1');
        await expect(page.locator('.indicador-porcentaje')).toHaveCount(0);
        await expect(page.locator('.grafico-composicion')).toHaveCount(0);
        await expect(page.locator('.indicador-detalle').filter({ hasText: 'global' }).first()).toBeVisible();
    });

    test(`${ruta}: un 429 del resumen se muestra como no disponible y Actualizar recupera las cifras`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 1000 });
        const control = await preparar(page, { falloResumen: true });
        await page.goto(ruta);
        await expect(page.getByText(/No se pudo cargar el resumen de/)).toBeVisible();
        const valores = page.locator('.indicador-valor');
        await expect(valores.first()).toHaveText(ruta === '/pagos' ? '18' : '8');
        await expect(valores.nth(1)).toHaveText('No disponible');
        await expect(valores.last()).toHaveText('No disponible');
        await expect(page.locator('.indicador-porcentaje, .grafico-composicion, .grafico-linea')).toHaveCount(0);
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
        await expect(page.locator('.indicador').first().locator('.indicador-valor')).toHaveText('No disponible');
        await expect(page.getByText('Demasiadas solicitudes')).toBeVisible();
        await expect(page.locator('.indicador-porcentaje, .grafico-composicion')).toHaveCount(0);
    });
}
