import { test, expect } from '@playwright/test';

const API = 'http://127.0.0.1:59999/api';
const admin = { id_usuario: 1, nombre: 'Prueba', apellido: 'Administrador', rol: 'administrador', estado: 1 };
const autor = { id_autor: 1, nombre: 'Gabriel', apellido: 'García Márquez', nacionalidad: 'Colombiana', estado: 1, biografia: 'Autor de prueba para revisar la presentación.' };

async function preparar(page, tema, guardado) {
    await page.addInitScript(({admin, tema, guardado}) => {
        localStorage.setItem('token', 'token-de-prueba');
        localStorage.setItem('usuario', JSON.stringify(admin));
        localStorage.setItem('libreria-admin-theme', tema);
        if (guardado) localStorage.setItem('libreria-theme-customization', JSON.stringify({
            zonas: {sidebar:'default',topbar:'default',buttons:'default',icons:'default'}
        }));
    }, {admin, tema, guardado});
    await page.route(`${API}/**`, route => {
        const ruta = new URL(route.request().url()).pathname;
        if (ruta.endsWith('/usuarios/perfil')) return route.fulfill({json:{success:true,data:admin}});
        if (ruta === '/api/autores') return route.fulfill({json:{success:true,data:[autor]}});
        if (ruta === '/api/autores/1') return route.fulfill({json:{success:true,data:autor}});
        if (ruta === '/api/pagos') return route.fulfill({json:{success:true,pagos:[],total:0,paginas:1}});
        if (ruta.endsWith('/resumen') || ruta.endsWith('/indicadores-ventas')) return route.fulfill({json:{success:true,data:{}}});
        return route.fulfill({json:{success:true,data:[]}});
    });
}

async function contraste(locator) {
    return locator.evaluate(el => {
        const estilo = getComputedStyle(el);
        const luminancia = rgb => {
            const canales = rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(n => {
                n /= 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            });
            return canales[0]*0.2126 + canales[1]*0.7152 + canales[2]*0.0722;
        };
        const a = luminancia(estilo.color), b = luminancia(estilo.backgroundColor);
        return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
    });
}

for (const ancho of [390, 1440]) {
    for (const tema of ['light', 'dark']) {
        test(`panel editorial ${tema} a ${ancho}px: marca, iconos, contraste y detalle`, async ({page}) => {
            await page.setViewportSize({width:ancho,height:1000});
            const errores=[]; page.on('pageerror', e => errores.push(e.message));
            await preparar(page, tema, ancho === 1440);
            await page.goto('/autores');
            await expect(page.locator('.admin-shell')).toHaveAttribute('data-theme', tema);
            await expect(page.locator('.admin-main')).toHaveCSS('background-color', tema === 'dark' ? 'rgb(10, 31, 49)' : 'rgb(255, 249, 239)');
            const guardar=page.getByRole('button',{name:'Guardar autor',exact:true});
            await expect(guardar).toHaveCSS('background-color','rgb(213, 164, 71)');
            await expect(guardar).toHaveCSS('color','rgb(10, 31, 49)');
            expect(await contraste(guardar)).toBeGreaterThanOrEqual(4.5);
            await expect(page.getByLabel('Nombre',{exact:true})).toHaveCSS('background-color',tema === 'dark' ? 'rgb(13, 41, 64)' : 'rgb(255, 255, 255)');
            if (ancho < 1024) await page.getByRole('button',{name:'Alternar menú',exact:true}).click();
            const menu=page.getByRole('complementary',{name:'Navegación principal'});
            await expect(menu).toBeVisible();
            await expect(menu).toHaveCSS('background-color',tema === 'dark' ? 'rgb(10, 31, 49)' : 'rgb(13, 41, 64)');
            await expect(menu.locator('a[href="/autores"] svg')).toHaveCSS('color','rgb(255, 255, 255)');
            for (const [ruta, icono] of [
                ['/dashboard','layout-dashboard'], ['/libros','book-open'], ['/autores','feather'],
                ['/categorias','tags'], ['/inventario','boxes'], ['/pedidos','package'],
                ['/ventas','shopping-bag'], ['/pagos','credit-card'], ['/comprobantes','receipt-text'],
                ['/tarifas-envio','truck'], ['/usuarios','users'], ['/anuncios','film'],
                ['/reclamaciones','message-square-warning'], ['/historial','history'], ['/configuracion/empresa','building-2']
            ]) {
                await expect(menu.locator(`a[href="${ruta}"] svg.lucide-${icono}`)).toHaveCount(1);
            }
            await expect(menu.locator('.lucide-pen-tool')).toHaveCount(0);
            await page.screenshot({path:test.info().outputPath(`autores-${tema}-${ancho}.png`),fullPage:true});
            if (ancho < 1024) await menu.getByRole('button',{name:'Cerrar menú',exact:true}).click();
            await page.getByTitle('Ver autor',{exact:true}).click();
            const modal=page.getByRole('dialog');
            await expect(modal.getByText('Gabriel García Márquez',{exact:true})).toBeVisible();
            await expect(modal).toHaveCSS('background-color',tema === 'dark' ? 'rgb(13, 41, 64)' : 'rgb(255, 255, 255)');
            await expect(modal).toHaveCSS('opacity','1');
            await page.screenshot({path:test.info().outputPath(`detalle-${tema}-${ancho}.png`),fullPage:true});
            await modal.getByRole('button',{name:'Cerrar',exact:true}).last().click();
            await page.goto('/dashboard');
            await expect(page.locator('.kpi-card--destacada')).toHaveCSS('background-color','rgb(13, 41, 64)');
            await expect(page.locator('.kpi-card').last()).toHaveCSS('opacity','1');
            await expect(page.locator('.mini-stat').last()).toHaveCSS('opacity','1');
            await page.screenshot({path:test.info().outputPath(`resumen-${tema}-${ancho}.png`),fullPage:true});
            expect(errores).toEqual([]);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        });
    }
}

