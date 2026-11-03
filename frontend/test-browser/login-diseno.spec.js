import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const admin = { id_usuario: 1, nombre: 'Admin', rol: 'administrador', estado: 1 };

for (const viewport of [
    { width: 320, height: 740 },
    { width: 390, height: 844 },
    { width: 900, height: 700 },
    { width: 1440, height: 1000 },
]) test(`acceso formal ${viewport.width}px: marca, formulario, lectura y controles`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errores = [];
    page.on('pageerror', (err) => errores.push(err.message));
    await page.goto('/admin/login');
    const marca = page.getByRole('complementary', { name: 'MATIDANA' });
    const formulario = page.getByRole('region', { name: 'Acceso administrativo' });
    await expect(marca).toBeVisible();
    await expect(formulario.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible();
    await expect(marca.locator('img')).toBeVisible();
    await expect(marca.locator('img')).toHaveJSProperty('complete', true);
    const izquierda = await marca.boundingBox();
    const derecha = await formulario.boundingBox();
    if (viewport.width >= 900) expect(derecha.x).toBeGreaterThanOrEqual(izquierda.x + izquierda.width);
    else expect(derecha.y).toBeGreaterThanOrEqual(izquierda.y + izquierda.height);
    await expect(formulario).toHaveCSS('backdrop-filter', 'none');
    await expect(formulario.getByRole('link', { name: 'Volver a la página principal', exact: true })).toHaveAttribute('href', '/');
    await expect(page.getByLabel('Correo electrónico', { exact: true })).toHaveAttribute('autocomplete', 'email');
    await page.getByLabel('Correo electrónico', { exact: true }).fill('admin@example.test');
    await page.getByLabel('Contraseña', { exact: true }).fill('ClaveDePrueba123');
    await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña', exact: true }).click();
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'password');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true });
    expect(errores).toEqual([]);
});

test('acceso: errores visibles conservan credenciales; recuperación pasa a la siguiente hoja', async ({ page }) => {
    await page.route(`${API}/auth/login`, (route) => route.fulfill({ status: 401, json: { mensaje: 'Correo o contraseña incorrectos' } }));
    await page.goto('/admin/login');
    await page.getByLabel('Correo electrónico', { exact: true }).fill('admin@example.test');
    await page.getByLabel('Contraseña', { exact: true }).fill('ClaveDePrueba123');
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos');
    await expect(page.getByLabel('Correo electrónico', { exact: true })).toHaveValue('admin@example.test');
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?', exact: true }).click();
    const hoja = page.getByRole('region', { name: 'Recuperar contraseña', exact: true });
    await expect(hoja.getByLabel('Correo electrónico de tu cuenta', { exact: true })).toHaveValue('admin@example.test');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await hoja.getByRole('button', { name: 'Volver al inicio de sesión', exact: true }).click();
    await expect(hoja).toHaveCount(0);
    await expect(page.getByRole('button', { name: '¿Olvidaste tu contraseña?', exact: true })).toBeFocused();
});

test('libro: aparece cerrado, abre en menos de medio segundo y no repite al escribir', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
        window.aperturasLibro = [];
        document.addEventListener('animationstart', (evento) => {
            if (evento.target.matches('.login-tapa-intro')) window.aperturasLibro.push({ nombre: evento.animationName, duracion: getComputedStyle(evento.target).animationDuration });
        }, true);
    });
    await page.goto('/admin/login');
    await expect.poll(() => page.evaluate(() => window.aperturasLibro.length)).toBe(1);
    const apertura = await page.evaluate(() => window.aperturasLibro[0]);
    expect(parseFloat(apertura.duracion)).toBeLessThanOrEqual(0.5);
    await expect(page.locator('.login-tapa-intro')).toHaveCount(0, { timeout: 2000 });
    await page.getByLabel('Correo electrónico', { exact: true }).fill('admin@example.test');
    expect(await page.evaluate(() => window.aperturasLibro.length)).toBe(1);
});

