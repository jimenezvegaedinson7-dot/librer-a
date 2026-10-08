import { test, expect } from '@playwright/test';

const API='http://127.0.0.1:59999/api';
const cliente={id_usuario:2,nombre:'Cliente',apellido:'Web',email:'cliente@example.test',rol:'cliente',estado:1};
const libro={id_libro:1,titulo:'Libro de prueba web',autor:'Autor de prueba',categoria:'Novela',precio:100,precio_final:75,descuento_vigente:1,descuento_porcentaje_efectivo:25,stock:5,estado:1,
    portada:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',sinopsis:'Descripción del libro de prueba.'};
const PORTADA='data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
async function api(page,{rol='cliente',fallarPrimera=false}={}) {
    const ordenes=[],favoritosQuitados=[];let pagada=false,cancelada=false,favoritos=[{...libro,portada:PORTADA}];
    await page.addInitScript(()=>{
        localStorage.setItem('token','token-administrador');
        localStorage.setItem('usuario',JSON.stringify({id_usuario:1,nombre:'Administrador',rol:'administrador'}));
    });
    await page.route(`${API}/**`,async route=>{
        const req=route.request(),ruta=new URL(req.url()).pathname;
        if(ruta==='/api/libros')return route.fulfill({json:{success:true,data:[{...libro,portada:PORTADA}]}});
        if(ruta==='/api/libros/1')return route.fulfill({json:{success:true,data:libro}});
        if(ruta==='/api/auth/login')return route.fulfill({json:{success:true,token:'token-cliente',data:{...cliente,rol}}});
        if(ruta==='/api/auth/registro')return route.fulfill({status:201,json:{success:true,requiere_verificacion_email:true,mensaje:'Revisa tu correo para verificar tu cuenta.'}});
        if(ruta==='/api/auth/verificar-email')return route.fulfill({json:{success:true,mensaje:'Cuenta verificada correctamente.'}});
        if(ruta==='/api/usuarios/perfil')return route.fulfill({json:{success:true,data:cliente}});
        if(ruta==='/api/zonas-delivery')return route.fulfill({json:{success:true,data:[{id_zona:1,nombre:'Zona de prueba',tarifa:7.5,estado:1}]}});
        if(ruta==='/api/pagos/capacidades')return route.fulfill({json:{success:true,data:{compras_web:true,moneda:'PEN',cobertura:'pallasca'}}});
        if(ruta==='/api/pagos/crear-orden') {
            ordenes.push({body:req.postDataJSON(),token:req.headers().authorization});
            if(fallarPrimera && ordenes.length===1)return route.abort('failed');
            const envio=req.postDataJSON().tipo_entrega==='domicilio'?7.5:0;
            return route.fulfill({status:201,json:{success:true,data:{id_venta:10,order_id:'orden_web_10',total:75+envio,costo_envio:envio,checkout_url:`${API}/pagos/checkout/orden_web_10`}}});
        }
        if(ruta==='/api/ventas/mis-ventas')return route.fulfill({json:{success:true,data:[{id_venta:10,canal_compra:'web',origen:'app',cobertura_entrega:'pallasca',tipo_entrega:'tienda',estado:cancelada?'cancelada':pagada?'pagada':'pendiente',estado_entrega:'pendiente',total:75,costo_envio:0,external_reference:'orden_web_10',detalle:[{id_libro:1,titulo:libro.titulo,cantidad:1,precio_unitario:75,subtotal:75}]}]}});
        if(ruta==='/api/pagos/orden_web_10'){pagada=true;return route.fulfill({json:{success:true,data:{status:'APPROVED'}}});}
        if(ruta==='/api/favoritos')return route.fulfill({json:{success:true,data:favoritos}});
        if(ruta==='/api/favoritos/1' && req.method()==='DELETE'){favoritosQuitados.push(req.headers().authorization);favoritos=[];return route.fulfill({json:{success:true}});}
        if(ruta==='/api/anuncios')return route.fulfill({json:{success:true,anuncio:null}});
        if(ruta==='/api/app/version')return route.fulfill({json:{version:'1.0.4',versionCode:5,sha256:'a'.repeat(64),apkUrl:'https://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/v1.0.4/libreria-1.0.4.apk'}});
        return route.fulfill({json:{success:true,data:[]}});
    });
    return {ordenes,favoritosQuitados,cancelar:()=>{cancelada=true;}};
}
async function login(page) {
    await page.getByLabel('Correo electrónico',{exact:true}).fill(cliente.email);
    await page.getByLabel('Contraseña',{exact:true}).fill('Compra-Web-123!');
    await page.getByRole('button',{name:'Entrar',exact:true}).click();
}
async function hastaCheckout(page) {
    await page.goto('/catalogo');
    await page.getByRole('button',{name:`Agregar ${libro.titulo} al carrito`,exact:true}).click();
    await page.locator('.cabecera .compra-carrito').click();
    await expect(page.getByText('S/ 75.00 por unidad',{exact:true})).toBeVisible();
    await page.getByRole('link',{name:'Continuar con la compra',exact:true}).click();
    await page.getByRole('link',{name:'Ingresar para comprar',exact:true}).click();
    await login(page);
    await expect(page.getByLabel('Número de documento',{exact:true})).toBeVisible();
}
for(const ancho of [390,1440]) {
    test(`compra web ${ancho}px: carrito, sesión separada, recojo, PayU y confirmación`,async({page})=>{
        await page.setViewportSize({width:ancho,height:1000});
        const errores=[];page.on('pageerror',e=>errores.push(e.message));
        const peticiones=[];page.on('request',r=>{if(r.url().includes('/api/libros'))peticiones.push(r.headers().authorization);});
        const control=await api(page);await hastaCheckout(page);
        await page.getByLabel('Número de documento',{exact:true}).fill('12345678');
        await expect(page.getByLabel('Dirección',{exact:true})).toHaveCount(0);
        await page.getByRole('button',{name:'Crear pedido y continuar al pago',exact:true}).click();
        await expect(page.getByRole('heading',{name:'Tu pedido está creado',exact:true})).toBeVisible();
        await expect(page.getByRole('link',{name:'Pagar con PayU',exact:true})).toHaveAttribute('href',`${API}/pagos/checkout/orden_web_10`);
        expect(control.ordenes).toHaveLength(1);
        expect(control.ordenes[0].token).toBe('Bearer token-cliente');
        expect(control.ordenes[0].body).toMatchObject({canal_compra:'web',tipo_entrega:'tienda',items:[{id_libro:1,cantidad:1}]});
        expect(control.ordenes[0].body).not.toHaveProperty('costo_envio');
        expect(control.ordenes[0].body.items[0]).not.toHaveProperty('precio');
        expect(await page.evaluate(()=>localStorage.getItem('token'))).toBe('token-administrador');
        await page.screenshot({path:test.info().outputPath(`checkout-web-${ancho}.png`),fullPage:true});
        await page.getByRole('link',{name:'Consultar mis compras',exact:true}).click();
        await expect(page.getByText('Pendiente de pago',{exact:true})).toBeVisible();
        await expect(page.locator('.cabecera .compra-carrito')).toHaveText('Carrito (1)');
        await page.getByRole('button',{name:'Verificar pago de compra #10',exact:true}).click();
        await expect(page.getByText('Pagada',{exact:true})).toBeVisible();
        await expect(page.locator('.cabecera .compra-carrito')).toHaveText('Carrito');
        expect(peticiones.every(t=>!t)).toBe(true);expect(errores).toEqual([]);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    });
}
test('compra web: delivery por zona y referencia; reintento conserva la clave después de un error de red',async({page})=>{
    const control=await api(page,{fallarPrimera:true});await hastaCheckout(page);
    await page.getByLabel('Delivery dentro de Pallasca — Tarifa por zona',{exact:true}).check();
    await page.getByLabel('Zona de delivery',{exact:true}).selectOption('1');
    await page.getByLabel('Dirección',{exact:true}).fill('Dirección de prueba Pallasca');
    await page.getByLabel('Referencia de dirección (opcional)',{exact:true}).fill('Referencia de prueba');
    await page.getByLabel('Número de documento',{exact:true}).fill('12345678');
    await page.getByRole('button',{name:'Crear pedido y continuar al pago',exact:true}).click();
    await expect(page.getByRole('button',{name:'Recuperar mi pedido',exact:true})).toBeVisible();
    await page.reload();
    await page.getByRole('button',{name:'Recuperar mi pedido',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Tu pedido está creado',exact:true})).toBeVisible();
    expect(control.ordenes).toHaveLength(2);expect(control.ordenes[1].body).toEqual(control.ordenes[0].body);
    expect(control.ordenes[1].body).toMatchObject({tipo_entrega:'domicilio',id_zona_delivery:1,referencia:'Referencia de prueba'});
    await expect(page.getByText('S/ 82.50',{exact:true})).toBeVisible();
});
test('cuenta web: registro, verificación de correo y bloqueo del rol administrador',async({page})=>{
    await api(page,{rol:'administrador'});await page.goto('/cuenta');
    await page.getByRole('button',{name:'Crear una cuenta',exact:true}).click();
    await page.getByLabel('Nombre',{exact:true}).fill('Cliente');await page.getByLabel('Apellido',{exact:true}).fill('Web');
    await page.getByLabel('Correo electrónico',{exact:true}).fill(cliente.email);
    await page.getByLabel('Contraseña',{exact:true}).fill('Compra-Web-123!');await page.getByLabel('Confirmar contraseña',{exact:true}).fill('Compra-Web-123!');
    await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Verifica tu correo',exact:true})).toBeVisible();
    await page.getByLabel('Código de seis dígitos',{exact:true}).fill('123456');await page.getByRole('button',{name:'Continuar',exact:true}).click();
    await login(page);await expect(page.getByRole('alert')).toContainText('cuenta de cliente');
    expect(await page.evaluate(()=>localStorage.getItem('libreria-web-cliente-v1'))).toBeNull();
});

test('pago cancelado conserva el carrito y libera el intento para una nueva compra',async({page})=>{
    const control=await api(page);await hastaCheckout(page);
    await page.getByLabel('Número de documento',{exact:true}).fill('12345678');
    await page.getByRole('button',{name:'Crear pedido y continuar al pago',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Tu pedido está creado',exact:true})).toBeVisible();
    control.cancelar();await page.getByRole('link',{name:'Consultar mis compras',exact:true}).click();
    await expect(page.getByText('Cancelada',{exact:true})).toBeVisible();
    await expect(page.locator('.cabecera .compra-carrito')).toHaveText('Carrito (1)');
    expect(await page.evaluate(()=>localStorage.getItem('libreria-web-intento-2'))).toBeNull();
    await page.locator('.cabecera .compra-carrito').click();
    await page.getByRole('link',{name:'Continuar con la compra',exact:true}).click();
    await expect(page.getByRole('button',{name:'Crear pedido y continuar al pago',exact:true})).toBeVisible();
});

test('mis compras muestra la portada del catálogo y favoritos se abre desde Mi cuenta',async({page})=>{
    const control=await api(page);await page.goto('/cuenta');await login(page);
    await expect(page.getByRole('heading',{name:'Mi cuenta',exact:true})).toBeVisible();
    await page.goto('/mis-compras');
    const compra=page.locator('.compra-registro').first();
    await expect(compra.getByAltText(`Portada de ${libro.titulo}`)).toBeVisible();
    await expect(compra.getByRole('link',{name:`Ver ${libro.titulo}`,exact:true})).toHaveAttribute('href','/libro/1');
    // Favoritos vive dentro del perfil, no en la cabecera.
    await expect(page.locator('header').getByRole('link',{name:/favoritos/i})).toHaveCount(0);
    await page.goto('/cuenta');await page.getByRole('link',{name:/Mis favoritos/}).click();
    await expect(page.getByRole('heading',{name:'Mis favoritos',exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:libro.titulo,level:2})).toBeVisible();
    await expect(page.getByAltText(`Portada de ${libro.titulo}`)).toBeVisible();
    await page.getByRole('button',{name:`Quitar ${libro.titulo} de favoritos`,exact:true}).click();
    await expect(page.getByText('Todavía no tienes favoritos')).toBeVisible();
    expect(control.favoritosQuitados).toEqual(['Bearer token-cliente']);
});
test('favoritos sin sesión pide ingresar',async({page})=>{
    await api(page);await page.goto('/favoritos');
    await expect(page.getByText('Inicia sesión para ver tus libros favoritos.')).toBeVisible();
    await expect(page.getByRole('link',{name:'Ingresar',exact:true})).toHaveAttribute('href','/cuenta?continuar=/favoritos');
});
test('mi cuenta muestra los datos del cliente y sus accesos',async({page})=>{
    await api(page);
    const datos={...cliente,nombre:'Lucía',apellido:'Ramos',email:'lucia@example.test',telefono:'987654321',fecha_registro:'2026-08-14T10:00:00Z',email_verified_at:'2026-08-14T10:05:00Z'};
    await page.route('**/api/usuarios/perfil',r=>r.fulfill({json:{success:true,data:datos}}));
    await page.route('**/api/auth/login',r=>r.fulfill({json:{success:true,token:'token-cliente',data:datos}}));
    // Tras entrar, sin otro destino, se llega directamente al perfil.
    await page.goto('/cuenta');await login(page);await expect(page).toHaveURL(/\/cuenta$/);
    const misDatos=page.getByRole('region',{name:'Mis datos'});
    for(const valor of ['Lucía','Ramos','lucia@example.test','987654321','Verificado'])await expect(misDatos).toContainText(valor);
    await expect(page.getByRole('navigation',{name:'Accesos de mi cuenta'}).getByRole('link',{name:/Mis compras/})).toHaveAttribute('href','/mis-compras');
    await page.getByRole('button',{name:'Cerrar sesión de cliente',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Iniciar sesión',exact:true})).toBeVisible();
});
