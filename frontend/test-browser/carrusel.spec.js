import { test, expect } from '@playwright/test';
const API='http://127.0.0.1:59999/api';
// Banners sintéticos solo de prueba; no se instalan en la web ni en la BD real.
const banner=n=>`${API}/fixtures/carrusel-${n}.svg`;
const grafico=(n,color='#064e3b')=>`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600"><rect width="1600" height="600" fill="${color}"/><rect x="1100" y="100" width="220" height="400" fill="#fffdf7"/><text x="100" y="210" fill="#fffdf7" font-size="84">ANUNCIO DE PRUEBA ${n}</text><text x="100" y="340" fill="#fffdf7" font-size="52">Imagen del carrusel · prueba de interfaz</text></svg>`;
const imagenes=[{id_imagen:1,titulo:'Banner de prueba 1',imagen_url:banner(1),orden:1,estado:1,id_libro:1},
    {id_imagen:2,titulo:'Banner de prueba 2',imagen_url:banner(2,'#0d2940'),orden:2,estado:1,id_libro:null}];
const admin={id_usuario:1,nombre:'Admin',apellido:'Prueba',rol:'administrador',estado:1};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr1sAAAAASUVORK5CYII=','base64');
async function preparar(page,{lista=imagenes,fallo=false,panel=false}={}){
    const control={lista:lista.map(i=>({...i})),fallo,altas:0,ordenes:[],autorizacionPublica:[],peticiones:[]};
    if(panel)await page.addInitScript(admin=>{localStorage.setItem('token','token-admin-prueba');localStorage.setItem('usuario',JSON.stringify(admin));},admin);
    await page.route(`${API}/**`,async route=>{
        const req=route.request(),ruta=new URL(req.url()).pathname,metodo=req.method();control.peticiones.push(ruta);
        if(/^\/api\/fixtures\/carrusel-\d+\.svg$/.test(ruta))return route.fulfill({body:grafico(Number(/carrusel-(\d+)/.exec(ruta)[1])),contentType:'image/svg+xml'});
        if(ruta==='/api/anuncios/carrusel' && metodo==='GET'){
            control.autorizacionPublica.push(req.headers().authorization);
            return route.fulfill(control.fallo?{status:503,json:{success:false}}:{json:{success:true,data:control.lista.filter(l=>l.estado===1).sort((a,b)=>a.orden-b.orden)}});
        }
        if(ruta==='/api/anuncios/carrusel/todos')return route.fulfill({json:{success:true,data:control.lista.sort((a,b)=>a.orden-b.orden)}});
        if(ruta==='/api/anuncios/carrusel' && metodo==='POST'){
            expect(req.headers().authorization).toBe('Bearer token-admin-prueba');
            const body=req.postData();expect(body).toContain('name="imagen"');expect(body).toContain('name="titulo"');control.altas++;
            control.lista.push({id_imagen:3,titulo:'Nuevo banner',imagen_url:banner(3),orden:3,estado:1,id_libro:1});
            return route.fulfill({status:201,json:{success:true,mensaje:'Imagen guardada'}});
        }
        if(ruta==='/api/anuncios/carrusel/orden'){
            const {ids}=req.postDataJSON();control.ordenes.push(ids);control.lista=ids.map((id,i)=>({...control.lista.find(l=>l.id_imagen===id),orden:i+1}));
            return route.fulfill({json:{success:true,mensaje:'Orden actualizado'}});
        }
        if(/^\/api\/anuncios\/carrusel\/\d+$/.test(ruta)){
            const id=Number(ruta.split('/').pop());
            if(metodo==='PUT'){
                const d=req.postDataJSON();control.lista=control.lista.map(l=>l.id_imagen===id?{...l,...d,estado:Number(d.estado ?? l.estado)}:l);
            }else if(metodo==='DELETE'){expect(req.postDataJSON()).toEqual({password:'ClavePrueba123'});control.lista=control.lista.filter(l=>l.id_imagen!==id);}
            return route.fulfill({json:{success:true,mensaje:'Carrusel actualizado'}});
        }
        if(ruta==='/api/usuarios/perfil')return route.fulfill({json:{success:true,data:admin}});
        if(ruta==='/api/libros')return route.fulfill({json:{success:true,data:[{id_libro:1,titulo:'Libro de prueba',autor:'Autor de prueba',precio:35,stock:3,estado:1}]}});
        if(ruta==='/api/empresa')return route.fulfill({json:{success:true,data:{nombre_comercial:'Librería del Saber'}}});
        if(ruta==='/api/anuncios')return route.fulfill({json:{success:true,anuncio:null}});
        return route.fulfill({json:{success:true,data:[]}});
    });
    return control;
}
for(const ancho of [320,390,1440])test(`inicio ${ancho}px: banners completos, navegación y sin libro 3D`,async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:ancho,height:900});
    const recursos=[],errores=[];page.on('request',r=>recursos.push(r.url()));page.on('pageerror',e=>errores.push(e.message));
    const control=await preparar(page);await page.goto('/');
    const carrusel=page.getByRole('region',{name:'Anuncios de la librería',exact:true});
    await expect(carrusel.getByAltText('Banner de prueba 1')).toBeVisible();
    await expect(carrusel.locator('img')).toHaveCSS('object-fit','contain');
    await expect(carrusel.getByRole('link',{name:'Ver libro: Banner de prueba 1',exact:true})).toHaveAttribute('href','/libro/1');
    await expect(page.locator('main canvas,.hero__poster,.hero__pista')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('Una librería de verdad,');
    const caja=await carrusel.boundingBox();expect(caja.width).toBeGreaterThan(ancho*.95);
    await carrusel.getByRole('button',{name:'Mostrar anuncio 2',exact:true}).click();await expect(carrusel.getByAltText('Banner de prueba 2')).toBeVisible();
    // Sin flechas, contador ni botón de pausa: solo los puntos.
    for(const nombre of ['Anuncio siguiente','Anuncio anterior','Pausar carrusel'])await expect(carrusel.getByRole('button',{name:nombre,exact:true})).toHaveCount(0);
    await carrusel.focus();await carrusel.press('ArrowLeft');await expect(carrusel.getByAltText('Banner de prueba 1')).toBeVisible();
    expect(control.autorizacionPublica).toEqual([undefined]);expect(recursos.filter(r=>/HeroScene|libro-3d|texturas\.js/.test(r))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:test.info().outputPath(`carrusel-${ancho}.png`),fullPage:false});expect(errores).toEqual([]);
});
test('sin anuncios o con un solo banner no se inventan imágenes ni se muestran controles innecesarios',async({page})=>{
    const control=await preparar(page,{lista:[]});await page.goto('/');await expect(page.getByText('Sin imágenes publicadas todavía.',{exact:true})).toBeVisible();
    expect(control.lista).toHaveLength(0);control.lista=[imagenes[0]];await page.reload();
    await expect(page.getByAltText('Banner de prueba 1')).toBeVisible();await expect(page.getByRole('button',{name:'Mostrar anuncio 2',exact:true})).toHaveCount(0);
});
test('error y archivo roto permiten reintentar sin restaurar el libro fijo',async({page})=>{
    const control=await preparar(page,{fallo:true});await page.goto('/');await expect(page.getByText('No pudimos cargar los anuncios.',{exact:true})).toBeVisible();
    control.fallo=false;control.lista=[{...imagenes[0],imagen_url:'http://127.0.0.1:5179/banner-inexistente.png'}];
    await page.route('**/banner-inexistente.png',r=>r.fulfill({status:404}));await page.getByRole('button',{name:'Reintentar anuncios',exact:true}).click();
    await expect(page.getByText('No se pudo mostrar la imagen del anuncio.',{exact:true})).toBeVisible();
    control.lista=imagenes;await page.getByRole('button',{name:'Reintentar anuncios',exact:true}).click();await expect(page.getByAltText('Banner de prueba 1')).toBeVisible();
    await expect(page.locator('.hero__poster')).toHaveCount(0);
});
test('cambia solo: con el mouse encima, tras pulsar un punto y con movimiento reducido',async({page})=>{
    await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.install();await preparar(page);await page.goto('/');await expect(page.getByAltText('Banner de prueba 1')).toBeVisible();
    await page.clock.fastForward(6100);await expect(page.getByAltText('Banner de prueba 2')).toBeVisible();
    // Con el mouse encima sigue cambiando.
    await page.getByAltText('Banner de prueba 2').hover();await page.clock.fastForward(6100);await expect(page.getByAltText('Banner de prueba 1')).toBeVisible();
    // Pulsar un punto no lo deja detenido.
    await page.getByRole('button',{name:'Mostrar anuncio 2',exact:true}).click();await expect(page.getByAltText('Banner de prueba 2')).toBeVisible();
    await page.clock.fastForward(6100);await expect(page.getByAltText('Banner de prueba 1')).toBeVisible();
    // Con movimiento reducido también cambia (sin transición).
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);await page.waitForTimeout(300);
    await page.clock.fastForward(6100);await expect(page.getByAltText('Banner de prueba 2')).toBeVisible();
});
test('el banner con libro vinculado muestra "Ver ahora" y lleva a la ficha',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await preparar(page);await page.goto('/');
    const carrusel=page.getByRole('region',{name:'Anuncios de la librería',exact:true});
    const enlace=carrusel.getByRole('link',{name:'Ver libro: Banner de prueba 1',exact:true});
    await expect(enlace.getByText('Ver ahora')).toBeVisible();await expect(enlace).toHaveAttribute('href','/libro/1');
    // El banner sin libro no muestra el botón.
    await carrusel.getByRole('button',{name:'Mostrar anuncio 2',exact:true}).click();await expect(carrusel.getByAltText('Banner de prueba 2')).toBeVisible();
    await expect(carrusel.getByText('Ver ahora')).toHaveCount(0);
});
for(const ancho of [390,1440])test(`panel ${ancho}px: subir, editar, ordenar, ocultar y eliminar banners`,async({page})=>{
    await page.setViewportSize({width:ancho,height:1000});const errores=[];page.on('pageerror',e=>errores.push(e.message));const control=await preparar(page,{panel:true});
    await page.goto('/anuncios');await expect(page.getByRole('heading',{name:'Anuncios de la web',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Nueva imagen',exact:true}).click();
    const modal=page.getByRole('dialog');await modal.getByRole('textbox',{name:'Título del anuncio / texto alternativo',exact:true}).fill('Nuevo banner');
    await modal.getByLabel('Libro vinculado (opcional)',{exact:true}).selectOption('1');
    await modal.locator('#imagen-carrusel').setInputFiles({name:'banner.png',mimeType:'image/png',buffer:png});
    await expect(modal.getByAltText('Vista previa del banner')).toHaveAttribute('src',/^blob:/);
    await modal.getByRole('button',{name:'Guardar imagen',exact:true}).click();await expect(modal).toHaveCount(0);expect(control.altas).toBe(1);
    const fila=page.getByRole('listitem').filter({has:page.getByRole('heading',{name:'Nuevo banner',exact:true})});
    await fila.getByRole('button',{name:'Subir Nuevo banner',exact:true}).click();await expect.poll(()=>control.ordenes.length).toBe(1);
    await fila.getByRole('button',{name:'Editar imagen',exact:true}).click();
    await page.getByRole('dialog').getByRole('textbox',{name:'Título del anuncio / texto alternativo',exact:true}).fill('Banner editado');
    await page.getByRole('dialog').getByRole('button',{name:'Guardar imagen',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
    const editada=page.getByRole('listitem').filter({has:page.getByRole('heading',{name:'Banner editado',exact:true})});
    await editada.getByRole('button',{name:'Ocultar',exact:true}).click();await expect(editada).toContainText('Oculto');
    await page.screenshot({path:test.info().outputPath(`panel-carrusel-${ancho}.png`),fullPage:true});
    await editada.getByRole('button',{name:'Eliminar imagen',exact:true}).click();await page.getByLabel('Contraseña del administrador').fill('ClavePrueba123');
    await page.getByRole('button',{name:'Confirmar eliminación'}).click();await expect(page.getByRole('heading',{name:'Banner editado',exact:true})).toHaveCount(0);
    expect(errores).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
