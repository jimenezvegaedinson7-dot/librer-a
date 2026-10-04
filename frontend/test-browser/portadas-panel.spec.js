import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fuentes=JSON.parse(readFileSync(new URL('../public/portadas/fuentes.json',import.meta.url),'utf8'));
const referencias=Object.values(fuentes.portadas).filter(p=>p.referencia);
const aviso='Portada de referencia · Otra edición';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr1sAAAAASUVORK5CYII=','base64');
const admin={id_usuario:1,nombre:'Admin',apellido:'Portadas',rol:'administrador',estado:1};
const modelo={id_autor:1,id_categoria:1,autor:'Autor de prueba',categoria:'Narrativa',precio:45,precio_final:45,stock:5,estado:1,
    descripcion:'Descripción del catálogo de prueba.',descuento_porcentaje:null,precio_oferta:null,descuento_hasta:null,descuento_vigente:0,descuento_porcentaje_efectivo:0};
const lista=[
    {...modelo,id_libro:1,titulo:'El asesinato de Roger Ackroyd',isbn:'9788467045437',portada:null},
    {...modelo,id_libro:2,titulo:'Persuasión',isbn:'9789580412342',portada:null},
    {...modelo,id_libro:3,titulo:'Muerte en el Nilo',isbn:'9788477511212',portada:'/uploads/portadas/inexistente.png'},
    {...modelo,id_libro:4,titulo:'Libro de prueba sin edición',isbn:null,portada:null}
];
async function preparar(page,{manual=false,incluirReferencias=false}={}){
    const control={libros:[...lista,...(incluirReferencias?referencias.map(p=>({...modelo,id_libro:p.idLibro,titulo:p.titulo,autor:p.autor,isbn:p.isbn,portada:null})):[])].map(l=>({...l})),guardados:[]};
    if(manual)control.libros[0].portada='/uploads/portadas/manual.png';
    await page.addInitScript(admin=>{localStorage.setItem('token','token-admin-portadas-prueba');localStorage.setItem('usuario',JSON.stringify(admin));},admin);
    await page.route('http://127.0.0.1:59999/**',async route=>{
        const req=route.request(),p=new URL(req.url()).pathname;
        if(p.endsWith('/manual.png'))return route.fulfill({body:png,contentType:'image/png'});
        if(p.endsWith('/inexistente.png'))return route.fulfill({status:404});
        if(p==='/api/usuarios/perfil')return route.fulfill({json:{success:true,data:admin}});
        if(p==='/api/libros')return route.fulfill({json:{success:true,data:control.libros}});
        if(/^\/api\/libros\/\d+$/.test(p)){
            const id=Number(p.split('/').pop());
            if(req.method()==='PUT'){control.guardados.push(req.postData());return route.fulfill({json:{success:true,id_libro:id,mensaje:'Libro guardado'}});}
            return route.fulfill({json:{success:true,data:control.libros.find(l=>l.id_libro===id)}});
        }
        if(p==='/api/autores')return route.fulfill({json:{success:true,data:[{id_autor:1,nombre:'Autor',apellido:'de prueba',estado:1}]}});
        if(p==='/api/categorias')return route.fulfill({json:{success:true,data:[{id_categoria:1,nombre:'Narrativa',estado:1}]}});
        if(/\/api\/libros\/\d+\/relacionados$/.test(p))return route.fulfill({json:{success:true,data:{relacionados:[],mas_autor:[],interesarte:[]}}});
        return route.fulfill({json:{success:true,data:[],anuncio:null}});
    });
    return control;
}
async function visible(img,patron){await expect(img).toHaveAttribute('src',patron);await expect.poll(()=>img.evaluate(i=>i.complete && i.naturalWidth>0)).toBe(true);}
const fila=(page,titulo)=>page.getByRole('row').filter({hasText:titulo});

