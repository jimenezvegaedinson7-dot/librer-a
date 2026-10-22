import { test, expect } from '@playwright/test';

const erroresGraficos = new WeakMap();
test.beforeEach(({ page }) => {
    const errores=[]; erroresGraficos.set(page,errores);
    page.on('console', (m) => { if(m.type()==='error' && /WebGLProgram|Shader Error|VALIDATE_STATUS|GL_INVALID/.test(m.text())) errores.push(m.text()); });
});
test.afterEach(({ page }) => expect(erroresGraficos.get(page) || []).toEqual([]));

// Portada espacial del inicio: un único libro real (datos de la API, aquí
// simulados), libro cerrado, sin audio y con navegación intacta.

const API = 'http://127.0.0.1:59999/api';
const PORTADA = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const LIBRO = {
    id_libro: 7, titulo: 'El principito', autor: 'Antoine de Saint-Exupéry', categoria: 'Infantil',
    descripcion: 'Un piloto conoce a un pequeño príncipe.', portada: PORTADA,
    precio: '40.00', precio_final: '30.00', descuento_vigente: 1, descuento_porcentaje_efectivo: 25, stock: 4, estado: 1,
};

const hayWebGL2 = (page) => page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
});

async function api(page, protagonista = { modo: 'automatico', libro: LIBRO }, libros = [LIBRO]) {
    // La UI decide cuándo está lista; no esperar recursos secundarios de
    // video del sitio para considerar terminada la navegación de WebKit.
    const goto = page.goto.bind(page), reload = page.reload.bind(page);
    page.goto = (url, options) => goto(url, { waitUntil: 'domcontentloaded', ...options });
    page.reload = (options) => reload({ waitUntil: 'domcontentloaded', ...options });
    await page.route(`${API}/**`, (r) => r.fulfill({ json: { success: true, data: [] } }));
    await page.route(`${API}/libros`, (r) => r.fulfill({ json: libros }));
    await page.route(`${API}/libros/7`, (r) => r.fulfill({ json: { success: true, data: LIBRO } }));
    await page.route(`${API}/empresa`, (r) => r.fulfill({ json: { success: true, empresa: {} } }));
    await page.route(`${API}/anuncios`, (r) => r.fulfill({ json: { success: true, anuncio: null } }));
    await page.route(`${API}/anuncios/carrusel`, (r) => r.fulfill({ json: { success: true, data: [] } }));
    await page.route(`${API}/anuncios/protagonista`, (r) => r.fulfill({ json: { success: true, data: protagonista } }));
}

test('con movimiento reducido muestra la portada estática con el libro real y su precio con descuento', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errores = []; page.on('pageerror', (e) => errores.push(e.message));
    await api(page);
    await page.goto('/');
    const portada = page.locator('.portada3d--estatica');
    await expect(portada).toBeVisible({ timeout: 30000 });
    await expect(portada.locator('.portada3d__ficha').getByRole('heading', { name: 'El principito' })).toBeVisible();
    await expect(portada.locator('.portada3d__ficha').getByText('Antoine de Saint-Exupéry')).toBeVisible();
    await expect(portada.locator('.portada3d__ficha .oferta__final')).toHaveText('S/ 30.00');
    await expect(page.locator('.navegacion-publica')).toHaveCSS('display','contents');
    await expect(portada.getByRole('link', { name: /Ver este libro/ })).toHaveAttribute('href', '/libro/7');
    await expect(page.locator('.portada3d canvas')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Libros y anuncios de Librería del Saber');
    // En lugar del carrusel de anuncios se muestran los últimos libros agregados.
    await expect(page.getByRole('region', { name: 'Anuncios de la librería' })).toHaveCount(0);
    const ultimos = portada.locator('.portada3d__ultimos');
    await expect(ultimos.getByText('Últimos libros agregados')).toBeVisible();
    await expect(ultimos.getByRole('link').first()).toHaveAttribute('href', '/libro/7');
    expect(errores).toEqual([]);
});

