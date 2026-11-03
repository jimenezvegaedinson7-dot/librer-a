import { test, expect } from '@playwright/test';

const admin = { id_usuario: 1, nombre: 'Admin', rol: 'administrador', estado: 1 };
const portada = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

async function preparar(page) {
    const control = {
        autores: [{ id_autor: 1, nombre: 'César', apellido: 'Vallejo', estado: 1 }],
        libros: [{ id_libro: 1, titulo: 'Los heraldos negros', autor: 'César Vallejo', categoria: 'Poesía',
            id_autor: 1, id_categoria: 1, precio: '40', stock: 3, estado: 1, portada,
            descuento_porcentaje: null, precio_oferta: null, descuento_hasta: null,
            precio_final: 40, descuento_vigente: 0, descuento_porcentaje_efectivo: 0 }],
        falloAutor: false, altasAutores: [], escriturasLibros: [], portadasSubidas: [],
    };
    await page.addInitScript((usuario) => {
        localStorage.setItem('token', 'token-de-prueba');
        localStorage.setItem('usuario', JSON.stringify(usuario));
    }, admin);
    await page.route(/^http:\/\/127\.0\.0\.1:59999\/api(?:\/|$)/, async (route) => {
        const req = route.request();
        const ruta = new URL(req.url()).pathname;
        const metodo = req.method();
        const responder = (data) => route.fulfill({ json: { success: true, data } });
        if (ruta === '/api/usuarios/perfil') return responder(admin);
        if (ruta === '/api') return route.fulfill({ json: { capacidades: { descuentos_libros: true } } });
        if (ruta === '/api/autores' && metodo === 'POST') {
            const datos = req.postDataJSON();
            control.altasAutores.push(datos);
            if (control.falloAutor) return route.fulfill({ status: 409, json: { mensaje: 'El autor ya está registrado' } });
            const autor = { ...datos, id_autor: control.autores.length + 1, estado: 1 };
            control.autores.push(autor);
            return route.fulfill({ status: 201, json: { success: true, id_autor: autor.id_autor } });
        }
        if (ruta === '/api/autores') return responder(control.autores);
        if (/^\/api\/autores\/\d+$/.test(ruta)) {
            const autor = control.autores.find((a) => a.id_autor === Number(ruta.split('/').pop()));
            if (metodo === 'PUT') Object.assign(autor, req.postDataJSON());
            return responder(autor);
        }
        if (ruta === '/api/categorias') return responder([{ id_categoria: 1, nombre: 'Poesía', estado: 1 }]);
        if (ruta.startsWith('/api/libros') && ['POST', 'PUT'].includes(metodo)) {
            control.portadasSubidas.push(req.postData().includes('filename="portada.png"'));
            const campo = (nombre) => req.postData().match(new RegExp(`name="${nombre}"\\r?\\n\\r?\\n([^\\r\\n]*)`))?.[1] || '';
            const id = metodo === 'POST' ? control.libros.length + 1 : Number(ruta.split('/').pop());
            const anterior = control.libros.find((l) => l.id_libro === id) || {};
            const autor = control.autores.find((a) => a.id_autor === Number(campo('id_autor')));
            const libro = { ...anterior, id_libro: id, titulo: campo('titulo'), id_autor: autor.id_autor,
                autor: `${autor.nombre} ${autor.apellido}`, id_categoria: 1, categoria: 'Poesía', precio: campo('precio'),
                estado: 1, stock: anterior.stock ?? 0, descuento_porcentaje: campo('descuento_porcentaje') || null,
                precio_oferta: campo('precio_oferta') || null, descuento_hasta: campo('descuento_hasta') || null,
                descuento_vigente: 0, precio_final: Number(campo('precio')) };
            control.libros = [...control.libros.filter((l) => l.id_libro !== id), libro];
            control.escriturasLibros.push({ metodo, id_autor: libro.id_autor, titulo: libro.titulo });
            return route.fulfill({ json: { success: true, id_libro: id } });
        }
        if (ruta === '/api/libros') return responder(control.libros);
        if (/^\/api\/libros\/\d+$/.test(ruta)) return responder(control.libros.find((l) => l.id_libro === Number(ruta.split('/').pop())));
        return responder([]);
    });
    return control;
}

