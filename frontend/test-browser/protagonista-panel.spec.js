import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const imagen = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const libros = [
    { id_libro: 11, titulo: 'Protagonista manual de prueba', autor: 'Autora A', estado: 1, portada: imagen, precio: 40, precio_final: 30, descuento_vigente: 1 },
    { id_libro: 12, titulo: 'Último agregado de prueba', autor: 'Autora B', estado: 1, portada: imagen, precio: 25, precio_final: 25, descuento_vigente: 0 },
    { id_libro: 13, titulo: 'Libro inactivo', estado: 0, portada: imagen, precio: 20 },
    { id_libro: 14, titulo: 'Libro sin portada', estado: 1, portada: null, precio: 20 },
];

async function preparar(page) {
    const control = { modo: 'automatico', elegido: null, escrituras: [], fallo: false, retrasar: false, liberar: null };
    const datos = () => ({ modo: control.modo, id_libro_manual: control.elegido, libro: control.elegido ? libros[0] : libros[1], libro_automatico: libros[1], manual_invalido: false });
    await page.addInitScript(() => {
        localStorage.setItem('token', 'token-administrativo-de-prueba');
        localStorage.setItem('usuario', JSON.stringify({ id_usuario: 1, nombre: 'Admin', rol: 'administrador', estado: 1 }));
    });
    await page.route(`${API}/**`, async (r) => {
        const req = r.request(), ruta = new URL(req.url()).pathname;
        if (ruta === '/api/usuarios/perfil') return r.fulfill({ json: { success: true, data: { id_usuario: 1, nombre: 'Admin', rol: 'administrador', estado: 1 } } });
        if (ruta === '/api/libros') return r.fulfill({ json: { success: true, data: libros } });
        if (ruta === '/api/anuncios/protagonista/panel') return r.fulfill(control.fallo ? { status: 503, json: { mensaje: 'Error de lectura de prueba' } } : { json: { success: true, data: datos() } });
        if (ruta === '/api/anuncios/protagonista' && req.method() === 'PUT') {
            expect(req.headers().authorization).toBe('Bearer token-administrativo-de-prueba');
            const body = req.postDataJSON(); control.escrituras.push(body);
            if (control.retrasar) await new Promise((resolve) => { control.liberar = resolve; });
            control.elegido = body.id_libro; control.modo = body.id_libro ? 'manual' : 'automatico';
            return r.fulfill({ json: { success: true, data: datos() } });
        }
        return r.fulfill({ json: { success: true, data: [] } });
    });
    return control;
}

for (const width of [390, 1440]) test(`panel protagonista ${width}px: manual, automático, vista previa y guardado sin duplicados`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errores = []; page.on('pageerror', (e) => errores.push(e.message));
    const control = await preparar(page);
    await page.goto('/anuncios'); await page.getByRole('tab', { name: 'Libro protagonista', exact: true }).click();
    const vista = page.locator('.protagonista-vista');
    await expect(vista.getByText('Último agregado de prueba', { exact: true })).toBeVisible();
    await page.getByRole('radio', { name: /Elegir un libro/ }).check();
    await expect(page.getByRole('list', { name: 'Libros activos con portada' }).getByRole('button')).toHaveCount(2);
    await page.getByRole('button', { name: /Protagonista manual de prueba/ }).click();
    await expect(vista.getByText('Protagonista manual de prueba', { exact: true })).toBeVisible();
    await expect(vista.getByRole('link', { name: /Ver en la web/ })).toHaveAttribute('href', '/libro/11');
    control.retrasar = true;
    await page.getByRole('button', { name: 'Guardar libro protagonista', exact: true }).click();
    await expect.poll(() => control.escrituras.length).toBe(1);
    await expect(page.getByRole('radio', { name: /Automático/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Actualizar', exact: true })).toBeDisabled();
    control.liberar(); control.retrasar = false;
    await expect(page.getByText('Libro protagonista guardado.', { exact: true })).toBeVisible();
    expect(control.escrituras).toEqual([{ id_libro: 11 }]);
    await page.getByRole('radio', { name: /Automático/ }).check();
    await expect(vista.getByText('Último agregado de prueba', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Usar modo automático', exact: true }).click();
    await expect.poll(() => control.escrituras.length).toBe(2);
    expect(control.escrituras[1]).toEqual({ id_libro: null });
    await expect(page.getByText('La portada usará el último libro agregado.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errores).toEqual([]);
});

test('fallo de lectura no deja guardar una configuración inventada; Actualizar recupera el panel', async ({ page }) => {
    const control = await preparar(page); control.fallo = true;
    await page.goto('/anuncios'); await page.getByRole('tab', { name: 'Libro protagonista', exact: true }).click();
    await expect(page.getByText('Error de lectura de prueba', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Usar modo automático', exact: true })).toBeDisabled();
    control.fallo = false;
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    await expect(page.locator('.protagonista-vista').getByText('Último agregado de prueba', { exact: true })).toBeVisible();
    expect(control.escrituras).toEqual([]);
});
