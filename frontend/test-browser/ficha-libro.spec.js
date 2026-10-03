import { test, expect } from '@playwright/test';

const API='http://127.0.0.1:59999/api';
// Imagen sintética exclusiva de pruebas; nunca se usa en el catálogo real.
const imagen='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="390" viewBox="0 0 260 390"><rect width="260" height="390" fill="#16395a"/><rect x="20" y="20" width="220" height="350" fill="none" stroke="#fff9ef"/><text x="130" y="170" fill="#fff9ef" text-anchor="middle" font-size="24">Portada</text><text x="130" y="210" fill="#fff9ef" text-anchor="middle" font-size="20">de prueba</text></svg>');
const descripcion='Descripción real del libro de prueba.\n\nSegunda línea conservada.\n'+ 'Contenido de prueba sin resumir. '.repeat(36);
const principal={id_libro:1,titulo:'Una lectura para descubrir',autor:'Autora de prueba',id_autor:10,categoria:'Narrativa',id_categoria:20,
    isbn:'9780000000001',descripcion,precio:100,precio_final:75,descuento_vigente:1,descuento_porcentaje_efectivo:25,estado:1,stock:5,portada:imagen};
const autores=Array.from({length:8},(_,i)=>({...principal,id_libro:i+2,titulo:`Título de la autora ${i+2}`,isbn:`97800000000${i+2}`,descripcion:'Descripción del título relacionado.',precio_final:100,descuento_vigente:0,descuento_porcentaje_efectivo:0}));
const categoria=Array.from({length:4},(_,i)=>({...principal,id_libro:i+10,titulo:`Otra lectura ${i+10}`,autor:'Otro autor',id_autor:11}));
const cliente={id_usuario:2,nombre:'Cliente',apellido:'Ficha',rol:'cliente',estado:1,email:'ficha@example.test'};

async function preparar(page,{sesion=false,libro=principal,errorLibro=0,errorRelacionados=false,vacios=false,espera,catalogo,errorCatalogo=false}={}){
    const favoritos=new Set(),operaciones=[],catalogos=[];
    if(sesion)await page.addInitScript(cliente=>localStorage.setItem('libreria-web-cliente-v1',JSON.stringify({token:'cliente-ficha-token',usuario:cliente})),cliente);
    await page.route(`${API}/**`,async route=>{
        const req=route.request(),ruta=new URL(req.url()).pathname;
        if(ruta==='/api/libros'){catalogos.push(req.url());return route.fulfill(errorCatalogo
            ?{status:503,json:{success:false,mensaje:'Catálogo temporalmente no disponible'}}
            :{json:{success:true,data:catalogo || [libro,...autores,...categoria]}});}
        if(ruta==='/api/usuarios/perfil')return route.fulfill({json:{success:true,data:cliente}});
        if(ruta==='/api/auth/login')return route.fulfill({json:{success:true,token:'cliente-ficha-token',data:cliente}});
        if(/^\/api\/libros\/\d+\/relacionados$/.test(ruta))return route.fulfill(errorRelacionados?{status:Number.isInteger(errorRelacionados)?errorRelacionados:503,json:{success:false,mensaje:'Error de relacionados'}}
            :{json:{success:true,data:vacios?{relacionados:[],mas_autor:[],interesarte:[]}:{relacionados:autores.slice(0,4),mas_autor:autores.slice(4),interesarte:categoria}}});
        if(/^\/api\/libros\/\d+$/.test(ruta)){
            if(espera)await espera;
            if(errorLibro)return route.fulfill({status:errorLibro,json:{success:false,mensaje:errorLibro===404?'Libro no encontrado':'Error de API'}});
            const id=Number(ruta.split('/').pop());const actual=[libro,...autores,...categoria].find(l=>l.id_libro===id);
            return route.fulfill(actual?{json:{success:true,data:actual}}:{status:404,json:{success:false,mensaje:'Libro no encontrado'}});
        }
        if(ruta.startsWith('/api/autores/'))return route.fulfill({json:{success:true,data:{id_autor:10,nombre:'Autora',apellido:'de prueba',nacionalidad:'Peruana',biografia:'Biografía real de prueba.\nSegunda línea.'}}});
        if(ruta.startsWith('/api/favoritos/')){
            const id=Number(ruta.split('/').pop());
            if(req.method()!=='GET'){
                operaciones.push({metodo:req.method(),body:req.postData(),token:req.headers().authorization});
                if(req.method()==='POST')favoritos.add(id);else favoritos.delete(id);
            }
            return route.fulfill({json:{success:true,mensaje:favoritos.has(id)?'Libro agregado a tus favoritos':'Libro eliminado de tus favoritos',data:{id_libro:id,es_favorito:favoritos.has(id)}}});
        }
        return route.fulfill({json:{success:true,data:[],anuncio:null}});
    });
    return {favoritos,operaciones,catalogos};
}