for (const width of [390, 1440]) {
    test(`libros y autores ${width}px: sección única, alta y edición de autores, ruta antigua y teclado`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const control = await preparar(page);
        await page.goto('/libros');
        await expect(page.getByRole('heading', { name: 'Libros y autores', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Autores', exact: true })).toHaveCount(0);
        await expect(page.getByRole('tab', { name: /Libros/ })).toHaveAttribute('aria-selected', 'true');
        await page.screenshot({ path: testInfo.outputPath('libros.png'), fullPage: true });
        const tabAutores = page.getByRole('tab', { name: /Autores/ });
        await tabAutores.click();
        await expect(page).toHaveURL(/\/libros\?vista=autores$/);
        await page.getByRole('button', { name: 'Nuevo autor', exact: true }).click();
        await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Blanca');
        await page.getByRole('textbox', { name: 'Apellido', exact: true }).fill('Varela');
        await page.getByRole('button', { name: 'Guardar autor', exact: true }).click();
        await expect(page.getByRole('cell', { name: 'Blanca Varela', exact: true })).toBeVisible();
        await page.getByRole('row').filter({ hasText: 'Blanca Varela' }).getByRole('button', { name: 'Editar autor' }).click();
        const modal = page.getByRole('dialog');
        await modal.locator('[name="nacionalidad"]').fill('Peruana');
        await modal.getByRole('button', { name: 'Guardar cambios' }).click();
        await expect(modal).toHaveCount(0);
        await expect(page.getByRole('cell', { name: 'Peruana', exact: true })).toBeVisible();
        expect(control.autores[1].nacionalidad).toBe('Peruana');
        await page.screenshot({ path: testInfo.outputPath('autores.png'), fullPage: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await tabAutores.focus();
        await page.keyboard.press('ArrowLeft');
        await expect(page.getByRole('tab', { name: /Libros/ })).toBeFocused();
        await expect(page.getByRole('button', { name: 'Nuevo libro', exact: true })).toBeVisible();
        await page.goBack();
        await expect(tabAutores).toHaveAttribute('aria-selected', 'true');
        await page.goto('/autores');
        await expect(page).toHaveURL(/\/libros\?vista=autores$/);
    });

    test(`libro nuevo ${width}px: crear autor conserva borrador y portada, maneja errores y guarda la relación`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const control = await preparar(page);
        const errores = [];
        page.on('pageerror', (err) => errores.push(err.message));
        await page.goto('/libros');
        await page.getByRole('button', { name: 'Nuevo libro', exact: true }).click();
        await page.locator('[name="titulo"]').fill('Libro en preparación');
        await page.locator('[name="isbn"]').fill('9781234567890');
        await page.locator('[name="descripcion"]').fill('Descripción conservada');
        await page.locator('[name="precio"]').fill('35');
        await page.locator('[name="id_categoria"]').selectOption('1');
        await page.locator('input[type="file"]').setInputFiles({ name: 'portada.png', mimeType: 'image/png',
            buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
        await page.getByRole('dialog', { name: 'Registrar libro', exact: true }).screenshot({ path: testInfo.outputPath('registrar-libro.png') });
        await page.getByRole('button', { name: 'Agregar autor', exact: true }).click();
        await expect(page.getByRole('textbox', { name: 'Nombre', exact: true })).toBeFocused();
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await expect(page.locator('[name="id_autor"]')).toBeFocused();
        await expect(page.locator('[name="titulo"]')).toHaveValue('Libro en preparación');
        await page.getByRole('button', { name: 'Agregar autor', exact: true }).click();
        await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('José María');
        await page.getByRole('textbox', { name: 'Apellido', exact: true }).fill('Arguedas');
        await page.screenshot({ path: testInfo.outputPath('agregar-autor.png'), fullPage: true });
        control.falloAutor = true;
        await page.getByRole('button', { name: 'Guardar autor', exact: true }).click();
        await expect(page.getByRole('alert').filter({ hasText: 'El autor ya está registrado' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('José María');
        control.falloAutor = false;
        await page.getByRole('button', { name: 'Guardar autor', exact: true }).click();
        await expect(page.locator('[name="id_autor"]')).toHaveValue('2');
        await expect(page.locator('[name="id_autor"]')).toBeFocused();
        await expect(page.locator('[name="id_autor"] option:checked')).toHaveText('José María Arguedas');
        await expect(page.locator('[name="titulo"]')).toHaveValue('Libro en preparación');
        await expect(page.locator('[name="isbn"]')).toHaveValue('9781234567890');
        await expect(page.locator('[name="descripcion"]')).toHaveValue('Descripción conservada');
        await expect(page.locator('[name="precio"]')).toHaveValue('35');
        await expect(page.locator('[name="id_categoria"]')).toHaveValue('1');
        await expect(page.locator('.libros-form img[src^="blob:"]')).toBeVisible();
        expect(await page.locator('form form').count()).toBe(0);
        await page.getByRole('button', { name: 'Guardar libro', exact: true }).click();
        await page.getByRole('dialog', { name: '¿Deseas agregar un descuento?', exact: true }).getByRole('button', { name: 'Registrar sin descuento', exact: true }).click();
        await expect(page.getByRole('cell', { name: 'José María Arguedas', exact: true })).toBeVisible();
        expect(control.escriturasLibros).toEqual([{ metodo: 'POST', id_autor: 2, titulo: 'Libro en preparación' }]);
        expect(errores).toEqual([]);
    });
}

test('editar libro: agrega un autor en el mismo diálogo y conserva los cambios pendientes', async ({ page }) => {
    const control = await preparar(page);
    await page.goto('/libros');
    await page.getByRole('button', { name: 'Editar libro', exact: true }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.locator('[name="id_categoria"] option')).toHaveCount(2);
    await modal.locator('[name="titulo"]').fill('Título actualizado');
    await modal.getByRole('button', { name: 'Agregar autor', exact: true }).click();
    await modal.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Julio');
    await modal.getByRole('textbox', { name: 'Apellido', exact: true }).fill('Ramón Ribeyro');
    await modal.getByRole('button', { name: 'Guardar autor', exact: true }).click();
    await expect(modal.locator('[name="titulo"]')).toHaveValue('Título actualizado');
    await expect(modal.locator('[name="id_autor"]')).toHaveValue('2');
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await modal.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(modal).toHaveCount(0);
    expect(control.escriturasLibros).toEqual([{ metodo: 'PUT', id_autor: 2, titulo: 'Título actualizado' }]);
    await expect(page.getByRole('cell', { name: 'Julio Ramón Ribeyro', exact: true })).toBeVisible();
});

for (const width of [390, 1440]) test(`descuento flotante ${width}px: cancelar, validar, aplicar, quitar y guardar`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const control = await preparar(page);
    await page.goto('/libros');
    await page.getByRole('button', { name: 'Nuevo libro', exact: true }).click();
    await page.locator('[name="titulo"]').fill('Libro con descuento');
    await page.locator('[name="precio"]').fill('100');
    await page.locator('[name="id_autor"]').selectOption('1');
    await page.locator('[name="id_categoria"]').selectOption('1');
    await expect(page.locator('[name="descuento_porcentaje"]')).toHaveCount(0);
    const abrir = () => page.getByRole('button', { name: /^(Agregar descuento|Editar descuento)$/ }).click();
    const modal = page.getByRole('dialog', { name: 'Descuento del libro', exact: true });
    await abrir();
    await modal.getByLabel('Porcentaje', { exact: true }).fill('25');
    await expect(modal.getByLabel('Precio de oferta', { exact: true })).toBeDisabled();
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.locator('[name="titulo"]')).toHaveValue('Libro con descuento');
    await abrir();
    await expect(modal.getByLabel('Porcentaje', { exact: true })).toHaveValue('');
    await modal.getByLabel('Precio de oferta', { exact: true }).fill('120');
    await expect(modal.getByRole('button', { name: 'Aplicar descuento', exact: true })).toBeDisabled();
    await modal.getByLabel('Precio de oferta', { exact: true }).fill('');
    await modal.getByLabel('Porcentaje', { exact: true }).fill('30');
    await modal.getByLabel('Hasta (incluido)', { exact: true }).fill('2099-12-31');
    await page.screenshot({ path: testInfo.outputPath('descuento-flotante.png'), fullPage: true });
    expect(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.locator('form form').count()).toBe(0);
    await modal.getByRole('button', { name: 'Aplicar descuento', exact: true }).click();
    await expect(page.getByText('30% de descuento', { exact: true })).toBeVisible();
    expect(control.escriturasLibros).toEqual([]);
    await abrir();
    await modal.getByRole('button', { name: 'Quitar descuento', exact: true }).click();
    await expect(page.getByText('30% de descuento', { exact: true })).toHaveCount(0);
    await abrir();
    await modal.getByLabel('Precio de oferta', { exact: true }).fill('75');
    await modal.getByRole('button', { name: 'Aplicar descuento', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar libro', exact: true }).click();
    await page.getByRole('dialog', { name: 'Falta la imagen de portada', exact: true }).getByRole('button', { name: 'Continuar sin imagen', exact: true }).click();
    await expect.poll(() => control.libros.length).toBe(2);
    expect(control.libros[1].precio_oferta).toBe('75');
    expect(control.libros[1].descuento_hasta).toBeNull();
});

test('alta flotante: Escape cierra solo el descuento, conserva el libro y devuelve el foco al botón', async ({ page }) => {
    await preparar(page);
    await page.goto('/libros');
    const boton = page.getByRole('button', { name: 'Nuevo libro', exact: true });
    await expect(page.locator('[name="titulo"]')).toHaveCount(0);
    await boton.click();
    const libro = page.getByRole('dialog', { name: 'Registrar libro', exact: true });
    await libro.locator('[name="titulo"]').fill('Borrador del libro');
    await libro.locator('[name="precio"]').fill('50');
    await libro.getByRole('button', { name: 'Agregar descuento', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Descuento del libro', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Descuento del libro', exact: true })).toHaveCount(0);
    await expect(libro).toBeVisible();
    await expect(libro.locator('[name="titulo"]')).toHaveValue('Borrador del libro');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await page.keyboard.press('Escape');
    await expect(libro).toHaveCount(0);
    await expect(boton).toBeFocused();
    expect(await page.locator('body').evaluate(el => el.style.overflow)).toBe('');
    await boton.click();
    await expect(libro.locator('[name="titulo"]')).toHaveValue('');
});

for (const width of [390, 1440]) for (const opcion of ['sin descuento', 'con descuento']) {
    test(`registro ${width}px: ofrecer descuento y continuar ${opcion}`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 1000 });
        const control = await preparar(page);
        await page.goto('/libros');
        await page.getByRole('button', { name: 'Nuevo libro', exact: true }).click();
        const libro = page.getByRole('dialog', { name: 'Registrar libro', exact: true });
        await libro.locator('[name="titulo"]').fill(`Libro ${opcion}`);
        await libro.locator('[name="precio"]').fill('100');
        await libro.locator('[name="id_autor"]').selectOption('1');
        await libro.locator('[name="id_categoria"]').selectOption('1');
        await libro.getByRole('button', { name: 'Guardar libro', exact: true }).click();
        await page.getByRole('dialog', { name: 'Falta la imagen de portada', exact: true }).getByRole('button', { name: 'Continuar sin imagen', exact: true }).click();
        const pregunta = page.getByRole('dialog', { name: '¿Deseas agregar un descuento?', exact: true });
        await expect(pregunta).toBeVisible();
        await expect(pregunta).toContainText('S/ 100.00');
        expect(control.escriturasLibros).toEqual([]);
        await pregunta.screenshot({ path: info.outputPath('elegir-descuento.png') });
        expect(await pregunta.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);

        if (opcion === 'sin descuento') {
            await pregunta.getByRole('button', { name: 'Volver al formulario', exact: true }).click();
            await expect(libro.locator('[name="titulo"]')).toHaveValue('Libro sin descuento');
            expect(control.escriturasLibros).toEqual([]);
            await libro.getByRole('button', { name: 'Guardar libro', exact: true }).click();
            await pregunta.getByRole('button', { name: 'Registrar sin descuento', exact: true }).click();
        } else {
            await pregunta.getByRole('button', { name: 'Agregar descuento', exact: true }).click();
            const descuento = page.getByRole('dialog', { name: 'Descuento del libro', exact: true });
            await descuento.getByLabel('Porcentaje', { exact: true }).fill('20');
            await descuento.getByRole('button', { name: 'Aplicar descuento', exact: true }).click();
            await expect(libro).toContainText('20% de descuento');
            expect(control.escriturasLibros).toEqual([]);
            await libro.getByRole('button', { name: 'Guardar libro', exact: true }).click();
        }
        await expect(libro).toHaveCount(0);
        await expect(page.getByText(`Libro ${opcion}`, { exact: true })).toBeVisible();
        expect(control.escriturasLibros).toHaveLength(1);
        expect(control.libros[1].descuento_porcentaje).toBe(opcion === 'con descuento' ? '20' : null);
        expect(control.libros[1].precio_oferta).toBeNull();
    });
}

for (const width of [390, 1440]) test(`portada ${width}px: avisa antes de guardar y permite seleccionar la imagen`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const control = await preparar(page);
    await page.goto('/libros');
    await page.getByRole('button', { name: 'Nuevo libro', exact: true }).click();
    const libro = page.getByRole('dialog', { name: 'Registrar libro', exact: true });
    await libro.locator('[name="titulo"]').fill('Libro con portada');
    await libro.locator('[name="precio"]').fill('40');
    await libro.locator('[name="id_autor"]').selectOption('1');
    await libro.locator('[name="id_categoria"]').selectOption('1');
    await libro.getByRole('button', { name: 'Guardar libro', exact: true }).click();
    const aviso = page.getByRole('dialog', { name: 'Falta la imagen de portada', exact: true });
    await expect(aviso).toBeVisible();
    expect(control.escriturasLibros).toEqual([]);
    await aviso.screenshot({ path: info.outputPath('aviso-portada.png') });
    const selector = page.waitForEvent('filechooser');
    await aviso.getByRole('button', { name: 'Seleccionar portada', exact: true }).click();
    await (await selector).setFiles({ name: 'portada.png', mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
    await expect(libro.locator('img[src^="blob:"]')).toBeVisible();
    await expect(libro.locator('[name="titulo"]')).toHaveValue('Libro con portada');
    await libro.getByRole('button', { name: 'Guardar libro', exact: true }).click();
    await expect(aviso).toHaveCount(0);
    await page.getByRole('dialog', { name: '¿Deseas agregar un descuento?', exact: true }).getByRole('button', { name: 'Registrar sin descuento', exact: true }).click();
    await expect(libro).toHaveCount(0);
    expect(control.escriturasLibros).toHaveLength(1);
    expect(control.portadasSubidas).toEqual([true]);
});
