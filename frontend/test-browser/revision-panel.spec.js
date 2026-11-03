import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const imagen = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const admin = { id_usuario: 1, nombre: 'Admin', apellido: 'Prueba', email: 'admin@example.invalid', rol: 'administrador', estado: 1 };
const autor = { id_autor: 1, nombre: 'María', apellido: 'Lectora', nacionalidad: 'Peruana', estado: 1 };
const categoria = { id_categoria: 1, nombre: 'Literatura', descripcion: 'Libros de narrativa y poesía', estado: 1 };
const libro = {
    id_libro: 1,
    titulo: 'Libro de revisión',
    autor: 'María Lectora',
    id_autor: 1,
    categoria: 'Literatura',
    id_categoria: 1,
    precio: 50,
    stock: 5,
    stock_minimo: 2,
    estado: 1,
    portada: imagen,
    descuento_porcentaje: null,
    precio_oferta: null,
    descuento_hasta: null,
    precio_final: 50,
    descuento_vigente: 0,
    descuento_porcentaje_efectivo: 0
};
const cliente = {
    id_usuario: 7,
    nombre_completo: 'Ana de la Cruz',
    nombre: 'Ana',
    apellido: 'de la Cruz',
    email: 'ana@example.invalid',
    rol: 'cliente',
    estado: 1,
    numero_compras: 2,
    total_compras: 2,
    total_gastado: 75,
    ultima_compra: '2026-11-01T14:00:00Z'
};
const venta = {
    id_venta: 51,
    id_usuario: 7,
    nombre_usuario: 'Ana',
    apellido_usuario: 'de la Cruz',
    correo_usuario: cliente.email,
    total: 50,
    costo_envio: 0,
    origen: 'app',
    canal_compra: 'web',
    external_reference: 'ref-51',
    payu_order_id: 'orden-51',
    payu_payment_status: 'APPROVED',
    estado: 'pagada',
    estado_entrega: 'pendiente',
    tipo_entrega: 'tienda',
    tiene_comprobante: 1,
    fecha_venta: '2026-11-01T14:00:00Z',
    detalles: [{ id_detalle: 1, titulo: libro.titulo, cantidad: 1, precio_unitario: 50, subtotal: 50 }]
};
const comprobante = {
    id_comprobante: 11,
    id_venta: 51,
    tipo: 'boleta',
    serie: 'B001',
    numero: 1,
    estado: 'emitido',
    cliente_nombre: cliente.nombre_completo,
    cliente_dni_ruc: '12345678',
    total: 50,
    subtotal: 50,
    igv: 0,
    costo_envio: 0,
    fecha_emision: '2026-11-01T14:00:00Z',
    items: venta.detalles
};
const hoja = {
    id_reclamacion: 1,
    numero: 'R-0000001',
    tipo: 'reclamo',
    estado: 'pendiente',
    consumidor_nombre: cliente.nombre_completo,
    consumidor_tipo_documento: 'DNI',
    consumidor_documento: '12345678',
    consumidor_email: cliente.email,
    consumidor_domicilio: 'Jr. Marañón 161, Ciudad de Pallasca',
    detalle: 'Consulta de prueba para revisar la distribución de información en teléfonos.',
    pedido: 'Solicito una respuesta de la librería.',
    fecha_registro: '2026-11-01T14:00:00Z',
    fecha_limite: '2099-12-31'
};