for(const ancho of [320,390,820,1440]){
    test(`ficha ${ancho}px: datos reales, precio, técnica, descripción y recomendaciones sin catálogo completo`,async({page})=>{
        await page.setViewportSize({width:ancho,height:1000});
        const errores=[];page.on('pageerror',e=>errores.push(e.message));
        const control=await preparar(page);await page.goto('/libro/1');
        await expect(page.getByRole('heading',{name:principal.titulo,exact:true})).toBeVisible();
        await expect(page.locator('.ficha-precio .oferta__final')).toHaveText('S/ 75.00');
        await expect(page.locator('.ficha-precio .oferta__anterior')).toHaveText('S/ 100.00');
        await expect(page.locator('.ficha-precio .oferta__pastilla')).toHaveText('-25%');
        const tecnica=page.locator('.ficha-tecnica');
        await expect(tecnica).toHaveCSS('display','block');
        await expect(page.locator('.ficha-portada-principal img')).toBeVisible();
        await expect(tecnica).toContainText('9780000000001');await expect(tecnica).toContainText('5 unidades');
        expect(await tecnica.innerText()).not.toMatch(/Editorial|Idioma|Páginas|Edición|Dimensiones|Desconocido/);
        await expect(page.locator('.ficha-descripcion-texto')).toHaveText(descripcion);
        await expect(page.locator('.ficha-descripcion-texto')).toHaveCSS('white-space','pre-line');
        await page.getByRole('button',{name:'Ver más',exact:true}).click();
        await expect(page.getByRole('button',{name:'Ver menos',exact:true})).toHaveAttribute('aria-expanded','true');
        await expect(page.locator('.ficha-relacionados li')).toHaveCount(4);
        await expect(page.locator('.ficha-descubrir .tarjeta-libro')).toHaveCount(8);
        const ids=await page.locator('.ficha-relacionados h3 a, .ficha-descubrir .compra-libro a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
        expect(new Set(ids).size).toBe(ids.length);expect(ids).not.toContain('/libro/1');
        expect(control.catalogos).toEqual([]);
        await expect(page).toHaveTitle(/Una lectura para descubrir.*Autora de prueba/);
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',descripcion);
        const jsonld=await page.locator('script[data-seo-libro]').textContent();
        expect(JSON.parse(jsonld)).toMatchObject({isbn:principal.isbn,offers:{price:'75.00',priceCurrency:'PEN'}});
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({path:test.info().outputPath(`ficha-${ancho}.png`),fullPage:true});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        expect(errores).toEqual([]);
    });
}
test('ficha: cantidad y agregar reutilizan el carrito, comprar ahora reutiliza checkout',async({page})=>{
    await preparar(page);await page.goto('/libro/1');
    await page.getByRole('spinbutton',{name:'Cantidad de ejemplares',exact:true}).fill('2');
    await page.getByRole('button',{name:`Agregar ${principal.titulo} al carrito`,exact:true}).click();
    await expect(page.locator('.compra-carrito')).toHaveAttribute('aria-label','Carrito (2)');
    await page.getByRole('spinbutton',{name:'Cantidad de ejemplares',exact:true}).fill('9');
    await expect(page.getByRole('button',{name:`Agregar ${principal.titulo} al carrito`,exact:true})).toBeDisabled();
    await page.getByRole('spinbutton',{name:'Cantidad de ejemplares',exact:true}).fill('1');
    await page.getByRole('button',{name:'Comprar ahora',exact:true}).click();await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.locator('.compra-carrito')).toHaveAttribute('aria-label','Carrito (3)');
});
test('favoritos: agregar, persistir al recargar y quitar con JWT de cliente y sin id_usuario',async({page})=>{
    const control=await preparar(page,{sesion:true});await page.goto('/libro/1');
    await page.getByRole('button',{name:'Agregar a favoritos',exact:true}).click();
    await expect(page.getByRole('button',{name:'En favoritos',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.reload();await expect(page.getByRole('button',{name:'En favoritos',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'En favoritos',exact:true}).click();
    await expect(page.getByRole('button',{name:'Agregar a favoritos',exact:true})).toHaveAttribute('aria-pressed','false');
    expect(control.operaciones.map(x=>x.metodo)).toEqual(['POST','DELETE']);
    expect(control.operaciones.every(x=>x.token==='Bearer cliente-ficha-token' && !x.body)).toBe(true);
});
test('favorito sin sesión conserva el libro y regresa después de iniciar sesión',async({page})=>{
    await preparar(page);await page.goto('/libro/1');
    await page.getByRole('button',{name:'Agregar a favoritos',exact:true}).click();
    await expect(page).toHaveURL(/\/libro\/1$/);await page.getByRole('link',{name:'Iniciar sesión',exact:true}).click();
    await page.getByLabel('Correo electrónico',{exact:true}).fill(cliente.email);
    await page.getByLabel('Contraseña',{exact:true}).fill('Prueba-12345');
    await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(/\/libro\/1$/);
    await expect(page.getByRole('heading',{name:principal.titulo,exact:true})).toBeVisible();
});
test('compartir nativo utiliza título, autor y URL reales',async({page})=>{
    await page.addInitScript(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async datos=>{window.datosCompartidos=datos;}}));
    await preparar(page);await page.goto('/libro/1');await page.getByRole('button',{name:'Compartir',exact:true}).click();
    const datos=await page.evaluate(()=>window.datosCompartidos);expect(datos.title).toBe(principal.titulo);expect(datos.text).toContain(principal.autor);expect(datos.url).toContain('/libro/1');
});
test('compartir alternativo permite copiar, WhatsApp y Facebook sin dependencias externas',async({page})=>{
    await page.addInitScript(()=>{
        Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.enlaceCopiado=text;}}});
    });
    await preparar(page);await page.goto('/libro/1');await page.getByRole('button',{name:'Compartir',exact:true}).click();
    const opciones=page.getByRole('group',{name:'Opciones para compartir'});
    await expect(opciones.getByRole('link',{name:'WhatsApp',exact:true})).toHaveAttribute('href',/^https:\/\/wa.me\//);
    await expect(opciones.getByRole('link',{name:'Facebook',exact:true})).toHaveAttribute('href',/^https:\/\/www.facebook.com\/sharer/);
    await opciones.getByRole('button',{name:'Copiar enlace',exact:true}).click();
    await expect(page.getByText('Enlace copiado',{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.enlaceCopiado)).toContain('/libro/1');
});
test('autor interactivo filtra el catálogo y navegar a un relacionado actualiza ficha y SEO',async({page})=>{
    await preparar(page);await page.goto('/libro/1');
    await page.locator('.ficha-autor a').click();await expect(page).toHaveURL(/autor=10/);
    await expect(page.locator('.tarjeta-libro')).toHaveCount(9);
    await page.goto('/libro/1');await page.locator('.ficha-relacionados').getByRole('link',{name:'Título de la autora 2',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Título de la autora 2',exact:true})).toBeVisible();await expect(page).toHaveTitle(/Título de la autora 2/);
    await expect(page.locator('script[data-seo-libro]')).toHaveCount(1);
    expect(await page.locator('.ficha-relacionados').innerText()).not.toContain('Título de la autora 2');
});
test('agotado, pocas unidades, sin ISBN/portada y descripción ausente usan estados reales',async({page})=>{
    await preparar(page,{libro:{...principal,stock:0,portada:null,isbn:null,descripcion:null,descuento_vigente:0,precio_final:100}});await page.goto('/libro/1');
    await expect(page.getByText('Sin portada',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:`Agregar ${principal.titulo} al carrito`,exact:true})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Comprar ahora',exact:true})).toBeDisabled();
    await expect(page.locator('.ficha-disponibilidad')).toContainText('Agotado');
    await expect(page.locator('.ficha-tecnica')).not.toContainText('ISBN');
    await expect(page.locator('.ficha-precio')).toHaveText('S/ 100.00');
    await expect(page.getByText('Este libro todavía no tiene una descripción registrada.',{exact:true})).toBeVisible();
});
test('pocas unidades respeta el umbral existente del catálogo',async({page})=>{
    await preparar(page,{libro:{...principal,stock:3}});await page.goto('/libro/1');
    await expect(page.locator('.ficha-disponibilidad')).toContainText('Quedan solo 3 en stock');
});
for(const codigo of [404,503])test(`ficha HTTP ${codigo}: error visible y acceso al catálogo`,async({page})=>{
    await preparar(page,{errorLibro:codigo});await page.goto('/libro/999');
    await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('link',{name:'Volver al catálogo',exact:true})).toBeVisible();
    if(codigo===503)await expect(page.getByRole('button',{name:'Reintentar ficha',exact:true})).toBeVisible();
});
test('carga y sin relacionados no dejan la pantalla vacía',async({page})=>{
    let resolver;const espera=new Promise(r=>{resolver=r;});await preparar(page,{vacios:true,espera});await page.goto('/libro/1');
    await expect(page.getByText('Cargando la ficha del libro…',{exact:true})).toBeVisible();await expect(page.locator('.ficha-cargando')).toBeVisible();
    resolver();await expect(page.getByRole('heading',{name:principal.titulo,exact:true})).toBeVisible();
    await expect(page.getByText('No hay otros títulos relacionados en este momento.',{exact:true})).toBeVisible();
});
test('error de relacionados mantiene la ficha, precio y compra utilizables',async({page})=>{
    await preparar(page,{errorRelacionados:true});await page.goto('/libro/1');
    await expect(page.getByRole('button',{name:'Reintentar relacionados',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:`Agregar ${principal.titulo} al carrito`,exact:true})).toBeEnabled();
});

for(const ancho of [390,1440])test(`ruta de relacionados ausente ${ancho}px: catálogo sin duplicados y navegación`,async({page})=>{
    await page.setViewportSize({width:ancho,height:1000});
    const autorizaciones=[];
    page.on('request',req=>{if(req.url()===`${API}/libros`)autorizaciones.push(req.headers().authorization);});
    const control=await preparar(page,{sesion:true,errorRelacionados:404,catalogo:[principal,...autores,...categoria,
        {...autores[0],id_libro:String(autores[0].id_libro)},
        {...principal,id_libro:90,titulo:'Título inactivo',estado:0},
        {...principal,id_libro:91,titulo:'Título sin relación',id_autor:99,id_categoria:99}]});
    await page.goto('/libro/1');
    await expect(page.locator('.ficha-relacionados li')).toHaveCount(4);
    await expect(page.locator('.ficha-descubrir .tarjeta-libro')).toHaveCount(8);
    expect(control.catalogos).toHaveLength(1);
    expect(autorizaciones).toEqual([undefined]);
    const enlaces=page.locator('.ficha-relacionados h3 a, .ficha-descubrir .compra-libro a');
    const ids=await enlaces.evaluateAll(a=>a.map(x=>x.getAttribute('href')));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('/libro/1');expect(ids).not.toContain('/libro/90');expect(ids).not.toContain('/libro/91');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:test.info().outputPath(`relacionados-respaldo-${ancho}.png`),fullPage:true});
    const siguiente=await page.locator('.ficha-relacionados h3 a').first().textContent();
    await page.locator('.ficha-relacionados h3 a').first().click();
    await expect(page.getByRole('heading',{name:siguiente,exact:true})).toBeVisible();
    await expect(page.locator('.ficha-relacionados')).not.toContainText(siguiente);
});

