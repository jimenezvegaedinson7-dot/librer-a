/* oxlint-disable react/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CLAVE_CLIENTE, clienteApi, guardar, leer } from './clienteApi';
import { centimos, listaLibros } from './libroComercial';

const Contexto = createContext(null);
const claveCarrito = id => `libreria-web-carrito-${id || 'invitado'}`;
const limpiarItems = lista => Array.isArray(lista) ? lista.filter(i => Number.isInteger(i.id_libro) && i.id_libro > 0
    && Number.isInteger(i.cantidad) && i.cantidad > 0 && i.cantidad <= 999) : [];

export function TiendaProvider({ catalogo, children }) {
    const [sesion, setSesion] = useState(() => {
        const previa = leer(CLAVE_CLIENTE);
        return previa?.usuario?.rol === 'cliente' && typeof previa.token === 'string' ? previa : null;
    });
    const [revisando, setRevisando] = useState(Boolean(sesion));
    const [items, setItems] = useState(() => limpiarItems(leer(claveCarrito(sesion?.usuario.id_usuario), [])));
    const [frescos, setFrescos] = useState(null);
    const [aviso, setAviso] = useState('');
    const libros = frescos || catalogo.libros;
    const usuario = sesion?.usuario;
    const usuarioActual = useRef(usuario?.id_usuario);
    const claveIntento = `libreria-web-intento-${usuario?.id_usuario || 'invitado'}`;

    function cerrarSesion() {
        usuarioActual.current = null;
        localStorage.removeItem(CLAVE_CLIENTE);
        setSesion(null); setRevisando(false);
        setItems(limpiarItems(leer(claveCarrito(null), [])));
    }
    useEffect(() => {
        if (!sesion?.token) return undefined;
        let vigente = true;
        clienteApi.perfil().then(json => {
            if (!vigente) return;
            if (json.data?.rol !== 'cliente') { cerrarSesion(); return; }
            setSesion(prev => prev ? {...prev,usuario:json.data} : null);
        }).catch(error => {
            if (vigente) { cerrarSesion(); setAviso(error.message); }
        }).finally(() => { if (vigente) setRevisando(false); });
        return () => { vigente = false; };
    }, [sesion?.token]);
    useEffect(() => {
        const expirada = () => { cerrarSesion(); setAviso('Tu sesión ha vencido. Inicia sesión para continuar.'); };
        window.addEventListener('cliente-sesion-expirada', expirada);
        return () => window.removeEventListener('cliente-sesion-expirada', expirada);
    }, []);
    useEffect(() => { guardar(claveCarrito(usuario?.id_usuario), items); }, [items, usuario?.id_usuario]);

    function iniciarSesion(json) {
        if (!json.token || json.data?.rol !== 'cliente') throw new Error('Usa una cuenta de cliente. El acceso administrativo está en el panel.');
        const nueva = {token:json.token,usuario:json.data};
        usuarioActual.current = json.data.id_usuario;
        const anteriores = limpiarItems(leer(claveCarrito(json.data.id_usuario), []));
        const unidos = new Map(anteriores.map(i => [i.id_libro, i.cantidad]));
        if (!usuario) items.forEach(i => unidos.set(i.id_libro, Math.min(999, (unidos.get(i.id_libro) || 0) + i.cantidad)));
        guardar(CLAVE_CLIENTE, nueva);
        localStorage.removeItem(claveCarrito(null));
        setSesion(nueva); setRevisando(true);
        setAviso('');
        setItems([...unidos].map(([id_libro,cantidad]) => ({id_libro,cantidad})));
    }
    function agregar(libro, unidades = 1) {
        if (!libro.disponible) { setAviso('Este libro está agotado.'); return false; }
        if (!Number.isInteger(unidades) || unidades < 1 || unidades > 999) return false;
        if ((items.find(i => i.id_libro === libro.id)?.cantidad || 0) + unidades > Math.min(libro.stock, 999)) {
            setAviso('Revisa la cantidad: supera las unidades disponibles para este libro.'); return false;
        }
        setItems(prev => {
            const actual = prev.find(i => i.id_libro === libro.id);
            return actual ? prev.map(i => i.id_libro === libro.id ? {...i,cantidad:Math.min(libro.stock,999,i.cantidad+unidades)} : i)
                : [...prev,{id_libro:libro.id,cantidad:unidades}];
        });
        setAviso(`${libro.titulo} añadido al carrito.`);
        return true;
    }
    function cantidad(id, valor) {
        const n = Number(valor);
        if (!Number.isInteger(n) || n < 1 || n > 999) return;
        setItems(prev => prev.map(i => i.id_libro === id ? {...i,cantidad:n} : i));
    }
    async function refrescar() {
        const nuevos = listaLibros(await clienteApi.catalogo());
        setFrescos(nuevos); return nuevos;
    }
    const confirmarCompra = useCallback((venta) => {
        if (!usuarioActual.current || Number(usuarioActual.current) !== Number(usuario?.id_usuario)) return;
        const intento = leer(claveIntento);
        if (!intento || intento.orden?.id_venta !== venta.id_venta) return;
        if (['cancelada','reembolsada'].includes(venta.estado)) {localStorage.removeItem(claveIntento);return;}
        if (!['pagada','entregada'].includes(venta.estado)) return;
        // Solo se retiran las unidades pagadas; otros artículos permanecen.
        const pagados = venta.detalle || venta.detalles || [];
        setItems(prev => prev.map(i => ({...i,cantidad:i.cantidad - Number(pagados.find(x => Number(x.id_libro) === i.id_libro)?.cantidad || 0)}))
            .filter(i => i.cantidad > 0));
        localStorage.removeItem(claveIntento);
    }, [claveIntento, usuario?.id_usuario]);
    useEffect(() => {
        if (!usuario?.id_usuario || revisando) return undefined;
        const intento = leer(claveIntento);
        if (!intento?.orden?.id_venta) return undefined;
        let activo = true;
        clienteApi.compra(intento.orden.id_venta).then(j => { if(activo)confirmarCompra(j.data); }).catch(() => {});
        return () => {activo=false;};
    }, [usuario?.id_usuario,revisando,claveIntento,confirmarCompra]);
    const lineas = items.map(i => ({...i,libro:libros.find(l => l.id === i.id_libro)}));
    const subtotal = lineas.reduce((s,i) => s + centimos(i.libro?.precioFinal) * i.cantidad, 0) / 100;
    return <Contexto.Provider value={{usuario,revisando,iniciarSesion,cerrarSesion,items,lineas,subtotal,libros,cargando:catalogo.cargando && !frescos,
        agregar,cantidad,quitar:id => setItems(prev => prev.filter(i => i.id_libro !== id)),refrescar,
        aviso,setAviso,claveIntento,confirmarCompra}}>{children}</Contexto.Provider>;
}
export function useTienda() { return useContext(Contexto); }
