import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clienteApi, checkoutSeguro } from './clienteApi';
import { useTienda } from './TiendaContext';
import { soles } from '../lib/formato';
import { descripcionEntrega, ubicacionEntrega } from '../../lib/utils/entrega';
import { formatearFecha } from '../../lib/utils/format';

const estados={pendiente:'Pendiente de pago',pagada:'Pagada',entregada:'Entregada',cancelada:'Cancelada',reembolsada:'Reembolsada'};
const entrega={pendiente:'Pendiente',preparando:'Preparando',listo_recojo:'Lista para recojo',en_camino:'En camino',entregado:'Entregada',cancelado:'Cancelada'};
export default function MisComprasPage() {
    const t=useTienda(); const [params]=useSearchParams();
    const idUsuario=t.usuario?.id_usuario, confirmar=t.confirmarCompra;
    const [compras,setCompras]=useState([]),[error,setError]=useState(''),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false),[cargando,setCargando]=useState(true);
    const cargar=useCallback(async () => {
        try {const lista=(await clienteApi.compras()).data || [];setCompras(lista);lista.forEach(confirmar);setError('');}
        catch(e){setError(e.message);} finally{setCargando(false);}
    },[confirmar]);
    useEffect(()=>{if(idUsuario && !t.revisando)Promise.resolve().then(cargar);},[idUsuario,t.revisando,cargar]);
    async function verificar(v) {
        if(ocupado)return;setOcupado(true);setError('');
        try {await clienteApi.verificarPago(v.external_reference || v.payu_order_id);await cargar();setMensaje('Consultamos el estado del pago con el servidor.');}
        catch(e){setError(e.message);} finally{setOcupado(false);}
    }
    async function continuar(v) {
        if(ocupado)return;setOcupado(true);setError('');
        try {const data=(await clienteApi.pagoCompra(v.id_venta)).data;
            if(!data.checkout_url){await cargar();throw new Error('Esta compra ya no tiene un pago pendiente. Revisa su estado.');}
            window.location.assign(checkoutSeguro(data.checkout_url));
        } catch(e){setError(e.message);setOcupado(false);}
    }
    return <section className="compra-pagina contenedor"><h1>Mis compras</h1>
        {params.get('orden') && <p className="compra-aviso">Volviste del pago. El estado se confirma con PayU; volver a esta página no confirma el cobro.</p>}
        {!t.usuario ? <><p>Inicia sesión para consultar tus compras.</p><Link className="boton boton--compra" to="/cuenta?continuar=/mis-compras">Ingresar</Link></>
            : <><button className="boton boton--linea" disabled={ocupado || cargando} onClick={cargar}>Actualizar compras</button>
                {error && <p role="alert" className="compra-error">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
                {cargando ? <p role="status">Cargando compras…</p> : !compras.length ? <p>Todavía no tienes compras. <Link to="/catalogo">Explorar catálogo</Link></p>
                    : <div className="compras-lista">{compras.map(v=><article key={v.id_venta} className="compra-registro">
                        <header><h2>Compra #{v.id_venta}</h2><strong>{estados[v.estado] || v.estado}</strong></header>
                        <p>{v.canal_compra==='web'?'Web':'App'} · {descripcionEntrega(v)}</p>
                        {v.fecha_venta && <p>{formatearFecha(v.fecha_venta)}</p>}
                        <p>Entrega: {entrega[v.estado_entrega] || v.estado_entrega || 'Pendiente'}</p>
                        {ubicacionEntrega(v) && <p>{ubicacionEntrega(v)}</p>}{v.direccion && <p>{v.direccion}</p>}{v.referencia && <p>Referencia: {v.referencia}</p>}
                        <ul>{(v.detalle || []).map(i=><li key={i.id_libro}>{i.titulo} × {i.cantidad} — {soles(i.subtotal)}</li>)}</ul>
                        <p>Costo de entrega: {soles(v.costo_envio)}</p><p>Total: <strong>{soles(v.total)}</strong></p>
                        {v.estado==='pendiente' && v.external_reference && <div className="compra-acciones"><button className="boton boton--compra" disabled={ocupado} onClick={()=>continuar(v)}>Continuar pago de compra #{v.id_venta}</button>
                            <button className="boton boton--linea" disabled={ocupado} onClick={()=>verificar(v)}>Verificar pago de compra #{v.id_venta}</button></div>}
                    </article>)}</div>}</>}
    </section>;
}