for (const [ancho, tema] of [[390,'light'],[1440,'dark']]) {
    test(`apariencia intensa ${tema} a ${ancho}px: aplicar, persistir y excluir amarillo del menú`, async ({page}) => {
        await page.setViewportSize({width:ancho,height:1000});
        await preparar(page, tema, false);
        const aplicar = async (nombre) => {
            await page.goto('/personalizacion');
            await page.getByRole('radio',{name:nombre,exact:true}).click();
            await page.getByRole('button',{name:'Aplicar',exact:true}).click();
            const modal=page.getByRole('dialog');
            await modal.getByRole('checkbox',{name:'Seleccionar todo',exact:true}).check();
            await modal.getByRole('button',{name:'Aplicar cambios',exact:true}).click();
            await expect(modal).toHaveCount(0);
        };
        await aplicar('Azul');
        await expect(page.locator('.admin-topbar')).toHaveCSS('background-color','rgb(0, 87, 255)');
        await expect(page.getByRole('complementary',{name:'Navegación principal'})).toHaveCSS('background-color','rgb(0, 87, 255)');
        await page.screenshot({path:test.info().outputPath(`apariencia-azul-${ancho}.png`),fullPage:true});
        await page.goto('/autores');
        const guardar=page.getByRole('button',{name:'Guardar autor',exact:true});
        await expect(guardar).toHaveCSS('background-color','rgb(0, 87, 255)');
        expect(await contraste(guardar)).toBeGreaterThanOrEqual(4.5);
        await expect(page.locator('.data-table-shell thead tr').first()).toHaveCSS('background-color','rgb(0, 87, 255)');
        await expect(page.locator('.data-table-shell thead th').first()).toHaveCSS('color','rgb(255, 255, 255)');
        await page.reload();
        await expect(guardar).toHaveCSS('background-color','rgb(0, 87, 255)');
        await aplicar('Amarillo');
        await page.goto('/autores');
        await expect(guardar).toHaveCSS('background-color','rgb(242, 196, 0)');
        expect(await contraste(guardar)).toBeGreaterThanOrEqual(4.5);
        const menu=page.getByRole('complementary',{name:'Navegación principal'});
        await expect(menu).toHaveCSS('background-color',tema==='dark' ? 'rgb(10, 31, 49)' : 'rgb(13, 41, 64)');
        await expect(menu.locator('a[href="/autores"] svg')).toHaveCSS('color','rgb(255, 255, 255)');
        const perfil=page.locator('.admin-topbar button[aria-haspopup="menu"]');
        await perfil.hover();
        await expect(perfil).toHaveCSS('background-color','rgb(255, 219, 38)');
        expect(await contraste(perfil)).toBeGreaterThanOrEqual(4.5);
        if (ancho < 1024) await page.getByRole('button',{name:'Alternar menú',exact:true}).click();
        await page.screenshot({path:test.info().outputPath(`menu-sin-amarillo-${ancho}.png`),fullPage:true});
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
}