for (const width of [390, 1440]) test(`recuperación en las hojas del libro ${width}px: correo, código, nueva clave y doble factor`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: width === 390 ? 'reduce' : 'no-preference' });
    const peticiones = [], errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    await page.route(`${API}/auth/**`, (route) => {
        const ruta = new URL(route.request().url()).pathname;
        peticiones.push({ ruta, body: route.request().postDataJSON() });
        return route.fulfill({ json: ruta.endsWith('/login')
            ? { requires_2fa: true, two_factor_token: 'token-recuperacion' }
            : { success: true, mensaje: 'Operación completada' } });
    });
    await page.goto('/admin/login');
    await page.getByLabel('Correo electrónico', { exact: true }).fill('admin@example.test');
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?', exact: true }).click();
    const hoja = page.getByRole('region', { name: 'Recuperar contraseña', exact: true });
    await expect(hoja.getByLabel('Correo electrónico de tu cuenta', { exact: true })).toBeFocused();
    await expect(page.locator('.login-hoja-recuperacion')).toHaveCSS('opacity', '1');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('hoja-recuperacion.png'), fullPage: true });
    await hoja.getByRole('button', { name: 'Enviar código', exact: true }).click();
    await hoja.getByLabel('Código de verificación', { exact: true }).fill('123456');
    await hoja.getByLabel('Nueva contraseña', { exact: true }).fill('ClaveNueva2026');
    await hoja.getByLabel('Confirmar contraseña', { exact: true }).fill('ClaveNueva2026');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('hoja-nueva-clave.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await hoja.getByRole('button', { name: 'Restablecer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Código de verificación', exact: true })).toBeVisible();
    expect(peticiones).toEqual([
        { ruta: '/api/auth/solicitar-reseteo', body: { email: 'admin@example.test' } },
        { ruta: '/api/auth/reestablecer-contrasena', body: { email: 'admin@example.test', codigo: '123456', password: 'ClaveNueva2026' } },
        { ruta: '/api/auth/login', body: { email: 'admin@example.test', password: 'ClaveNueva2026' } },
    ]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errores).toEqual([]);
});

test('acceso: doble factor conserva el diseño y permite volver a las credenciales', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route(`${API}/auth/login`, (route) => route.fulfill({ json: { requires_2fa: true, two_factor_token: 'token-temporal-de-prueba' } }));
    await page.route(`${API}/auth/2fa/verify-login`, (route) => {
        expect(route.request().postDataJSON()).toEqual({ two_factor_token: 'token-temporal-de-prueba', codigo: '123456' });
        return route.fulfill({ status: 400, json: { mensaje: 'Código incorrecto o expirado' } });
    });
    await page.goto('/admin/login');
    await page.getByLabel('Correo electrónico', { exact: true }).fill('admin@example.test');
    await page.getByLabel('Contraseña', { exact: true }).fill('ClaveDePrueba123');
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Código de verificación', exact: true })).toBeVisible();
    await page.getByLabel('Código OTP', { exact: true }).fill('123456');
    await page.getByRole('button', { name: 'Verificar código', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Código incorrecto o expirado' })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('login-otp.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Volver al inicio de sesión', exact: true }).click();
    await expect(page.getByLabel('Correo electrónico', { exact: true })).toHaveValue('admin@example.test');
});

test('acceso administrativo: credenciales válidas abren el panel', async ({ page }) => {
    await page.route(`${API}/**`, (route) => {
        const ruta = new URL(route.request().url()).pathname;
        if (ruta === '/api/auth/login') {
            expect(route.request().postDataJSON()).toEqual({ email: 'admin@example.test', password: 'ClaveDePrueba123' });
            return route.fulfill({ json: { success: true, token: 'sesion-de-prueba', data: admin } });
        }
        return route.fulfill({ json: { success: true, data: ruta.endsWith('/perfil') ? admin : [] } });
    });
    await page.goto('/admin/login');
    await page.getByLabel('Correo electrónico', { exact: true }).fill('admin@example.test');
    await page.getByLabel('Contraseña', { exact: true }).fill('ClaveDePrueba123');
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('sesion-de-prueba');
});
