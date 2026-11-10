const texto = (valor) => (typeof valor === 'string' ? valor.trim().slice(0, 100) : '');
const dinero = (valor) => Math.round(Number(valor) * 100) / 100;
const total = (items) => items.reduce((suma, item) => suma + Math.round(item.price * 100) * item.quantity, 0) / 100;

export function resolverMedicion({ configurada, produccion, hostname }) {
    if (typeof configurada === 'string') return configurada.trim();
    return produccion && ['libreria.my', 'www.libreria.my'].includes(hostname) ? 'G-5SG4L6QMEN' : '';
}

export function itemAnalitica(libro, cantidad = 1) {
    const id = Number(libro?.id ?? libro?.id_libro);
    const precio = Number(libro?.precio_unitario ?? libro?.precioFinal ?? libro?.precio_final ?? libro?.precio);
    if (!Number.isSafeInteger(id) || id < 1 || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999 || !Number.isFinite(precio) || precio < 0) return null;
    return {
        item_id: String(id),
        item_name: texto(libro.titulo),
        ...(texto(libro.categoria) && { item_category: texto(libro.categoria) }),
        ...(texto(libro.autor) && { autor_libro: texto(libro.autor) }),
        price: dinero(precio),
        quantity: cantidad
    };
}

export function crearAnalitica({ medicion, ventana, depurar = false }) {
    const id = typeof medicion === 'string' ? medicion.trim() : '';
    const vistos = new Set();
    const compras = new Set();
    const claveCompras = `matidana-ga4-compras-${id}`;
    let iniciada = false;
    const rutaSegura = () => {
        const ruta = ventana.location.pathname;
        if (/^\/libro\/\d+\/?$/.test(ruta)) return ruta;
        return ['/', '/catalogo', '/aplicacion', '/caracteristicas', '/nosotros', '/descargar', '/cuenta', '/carrito', '/checkout', '/mis-compras', '/favoritos'].includes(ruta)
            ? ruta
            : '/';
    };
    const urlSegura = () => `${ventana.location.origin}${rutaSegura()}`;
    const referenciaSegura = () => {
        try {
            return new URL(ventana.document.referrer).origin;
        } catch {
            return '';
        }
    };
    function iniciar() {
        try {
            if (!ventana || !/^G-[A-Z0-9]{5,20}$/.test(id) || ventana.navigator?.globalPrivacyControl === true) return false;
            if (iniciada) return true;
            ventana.dataLayer = ventana.dataLayer || [];
            if (typeof ventana.gtag !== 'function')
                ventana.gtag = function () {
                    ventana.dataLayer.push(arguments);
                };
            ventana.gtag('js', new Date());
            ventana.gtag('config', id, {
                send_page_view: false,
                allow_google_signals: false,
                allow_ad_personalization_signals: false,
                page_location: urlSegura(),
                page_referrer: referenciaSegura(),
                ...(depurar && { debug_mode: true })
            });
            if (!ventana.document.getElementById('matidana-ga4')) {
                const script = ventana.document.createElement('script');
                script.id = 'matidana-ga4';
                script.async = true;
                script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
                ventana.document.head.appendChild(script);
            }
            iniciada = true;
            return true;
        } catch {
            return false;
        }
    }
    function evento(nombre, datos, clave) {
        try {
            if (!iniciar() || (clave && vistos.has(clave))) return false;
            ventana.gtag('event', nombre, { ...datos, page_location: urlSegura(), page_referrer: referenciaSegura(), send_to: id });
            if (clave) {
                vistos.add(clave);
                if (vistos.size > 256) vistos.delete(vistos.values().next().value);
            }
            return true;
        } catch {
            return false;
        }
    }
    function productos(nombre, libros, clave, datos = {}) {
        const items = libros
            .map((libro) => itemAnalitica(libro))
            .filter(Boolean)
            .slice(0, 200);
        return items.length ? evento(nombre, { currency: 'PEN', value: total(items), ...datos, items }, clave) : false;
    }
    return {
        pagina: (titulo, clave) => evento('page_view', { page_title: texto(titulo) }, `pagina:${clave}`),
        libro: (libro, clave) => productos('view_item', [libro], `libro:${clave}:${libro.id}`),
        agregar: (libro, unidades) => {
            const item = itemAnalitica(libro, unidades);
            return item ? evento('add_to_cart', { currency: 'PEN', value: total([item]), items: [item] }) : false;
        },
        checkout: (lineas, clave) => {
            const items = lineas.map((i) => itemAnalitica(i.libro, i.cantidad)).filter(Boolean);
            return items.length ? evento('begin_checkout', { currency: 'PEN', value: total(items), items }, `checkout:${clave}`) : false;
        },
        lista: (libros, clave) => productos('view_item_list', libros, `recomendaciones:${clave}`, { item_list_id: 'compras_personalizadas', item_list_name: 'Según tus compras' }),
        seleccionar: (libro) => productos('select_item', [libro], null, { item_list_id: 'compras_personalizadas', item_list_name: 'Según tus compras' }),
        compra: (venta, catalogo = []) => {
            try {
                if (!Number.isSafeInteger(Number(venta?.id_venta)) || Number(venta.id_venta) < 1 || !['pagada', 'entregada'].includes(venta.estado) || venta.canal_compra !== 'web')
                    return false;
                const transaccion = `MATIDANA-${venta.id_venta}`;
                let guardadas = [];
                try {
                    const datos = JSON.parse(ventana.localStorage.getItem(claveCompras) || '[]');
                    if (Array.isArray(datos)) guardadas = datos.filter((x) => typeof x === 'string');
                } catch {}
                if (compras.has(transaccion) || guardadas.includes(transaccion)) return false;
                const detalle = venta.detalle;
                if (!Array.isArray(detalle) || !detalle.length || detalle.length > 200) return false;
                const items = detalle.map((i) => {
                    const libro = catalogo.find((l) => l.id === Number(i.id_libro));
                    return itemAnalitica(
                        { id_libro: i.id_libro, titulo: i.titulo || libro?.titulo, autor: libro?.autor, categoria: libro?.categoria, precio_unitario: i.precio_unitario },
                        Number(i.cantidad)
                    );
                });
                if (items.some((i) => !i)) return false;
                if (!evento('purchase', { transaction_id: transaccion, currency: 'PEN', value: total(items), shipping: Math.max(0, dinero(venta.costo_envio || 0)), items }))
                    return false;
                compras.add(transaccion);
                try {
                    ventana.localStorage.setItem(claveCompras, JSON.stringify([...guardadas, transaccion].slice(-200)));
                } catch {}
                return true;
            } catch {
                return false;
            }
        }
    };
}

export const analitica = crearAnalitica({
    medicion: resolverMedicion({
        configurada: import.meta.env?.VITE_GA4_ID,
        produccion: import.meta.env?.PROD,
        hostname: typeof window === 'undefined' ? '' : window.location.hostname
    }),
    depurar: import.meta.env?.VITE_GA4_DEBUG === 'true',
    ventana: typeof window === 'undefined' ? null : window
});