async function preparar(page) {
    const control = {
        lecturas: [],
        escrituras: [],
        errores: [],
        fallos: new Set(),
        falloGuardarEmpresa: false,
        empresa: {
            ruc: '20123456789',
            razon_social: 'Empresa de prueba',
            nombre_comercial: 'Librería de prueba',
            direccion: 'Dirección de prueba',
            aplica_igv: 0,
            libros_exonerados: 1,
            tasa_igv: 18,
            exoneracion_libros_hasta: '2026-10-17'
        },
        inventario: Array.from({ length: 12 }, (_, i) => ({
            id_inventario: i + 1,
            id_libro: i + 1,
            titulo: i ? `Libro de stock ${i + 1}` : libro.titulo,
            stock: i === 11 ? 0 : 5,
            stock_minimo: 2,
            ubicacion: `Estante ${i + 1}`,
            ultima_actualizacion: '2026-11-01T14:00:00Z'
        }))
    };
    await page.emulateMedia({ reducedMotion: 'reduce' });
    page.on('pageerror', (e) => control.errores.push(e.message));
    await page.addInitScript((u) => {
        localStorage.setItem('token', 'token-revision');
        localStorage.setItem('usuario', JSON.stringify(u));
    }, admin);
    await page.route(`${API}/**`, async (route) => {
        const req = route.request(),
            url = new URL(req.url()),
            p = url.pathname;
        if (req.method() !== 'GET') {
            control.escrituras.push({ ruta: p, metodo: req.method(), cuerpo: req.postDataJSON() });
            if (p === '/api/empresa' && req.method() === 'PUT') {
                if (control.falloGuardarEmpresa) return route.fulfill({ status: 503, json: { mensaje: 'No se pudieron guardar los datos' } });
                control.empresa = { ...control.empresa, ...req.postDataJSON() };
                return route.fulfill({ json: { success: true, empresa: control.empresa } });
            }
            if (p === '/api/inventario' && req.method() === 'POST') {
                const datos = req.postDataJSON();
                control.inventario.push({ ...datos, id_inventario: 13, titulo: 'Nuevo libro sin stock' });
                return route.fulfill({ json: { success: true, id_inventario: 13 } });
            }
            return route.abort();
        }
        control.lecturas.push(p + url.search);
        if (p.endsWith('/usuarios/perfil')) return route.fulfill({ json: { success: true, data: admin } });
        if (control.fallos.has(p)) return route.fulfill({ status: 503, json: { mensaje: 'Consulta temporalmente no disponible' } });
        if (p === '/api/empresa') return route.fulfill({ json: { success: true, empresa: control.empresa } });
        if (p === '/api/clientes') {
            const lista = url.searchParams.get('q') ? [] : [cliente];
            return route.fulfill({ json: { success: true, clientes: lista, total: lista.length, paginas: 1, resumen: { total_general: 75, con_compras: 1 } } });
        }
        if (p === '/api/comprobantes/resumen') return route.fulfill({ json: { success: true, boletas: 1, facturas: 0, ingresos: 50 } });
        if (p === '/api/comprobantes') {
            const lista = url.searchParams.has('tipo') || url.searchParams.get('envio') === 'pendiente' ? [] : [comprobante];
            return route.fulfill({ json: { success: true, comprobantes: lista, total: lista.length, paginas: 1, filtro_venta: Number(url.searchParams.get('id_venta')) || null } });
        }
        if (p === '/api/comprobantes/11') return route.fulfill({ json: { success: true, comprobante } });
        if (p === '/api/pagos') return route.fulfill({ json: { success: true, pagos: [], total: 0, paginas: 1 } });
        if (p === '/api/anuncios/protagonista/panel') return route.fulfill({ json: { success: true, data: { modo: 'automatico', libro, libro_automatico: libro } } });
        if (p === '/api/anuncios/todos') return route.fulfill({ json: [{ id_anuncio: 1, titulo: 'Video de prueba', estado: 1, video_url: '', fecha_creacion: '2026-11-01' }] });
        let data = [];
        if (p === '/api/libros') data = [libro, { ...libro, id_libro: 99, titulo: 'Nuevo libro sin stock' }];
        if (p === '/api/libros/1') data = libro;
        if (p === '/api/autores') data = [autor];
        if (p === '/api/autores/1') data = autor;
        if (p === '/api/categorias') data = [categoria];
        if (p === '/api/categorias/1') data = categoria;
        if (p === '/api/inventario') data = control.inventario;
        if (/^\/api\/inventario\/libro\/\d+$/.test(p)) data = control.inventario.find((i) => Number(i.id_libro) === Number(p.split('/').at(-1)));
        if (p === '/api/usuarios') data = [admin, cliente];
        if (p === '/api/ventas' || p === '/api/pedidos') data = [venta];
        if (p === '/api/ventas/51' || p === '/api/pedidos/51') data = venta;
        if (p === '/api/reclamaciones') data = [hoja];
        if (p === '/api/reclamaciones/resumen') data = { total: 1, pendientes: 1, vencidos: 0, por_vencer: 0 };
        if (p === '/api/zonas-delivery/todos') data = [{ id_zona: 1, nombre: 'Ciudad de Pallasca', tarifa: 5, estado: 1 }];
        if (p === '/api/reportes/resumen') data = { total_libros: 2, total_autores: 1, total_categorias: 1, total_usuarios: 2, total_vendido: 50 };
        if (p === '/api/reportes/indicadores-ventas') data = {};
        return route.fulfill({ json: { success: true, data, total: Array.isArray(data) ? data.length : 0, paginas: 1 } });
    });
    return control;
}

