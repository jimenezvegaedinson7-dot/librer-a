/* oxlint-disable react/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CLAVE_CLIENTE, clienteApi, exigirSesion, firmaSesion, guardar, leer } from './clienteApi';
import { centimos, listaLibros } from './libroComercial';
import { descontarCompra } from './carritoCompra';
import { claveCarrito, claveIntento as intentoDelUsuario, conExclusionCliente, enviarIntento, leerCarrito, leerIntento } from './persistenciaCompra';

const Contexto = createContext(null);
const leerSesion = () => {
    const s = leer(CLAVE_CLIENTE);
    return s?.usuario?.rol === 'cliente' && typeof s.token === 'string' && Number(s.usuario.id_usuario) > 0 ? s : null;
};

export function TiendaProvider({ catalogo, children }) {
    const [sesion,setSesion] = useState(leerSesion);
    const actual = useRef(sesion);
    const [revisando,setRevisando] = useState(Boolean(sesion));
    const [errorSesion,setErrorSesion] = useState('');
    const [revision,setRevision] = useState(0);
    const [carrito,setCarrito] = useState(() => leerCarrito(sesion?.usuario.id_usuario));
    const [versionIntento,setVersionIntento] = useState(0);
    const [frescos,setFrescos] = useState(null);
    const [aviso,setAviso] = useState('');
    const usuario = sesion?.usuario;
    const generacion = firmaSesion(sesion);
    const claveIntento = intentoDelUsuario(usuario?.id_usuario);
    const libros = frescos || catalogo.libros;
    const items = carrito.items;

    const adoptar = useCallback(nueva => {
        actual.current = nueva;
        setSesion(nueva); setRevisando(Boolean(nueva)); setErrorSesion('');
        setCarrito(leerCarrito(nueva?.usuario.id_usuario));
        setVersionIntento(v => v + 1); setAviso('');
    },[]);
    const cerrarSesion = useCallback(() => {
        if (firmaSesion(actual.current) !== firmaSesion(leerSesion())) { adoptar(leerSesion()); return; }
        localStorage.removeItem(CLAVE_CLIENTE); adoptar(null);
    },[adoptar]);

    useEffect(() => {
        const sincronizar = e => {
            const nueva = leerSesion();
            if (firmaSesion(actual.current) !== firmaSesion(nueva)) { adoptar(nueva); return; }
            if (!e || e.key === null || e.key === claveCarrito(nueva?.usuario.id_usuario)) setCarrito(leerCarrito(nueva?.usuario.id_usuario));
            if (!e || e.key === null || e.key === intentoDelUsuario(nueva?.usuario.id_usuario)) setVersionIntento(v => v + 1);
        };
        const expirada = e => {
            if (e.detail !== firmaSesion(actual.current) || e.detail !== firmaSesion(leerSesion())) return;
            cerrarSesion(); setAviso('Tu sesión ha vencido. Inicia sesión para continuar.');
        };
        window.addEventListener('storage',sincronizar);
        window.addEventListener('focus',sincronizar);
        window.addEventListener('cliente-sesion-expirada',expirada);
        return () => {
            window.removeEventListener('storage',sincronizar); window.removeEventListener('focus',sincronizar);
            window.removeEventListener('cliente-sesion-expirada',expirada);
        };
    },[adoptar,cerrarSesion]);

    useEffect(() => {
        const captura = actual.current;
        if (!captura) return undefined;
        let vigente = true;
        clienteApi.perfil(captura).then(json => {
            if (!vigente) return;
            if (json.data?.rol !== 'cliente' || Number(json.data.id_usuario) !== Number(captura.usuario.id_usuario)) { cerrarSesion(); return; }
            const nueva = {...captura,usuario:json.data};
            actual.current = nueva; setSesion(nueva); setErrorSesion('');
        }).catch(error => {
            if (vigente && error.name !== 'SesionCambiada' && error.status !== 401) setErrorSesion(error.message);
        }).finally(() => { if (vigente) setRevisando(false); });
        return () => { vigente = false; };
    },[generacion,revision,cerrarSesion]);

    async function iniciarSesion(json) {
        if (!json.token || json.data?.rol !== 'cliente') throw new Error('Usa una cuenta de cliente. El acceso administrativo está en el panel.');
        const previa = actual.current;
        await conExclusionCliente(json.data.id_usuario,() => {
            if (firmaSesion(previa) !== firmaSesion(leerSesion())) throw new Error('La sesión cambió. Revisa la cuenta actual.');
            const estado = leerCarrito(json.data.id_usuario);
            if (!previa) {
                const invitado = leerCarrito(null);
                invitado.items.forEach(i => {
                    const guardado = estado.items.find(x => x.id_libro === i.id_libro);
                    if (guardado) guardado.cantidad = Math.min(999,guardado.cantidad + i.cantidad);
                    else estado.items.push(i);
                });
                localStorage.removeItem(claveCarrito(null));
            }
            guardar(claveCarrito(json.data.id_usuario),estado);
            const nueva = {token:json.token,usuario:json.data,generacion:crypto.randomUUID()};
            guardar(CLAVE_CLIENTE,nueva); adoptar(nueva);
        },false);
    }
    async function modificarCarrito(cambiar) {
        const captura = actual.current;
        try {
            return await conExclusionCliente(captura?.usuario.id_usuario,() => {
                if (firmaSesion(captura) !== firmaSesion(leerSesion())) throw new Error('Tu cuenta cambió. Revisa el carrito de la cuenta actual.');
                const estado = leerCarrito(captura?.usuario.id_usuario);
                const resultado = cambiar(estado);
                guardar(claveCarrito(captura?.usuario.id_usuario),estado);
                setCarrito(estado); return resultado;
            },false);
        } catch (e) { setAviso(e.message); return false; }
    }
    async function agregar(libro,unidades = 1) {
        if (!libro.disponible) { setAviso('Este libro está agotado.'); return false; }
        if (!Number.isInteger(unidades) || unidades < 1 || unidades > 999) return false;
        return modificarCarrito(estado => {
            const i = estado.items.find(x => x.id_libro === libro.id);
            if ((i?.cantidad || 0) + unidades > Math.min(libro.stock,999)) {
                setAviso('Revisa la cantidad: supera las unidades disponibles para este libro.'); return false;
            }
            if (i) i.cantidad += unidades;
            else estado.items.push({id_libro:libro.id,cantidad:unidades,linea:crypto.randomUUID(),retiradas:0});
            setAviso(`${libro.titulo} añadido al carrito.`); return true;
        });
    }
    function cantidad(id,valor) {
        const n = Number(valor);
        if (!Number.isInteger(n) || n < 1 || n > 999) return;
        return modificarCarrito(estado => {
            const i = estado.items.find(x => x.id_libro === id);
            if (i) { i.retiradas += Math.max(0,i.cantidad - n); i.cantidad = n; }
        });
    }
    function quitar(id) { return modificarCarrito(estado => { estado.items = estado.items.filter(i => i.id_libro !== id); }); }
    async function refrescar() {
        const nuevos = listaLibros(await clienteApi.catalogo());
        setFrescos(nuevos); return nuevos;
    }

    const confirmarCompra = useCallback(async venta => {
        const captura = actual.current;
        if (!captura || revisando || errorSesion || !venta) return;
        return conExclusionCliente(captura.usuario.id_usuario,async () => {
            exigirSesion(captura);
            let intento = leerIntento(captura.usuario.id_usuario);
            if (!intento) return;
            if (!intento.orden?.id_venta) intento = await enviarIntento(intento,captura);
            if (Number(intento.orden.id_venta) !== Number(venta.id_venta)) return;
            if (venta.id_usuario != null && Number(venta.id_usuario) !== Number(captura.usuario.id_usuario)) return;
            if (['cancelada','reembolsada'].includes(venta.estado)) {
                localStorage.removeItem(claveIntento); setVersionIntento(v => v + 1); return;
            }
            if (!['pagada','entregada'].includes(venta.estado)) return;
            const estado = descontarCompra(leerCarrito(captura.usuario.id_usuario),intento,venta);
            guardar(claveCarrito(captura.usuario.id_usuario),estado);
            setCarrito(estado);
            localStorage.removeItem(claveIntento); setVersionIntento(v => v + 1);
        });
    },[revisando,errorSesion,claveIntento]);
    useEffect(() => {
        const captura = actual.current;
        if (!captura || revisando || errorSesion) return undefined;
        // Los intentos sin respuesta se recuperan explícitamente en checkout
        // o al consultar Mis compras, nunca creando otro intento en segundo plano.
        let intento;
        try { intento = leerIntento(captura.usuario.id_usuario); } catch (e) { queueMicrotask(() => setAviso(e.message)); return undefined; }
        if (!intento?.orden?.id_venta) return undefined;
        let activo = true;
        clienteApi.compra(intento.orden.id_venta,captura).then(j => activo && confirmarCompra(j.data)).catch(e => {
            if (activo && e.name !== 'SesionCambiada' && e.status !== 401) setAviso(e.message);
        });
        return () => { activo = false; };
    },[generacion,revisando,errorSesion,confirmarCompra]);

    const lineas = items.map(i => ({...i,libro:libros.find(l => l.id === i.id_libro)}));
    const subtotal = lineas.reduce((s,i) => s + centimos(i.libro?.precioFinal) * i.cantidad,0) / 100;
    return <Contexto.Provider value={{sesion,generacion,usuario,revisando,errorSesion,
        reintentarSesion:() => { setErrorSesion(''); setRevisando(true); setRevision(v => v + 1); },
        iniciarSesion,cerrarSesion,items,lineas,subtotal,libros,cargando:catalogo.cargando && !frescos,
        agregar,cantidad,quitar,refrescar,aviso,setAviso,claveIntento,versionIntento,
        notificarIntento:() => setVersionIntento(v => v + 1),confirmarCompra}}>{children}</Contexto.Provider>;
}
export function useTienda() { return useContext(Contexto); }