test('cabecera comercial: controles legibles, fuente local y colores coherentes al navegar', async ({ page }) => {
    await page.setViewportSize({width:390,height:844});
    await page.emulateMedia({reducedMotion:'reduce'});
    await api(page); await page.goto('/');
    const boton=page.locator('.portada3d__ficha .portada3d__boton');
    await expect(boton).toBeVisible({timeout:30000});
    await expect(page.locator('.cabecera')).toHaveCSS('background-color','rgb(5, 5, 6)');
    const lectura=await boton.evaluate(async e=>{
        await document.fonts.load('400 32px "Serif Editorial"');
        const s=getComputedStyle(e);
        const luminancia=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(v=>{const x=Number(v)/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
        const contraste=(a,b)=>{const x=luminancia(a),y=luminancia(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
        const nav=document.querySelector('.barra-movil a[aria-current=page]'), icono=nav.querySelector('svg');
        const cab=document.querySelector('.cabecera'),marca=cab.querySelector('.marca span'),buscador=cab.querySelector('.buscador'),campo=buscador.querySelector('input');
        return {radio:s.borderRadius,contraste:contraste(s.color,s.backgroundColor),nav:contraste(getComputedStyle(icono).color,getComputedStyle(nav).backgroundColor),marca:contraste(getComputedStyle(marca).color,getComputedStyle(cab).backgroundColor),placeholder:contraste(getComputedStyle(campo,'::placeholder').color,getComputedStyle(buscador).backgroundColor),fuente:document.fonts.check('400 32px "Serif Editorial"')};
    });
    expect(lectura.radio).toBe('999px'); expect(lectura.contraste).toBeGreaterThanOrEqual(4.5);
    expect(lectura.nav).toBeGreaterThanOrEqual(4.5); expect(lectura.marca).toBeGreaterThanOrEqual(4.5); expect(lectura.placeholder).toBeGreaterThanOrEqual(4.5); expect(lectura.fuente).toBe(true);
    await page.goto('/catalogo');
    await expect(page.getByRole('heading',{level:1})).toHaveText('Catálogo');
    await expect(page.locator('.cabecera')).toHaveCSS('background-color','rgb(5, 5, 6)');
});

for(const ancho of [390,1440])test(`cabecera siempre visible ${ancho}px: identidad y compra usables desde el primer cuadro`,async({page})=>{
    test.setTimeout(45000);
    await page.setViewportSize({width:ancho,height:1000});
    await api(page);await page.goto('/');
    test.skip(!await hayWebGL2(page),'La presentación a pantalla completa requiere WebGL 2');
    await expect(page.locator('.portada3d--lista')).toBeVisible({timeout:30000});
    await page.locator('#precarga').waitFor({state:'detached',timeout:30000});
    const nav=page.locator('.navegacion-publica'), escenario=page.locator('.portada3d__escenario');
    // La referencia arranca con la navegación a la vista, sin gesto previo.
    await expect(nav).toHaveCSS('opacity','1');await expect(nav).toHaveCSS('pointer-events','auto');
    await expect(page.locator('.portada3d__presentacion .portada3d__acceso')).toBeVisible();
    const inicial=await escenario.boundingBox();
    expect(inicial.y).toBeGreaterThanOrEqual(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:test.info().outputPath(`cabecera-visible-${ancho}.png`)});
    // La escena no se mueve de sitio al deslizar: el hero ya no la desplaza.
    await page.evaluate(()=>scrollTo(0,180));
    await expect(escenario).toBeVisible();
    expect((await escenario.boundingBox()).height).toBeCloseTo(inicial.height,0);
    await page.evaluate(()=>scrollTo(0,0));
    await expect(nav).toHaveCSS('opacity','1');
    if(ancho<1024){
        await page.getByRole('button',{name:'Abrir menú',exact:true}).click();
        const dialogo=page.getByRole('dialog',{name:'Menú',exact:true});
        await expect(dialogo).toBeVisible();
        await dialogo.getByRole('link',{name:'Catálogo',exact:true}).click();
    }else await nav.getByRole('link',{name:'Catálogo',exact:true}).click();
    await expect(page).toHaveURL(/\/catalogo$/);
    await expect(page.locator('.catalogo, .portada-catalogo').first()).toBeVisible({timeout:30000});
    // Fuera de la portada 3D la navegación vuelve a su flujo normal de bloque.
    await expect(nav).toHaveCSS('opacity','1');
    await expect(nav).toHaveCSS('pointer-events','auto');
    await expect(page.locator('.cabecera')).toBeVisible();
});

test('la identidad y la compra siguen legibles tras bajar y volver arriba',async({page})=>{
    await api(page);await page.goto('/');
    test.skip(!await hayWebGL2(page),'Sin WebGL no hay escena 3D');
    await expect(page.locator('.portada3d--lista')).toBeVisible({timeout:30000});
    await page.locator('#precarga').waitFor({state:'detached',timeout:30000});
    const nav=page.locator('.navegacion-publica');await expect(nav).toHaveCSS('opacity','1');
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    await expect(nav).toHaveCSS('opacity','1');await expect(nav).toHaveCSS('pointer-events','auto');
    await page.evaluate(()=>scrollTo(0,0));
    await expect(nav).toHaveCSS('opacity','1');
    await expect(page.locator('.portada3d__presentacion .portada3d__acceso')).toBeVisible();
});

test('la navegación es alcanzable con teclado desde el primer cuadro',async({page})=>{
    await api(page);await page.goto('/');
    test.skip(!await hayWebGL2(page),'Sin WebGL se mantiene la cabecera normal');
    await expect(page.locator('.portada3d--lista')).toBeVisible({timeout:30000});
    await page.locator('#precarga').waitFor({state:'detached',timeout:30000});
    const nav=page.locator('.navegacion-publica');await expect(nav).toHaveCSS('opacity','1');
    await page.keyboard.press('Tab');await expect(page.locator('.saltar')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(()=>Boolean(document.activeElement.closest('.navegacion-publica')))).toBe(true);
    expect(await page.evaluate(()=>scrollY)).toBe(0);
});

test('la cabecera comienza en el borde superior, sin franja de avisos',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await api(page);await page.goto('/');
    await expect(page.locator('.cabecera')).toBeVisible();
    await expect(page.locator('.avisos')).toHaveCount(0);
    expect((await page.locator('.cabecera').boundingBox()).y).toBe(0);
});

for(const ancho of [320,390,1024,1440])test(`márgenes comerciales ${ancho}px: cabecera alineada sin desbordes`,async({page})=>{
    await page.setViewportSize({width:ancho,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
    await api(page);await page.goto('/');
    await expect(page.locator('.cabecera__principal .marca')).toBeVisible({timeout:30000});
    const caja=await page.locator('.cabecera__principal').boundingBox();
    expect(caja.x).toBeGreaterThanOrEqual(15);
    expect(caja.x).toBeCloseTo(ancho-caja.x-caja.width,0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const pie=page.locator('.pie');await pie.scrollIntoViewIfNeeded();
    await expect(pie).toHaveCSS('background-color','rgb(5, 5, 6)');
    await expect(pie.getByRole('link',{name:'Ingresar a mi cuenta',exact:true})).toHaveAttribute('href','/cuenta');
    await expect(pie.getByRole('link',{name:'Libro de Reclamaciones',exact:true})).toHaveAttribute('href','/libro-de-reclamaciones');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for (const [width, height] of [[320, 667], [390, 844], [768, 1024], [1440, 1000]]) {
    test(`escena y últimos cinco libros usables a ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        const errores = []; page.on('pageerror', (e) => errores.push(e.message));
        const libros = Array.from({ length: 6 }, (_, i) => ({ ...LIBRO, id_libro: i + 1, titulo: `Libro de prueba ${i + 1}`, creado_en: i < 2 ? '2025-01-01T00:00:00Z' : '2026-01-01T00:00:00Z' }));
        await api(page, { modo: 'manual', libro: LIBRO }, libros);
        await page.goto('/');
        await expect(page.locator('.portada3d--lista, .portada3d--estatica .portada3d__ficha')).toBeVisible({ timeout: 30000 });
        const compra = await page.locator('.portada3d--lista').count() ? page.locator('.portada3d__acceso') : page.locator('.portada3d__ficha');
        await expect(compra.getByRole('link', { name: /Ver este libro/ })).toBeVisible();
        // Ensaya el clic real: el asistente flotante y la barra móvil no deben taparlo.
        await compra.getByRole('link', { name: /Ver este libro/ }).click({ trial: true });
        const recientes = page.getByRole('region', { name: 'Últimos libros agregados', exact: true });
        // En la escena 3D los libros llegan al final del recorrido del scroll.
        if (await page.locator('.portada3d--3d').count()) {
            await page.evaluate(() => { const s = document.querySelector('.portada3d--3d'); scrollTo(0, s.offsetTop + s.offsetHeight - innerHeight); });
            await expect(recientes.locator('.portada3d__apilar-item').last()).toHaveCSS('opacity', '1');
        } else await recientes.scrollIntoViewIfNeeded();
        await expect(recientes.getByRole('link')).toHaveCount(5);
        const ids = await recientes.getByRole('link').evaluateAll((links) => links.map((l) => l.getAttribute('href')));
        // En la escena 3D el centro es el protagonista que estalla (id 7); el respaldo estático muestra los 5 más nuevos.
        expect(new Set(ids)).toEqual(await page.locator('.portada3d--3d').count()
            ? new Set(['/libro/7', '/libro/6', '/libro/5', '/libro/4', '/libro/3'])
            : new Set(['/libro/6', '/libro/5', '/libro/4', '/libro/3', '/libro/2']));
        if (width > 900) {
            await expect(recientes.locator('.portada3d__apilar')).toHaveAttribute('data-final', 'true');
            await expect(recientes.locator('.portada3d__apilar-item').nth(2).locator('a')).toHaveAttribute('href', '/libro/7');
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(errores).toEqual([]);
    });
}

test('pérdida de WebGL o cambio a movimiento reducido retira el canvas y conserva la compra', async ({ page }) => {
    const errores = []; page.on('pageerror', (e) => errores.push(e.message));
    await api(page); await page.goto('/');
    test.skip(!await hayWebGL2(page), 'Este motor no dispone de WebGL 2; se verifica el respaldo estático en las otras pruebas');
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await page.locator('.portada3d canvas').evaluate((c) => c.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    await expect(page.locator('.portada3d--estatica')).toBeVisible();
    await expect(page.locator('.portada3d canvas')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.portada3d--estatica')).toBeVisible();
    await expect(page.locator('.portada3d canvas')).toHaveCount(0);
    await page.getByRole('link', { name: /Ver este libro/ }).click();
    await expect(page).toHaveURL(/\/libro\/7$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('El principito');
    expect(errores).toEqual([]);
});

test('sin WebGL ni altura suficiente no descarga el motor 3D ni oculta el contenido', async ({ page }) => {
    const recursos = [];
    page.on('request', (r) => recursos.push(r.url()));
    await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (tipo, ...args) { return /^webgl/.test(tipo) ? null : original.call(this, tipo, ...args); };
    });
    await page.setViewportSize({ width: 844, height: 390 });
    await api(page); await page.goto('/');
    await expect(page.locator('.portada3d--estatica')).toBeVisible();
    expect(recursos.some((url) => url.includes('escenaLibro'))).toBe(false);
    await expect(page.getByRole('link', { name: /Ver este libro/ })).toBeVisible();
});

test('la portada rota degrada a una ficha sin imagen y un fallo de red se puede reintentar', async ({ page }) => {
    const roto = { ...LIBRO, portada: `${API}/portada-rota.png` };
    // La imagen rota solo se ve en el respaldo estático, donde la ficha no
    // queda recortada por el volumen 3D.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await api(page, { modo: 'manual', libro: roto });
    await page.route(`${API}/portada-rota.png`, (r) => r.fulfill({ status: 404 }));
    await page.goto('/');
    await expect(page.locator('.portada3d--estatica')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Portada no disponible', { exact: true })).toBeVisible();
    await page.route(`${API}/anuncios/protagonista`, (r) => r.fulfill({ status: 503, json: {} }));
    await page.reload();
    await expect(page.getByRole('button', { name: 'reintentar', exact: true })).toBeVisible({ timeout: 30000 });
    await page.route(`${API}/anuncios/protagonista`, (r) => r.fulfill({ json: { success: true, data: { modo: 'automatico', libro: { ...LIBRO, portada: `${API}/portada-ok.png` } } } }));
    await page.route(`${API}/portada-ok.png`, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('') }));
    await page.getByRole('button', { name: 'reintentar', exact: true }).click();
    await expect(page.locator('.portada3d--estatica .portada3d__ficha')).toBeVisible({ timeout: 30000 });
});

test('la portada no ofrece sonido ni crea AudioContext', async ({ page }) => {
    test.setTimeout(60000);
    const errores = []; page.on('pageerror', (e) => errores.push(e.message));
    await page.addInitScript(() => {
        window.__audioPortada = [];
        const Contexto = window.AudioContext;
        if (!Contexto) return;
        window.AudioContext = new Proxy(Contexto, { construct(Target, args) { const ctx = new Target(...args); window.__audioPortada.push(ctx); return ctx; } });
    });
    await api(page); await page.goto('/');
    test.skip(!await hayWebGL2(page), 'La escena requiere WebGL 2');
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.portada3d__sonido')).toHaveCount(0);
    expect(await page.evaluate(() => window.__audioPortada.length)).toBe(0);
    // Navegación dentro de la app (page.goto recargaría el documento y
    // reiniciaría el registro de contextos de esta prueba).
    await page.locator('.portada3d a[href="/libro/7"]').first().click();
    await expect(page).toHaveURL(/\/libro\/7$/);
    // La ficha se carga bajo demanda: la portada se desmonta cuando aparece.
    await expect(page.locator('.portada3d')).toHaveCount(0, { timeout: 30000 });
    expect(await page.evaluate(() => window.__audioPortada.length)).toBe(0);
    await page.goto('/');
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.portada3d__sonido')).toHaveCount(0);
    expect(await page.evaluate(() => window.__audioPortada.length)).toBe(0);
    expect(errores).toEqual([]);
});

test('sin libros elegibles no inventa un libro: portada sin libro con acceso al catálogo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await api(page, { modo: 'ninguno', libro: null });
    await page.goto('/');
    const portada = page.locator('.portada3d--estatica');
    await expect(portada).toBeVisible({ timeout: 30000 });
    await expect(portada.locator('.portada3d__libro-titulo')).toHaveCount(0);
    await expect(portada.getByRole('link', { name: /Ver catálogo/ })).toHaveAttribute('href', '/catalogo');
});

test('si la API de la portada falla, la página sigue usable', async ({ page }) => {
    await api(page);
    await page.unroute(`${API}/anuncios/protagonista`);
    await page.route(`${API}/anuncios/protagonista`, (r) => r.fulfill({ status: 503, json: { success: false } }));
    await page.goto('/');
    await expect(page.locator('.portada3d--estatica')).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Libros y anuncios de Librería del Saber');
});

test('escena 3D: avanza y retrocede con el scroll sin controles de sonido', async ({ page, browserName }) => {
    const errores = []; page.on('pageerror', (e) => errores.push(e.message));
    await api(page);
    await page.goto('/');
    const webgl = await hayWebGL2(page);
    test.skip(!webgl, `Sin WebGL en ${browserName}: se cubre con la versión estática`);
    await expect(page.locator('.portada3d--lista')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.portada3d__sonido')).toHaveCount(0);
    const { top, h, vh } = await page.evaluate(() => { const s = document.querySelector('.portada3d'); return { top: s.offsetTop, h: s.offsetHeight, vh: innerHeight }; });
    const ficha = page.locator('.portada3d__ficha--flotante');
    // Al 30 % se presenta la ficha del libro; al volver al inicio desaparece.
    await page.evaluate((y) => window.scrollTo(0, y), top + (h - vh) * 0.32);
    await expect(ficha).toHaveCSS('visibility', 'visible');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(ficha).toHaveCSS('visibility', 'hidden');
    await expect(page.locator('.portada3d__sonido')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errores).toEqual([]);
});

for(const ancho of [390,1440])test(`libro cerrado ${ancho}px: tapa y hojas inmóviles, con cintas y transición reversibles`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({width:ancho,height:1000});
    await page.addInitScript(()=>performance.setResourceTimingBufferSize(3000));
    await api(page); await page.goto('/');
    test.skip(!await hayWebGL2(page),'La coordinación 3D se prueba cuando existe WebGL 2');
    await expect(page.locator('.portada3d--lista')).toBeVisible({timeout:30000});
    // Instrumentación exclusiva de la prueba, sin exponer controles en la web.
    await page.evaluate(async()=>{
        const recurso=nombre=>performance.getEntriesByType('resource').map(r=>r.name).filter(url=>url.includes('/'+nombre)).at(-1);
        const {default:Escena}=await import(recurso('escenaLibro.js'));
        window.__coordinacion=[];
        const dibujar=Escena.prototype.dibujar;
        Escena.prototype.dibujar=function(...args){
            const r=dibujar.apply(this,args);
            if(r)window.__coordinacion.push({p:r.p,tapa:this.bisagra.rotation.y,
                hojas:this.hojas.map(h=>h.rotation.y),bloque:this.bloque.scale.z,
                cintas:this.portal.grupo.rotation.z,disolucion:r.disolucion});
            return r;
        };
    });
    const ir=async p=>{
        await page.evaluate(p=>{const s=document.querySelector('.portada3d--3d'),top=s.getBoundingClientRect().top+scrollY,cab=parseFloat(getComputedStyle(s).getPropertyValue('--cabecera'))||0;scrollTo(0,top-cab+(s.offsetHeight-innerHeight+cab)*p);},p);
        await page.waitForTimeout(1100);
    };
    for(const p of [.3,.46,.6,.75,.46,0])await ir(p);
    const cuadros=await page.evaluate(()=>window.__coordinacion);
    expect(cuadros.length).toBeGreaterThan(6);
    expect(cuadros.every(c=>Math.abs(c.tapa)<1e-6 && c.hojas.every(h=>Math.abs(h)<1e-6) && c.bloque===1)).toBe(true);
    expect(cuadros.some(c=>c.disolucion>0)).toBe(true);
    expect(new Set(cuadros.map(c=>c.cintas.toFixed(3))).size).toBeGreaterThan(1);
    await expect(page.locator('.portada3d__sonido')).toHaveCount(0);
    await page.screenshot({path:test.info().outputPath(`libro-cerrado-${ancho}.png`)});
});