const vistas = [
    ['/dashboard', 'resumen'],
    ['/libros', 'libros', 'Ver libro'],
    ['/libros?vista=autores', 'autores', 'Ver autor'],
    ['/categorias', 'categorias', 'Ver categoría'],
    ['/inventario', 'stock', 'Ver inventario'],
    ['/ventas', 'ventas', 'Ver venta'],
    ['/ventas/pedidos', 'pedidos', 'Ver detalle'],
    ['/ventas/comprobantes', 'comprobantes', 'Ver comprobante'],
    ['/tarifas-envio', 'delivery'],
    ['/usuarios', 'usuarios', 'Ver usuario'],
    ['/usuarios?vista=clientes', 'clientes', 'Ver detalle del cliente'],
    ['/anuncios', 'protagonista'],
    ['/anuncios', 'videos'],
    ['/reclamaciones', 'reclamaciones', 'Ver y responder'],
    ['/configuracion/empresa', 'empresa']
];

for (const width of [390, 1440])
    test(`revisión sección por sección ${width}px: vistas y detalles utilizables`, async ({ page }, info) => {
        test.setTimeout(150000);
        await page.setViewportSize({ width, height: 1000 });
        const control = await preparar(page);
        for (const [ruta, nombre, detalle] of vistas) {
            await test.step(nombre, async () => {
                await page.goto(ruta);
                if (nombre === 'videos') await page.getByRole('tab', { name: 'Anuncios en video', exact: true }).click();
                await expect(page.locator('main h1')).toHaveCount(1);
                await expect(page.locator('main .skeleton')).toHaveCount(0);
                if (detalle) await expect(page.getByRole('button', { name: detalle, exact: true }).first()).toBeVisible();
                else if (nombre === 'resumen') await expect(page.locator('.dashboard-mosaico')).toBeVisible();
                else if (nombre === 'delivery') await expect(page.getByText('S/ 5.00 por pedido', { exact: true })).toBeVisible();
                else if (nombre === 'empresa') await expect(page.getByText(control.empresa.ruc, { exact: true })).toBeVisible();
                else if (nombre === 'videos') await expect(page.getByRole('region', { name: 'Anuncios de video registrados', exact: true })).toBeVisible();
                else await expect(page.getByText('Libro de revisión', { exact: true }).first()).toBeVisible();
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), nombre).toBe(true);
                await page.screenshot({ path: info.outputPath(`${nombre}-${width}.png`), fullPage: true });
                if (detalle) {
                    await page.getByRole('button', { name: detalle, exact: true }).first().click();
                    const dialogo = page.getByRole('dialog').last();
                    await expect(dialogo).toBeVisible();
                    await expect(dialogo).not.toContainText(/\bundefined\b|\bNaN\b|Invalid Date/);
                    expect(await dialogo.evaluate((el) => el.scrollWidth <= el.clientWidth), nombre).toBe(true);
                    await dialogo.screenshot({ path: info.outputPath(`${nombre}-detalle-${width}.png`) });
                    await page.keyboard.press('Escape');
                    await expect(dialogo).toHaveCount(0);
                }
            });
        }
        await page.getByRole('button', { name: 'Menú del administrador', exact: true }).click();
        await page.getByRole('button', { name: 'Datos del administrador', exact: true }).click();
        const perfil = page.getByRole('dialog', { name: 'Datos del administrador', exact: true });
        await expect(perfil).toContainText(admin.email);
        expect(await perfil.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await perfil.screenshot({ path: info.outputPath(`perfil-${width}.png`) });
        await page.keyboard.press('Escape');
        await expect(perfil).toHaveCount(0);
        await page.getByRole('button', { name: 'Menú del administrador', exact: true }).click();
        await page.getByRole('button', { name: 'Configuración', exact: true }).click();
        const configuracion = page.getByRole('dialog', { name: 'Configuración', exact: true });
        await expect(configuracion).toBeVisible();
        expect(await configuracion.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await configuracion.screenshot({ path: info.outputPath(`configuracion-${width}.png`) });
        expect(control.escrituras).toEqual([]);
        expect(control.errores).toEqual([]);
    });

