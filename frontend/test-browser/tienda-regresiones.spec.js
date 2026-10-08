import { test, expect } from '@playwright/test';

const a={id_usuario:2,nombre:'ClienteA',apellido:'Web',email:'a@example.test',rol:'cliente',estado:1};
const b={...a,id_usuario:3,nombre:'ClienteB',email:'b@example.test'};
const imagen='data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const libros=[{id_libro:1,titulo:'Libro auditoría',autor:'Autor',precio:100,precio_final:75,descuento_vigente:1,
    descuento_porcentaje_efectivo:25,estado:1,stock:9,portada:imagen},
    {id_libro:2,titulo:'Otro libro nuevo',autor:'Autor',precio:20,precio_final:20,estado:1,stock:9,portada:imagen}];

async function preparar(context,{sesion=true,perderPrimera=false,expirarReintento=false,sinLocks=false}={}) {
    const estado={posts:[],ventas:new Map(),pagada:false,perfilStatus:200,esperaCatalogo:0,esperaPost:null,respuestaPost:201};
    await context.addInitScript(({a,sesion,sinLocks})=>{
        if(sinLocks)Object.defineProperty(navigator,'locks',{value:undefined,configurable:true});
        if(localStorage.getItem('auditoria-sembrada'))return;
        localStorage.setItem('auditoria-sembrada','1');
        localStorage.setItem('token','admin-intacto');
        if(sesion)localStorage.setItem('libreria-web-cliente-v1',JSON.stringify({token:'tokenA',usuario:a,generacion:'inicial-A'}));
        localStorage.setItem('libreria-web-carrito-2',JSON.stringify([{id_libro:1,cantidad:1}]));
    },{a,sesion,sinLocks});
    // Interceptar TODO antes de navegar: tampoco hay imágenes, correos ni
    // llamadas accidentales a producción al ejercer los flujos de compra.
    await context.route('**/*',async route=>{
        const req=route.request(),url=new URL(req.url()),ruta=url.pathname;
        if(ruta.startsWith('/api/')) {
            const usuario=req.headers().authorization==='Bearer tokenB'?b:a;
            let data=[];
            if(ruta==='/api/libros'){if(estado.esperaCatalogo)await new Promise(r=>setTimeout(r,estado.esperaCatalogo));data=libros;}
            if(ruta==='/api/usuarios/perfil')return route.fulfill({status:estado.perfilStatus,
                json:{success:estado.perfilStatus===200,data:usuario,mensaje:'Fallo temporal del perfil'}});
            if(ruta==='/api/auth/login')return route.fulfill({json:{success:true,token:req.postDataJSON().email===b.email?'tokenB':'tokenA-renovado',data:req.postDataJSON().email===b.email?b:a}});
            if(ruta==='/api/pagos/capacidades')data={compras_web:true};
            if(ruta==='/api/zonas-delivery')data=[{id_zona:1,nombre:'Zona original',tarifa:7.5,estado:1}];
            if(ruta==='/api/pagos/crear-orden') {
                const body=req.postDataJSON();estado.posts.push({body,token:req.headers().authorization});
                if(!estado.ventas.has(body.idempotencia_clave))estado.ventas.set(body.idempotencia_clave,{id_venta:10+estado.ventas.size,body,id_usuario:usuario.id_usuario});
                const venta=estado.ventas.get(body.idempotencia_clave);
                if(estado.esperaPost)await estado.esperaPost;
                if(perderPrimera && estado.posts.length===1)return route.abort('failed');
                if(expirarReintento && estado.posts.length===2)return route.fulfill({status:401,json:{success:false,mensaje:'El token ha expirado'}});
                if(estado.respuestaPost===401)return route.fulfill({status:401,json:{success:false,mensaje:'El token ha expirado'}});
                data={id_venta:venta.id_venta,total:75+(body.tipo_entrega==='domicilio'?7.5:0),checkout_url:`http://127.0.0.1:59999/api/pagos/checkout/test${venta.id_venta}`};
            }
            const ventas=[...estado.ventas.values()].filter(v=>v.id_usuario===usuario.id_usuario).map(v=>({id_venta:v.id_venta,id_usuario:v.id_usuario,
                estado:estado.pagada?'pagada':'pendiente',estado_entrega:'pendiente',tipo_entrega:v.body.tipo_entrega,
                canal_compra:'web',external_reference:`test${v.id_venta}`,total:75,costo_envio:0,
                detalle:v.body.items.map(i=>({...i,titulo:libros.find(l=>l.id_libro===i.id_libro)?.titulo,precio_unitario:75,subtotal:75*i.cantidad}))}));
            if(ruta==='/api/ventas/mis-ventas')data=ventas;
            if(/^\/api\/ventas\/\d+$/.test(ruta))data=ventas.find(v=>v.id_venta===Number(ruta.split('/').pop())) || {estado:'pendiente'};
            if(/^\/api\/pagos\/test\d+$/.test(ruta)){estado.pagada=true;data={status:'APPROVED'};}
            if(ruta==='/api/favoritos')data=libros;
            return route.fulfill({json:{success:true,data,anuncio:null}});
        }
        if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
        return route.continue();
    });
    return estado;
}
async function checkout(page) {
    await page.goto('/checkout');
    await expect(page.getByRole('button',{name:'Crear pedido y continuar al pago',exact:true})).toBeEnabled();
    await page.getByLabel('Número de documento',{exact:true}).fill('12345678');
}
async function crear(page) {await page.getByRole('button',{name:'Crear pedido y continuar al pago',exact:true}).click();}
async function login(page,usuario=a) {
    await page.getByLabel('Correo electrónico',{exact:true}).fill(usuario.email);
    await page.getByLabel('Contraseña',{exact:true}).fill('Prueba-Web-123');
    await page.getByRole('button',{name:'Entrar',exact:true}).click();
}
async function cambiarCuenta(context) {
    const otra=await context.newPage();await otra.goto('/cuenta');
    await otra.getByRole('button',{name:'Cerrar sesión de cliente',exact:true}).click();
    await login(otra,b);await expect(otra.locator('.compra-cuenta')).toContainText('ClienteB');
    return otra;
}
async function irCompras(page) {
    await page.locator('.compra-cuenta').click();
    await page.getByRole('link',{name:/Mis compras Estado del pago/}).click();
}

