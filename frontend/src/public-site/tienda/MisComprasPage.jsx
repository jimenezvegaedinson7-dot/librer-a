import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { FaArrowsRotate, FaReceipt } from 'react-icons/fa6';
import { clienteApi, checkoutSeguro } from './clienteApi';
import { useTienda } from './TiendaContext';
import PortadaLibro from './PortadaLibro';
import { soles } from '../lib/formato';
import { descripcionEntrega, ubicacionEntrega } from '../../lib/utils/entrega';
import { formatearFecha } from '../../lib/utils/format';
import { seguimientoPedido } from '../../lib/utils/seguimientoPedido';
import EstadoSesion from './EstadoSesion';

const estados={pendiente:'Pendiente de pago',pagada:'Pagada',entregada:'Entregada',cancelada:'Cancelada',reembolsada:'Reembolsada'};
// Seguimiento: mismos pasos y textos que la app y los correos.
function Seguimiento({ v }) {
    const seg=seguimientoPedido(v);
    return <section className={`compra-seguimiento compra-seguimiento--${seg.tono}`} aria-label={`Seguimiento de la compra #${v.id_venta}`}>
        <p className="compra-seguimiento__titulo">{seg.titulo}</p>
        {seg.mensaje && <p className="compra-seguimiento__texto">{seg.mensaje}</p>}
        {seg.pasos.length>0 && <ol className="compra-seguimiento__pasos">{seg.pasos.map(p=><li key={p.clave}
            className={p.actual?'es-actual':p.hecho?'es-hecho':undefined} aria-current={p.actual?'step':undefined}>{p.etiqueta}</li>)}</ol>}
    </section>;
}
export default function MisComprasPage() {
    const t=useTienda();
    return <ComprasCliente key={t.generacion} t={t}/>;
}
function ComprasCliente({ t }) {
    const [params]=useSearchParams();
    // Portada de cada libro: la que trae la compra o, si falta, la del catálogo
    // que ya usa la tienda (incluye las portadas resueltas por ISBN).
    const {catalogo}=useOutletContext() || {};
    const portadas=useMemo(()=>new Map((catalogo?.libros || []).map(l=>[l.id,l.portada])),[catalogo?.libros]);
    const conPortada=i=>({...i,portada:i.portada || portadas.get(Number(i.id_libro)) || null});
    const idUsuario=t.usuario?.id_usuario, confirmar=t.confirmarCompra;
    const [compras,setCompras]=useState([]),[error,setError]=useState(''),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false),[cargando,setCargando]=useState(true);
    const cargar=useCallback(async () => {
        try {
            const lista=(await clienteApi.compras(t.sesion)).data || [];
            setCompras(lista);
            for(const venta of lista)await confirmar(venta);
            setError('');
        }
        catch(e){setError(e.message);} finally{setCargando(false);}
    },[confirmar,t.sesion]);
    useEffect(()=>{if(idUsuario && !t.revisando && !t.errorSesion)Promise.resolve().then(cargar);},[idUsuario,t.revisando,t.errorSesion,cargar]);
    useEffect(() => {
        if (!idUsuario || t.revisando || t.errorSesion) return undefined;
        const actualizar = () => { if (document.visibilityState === 'visible' && !ocupado) cargar(); };
        const timer = setInterval(actualizar, 60000);
        window.addEventListener('focus', actualizar);
        return () => { clearInterval(timer); window.removeEventListener('focus', actualizar); };
    }, [idUsuario,t.revisando,t.errorSesion,cargar,ocupado]);
    async function verificar(v) {
        if(ocupado)return;setOcupado(true);setError('');
        try {await clienteApi.verificarPago(v.external_reference || v.payu_order_id,t.sesion);await cargar();setMensaje('Consultamos el estado del pago con el servidor.');}
        catch(e){setError(e.message);} finally{setOcupado(false);}
    }
    async function continuar(v) {
        if(ocupado)return;setOcupado(true);setError('');
        try {const data=(await clienteApi.pagoCompra(v.id_venta,t.sesion)).data;
            if(!data.checkout_url){await cargar();throw new Error('Esta compra ya no tiene un pago pendiente. Revisa su estado.');}
            window.location.assign(checkoutSeguro(data.checkout_url));
        } catch(e){setError(e.message);setOcupado(false);}
    }
    if(t.revisando || t.errorSesion)return <EstadoSesion titulo="Mis compras"/>;
    return <section className="compra-pagina contenedor mis-compras">
        <div className="mis-compras__cabeza"><div><h1>Mis compras</h1>
            <p>Estado del pago y de la entrega de tus pedidos hechos en la web o en la app.</p></div>
            {t.usuario && <button className="boton boton--linea boton--chico" disabled={ocupado || cargando} onClick={cargar}>
                <FaArrowsRotate aria-hidden="true"/> Actualizar compras</button>}</div>
        {params.get('orden') && <p className="compra-aviso">Volviste del pago. El estado se confirma con PayU; volver a esta página no confirma el cobro.</p>}
        {!t.usuario ? <div className="compra-vacio"><FaReceipt aria-hidden="true"/><p>Inicia sesión para consultar tus compras.</p><Link className="boton boton--compra" to="/cuenta?continuar=/mis-compras">Ingresar</Link></div>
            : <>
                {error && <p role="alert" className="compra-error">{error}</p>}{mensaje && <p role="status" className="compra-aviso">{mensaje}</p>}
                {cargando ? <p role="status">Cargando compras…</p> : !compras.length ? <div className="compra-vacio"><FaReceipt aria-hidden="true"/><p>Todavía no tienes compras.</p><Link className="boton boton--compra" to="/catalogo">Explorar catálogo</Link></div>
                    : <div className="compras-lista">{compras.map(v=><article key={v.id_venta} className="compra-registro">
                        <header>
                            <div><h2>Compra #{v.id_venta}</h2>
                                <p className="compra-registro__meta">{v.fecha_venta && <>{formatearFecha(v.fecha_venta)} · </>}{v.canal_compra==='web'?'Web':'App'}</p></div>
                            <strong className={`compra-estado compra-estado--${v.estado}`}>{estados[v.estado] || v.estado}</strong>
                        </header>
                        <Seguimiento v={v}/>
                        <div className="compra-registro__cuerpo">
                            <ul className="compra-registro__libros">{(v.detalle || []).map(i=><li key={i.id_libro}>
                                <Link to={`/libro/${Number(i.id_libro)}`} className="compra-registro__portada" aria-label={`Ver ${i.titulo}`}><PortadaLibro key={conPortada(i).portada || 'sin'} libro={conPortada(i)} mini/></Link>
                                <div className="compra-registro__titulo"><Link to={`/libro/${Number(i.id_libro)}`}>{i.titulo}</Link>
                                    <small>Cantidad: {i.cantidad}{Number(i.precio_unitario)>0 && <> · {soles(i.precio_unitario)} c/u</>}</small></div>
                                <span className="compra-registro__subtotal">{soles(i.subtotal)}</span></li>)}</ul>
                            <dl className="compra-registro__entrega">
                                <div><dt>Entrega</dt><dd>{descripcionEntrega(v)}</dd></div>
                                {v.tipo_entrega==='domicilio' && (ubicacionEntrega(v) || v.direccion) && <div><dt>Dirección</dt><dd>{[v.direccion,ubicacionEntrega(v)].filter(Boolean).join(', ')}</dd></div>}
                                {v.referencia && <div><dt>Referencia</dt><dd>{v.referencia}</dd></div>}
                            </dl>
                        </div>
                        <footer className="compra-registro__pie">
                            <dl className="compra-registro__importes">
                                <div><dt>Libros</dt><dd>{soles((v.detalle || []).reduce((s,i)=>s+Number(i.subtotal || 0),0))}</dd></div>
                                <div><dt>Costo de entrega</dt><dd>{soles(v.costo_envio)}</dd></div>
                                <div className="compra-registro__total"><dt>Total</dt><dd><strong>{soles(v.total)}</strong></dd></div>
                            </dl>
                            {v.estado==='pendiente' && v.external_reference && <div className="compra-acciones">
                                <button className="boton boton--compra boton--chico" disabled={ocupado} onClick={()=>continuar(v)} aria-label={`Continuar pago de compra #${v.id_venta}`}>Continuar el pago</button>
                                <button className="boton boton--linea boton--chico" disabled={ocupado} onClick={()=>verificar(v)} aria-label={`Verificar pago de compra #${v.id_venta}`}>Verificar pago</button></div>}
                        </footer>
                    </article>)}</div>}</>}
    </section>;
}