test('Historial se retira del menú y la URL antigua redirige sin consultar su API', async ({ page }) => {
    const control = await preparar(page);
    await page.goto('/historial');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('link', { name: 'Historial', exact: true })).toHaveCount(0);
    expect(control.lecturas.some((r) => r.startsWith('/api/historial'))).toBe(false);
});

test('Empresa: consulta inicial, cancelar sin escribir y errores de guardado conservan datos', async ({ page }) => {
    const control = await preparar(page);
    await page.goto('/configuracion/empresa');
    await expect(page.getByLabel('RUC', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Editar datos', exact: true }).click();
    await page.getByLabel('Razón social', { exact: true }).fill('Borrador sin guardar');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page.getByText('Empresa de prueba', { exact: true })).toBeVisible();
    expect(control.escrituras).toEqual([]);
    await page.getByRole('button', { name: 'Editar datos', exact: true }).click();
    await page.getByLabel('Razón social', { exact: true }).fill('Empresa actualizada');
    control.falloGuardarEmpresa = true;
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('No se pudieron guardar los datos');
    await expect(page.getByLabel('Razón social', { exact: true })).toHaveValue('Empresa actualizada');
    control.falloGuardarEmpresa = false;
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(page.getByLabel('RUC', { exact: true })).toHaveCount(0);
    await expect(page.locator('main').getByText('Empresa actualizada', { exact: true })).toBeVisible();
});

test('Stock: registro a demanda, cancelación y filtro desde la segunda página', async ({ page }) => {
    const control = await preparar(page);
    await page.goto('/inventario');
    await expect(page.getByLabel('Stock mínimo', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Registrar stock', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Registrar stock', exact: true });
    await expect(modal.getByLabel('Stock mínimo', { exact: true })).toHaveValue('5');
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modal).toHaveCount(0);
    expect(control.escrituras).toEqual([]);
    await page.getByRole('button', { name: 'Página 2', exact: true }).click();
    await expect(page.locator('.data-table-shell tbody')).toContainText('Libro de stock 12');
    await page.getByLabel('Nivel de stock', { exact: true }).selectOption('sin-stock');
    await expect(page.locator('.data-table-shell tbody tr')).toHaveCount(1);
    await expect(page.locator('.data-table-shell tbody')).toContainText('Libro de stock 12');
});