test('WEB01: otra pestaña cambia cuenta, carrito y checkout juntos',async({page,context})=>{
    const control=await preparar(context);await checkout(page);
    await cambiarCuenta(context);
    await expect(page.locator('.compra-cuenta')).toContainText('ClienteB');
    await expect(page.locator('.compra-carrito')).toHaveText('Carrito');
    await expect(page.getByText('Tu carrito está vacío.',{exact:true})).toBeVisible();
    expect(control.posts).toEqual([]);
    expect(await page.evaluate(()=>localStorage.getItem('token'))).toBe('admin-intacto');
});
for(const respuesta of [201,401])test(`WEB01: respuesta ${respuesta} tardía de A no modifica ni cierra B`,async({page,context})=>{
    const control=await preparar(context);let liberar;
    control.esperaPost=new Promise(r=>{liberar=r;});control.respuestaPost=respuesta;
    await checkout(page);await crear(page);await expect.poll(()=>control.posts.length).toBe(1);
    await cambiarCuenta(context);await expect(page.locator('.compra-cuenta')).toContainText('ClienteB');
    liberar();await expect(page.getByText('Tu carrito está vacío.',{exact:true})).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('libreria-web-cliente-v1')).usuario.id_usuario)).toBe(3);
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('libreria-web-intento-2')).orden)).toBeUndefined();
    expect(control.posts[0].token).toBe('Bearer tokenA');
});
test('WEB02: respuesta perdida, 401 y login recuperan la misma clave y venta',async({page,context})=>{
    const control=await preparar(context,{perderPrimera:true,expirarReintento:true});await checkout(page);await crear(page);
    await page.getByRole('button',{name:'Recuperar mi pedido',exact:true}).click();
    await expect(page.getByRole('link',{name:'Ingresar para comprar',exact:true})).toBeVisible();
    const intento=await page.evaluate(()=>JSON.parse(localStorage.getItem('libreria-web-intento-2')));
    expect(intento.cuerpo).toEqual({...control.posts[0].body,canal_compra:undefined});
    await page.getByRole('link',{name:'Ingresar para comprar',exact:true}).click();await login(page);
    await page.getByRole('button',{name:'Recuperar mi pedido',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Tu pedido está creado',exact:true})).toBeVisible();
    expect(new Set(control.posts.map(p=>p.body.idempotencia_clave)).size).toBe(1);
    expect(control.ventas.size).toBe(1);
});
test('WEB03: dos confirmaciones simultáneas crean un único intento',async({page,context})=>{
    const control=await preparar(context);await checkout(page);
    const otra=await context.newPage();await checkout(otra);control.esperaCatalogo=350;
    await Promise.all([crear(page),crear(otra)]);
    await expect(page.getByRole('heading',{name:'Tu pedido está creado',exact:true})).toBeVisible();
    await expect(otra.getByRole('heading',{name:'Tu pedido está creado',exact:true})).toBeVisible();
    expect(control.posts.length).toBe(1);expect(control.ventas.size).toBe(1);
});
test('WEB03: sin Web Locks no se envía ni reemplaza una compra ambigua',async({page,context})=>{
    const control=await preparar(context,{sinLocks:true});await checkout(page);await crear(page);
    await expect(page.getByRole('alert')).toContainText('navegador actualizado');
    await crear(page);expect(control.posts).toEqual([]);
});
test('WEB04: recuperación muestra los artículos y entrega originales, no el carrito editado',async({page,context})=>{
    const control=await preparar(context,{perderPrimera:true});await checkout(page);
    await page.getByLabel('Delivery dentro de Pallasca — Tarifa por zona',{exact:true}).check();
    await page.getByLabel('Zona de delivery',{exact:true}).selectOption('1');
    await page.getByLabel('Dirección',{exact:true}).fill('Dirección original Pallasca');
    await crear(page);await expect(page.getByRole('button',{name:'Recuperar mi pedido',exact:true})).toBeVisible();
    await page.getByRole('link',{name:'Volver al carrito',exact:true}).click();
    await page.getByRole('spinbutton').fill('3');await expect(page.locator('.compra-carrito')).toHaveText('Carrito (3)');
    await page.getByRole('link',{name:'Continuar con la compra',exact:true}).click();
    await expect(page.locator('.compra-resumen')).toContainText('Libro auditoría × 1');
    await expect(page.locator('.compra-resumen')).toContainText('S/ 82.50');
    await expect(page.getByText('Dirección original Pallasca',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Recuperar mi pedido',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Tu pedido está creado',exact:true})).toBeVisible();
    expect(control.posts[1].body).toEqual(control.posts[0].body);
});
test('WEB05: perfil 503 conserva sesión/carrito y permite reintentar',async({page,context})=>{
    const control=await preparar(context);control.perfilStatus=503;await page.goto('/checkout');
    await expect(page.getByRole('alert')).toContainText('Tu sesión y tu carrito se conservan');
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('libreria-web-cliente-v1')).usuario.id_usuario)).toBe(2);
    await expect(page.locator('.compra-carrito')).toHaveText('Carrito (1)');
    control.perfilStatus=200;await page.getByRole('button',{name:'Reintentar verificación',exact:true}).click();
    await expect(page.getByRole('button',{name:'Crear pedido y continuar al pago',exact:true})).toBeEnabled();
});
test('WEB06: Mis compras recupera el POST perdido, descuenta una vez y conserva nuevos ejemplares',async({page,context})=>{
    const control=await preparar(context,{perderPrimera:true});await checkout(page);await crear(page);
    await expect(page.getByRole('button',{name:'Recuperar mi pedido',exact:true})).toBeVisible();
    await page.locator('.compra-carrito').click();await page.getByRole('spinbutton').fill('3');
    await expect(page.locator('.compra-carrito')).toHaveText('Carrito (3)');
    await page.getByRole('link',{name:'Seguir comprando',exact:true}).click();
    await page.getByRole('button',{name:'Agregar Otro libro nuevo al carrito',exact:true}).click();
    await expect(page.locator('.compra-carrito')).toHaveText('Carrito (4)');
    await irCompras(page);await expect(page.getByText('Pendiente de pago',{exact:true})).toBeVisible();
    await expect.poll(()=>control.posts.length).toBe(2);expect(control.posts[1].body).toEqual(control.posts[0].body);
    await page.getByRole('button',{name:'Verificar pago de compra #10',exact:true}).click();
    await expect(page.getByText('Pagada',{exact:true})).toBeVisible();
    await expect(page.locator('.compra-carrito')).toHaveText('Carrito (3)');
    await page.getByRole('button',{name:'Actualizar compras',exact:false}).click();
    await page.reload();await expect(page.getByText('Pagada',{exact:true})).toBeVisible();
    await expect(page.locator('.compra-carrito')).toHaveText('Carrito (3)');
    expect(await page.evaluate(()=>localStorage.getItem('libreria-web-intento-2'))).toBeNull();
});
test('WEB06: quitar y volver a agregar el mismo libro no deduce los nuevos ejemplares',async({page,context})=>{
    await preparar(context,{perderPrimera:true});await checkout(page);await crear(page);
    await expect(page.getByRole('button',{name:'Recuperar mi pedido',exact:true})).toBeVisible();
    await page.locator('.compra-carrito').click();await page.getByRole('button',{name:'Quitar Libro auditoría',exact:true}).click();
    await expect(page.locator('.compra-carrito')).toHaveText('Carrito');
    await page.getByRole('link',{name:'Explorar libros',exact:true}).click();
    await page.getByRole('button',{name:'Agregar Libro auditoría al carrito',exact:true}).click();
    await expect(page.locator('.compra-carrito')).toHaveText('Carrito (1)');
    await irCompras(page);await page.getByRole('button',{name:'Verificar pago de compra #10',exact:true}).click();
    await expect(page.getByText('Pagada',{exact:true})).toBeVisible();await expect(page.locator('.compra-carrito')).toHaveText('Carrito (1)');
});