for(const ancho of [390,1440])test(`panel ${ancho}px: portada por ISBN visible en listado, detalle y edición`,async({page})=>{
    await page.setViewportSize({width:ancho,height:1000});const control=await preparar(page);await page.goto('/libros');
    await visible(page.getByAltText('Portada de El asesinato de Roger Ackroyd'),/^http:\/\/127\.0\.0\.1:5179\/portadas\/9788467045437\.jpg$/);
    await visible(page.getByAltText('Portada de Persuasión'),/\/portadas\/9789580412342\.jpg$/);
    await fila(page,'Persuasión').getByRole('button',{name:'Ver libro',exact:true}).click();
    const modal=page.getByRole('dialog');await visible(modal.getByAltText('Portada de Persuasión'),/\/portadas\/9789580412342\.jpg$/);
    await expect(modal.getByAltText('Portada de Persuasión')).toHaveCSS('object-fit','contain');
    await expect(modal).toHaveCSS('opacity','1');
    await page.screenshot({path:test.info().outputPath(`panel-portada-detalle-${ancho}.png`),fullPage:false});
    await modal.getByRole('button',{name:'Cerrar',exact:true}).first().click();await expect(modal).toHaveCount(0);
    await fila(page,'Persuasión').getByRole('button',{name:'Editar libro',exact:true}).click();
    await visible(page.getByRole('dialog').getByAltText('Portada del libro'),/\/portadas\/9789580412342\.jpg$/);
    await page.getByRole('dialog').getByRole('button',{name:'Guardar cambios',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);expect(control.guardados).toHaveLength(1);
    expect(control.guardados[0]).not.toContain('name="portada"');expect(control.guardados[0]).not.toContain('/portadas/');
    expect(control.libros.find(l=>l.id_libro===2).portada).toBeNull();
});
test('portada manual registrada tiene prioridad en el panel y en la tienda',async({page})=>{
    await preparar(page,{manual:true});await page.goto('/libros');
    await visible(page.getByAltText('Portada de El asesinato de Roger Ackroyd'),/^http:\/\/127\.0\.0\.1:59999\/uploads\/portadas\/manual\.png$/);
    await page.goto('/libro/1');await visible(page.locator('.ficha-portada-principal img'),/59999\/uploads\/portadas\/manual\.png$/);
});
test('imagen registrada rota utiliza respaldo por ISBN sin enlazar assets al backend',async({page})=>{
    await preparar(page);await page.goto('/libros');await visible(page.getByAltText('Portada de Muerte en el Nilo'),/5179\/portadas\/9788477511212\.jpg$/);
    await fila(page,'Muerte en el Nilo').getByRole('button',{name:'Ver libro',exact:true}).click();
    await visible(page.getByRole('dialog').getByAltText('Portada de Muerte en el Nilo'),/5179\/portadas\/9788477511212\.jpg$/);
    await page.goto('/libro/3');await visible(page.locator('.ficha-portada-principal img'),/5179\/portadas\/9788477511212\.jpg$/);
});
test('registro sin ISBN verificable conserva un estado vacío, sin inventar imágenes',async({page})=>{
    await preparar(page);await page.goto('/libros');await fila(page,'Libro de prueba sin edición').getByRole('button',{name:'Ver libro',exact:true}).click();
    const modal=page.getByRole('dialog');await expect(modal.getByText('Sin portada',{exact:true})).toBeVisible();await expect(modal.locator('img')).toHaveCount(0);
});
test('seleccionar una nueva imagen en edición reemplaza la vista previa y cancelar vuelve a la portada por ISBN',async({page})=>{
    await preparar(page);await page.goto('/libros');await fila(page,'Persuasión').getByRole('button',{name:'Editar libro',exact:true}).click();
    const modal=page.getByRole('dialog');await visible(modal.getByAltText('Portada del libro'),/\/portadas\/9789580412342\.jpg$/);
    await modal.locator('input[type=file]').setInputFiles({name:'portada-nueva.png',mimeType:'image/png',buffer:png});
    await expect(modal.getByAltText('Portada del libro')).toHaveAttribute('src',/^blob:/);
    await modal.getByRole('button',{name:'Cancelar cambio',exact:true}).click();await visible(modal.getByAltText('Portada del libro'),/\/portadas\/9789580412342\.jpg$/);
});

for(const ancho of [390,1440])test(`cinco referencias ${ancho}px: panel, ficha y catálogo identifican otra edición conservando ISBN`,async({page})=>{
    await page.setViewportSize({width:ancho,height:1000});
    const control=await preparar(page,{incluirReferencias:true});
    expect(referencias).toHaveLength(5);
    // Primera ruta pública: el componente compartido no depende del CSS
    // cargado al visitar previamente /libro/:id.
    await page.goto('/catalogo');
    const inicial=page.locator('.tarjeta-libro').filter({has:page.getByRole('heading',{name:'Cuentos inconclusos',exact:true})});
    await visible(inicial.locator('img'),/9789505470587-referencia\.jpg$/);
    await expect(inicial.locator('img')).toHaveCSS('object-fit','contain');
    await expect(inicial.locator('.ficha-portada')).toHaveCSS('display','grid');
    await page.goto('/libros');
    for(const r of referencias){
        const row=fila(page,r.titulo);
        await visible(row.getByAltText(`Portada de ${r.titulo}`),new RegExp(`${r.isbn}-referencia\\.jpg$`));
        await expect(row.getByText(aviso,{exact:true})).toBeVisible();
    }
    const r=referencias.find(p=>p.idLibro===60);
    await fila(page,r.titulo).getByRole('button',{name:'Ver libro',exact:true}).click();
    let modal=page.getByRole('dialog');
    await visible(modal.getByAltText(`Portada de ${r.titulo}`),/-referencia\.jpg$/);
    await expect(modal.getByText(aviso,{exact:true})).toBeVisible();
    await expect(modal).toContainText(r.isbn);
    await expect(modal.getByAltText(`Portada de ${r.titulo}`)).toHaveCSS('object-fit','contain');
    await expect(modal).toHaveCSS('opacity','1');
    await page.screenshot({path:test.info().outputPath(`referencia-panel-${ancho}.png`)});
    await modal.getByRole('button',{name:'Cerrar',exact:true}).first().click();await expect(modal).toHaveCount(0);
    await fila(page,r.titulo).getByRole('button',{name:'Editar libro',exact:true}).click();
    modal=page.getByRole('dialog');await expect(modal.getByText(aviso,{exact:true})).toBeVisible();
    await modal.locator('input[type=file]').setInputFiles({name:'nueva.png',mimeType:'image/png',buffer:png});
    await expect(modal.getByAltText('Portada del libro')).toHaveAttribute('src',/^blob:/);
    await expect(modal.getByText(aviso,{exact:true})).toHaveCount(0);
    await modal.getByRole('button',{name:'Cancelar cambio',exact:true}).click();
    await expect(modal.getByText(aviso,{exact:true})).toBeVisible();
    await expect(modal.locator('input[name="isbn"]')).toHaveValue(r.isbn);
    await modal.getByRole('button',{name:'Guardar cambios',exact:true}).click();await expect(modal).toHaveCount(0);
    expect(control.guardados).toHaveLength(1);
    expect(control.guardados[0]).not.toContain('name="portada"');
    expect(control.guardados[0]).not.toContain('/portadas/');
    expect(control.guardados[0]).toContain(r.isbn);expect(control.guardados[0]).not.toContain(r.isbnEdicion);
    for(const ref of referencias){
        await page.goto(`/libro/${ref.idLibro}`);
        const portada=page.locator('.ficha-portada-principal');
        await visible(portada.locator('img'),new RegExp(`${ref.isbn}-referencia\\.jpg$`));
        await expect(portada).toContainText(aviso);
        await expect(page.locator('.ficha-tecnica')).toContainText(ref.isbn);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        if(ref.idLibro===60)await page.screenshot({path:test.info().outputPath(`referencia-ficha-${ancho}.png`),fullPage:true});
    }
    await page.goto('/catalogo');
    const tarjetas=page.locator('.tarjeta-libro');
    await visible(tarjetas.filter({has:page.getByRole('heading',{name:'Muerte en el Nilo',exact:true})}).locator('img'),/9788477511212\.jpg$/);
    await expect(tarjetas.filter({has:page.getByRole('heading',{name:'Libro de prueba sin edición',exact:true})})).toContainText('Sin portada');
    for(const ref of referencias){
        const tarjeta=tarjetas.filter({has:page.getByRole('heading',{name:ref.titulo,exact:true})});
        await visible(tarjeta.locator('img'),new RegExp(`${ref.isbn}-referencia\\.jpg$`));
        await expect(tarjeta.getByText(aviso,{exact:true})).toBeVisible();
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:test.info().outputPath(`referencia-catalogo-${ancho}.png`),fullPage:true});
});

