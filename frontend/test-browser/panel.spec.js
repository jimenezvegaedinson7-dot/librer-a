import { test, expect } from '@playwright/test';

const rutas = ['/dashboard','/libros','/autores','/categorias','/inventario','/pedidos','/ventas',
    '/pagos','/comprobantes','/tarifas-envio','/usuarios','/anuncios','/reclamaciones','/historial','/configuracion/empresa'];
const admin = { id_usuario: 1, nombre:'Audit', apellido:'Admin', rol:'administrador', estado:1 };

async function catalogoEditable(page, { antiguo = false, ignorarCambios = false } = {}) {
    await sesion(page); await apiVacia(page);
    let escrituras = 0;
    let libro = {id_libro: 1, titulo: 'Libro con promoción', autor: 'Autor de prueba', categoria: 'Novela',
        id_autor: 1, id_categoria: 1, precio: '100.00', stock: 5, estado: 1};
    if (!antiguo) Object.assign(libro, {descuento_porcentaje: null, precio_oferta: null,
        descuento_hasta: null, descuento_vigente: 0, precio_final: '100.00', descuento_porcentaje_efectivo: 0});
    await page.route('**/api/autores', r => r.fulfill({json: {success:true, data:[{id_autor:1, nombre:'Autor', apellido:'de prueba'}]}}));
    await page.route('**/api/categorias', r => r.fulfill({json: {success:true, data:[{id_categoria:1, nombre:'Novela'}]}}));
    await page.route('**/api/libros**', async route => {
        const req = route.request();
        if (req.method() === 'PUT') {
            escrituras++;
            if (!ignorarCambios) {
                const campo = nombre => req.postData().match(new RegExp(`name="${nombre}"\\r?\\n\\r?\\n([^\\r\\n]*)`))?.[1] || '';
                const porcentaje = campo('descuento_porcentaje');
                const oferta = campo('precio_oferta');
                const final = oferta ? Number(oferta) : porcentaje ? 100 * (100 - Number(porcentaje)) / 100 : 100;
                libro = {...libro, descuento_porcentaje: porcentaje ? Number(porcentaje) : null,
                    precio_oferta: oferta || null, descuento_hasta: campo('descuento_hasta') || null,
                    descuento_vigente: final < 100 ? 1 : 0, precio_final: final.toFixed(2),
                    descuento_porcentaje_efectivo: Math.round(100 - final)};
            }
            return route.fulfill({json: {success:true, mensaje:'Libro actualizado correctamente'}});
        }
        return route.fulfill({json: {success:true, data: new URL(req.url()).pathname === '/api/libros' ? [libro] : libro}});
    });
    await page.goto('/libros');
    return {escrituras: () => escrituras};
}

test('libros: editar porcentaje y oferta, consultar el ojito y quitar promoción', async ({page}) => {
    const errores = []; page.on('pageerror', e => errores.push(e.message));
    const api = await catalogoEditable(page);
    for (const [porcentaje, oferta, precio, estado] of [
        ['25', '', 'S/ 75.00', 'Descuento vigente'],
        ['', '60', 'S/ 60.00', 'Descuento vigente'],
        ['', '', 'S/ 100.00', 'Sin descuento'],
    ]) {
        await page.getByRole('button', {name:'Editar libro', exact:true}).click();
        const editar = page.getByRole('dialog');
        const campoPorcentaje = editar.locator('[name="descuento_porcentaje"]');
        const campoOferta = editar.locator('[name="precio_oferta"]');
        if (await campoPorcentaje.isEnabled()) await campoPorcentaje.fill('');
        if (await campoOferta.isEnabled()) await campoOferta.fill('');
        if (porcentaje) await campoPorcentaje.fill(porcentaje);
        if (oferta) await campoOferta.fill(oferta);
        await editar.getByRole('button', {name:'Guardar cambios', exact:true}).click();
        await expect(editar).toHaveCount(0);
        await page.getByRole('button', {name:'Ver libro', exact:true}).click();
        const detalle = page.getByRole('dialog');
        await expect(detalle.getByText(estado, {exact:true})).toBeVisible();
        await expect(detalle.locator('.detail-tile').filter({hasText:'Precio actual'}).locator('.text-lg')).toHaveText(precio);
        await detalle.getByRole('button', {name:'Cerrar', exact:true}).last().click();
        await expect(detalle).toHaveCount(0);
    }
    expect(api.escrituras()).toBe(3);
    expect(errores).toEqual([]);
});

