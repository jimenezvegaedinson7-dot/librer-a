import { test, expect } from '@playwright/test';

const admin = { id_usuario: 1, nombre: 'Audit', apellido: 'Admin', rol: 'administrador', estado: 1 };
const original = { ruc: '20123456789', razon_social: 'Empresa de demostración', nombre_comercial: 'Librería de demostración',
    direccion: 'Dirección ficticia para revisión local', tipo_documento: 'CE', documento_identidad: 'HIST-0001',
    fecha_inicio: '2020-01-01', aplica_igv: 0, libros_exonerados: 1, exoneracion_libros_hasta: '2026-10-17', tasa_igv: 18 };

for (const width of [390, 1440]) {
    test(`Empresa ${width}px: solo datos usados, impuestos válidos e históricos intactos`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript(usuario => {
            localStorage.setItem('token', 'audit-token'); localStorage.setItem('usuario', JSON.stringify(usuario));
        }, admin);
        const errores = [], escrituras = [];
        let empresa = { ...original };
        page.on('pageerror', error => errores.push(error.message));
        await page.route('http://127.0.0.1:59999/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path.endsWith('/usuarios/perfil')) return route.fulfill({ json: { success: true, data: admin } });
            if (path === '/api/empresa') {
                if (route.request().method() === 'PUT') {
                    const body = route.request().postDataJSON(); escrituras.push(body);
                    // El contrato real de la API exige flags numéricos, no booleanos.
                    if (![0, 1].includes(body.aplica_igv) || ![0, 1].includes(body.libros_exonerados)) {
                        return route.fulfill({ status: 400, json: { success: false, mensaje: 'Los indicadores deben ser 0 o 1' } });
                    }
                    empresa = { ...empresa, ...body };
                }
                return route.fulfill({ json: { success: true, empresa } });
            }
            return route.fulfill({ json: { success: true, data: [] } });
        });
        await page.goto('/configuracion/empresa');
        const main = page.locator('main');
        await expect(main.getByLabel('RUC', { exact: true })).toHaveValue(original.ruc);
        await expect(main.getByLabel('Tipo de documento', { exact: true })).toHaveCount(0);
        await expect(main.getByLabel('Número de documento', { exact: true })).toHaveCount(0);
        await main.getByLabel('RUC', { exact: true }).fill('123');
        await main.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
        await expect(main.getByText('El RUC debe tener exactamente 11 dígitos')).toBeVisible();
        expect(escrituras).toHaveLength(0);
        await main.getByLabel('RUC', { exact: true }).fill(original.ruc);
        await main.getByLabel('Razón social', { exact: true }).fill('Empresa actualizada');
        await main.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
        await expect(page.getByText('Datos de la empresa actualizados correctamente', { exact: true })).toBeVisible();
        expect(escrituras[0]).toMatchObject({ aplica_igv: 0, libros_exonerados: 1 });
        expect(escrituras[0]).not.toHaveProperty('tipo_documento');
        expect(escrituras[0]).not.toHaveProperty('documento_identidad');
        expect(escrituras[0]).not.toHaveProperty('fecha_inicio');
        expect(empresa).toMatchObject({ tipo_documento: original.tipo_documento,
            documento_identidad: original.documento_identidad, fecha_inicio: original.fecha_inicio });
        await main.getByRole('switch', { name: 'Empresa afecta al IGV', exact: true }).click();
        await expect(main.getByLabel('Tasa del IGV (%)')).toBeVisible();
        await expect(main.getByLabel('Exonerados hasta')).toBeVisible();
        await main.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
        await expect.poll(() => escrituras.length).toBe(2);
        expect(escrituras[1]).toMatchObject({ aplica_igv: 1, libros_exonerados: 1, tasa_igv: '18' });
        await main.getByRole('button', { name: 'Actualizar', exact: true }).click();
        await expect(main.getByLabel('Razón social', { exact: true })).toHaveValue('Empresa actualizada');
        expect(errores).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.waitForTimeout(600);
        await page.screenshot({ path: info.outputPath('empresa-limpia.png'), fullPage: true });
    });
}