test('referencia solo se anuncia al mostrarla: portada registrada prioritaria, fallo y recuperación',async({page})=>{
    const control=await preparar(page,{incluirReferencias:true});
    const ref=control.libros.find(l=>l.id_libro===85);ref.portada='/uploads/portadas/manual.png';
    await page.goto('/libros');
    await expect(fila(page,ref.titulo).getByText(aviso,{exact:true})).toHaveCount(0);
    await page.goto('/libro/85');
    await visible(page.locator('.ficha-portada-principal img'),/manual\.png$/);
    await expect(page.locator('.ficha-portada-principal')).not.toContainText(aviso);
    ref.portada='/uploads/portadas/inexistente.png';await page.reload();
    await visible(page.locator('.ficha-portada-principal img'),/9789700508900-referencia\.jpg$/);
    await expect(page.locator('.ficha-portada-principal')).toContainText(aviso);
    await page.goto('/libros');await fila(page,ref.titulo).getByRole('button',{name:'Ver libro',exact:true}).click();
    await expect(page.getByRole('dialog').getByText(aviso,{exact:true})).toBeVisible();
    await page.route('**/portadas/9789700508900-referencia.jpg',route=>route.fulfill({status:404}));
    await page.goto('/libro/85');
    await expect(page.locator('.ficha-portada-principal')).toContainText('No se pudo cargar la portada');
    await expect(page.locator('.ficha-portada-principal')).not.toContainText(aviso);
});