test('libros: API antigua se señala en el ojito y no permite un guardado falso', async ({page}) => {
    const api = await catalogoEditable(page, {antiguo:true});
    await page.getByRole('button', {name:'Ver libro', exact:true}).click();
    const detalle = page.getByRole('dialog');
    await expect(detalle.getByText('Información no disponible', {exact:true})).toBeVisible();
    await expect(detalle.getByText('Sin descuento', {exact:true})).toHaveCount(0);
    await detalle.getByRole('button', {name:'Cerrar', exact:true}).last().click();
    await page.getByRole('button', {name:'Editar libro', exact:true}).click();
    const editar = page.getByRole('dialog');
    await editar.locator('[name="descuento_porcentaje"]').fill('25');
    await editar.getByRole('button', {name:'Guardar cambios', exact:true}).click();
    await expect(editar.getByText('La API conectada aún no admite descuentos. Actualiza el backend antes de guardar una promoción.')).toBeVisible();
    expect(api.escrituras()).toBe(0);
});

test('libros: HTTP 200 sin persistir descuento conserva el formulario y muestra el error', async ({page}) => {
    const api = await catalogoEditable(page, {ignorarCambios:true});
    await page.getByRole('button', {name:'Editar libro', exact:true}).click();
    const editar = page.getByRole('dialog');
    await editar.locator('[name="descuento_porcentaje"]').fill('25');
    await editar.getByRole('button', {name:'Guardar cambios', exact:true}).click();
    await expect(editar.getByText('El servidor respondió, pero el descuento no quedó guardado como lo enviaste. Revisa el detalle del libro.')).toBeVisible();
    await expect(editar.locator('[name="descuento_porcentaje"]')).toHaveValue('25');
    expect(api.escrituras()).toBe(1);
});