test('Stock: el formulario flotante guarda el registro y actualiza el listado', async ({ page }) => {
    const control = await preparar(page);
    await page.goto('/inventario');
    await page.getByRole('button', { name: 'Registrar stock', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Registrar stock', exact: true });
    await modal.getByLabel('Libro', { exact: true }).selectOption('99');
    await modal.getByLabel('Stock', { exact: true }).fill('3');
    await modal.getByLabel('Ubicación', { exact: true }).fill('Estante nuevo');
    await modal.getByRole('button', { name: 'Guardar inventario', exact: true }).click();
    await expect(modal).toHaveCount(0);
    expect(control.escrituras).toHaveLength(1);
    expect(control.escrituras[0]).toMatchObject({ ruta: '/api/inventario', cuerpo: { id_libro: 99, stock: 3, ubicacion: 'Estante nuevo' } });
    await page.getByRole('button', { name: 'Página 2', exact: true }).click();
    await expect(page.locator('.data-table-shell tbody')).toContainText('Nuevo libro sin stock');
});

test('fallos de listas: Reintentar recupera datos y los indicadores no inventan ceros', async ({ page }) => {
    const control = await preparar(page);
    control.fallos.add('/api/categorias');
    await page.goto('/categorias');
    await expect(page.getByRole('region', { name: 'Resumen de categorías' }).locator('.kpi-valor')).toHaveText(['No disponible', 'No disponible', 'No disponible']);
    control.fallos.delete('/api/categorias');
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Literatura', exact: true })).toBeVisible();
    control.fallos.add('/api/empresa');
    await page.goto('/configuracion/empresa');
    await expect(page.getByRole('button', { name: 'Editar datos', exact: true })).toHaveCount(0);
    await expect(page.getByLabel('RUC', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
    control.fallos.delete('/api/empresa');
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Editar datos', exact: true })).toBeVisible();
});

test('Clientes y comprobantes: un filtro sin coincidencias no afirma que no existan registros', async ({ page }) => {
    await preparar(page);
    await page.goto('/usuarios?vista=clientes');
    await page.getByLabel('Nombre o correo del cliente', { exact: true }).fill('inexistente');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'No se encontraron clientes', exact: true })).toBeVisible();
    await page.goto('/ventas/comprobantes');
    await page.getByLabel('Tipo de comprobante', { exact: true }).selectOption('factura');
    await expect(page.getByRole('heading', { name: 'No se encontraron comprobantes', exact: true })).toBeVisible();
});

test('Resumen: un error inicial tiene recuperación directa sin recargar el navegador', async ({ page }) => {
    const control = await preparar(page);
    control.fallos.add('/api/reportes/resumen');
    await page.goto('/dashboard');
    await expect(page.getByRole('alert')).toContainText('Consulta temporalmente no disponible');
    control.fallos.delete('/api/reportes/resumen');
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await expect(page.locator('.dashboard-mosaico')).toBeVisible();
});

test('Clientes: la ficha de una cuenta eliminada no muestra el correo técnico', async ({ page }) => {
    await preparar(page);
    await page.route(`${API}/clientes*`, (route) =>
        route.fulfill({
            json: { success: true, clientes: [{ ...cliente, nombre_completo: 'Usuario eliminado', email: 'eliminado-7@cuenta-eliminada.invalid' }], total: 1, paginas: 1 }
        })
    );
    await page.goto('/usuarios?vista=clientes');
    await page.getByRole('button', { name: 'Ver detalle del cliente', exact: true }).click();
    const detalle = page.getByRole('dialog', { name: 'Detalle del cliente', exact: true });
    await expect(detalle).toContainText('Cuenta eliminada por su titular');
    await expect(detalle).not.toContainText('cuenta-eliminada.invalid');
});

test('Clientes: una búsqueda tardía no reemplaza el resultado de la consulta más reciente', async ({ page }) => {
    await preparar(page);
    let soltar;
    const espera = new Promise((resolve) => {
        soltar = resolve;
    });
    await page.route(`${API}/clientes?*`, async (route) => {
        const q = new URL(route.request().url()).searchParams.get('q');
        if (q === 'ana') await espera;
        const encontrado = q === 'beatriz' ? { ...cliente, nombre_completo: 'Beatriz Nueva' } : cliente;
        await route.fulfill({ json: { success: true, clientes: [encontrado], total: 1, paginas: 1 } });
    });
    await page.goto('/usuarios?vista=clientes');
    await expect(page.getByRole('button', { name: 'Ver detalle del cliente', exact: true })).toBeVisible();
    const campo = page.getByLabel('Nombre o correo del cliente', { exact: true });
    const antigua = page.waitForRequest((r) => r.url().includes('/clientes?') && new URL(r.url()).searchParams.get('q') === 'ana');
    await campo.fill('ana');
    await campo.press('Enter');
    await antigua;
    await campo.fill('beatriz');
    await campo.press('Enter');
    await expect(page.locator('.data-table-shell tbody')).toContainText('Beatriz Nueva');
    const respuesta = page.waitForResponse((r) => r.url().includes('/clientes?') && new URL(r.url()).searchParams.get('q') === 'ana');
    soltar();
    await respuesta;
    await expect(page.locator('.data-table-shell tbody')).toContainText('Beatriz Nueva');
});

test('Clientes y comprobantes: los importes acumulados no se etiquetan como ventas de 14 días', async ({ page }) => {
    const control = await preparar(page);
    for (const [ruta, nombre, titulo, importe] of [
        ['/usuarios?vista=clientes', 'Resumen de clientes', 'Total comprado', 'S/ 75.00'],
        ['/ventas/comprobantes', 'Resumen de comprobantes', 'Importe emitido', 'S/ 50.00']
    ]) {
        await page.goto(ruta);
        const indicador = page.getByRole('region', { name: nombre }).locator('.indicador-nuevo').filter({ hasText: titulo });
        await expect(indicador.locator('.kpi-valor')).toHaveText(importe);
        await expect(indicador.locator('.kpi-descripcion')).not.toContainText('14 días');
    }
    expect(control.lecturas.some((r) => r.startsWith('/api/reportes/ventas-por-dia'))).toBe(false);
});
