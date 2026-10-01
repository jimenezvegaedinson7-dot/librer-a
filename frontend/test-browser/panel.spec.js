import { test, expect } from '@playwright/test';

const rutas = ['/dashboard','/libros','/autores','/categorias','/inventario','/pedidos','/ventas',
    '/pagos','/comprobantes','/tarifas-envio','/usuarios','/reclamaciones','/historial','/configuracion/empresa'];
const admin = { id_usuario: 1, nombre:'Audit', apellido:'Admin', rol:'administrador', estado:1 };
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