const promocionesDetalle = [
    { nombre: 'sin descuento', datos: {}, estado: 'Sin descuento', precio: 'S/ 100.00' },
    { nombre: 'porcentaje vigente hasta hoy', datos: {descuento_porcentaje: 25,
        descuento_vigente: 1, precio_final: '75.00', descuento_porcentaje_efectivo: 25,
        descuento_hasta: '2026-10-01'}, estado: 'Descuento vigente', precio: 'S/ 75.00' },
    { nombre: 'oferta fija sin fecha', datos: {precio_oferta: '60.00',
        descuento_vigente: 1, precio_final: '60.00', descuento_porcentaje_efectivo: 40},
        estado: 'Descuento vigente', precio: 'S/ 60.00' },
    { nombre: 'descuento vencido', datos: {descuento_porcentaje: 25,
        descuento_hasta: '2026-09-30'}, estado: 'Descuento vencido', precio: 'S/ 100.00' },
];
for (const width of [390, 1440]) {
    for (const caso of promocionesDetalle) {
        test(`ojito libro: ${caso.nombre} a ${width}px`, async ({page}) => {
            await page.setViewportSize({width, height: 900});
            // Perú todavía está en el día 1; la fecha DATE no puede correrse
            // al día anterior cuando se formatea el fin de la promoción.
            await page.clock.setFixedTime(new Date('2026-10-02T03:00:00Z'));
            const errores = []; page.on('pageerror', e => errores.push(e.message));
            const libro = {id_libro: 1, titulo: 'Libro para revisar oferta', autor: 'Autor de prueba',
                categoria: 'Novela', precio: '100.00', stock: 5, estado: 1,
                descuento_porcentaje: null, precio_oferta: null, descuento_hasta: null,
                precio_final: '100.00', descuento_vigente: 0, ...caso.datos};
            await sesion(page); await apiVacia(page);
            await page.route('**/api/libros', r => r.fulfill({json: {success: true, data: [libro]}}));
            await page.route('**/api/libros/1', r => r.fulfill({json: {success: true, data: libro}}));
            await page.goto('/libros');
            await page.getByRole('button', {name: 'Ver libro', exact: true}).click();
            const modal = page.getByRole('dialog');
            await expect(modal.getByText(caso.estado, {exact: true})).toBeVisible();
            const precio = modal.locator('.detail-tile').filter({hasText: 'Precio actual'});
            await expect(precio.locator('.text-lg')).toHaveText(caso.precio);
            if (libro.descuento_vigente) {
                await expect(precio.locator('.line-through')).toHaveText('S/ 100.00');
            } else {
                await expect(precio.locator('.line-through')).toHaveCount(0);
            }
            if (libro.descuento_porcentaje) {
                await expect(modal.getByText('Descuento configurado', {exact: true})).toBeVisible();
                await expect(modal.getByText('25%', {exact: true})).toBeVisible();
            }
            if (libro.precio_oferta !== null) {
                const promocion = modal.locator('.detail-tile').filter({hasText: 'Promoción'});
                await expect(promocion.getByText('Precio de oferta configurado', {exact: true})).toBeVisible();
                await expect(promocion.getByText('S/ 60.00', {exact: true})).toBeVisible();
                await expect(promocion.getByText('Sin límite de fecha', {exact: true})).toBeVisible();
            }
            if (caso.datos.descuento_hasta === '2026-10-01') {
                await expect(modal.getByText(/01.*octubre.*2026/)).toBeVisible();
            }
            if (caso.estado === 'Descuento vencido') {
                await expect(modal.getByText('La promoción terminó. Actualmente se cobra el precio normal.')).toBeVisible();
            }
            if (caso.estado === 'Sin descuento') {
                await expect(modal.getByText('Este libro no tiene una promoción configurada.')).toBeVisible();
            }
            expect(await modal.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
            expect(errores).toEqual([]);
        });
    }
}

test('anuncios: alta con video, cambio de visibilidad y eliminación desde el panel', async ({page}) => {
    await sesion(page); await apiVacia(page);
    const errores = []; page.on('pageerror', e => errores.push(e.message));
    let lista = [], altas = 0;
    await page.route('**/api/anuncios**', async route => {
        const request = route.request();
        const method = request.method();
        if (method === 'GET') return route.fulfill({json: lista});
        if (method === 'POST') {
            const body = request.postData();
            expect(body).toContain('name="video"');
            expect(body).toContain('name="titulo"');
            altas++;
            lista = [{id_anuncio: 1, titulo: 'Promo de prueba', estado: 1, created_at: '2026-10-01'}];
        } else if (method === 'PUT') {
            expect(request.postData()).toContain('name="estado"');
            lista = [{...lista[0], estado: 0}];
        } else if (method === 'DELETE') {
            expect(request.postDataJSON()).toEqual({password: 'ClaveDePrueba123'});
            lista = [];
        }
        return route.fulfill({status: method === 'POST' ? 201 : 200,
            json: {success: true, mensaje: 'Guardado', anuncio: lista[0]}});
    });
    await page.goto('/anuncios');
    await page.getByRole('button', {name: 'Nuevo anuncio', exact: true}).click();
    await page.getByRole('textbox', {name: 'Título', exact: true}).fill('Promo de prueba');
    await page.locator('#campo-video').setInputFiles('test-browser/fixtures/anuncio.webm');
    await expect(page.locator('#form-anuncio video')).toHaveAttribute('src', /^blob:/);
    await page.getByRole('button', {name: 'Publicar anuncio', exact: true}).click();
    await expect(page.getByText('En portada', {exact: true})).toBeVisible();
    expect(altas).toBe(1);
    await page.getByRole('button', {name: 'Ocultar', exact: true}).click();
    await expect(page.getByText('Inactivo', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Eliminar', exact: true}).click();
    await page.getByLabel('Contraseña del administrador').fill('ClaveDePrueba123');
    await page.getByRole('button', {name: 'Confirmar eliminación'}).click();
    await expect(page.getByText('Sin anuncios', {exact: true})).toBeVisible();
    expect(errores).toEqual([]);
});
test('anuncios: respuesta real en array muestra portada, espera y ocultos sin errores', async ({page}) => {
    const errores = []; page.on('pageerror', e => errores.push(e.message));
    await sesion(page); await apiVacia(page);
    await page.route('**/api/anuncios/todos', route => route.fulfill({json: [
        {id_anuncio: 3, titulo: 'Promo actual', estado: 1, created_at: '2026-10-01'},
        {id_anuncio: 2, titulo: 'Promo anterior', estado: 1, created_at: '2026-09-30'},
        {id_anuncio: 1, titulo: 'Promo oculta', estado: 0, created_at: '2026-09-29'},
    ]}));
    await page.goto('/anuncios');
    await expect(page.getByText('Promo actual', {exact: true}).last()).toBeVisible();
    await expect(page.getByText('En portada', {exact: true})).toBeVisible();
    await expect(page.getByText('Activo · en espera', {exact: true})).toBeVisible();
    await expect(page.getByText('Inactivo', {exact: true})).toBeVisible();
    expect(errores).toEqual([]);
});
async function sesion(page, usuario = admin, token = 'audit-token') {
    await page.addInitScript(({ usuario, token }) => {
        if (token) localStorage.setItem('token', token);
        if (usuario) localStorage.setItem('usuario', JSON.stringify(usuario));
    }, { usuario, token });
}
function vacio(url) {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith('/usuarios/perfil')) return {success:true,data:admin};
    if (pathname === '/api/empresa') return {success:true,empresa:{ruc:'10447545387',razon_social:'Audit',tasa_igv:18}};
    if (pathname.endsWith('/resumen') || pathname.endsWith('/indicadores-ventas')) return {success:true,data:{},pagado:0,boletas:0,ingresos:0};
    if (pathname === '/api/pagos') return {success:true,pagos:[],total:0,paginas:1};
    if (pathname === '/api/comprobantes') return {success:true,comprobantes:[],total:0,paginas:1};
    return {success:true,data:[]};
}
async function apiVacia(page) {
    await page.route('http://127.0.0.1:59999/api/**', route => route.fulfill({json:vacio(route.request().url())}));
}
for (const rol of ['cajero','cliente','anónimo']) {
    test(`URL manual todas las pantallas: ${rol} rechazado`, async ({page}) => {
        await sesion(page, rol === 'anónimo' ? null : {...admin,rol}, rol === 'anónimo' ? null : 'audit-token');
        await apiVacia(page);
        for (const ruta of rutas.concat('/personalizacion')) {
            await page.goto(ruta);
            await expect(page).toHaveURL('http://127.0.0.1:5179/admin/login');
            await expect(page.getByRole('complementary', {name:'Navegación principal'})).toHaveCount(0);
        }
    });
}
for (const caso of ['token inválido','inactivo','eliminado']) {
    test(`sesión antigua ${caso}: no abre personalización sin revalidar`, async ({page}) => {
        await sesion(page);
        await page.route('http://127.0.0.1:59999/api/**',route => route.fulfill({status:401,json:{success:false,mensaje:'Cuenta desactivada'}}));
        await page.goto('/personalizacion');
        await expect(page).toHaveURL('http://127.0.0.1:5179/admin/login');
        await expect(page.getByRole('complementary', {name:'Navegación principal'})).toHaveCount(0);
    });
}
for (const ruta of rutas) {
    test(`admin ${ruta}: estado vacío sin errores de render ni valores rotos`, async ({page}) => {
        const errores = []; page.on('pageerror',e => errores.push(e.message));
        await sesion(page); await apiVacia(page); await page.goto(ruta);
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('main h1').first()).toBeVisible();
        await expect(page.locator('main .skeleton').first()).toHaveCount(0, {timeout:10000});
        expect(errores).toEqual([]);
        expect(await page.locator('main').innerText()).not.toMatch(/\bNaN\b|\bundefined\b|\[object Object\]/);
        await expect(page.getByRole('button',{name:/Nueva venta/i})).toHaveCount(0);
    });
    test(`admin ${ruta}: error de API visible sin romper pantalla`, async ({page}) => {
        const errores = []; page.on('pageerror',e => errores.push(e.message));
        await sesion(page); await apiVacia(page);
        await page.route('http://127.0.0.1:59999/api/**',route => new URL(route.request().url()).pathname.endsWith('/usuarios/perfil') ?
            route.fulfill({json:{success:true,data:admin}}) :
            route.fulfill({status:400,json:{success:false,mensaje:'Fallo de auditoría'}}));
        await page.goto(ruta);
        await expect(page.getByText('Fallo de auditoría',{exact:true}).first()).toBeVisible();
        expect(errores).toEqual([]);
    });
}
test('sidebar admin: todos los links activos resuelven URL y pantalla', async ({page}) => {
    await sesion(page); await apiVacia(page); await page.goto('/dashboard');
    const sidebar = page.getByRole('complementary', {name:'Navegación principal'});
    await expect(sidebar).toBeVisible();
    const hrefs = await sidebar.locator('a').evaluateAll(as => as.map(a => a.getAttribute('href')));
    expect(hrefs.sort()).toEqual([...rutas].sort());
    for (const ruta of hrefs) {
        await sidebar.locator(`a[href="${ruta}"]`).click();
        await expect(page).toHaveURL(`http://127.0.0.1:5179${ruta}`);
        await expect(page.locator('main h1').first()).toBeVisible();
    }
});
test('rol degradado en backend: localStorage admin no autoriza URL manual', async ({page}) => {
    await sesion(page); await apiVacia(page);
    await page.route('**/api/usuarios/perfil',route => route.fulfill({json:{success:true,data:{...admin,rol:'cliente'}}}));
    await page.goto('/personalizacion');
    await expect(page).toHaveURL('http://127.0.0.1:5179/admin/login');
});
test('alta autor: doble submit no duplica, error backend visible y conserva campos', async ({page}) => {
    await sesion(page); await apiVacia(page);
    let escrituras = 0;
    await page.route('**/api/autores', async route => {
        if (route.request().method() !== 'POST') return route.fulfill({json:{success:true,data:[]}});
        escrituras++; await new Promise(r => setTimeout(r,500));
        await route.fulfill({status:409,json:{success:false,mensaje:'Conflicto de auditoría'}});
    });
    await page.goto('/autores');
    await page.getByLabel('Nombre', {exact:true}).fill('Audit');
    await page.getByLabel('Apellido', {exact:true}).fill('Autor');
    const form = page.locator('form').filter({has:page.getByRole('button',{name:'Guardar autor'})});
    await form.evaluate(el => { el.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); el.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); });
    await expect(page.getByRole('button',{name:'Guardando...'})).toBeDisabled();
    await expect(page.getByText('Conflicto de auditoría', {exact:true})).toBeVisible();
    expect(escrituras).toBe(1);
    await expect(page.getByLabel('Nombre',{exact:true})).toHaveValue('Audit');
});
test('editar autor: backend falla, modal sigue abierto y muestra el mensaje', async ({page}) => {
    await sesion(page); await apiVacia(page);
    const autor = {id_autor:1,nombre:'Audit',apellido:'Autor',estado:1};
    await page.route('**/api/autores*',route => route.fulfill({json:{success:true,data:[autor]}}));
    await page.route('**/api/autores/1',route => route.fulfill(route.request().method() === 'PUT' ?
        {status:400,json:{success:false,mensaje:'Edición rechazada'}} : {json:{success:true,data:autor}}));
    await page.goto('/autores'); await page.getByTitle('Editar autor',{exact:true}).click();
    await page.getByRole('button',{name:'Guardar cambios'}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Edición rechazada',{exact:true})).toBeVisible();
});
test('ventas legacy: consulta disponible sin botones de escritura', async ({page}) => {
    await sesion(page); await apiVacia(page);
    await page.route('**/api/ventas',route => route.fulfill({json:{success:true,data:[
        {id_venta:1,origen:'panel',estado:'pagada',total:10},
        {id_venta:2,origen:'reserva',estado:'pagada',total:20}
    ]}}));
    await page.goto('/ventas');
    await expect(page.getByTitle('Ver venta',{exact:true})).toHaveCount(2);
    for(const nombre of ['Confirmar entrega','Emitir boleta','Emitir factura','Reembolsar venta']) await expect(page.getByTitle(nombre,{exact:true})).toHaveCount(0);
});
test('autores: loading visible y estado vacío explícito al terminar', async ({page}) => {
    await sesion(page); await apiVacia(page);
    let liberar;
    const espera=new Promise(resolve => {liberar=resolve;});
    await page.route('**/api/autores',async route => {await espera; await route.fulfill({json:{success:true,data:[]}});});
    await page.goto('/autores');
    await expect(page.locator('main .skeleton').first()).toBeVisible();
    liberar();
    await expect(page.getByText('No hay autores registrados',{exact:true})).toBeVisible();
});
test('rutas guardadas de reportes y cierre de caja resuelven al Dashboard', async ({page}) => {
    await sesion(page); await apiVacia(page);
    for(const ruta of ['/reportes','/cierre-caja']) {
        await page.goto(ruta); await expect(page).toHaveURL('http://127.0.0.1:5179/dashboard');
        await expect(page.getByRole('heading',{name:'Resumen',exact:true})).toBeVisible();
    }
});

test('usuarios: solo administrador y cliente en filtros, selector, contador y detalle', async ({page}) => {
    await sesion(page); await apiVacia(page);
    const usuarios = [admin, {id_usuario:2,nombre:'Audit',apellido:'Cliente',rol:'cliente',estado:1},
        {id_usuario:3,nombre:'Cuenta',apellido:'Histórica',rol:'cajero',estado:0}];
    await page.route('http://127.0.0.1:59999/api/usuarios*',route => route.request().url().includes('/perfil') ?
        route.fulfill({json:{success:true,data:admin}}) : route.fulfill({json:{success:true,data:usuarios}}));
    await page.goto('/usuarios');
    await expect(page.getByTitle('Ver usuario',{exact:true})).toHaveCount(3);
    expect(await page.locator('main').innerText()).not.toMatch(/cajer/i);
    await expect(page.getByRole('combobox',{name:'Filtrar por rol'}).locator('option'))
        .toHaveText(['Todos los roles','Administradores','Clientes']);
    const fila = page.locator('tr').filter({hasText:'Audit Cliente'});
    await expect(fila.getByTitle('Cambiar rol',{exact:true}).locator('option')).toHaveText(['Cliente','Administrador']);
    await page.locator('tr').filter({hasText:'Cuenta Histórica'}).getByTitle('Ver usuario',{exact:true}).click();
    expect(await page.getByRole('dialog').innerText()).not.toMatch(/cajer/i);
    await expect(page.getByRole('dialog').getByText('Rol no válido',{exact:true})).toBeVisible();
});

test('login de una cuenta sin permiso no ofrece un rol retirado', async ({page}) => {
    await page.route('http://127.0.0.1:59999/api/auth/login',route => route.fulfill({json:{success:true,token:'test',data:{...admin,rol:'cliente'}}}));
    await page.goto('/admin/login');
    await page.locator('input[type=email]').fill('audit@example.test');
    await page.locator('input[type=password]').fill('Audit-only-123!');
    await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
    await expect(page.getByText('Este panel es solo para administradores',{exact:true})).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/cajer/i);
});
