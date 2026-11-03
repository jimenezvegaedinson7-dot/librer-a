import { test, expect } from '@playwright/test';
import { MOSTRAR_CARRUSEL_INICIO } from '../src/web/config/site.js';
const API='http://127.0.0.1:59999/api';
// Banners sintéticos solo de prueba; no se instalan en la web ni en la BD real.
const banner=n=>`${API}/fixtures/carrusel-${n}.svg`;
const grafico=(n,color='#064e3b')=>`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600"><rect width="1600" height="600" fill="${color}"/><rect x="1100" y="100" width="220" height="400" fill="#fffdf7"/><text x="100" y="210" fill="#fffdf7" font-size="84">ANUNCIO DE PRUEBA ${n}</text><text x="100" y="340" fill="#fffdf7" font-size="52">Imagen del carrusel · prueba de interfaz</text></svg>`;
const imagenes=[{id_imagen:1,titulo:'Banner de prueba 1',imagen_url:banner(1),orden:1,estado:1,id_libro:1},
    {id_imagen:2,titulo:'Banner de prueba 2',imagen_url:banner(2,'#0d2940'),orden:2,estado:1,id_libro:null}];
async function preparar(page,{lista=imagenes,fallo=false}={}){
    const control={lista:lista.map(i=>({...i})),fallo,autorizacionPublica:[],peticiones:[]};
    await page.route(`${API}/**`,async route=>{
        const req=route.request(),ruta=new URL(req.url()).pathname,metodo=req.method();control.peticiones.push(ruta);
        if(/^\/api\/fixtures\/carrusel-\d+\.svg$/.test(ruta))return route.fulfill({body:grafico(Number(/carrusel-(\d+)/.exec(ruta)[1])),contentType:'image/svg+xml'});
        if(ruta==='/api/anuncios/carrusel' && metodo==='GET'){
            control.autorizacionPublica.push(req.headers().authorization);
            return route.fulfill(control.fallo?{status:503,json:{success:false}}:{json:{success:true,data:control.lista.filter(l=>l.estado===1).sort((a,b)=>a.orden-b.orden)}});
        }
        if(ruta==='/api/libros')return route.fulfill({json:{success:true,data:[{id_libro:1,titulo:'Libro de prueba',autor:'Autor de prueba',precio:35,stock:3,estado:1}]}});
        if(ruta==='/api/empresa')return route.fulfill({json:{success:true,data:{nombre_comercial:'MATIDANA'}}});
        if(ruta==='/api/anuncios')return route.fulfill({json:{success:true,anuncio:null}});
        return route.fulfill({json:{success:true,data:[]}});
    });
    return control;
}
for(const ancho of [320,390,1440])test(`inicio ${ancho}px: banners completos, navegación y sin libro 3D`,async({page})=>{
    test.skip(!MOSTRAR_CARRUSEL_INICIO,'El carrusel de anuncios está oculto en el inicio (config/site.js)');
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
    test.skip(!MOSTRAR_CARRUSEL_INICIO,'El carrusel de anuncios está oculto en el inicio (config/site.js)');
    const control=await preparar(page,{lista:[]});await page.goto('/');await expect(page.getByText('Sin imágenes publicadas todavía.',{exact:true})).toBeVisible();
    expect(control.lista).toHaveLength(0);control.lista=[imagenes[0]];await page.reload();
    await expect(page.getByAltText('Banner de prueba 1')).toBeVisible();await expect(page.getByRole('button',{name:'Mostrar anuncio 2',exact:true})).toHaveCount(0);
});
test('error y archivo roto permiten reintentar sin restaurar el libro fijo',async({page})=>{
    test.skip(!MOSTRAR_CARRUSEL_INICIO,'El carrusel de anuncios está oculto en el inicio (config/site.js)');
    const control=await preparar(page,{fallo:true});await page.goto('/');await expect(page.getByText('No pudimos cargar los anuncios.',{exact:true})).toBeVisible();
    control.fallo=false;control.lista=[{...imagenes[0],imagen_url:'http://127.0.0.1:5179/banner-inexistente.png'}];
    await page.route('**/banner-inexistente.png',r=>r.fulfill({status:404}));await page.getByRole('button',{name:'Reintentar anuncios',exact:true}).click();
    await expect(page.getByText('No se pudo mostrar la imagen del anuncio.',{exact:true})).toBeVisible();
    control.lista=imagenes;await page.getByRole('button',{name:'Reintentar anuncios',exact:true}).click();await expect(page.getByAltText('Banner de prueba 1')).toBeVisible();
    await expect(page.locator('.hero__poster')).toHaveCount(0);
});
test('cambia solo: con el mouse encima, tras pulsar un punto y con movimiento reducido',async({page})=>{
    test.skip(!MOSTRAR_CARRUSEL_INICIO,'El carrusel de anuncios está oculto en el inicio (config/site.js)');
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
test('el banner con libro vinculado lleva a la ficha sin texto «Ver ahora» encima',async({page})=>{
    test.skip(!MOSTRAR_CARRUSEL_INICIO,'El carrusel de anuncios está oculto en el inicio (config/site.js)');
    await page.emulateMedia({reducedMotion:'reduce'});await preparar(page);await page.goto('/');
    const carrusel=page.getByRole('region',{name:'Anuncios de la librería',exact:true});
    const enlace=carrusel.getByRole('link',{name:'Ver libro: Banner de prueba 1',exact:true});
    await expect(enlace).toHaveAttribute('href','/libro/1');
    await expect(carrusel.getByText('Ver ahora')).toHaveCount(0);
    await enlace.click();await expect(page).toHaveURL(/\/libro\/1$/);
});