test('respaldo por categoría funciona con IDs de texto y prioriza libros con stock',async({page})=>{
    await preparar(page,{errorRelacionados:404,catalogo:[principal,
        {...principal,id_libro:'2',id_autor:'11',id_categoria:'20',titulo:'Lectura disponible',stock:3},
        {...principal,id_libro:99,id_autor:11,id_categoria:20,titulo:'Lectura agotada',stock:0},
        {...principal,id_libro:100,id_autor:11,id_categoria:20,titulo:'Lectura retirada',estado:0}]});
    await page.goto('/libro/1');
    await expect(page.locator('.ficha-relacionados li')).toHaveCount(2);
    await expect(page.locator('.ficha-relacionados h3 a').first()).toHaveText('Lectura disponible');
    await expect(page.locator('.ficha-relacionados')).not.toContainText('Lectura retirada');
});

test('404 HTML y catálogo sin coincidencias muestran el estado vacío real',async({page})=>{
    await preparar(page,{catalogo:[principal]});
    await page.route(`${API}/libros/*/relacionados`,route=>route.fulfill({status:404,contentType:'text/html',body:'Ruta no encontrada'}));
    await page.goto('/libro/1');
    await expect(page.getByText('No hay otros títulos relacionados en este momento.',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Reintentar relacionados',exact:true})).toHaveCount(0);
});

test('fallo del catálogo de respaldo permite reintentar y anuncia la carga',async({page})=>{
    await preparar(page,{errorRelacionados:404,errorCatalogo:true});await page.goto('/libro/1');
    await expect(page.getByRole('button',{name:'Reintentar relacionados',exact:true})).toBeVisible();
    let resolver;
    const espera=new Promise(r=>{resolver=r;});
    await page.route(`${API}/libros`,async route=>{
        await espera;
        await route.fulfill({json:{success:true,data:[principal,...autores,...categoria]}});
    });
    await page.getByRole('button',{name:'Reintentar relacionados',exact:true}).click();
    await expect(page.getByText('Cargando relacionados…',{exact:true})).toBeVisible();
    resolver();await expect(page.locator('.ficha-relacionados li')).toHaveCount(4);
    await expect(page.getByRole('button',{name:`Agregar ${principal.titulo} al carrito`,exact:true})).toBeEnabled();
});
