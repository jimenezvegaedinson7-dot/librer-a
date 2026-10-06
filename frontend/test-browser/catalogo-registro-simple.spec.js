import { test, expect } from '@playwright/test';

const admin = { id_usuario: 1, nombre: 'Audit', apellido: 'Admin', rol: 'administrador', estado: 1 };
const casos = [
    { modulo: 'autores', titulo: 'Registrar autor', boton: 'Guardar autor',
        basicos: { Nombre: 'Gabriel', Apellido: 'García Márquez' },
        adicionales: { Nacionalidad: 'Colombiana', Biografía: 'Autor de novelas y cuentos.' },
        minimo: { nombre: 'Gabriel', apellido: 'García Márquez', nacionalidad: '', biografia: '' },
        completo: { nombre: 'Gabriel', apellido: 'García Márquez', nacionalidad: 'Colombiana', biografia: 'Autor de novelas y cuentos.' },
        primero: 'Nombre', id: 'id_autor' },
    { modulo: 'categorias', titulo: 'Registrar categoría', boton: 'Guardar categoría',
        basicos: { 'Nombre de la categoría': 'Literatura' },
        adicionales: { Descripción: 'Novelas, cuentos y poesía.' },
        minimo: { nombre: 'Literatura', descripcion: '' },
        completo: { nombre: 'Literatura', descripcion: 'Novelas, cuentos y poesía.' },
        primero: 'Nombre de la categoría', id: 'id_categoria' },
];

for (const width of [390, 1440]) for (const caso of casos) {
    test(`${caso.modulo} ${width}px: registro mínimo y opcionales conservados al cerrar o fallar`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript(usuario => {
            localStorage.setItem('token', 'audit-token'); localStorage.setItem('usuario', JSON.stringify(usuario));
        }, admin);
        const escrituras = [], errores = [];
        let registros = [], rechazar = false;
        page.on('pageerror', error => errores.push(error.message));
        await page.route('http://127.0.0.1:59999/api/**', route => {
            const pathname = new URL(route.request().url()).pathname;
            if (pathname.endsWith('/usuarios/perfil')) return route.fulfill({ json: { success: true, data: admin } });
            if (pathname === `/api/${caso.modulo}`) {
                if (route.request().method() === 'POST') {
                    const body = route.request().postDataJSON(); escrituras.push(body);
                    if (rechazar) return route.fulfill({ status: 409, json: { success: false, mensaje: 'Registro duplicado de prueba' } });
                    registros = [...registros, { [caso.id]: registros.length + 1, estado: 1, ...body }];
                    return route.fulfill({ status: 201, json: { success: true, mensaje: 'Registro guardado' } });
                }
                return route.fulfill({ json: { success: true, data: registros } });
            }
            return route.fulfill({ json: { success: true, data: [] } });
        });
        await page.goto(`/${caso.modulo}`);
        const card = page.locator('.admin-form-card').filter({ has: page.getByRole('heading', { name: caso.titulo, exact: true }) });
        const form = card.locator('form');
        for (const label of Object.keys(caso.adicionales)) await expect(form.getByLabel(label, { exact: true })).toBeHidden();
        await expect(card.getByText('Nuevo registro', { exact: true })).toHaveCount(0);
        await form.getByRole('button', { name: caso.boton, exact: true }).click();
        await expect(card.getByText('Revisa los campos marcados en rojo antes de continuar.')).toBeVisible();
        expect(escrituras).toHaveLength(0);
        for (const [label, value] of Object.entries(caso.basicos)) await form.getByLabel(label, { exact: true }).fill(value);
        await form.getByRole('button', { name: caso.boton, exact: true }).click();
        await expect(form.getByLabel(caso.primero, { exact: true })).toHaveValue('');
        expect(escrituras[0]).toEqual(caso.minimo);

        for (const [label, value] of Object.entries(caso.basicos)) await form.getByLabel(label, { exact: true }).fill(value);
        const summary = form.locator('summary');
        await summary.focus(); await page.keyboard.press('Enter');
        for (const [label, value] of Object.entries(caso.adicionales)) await form.getByLabel(label, { exact: true }).fill(value);
        await summary.click();
        for (const label of Object.keys(caso.adicionales)) await expect(form.getByLabel(label, { exact: true })).toBeHidden();
        rechazar = true;
        await form.getByRole('button', { name: caso.boton, exact: true }).click();
        await expect(card.getByText('Registro duplicado de prueba').first()).toBeVisible();
        expect(escrituras[1]).toEqual(caso.completo);
        await summary.click();
        for (const [label, value] of Object.entries(caso.adicionales)) await expect(form.getByLabel(label, { exact: true })).toHaveValue(value);
        rechazar = false;
        await summary.click();
        await form.getByRole('button', { name: caso.boton, exact: true }).click();
        await expect(form.getByLabel(caso.primero, { exact: true })).toHaveValue('');
        expect(escrituras[2]).toEqual(caso.completo);
        await summary.click();
        for (const label of Object.keys(caso.adicionales)) await expect(form.getByLabel(label, { exact: true })).toHaveValue('');
        await summary.click();
        await page.waitForTimeout(500);
        expect(await form.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await card.screenshot({ path: info.outputPath('registro-simple.png') });
        expect(errores).toEqual([]);
    });
}