test('portada absoluta de la API para Flutter conserva imagen y aviso en la web y el panel',async({page})=>{
    const control=await preparar(page,{incluirReferencias:true});
    const libro=control.libros.find(l=>l.id_libro===85);
    const url='https://librer-a-zeta.vercel.app/portadas/9789700508900-referencia.jpg';
    libro.portada=url;libro.portada_registrada=null;libro.portada_es_referencia=true;
    await page.route(url,async route=>route.fulfill({response:await page.request.get('/portadas/9789700508900-referencia.jpg')}));
    await page.goto('/libros');
    await visible(fila(page,libro.titulo).getByAltText(`Portada de ${libro.titulo}`),/^https:\/\/librer-a-zeta\.vercel\.app\/portadas\//);
    await expect(fila(page,libro.titulo).getByText(aviso,{exact:true})).toBeVisible();
    await page.goto('/libro/85');
    await visible(page.locator('.ficha-portada-principal img'),/^https:\/\/librer-a-zeta\.vercel\.app\/portadas\//);
    await expect(page.locator('.ficha-portada-principal')).toContainText(aviso);
    await page.goto('/catalogo');
    await expect(page.locator('.tarjeta-libro').filter({hasText:libro.titulo}).getByText(aviso,{exact:true})).toBeVisible();
});
