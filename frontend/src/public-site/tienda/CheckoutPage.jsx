import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { clienteApi, checkoutSeguro, exigirSesion, guardar } from './clienteApi';
import { conExclusionCliente, enviarIntento, leerCarrito, leerIntento } from './persistenciaCompra';
import { centimos } from './libroComercial';
import { useTienda } from './TiendaContext';
import { soles } from '../lib/formato';
import EstadoSesion from './EstadoSesion';

export default function CheckoutPage() {
    const t=useTienda();
    return <CheckoutCliente key={t.generacion} t={t}/>;
}

function CheckoutCliente({ t }) {
    const {irArriba}=useOutletContext();
    const navigate=useNavigate();
    const idUsuario=t.usuario?.id_usuario;
    const leerPrevio=useCallback(()=>{
        try {return {intento:leerIntento(idUsuario),error:''};}
        catch(e){return {intento:null,error:e.message};}
    },[idUsuario]);
    const [lectura,setLectura]=useState(leerPrevio);
    const previo=lectura.intento;
    const [tipo,setTipo]=useState(previo?.cuerpo?.tipo_entrega || 'tienda');
    const [zonaId,setZonaId]=useState(String(previo?.cuerpo?.id_zona_delivery || ''));
    const [direccion,setDireccion]=useState(previo?.cuerpo?.direccion || '');
    const [referencia,setReferencia]=useState(previo?.cuerpo?.referencia || '');
    const [documento,setDocumento]=useState(previo?.cuerpo?.cliente_documento || '');
    const [tipoDoc,setTipoDoc]=useState(previo?.cuerpo?.cliente_tipo_documento || 'DNI');
    const [zonas,setZonas]=useState([]);
    const [error,setError]=useState('');
    const [errorZonas,setErrorZonas]=useState('');
    const [disponible,setDisponible]=useState(false);
    const [ocupado,setOcupado]=useState(false);
    const orden=previo?.orden || null;
    const bloqueo=useRef(false);
    const confirmar=t.confirmarCompra;
    useEffect(()=>{let activo=true;queueMicrotask(()=>{if(activo)setLectura(leerPrevio());});return()=>{activo=false;};},[t.versionIntento,leerPrevio]);
    useEffect(()=>{
        if(!orden?.id_venta || !idUsuario || t.revisando || t.errorSesion)return undefined;
        let activo=true;
        clienteApi.compra(orden.id_venta,t.sesion).then(async j=>{
            if(activo && ['pagada','entregada','cancelada','reembolsada'].includes(j.data?.estado)) {
                await confirmar(j.data);if(activo)navigate('/mis-compras',{replace:true});
            }
        }).catch(e=>{if(activo)setError(e.message);});
        return()=>{activo=false;};
    },[orden?.id_venta,idUsuario,confirmar,navigate,t.revisando,t.errorSesion,t.sesion]);
    useEffect(()=>{
        if(!idUsuario || t.revisando || t.errorSesion)return undefined;
        let vigente=true;
        clienteApi.capacidades().then(j=>{
            if(!j.data?.compras_web)throw new Error('La compra web aún no está disponible en este servidor.');
            if(vigente)setDisponible(true);
        }).catch(()=>{if(vigente)setError('La compra web aún no está disponible en este servidor. Inténtalo más tarde.');});
        clienteApi.zonas(t.sesion).then(j=>{if(vigente)setZonas(j.data || []);})
            .catch(e=>{if(vigente)setErrorZonas(e.message);});
        return()=>{vigente=false;};
    },[idUsuario,t.revisando,t.errorSesion,t.sesion]);
    const zona=zonas.find(z=>Number(z.id_zona)===Number(zonaId));
    const envio=tipo==='tienda' ? 0 : Number(zona?.tarifa || 0);
    async function comprar(e) {
        e.preventDefault(); if(bloqueo.current)return;
        bloqueo.current=true;setOcupado(true);setError('');
        try {
            // Recuperar primero el mismo intento evita duplicar reservas de
            // stock después de un timeout o una recarga del navegador.
            const recuperado=await conExclusionCliente(idUsuario,async()=>{
            exigirSesion(t.sesion);
            if(t.revisando || t.errorSesion)throw new Error('Verifica tu cuenta antes de continuar.');
            let intento=leerIntento(idUsuario);
            if(!intento) {
                const carrito=leerCarrito(idUsuario);
                if(!carrito.items.length)throw new Error('El carrito está vacío.');
                if(!({DNI:/^\d{8}$/,RUC:/^\d{11}$/,CE:/^[a-zA-Z0-9]{8,20}$/})[tipoDoc].test(documento.trim()))throw new Error('Revisa el número de documento.');
                const actuales=await t.refrescar();
                let cambio=false;
                exigirSesion(t.sesion);
                for(const item of carrito.items) {
                    const l=actuales.find(l=>l.id===item.id_libro),anterior=t.libros.find(l=>l.id===item.id_libro);
                    if(!l || item.cantidad>l.stock)throw new Error('El stock cambió. Revisa las cantidades en tu carrito.');
                    if(centimos(l.precioFinal)!==centimos(anterior?.precioFinal))cambio=true;
                }
                if(cambio)throw new Error('Actualizamos los precios. Revisa el resumen y vuelve a confirmar.');
                if(tipo==='domicilio') {
                    const nuevas=(await clienteApi.zonas(t.sesion)).data || [];
                    const vigente=nuevas.find(z=>Number(z.id_zona)===Number(zonaId) && Number(z.estado)===1);
                    setZonas(nuevas);
                    if(!vigente)throw new Error('Selecciona una zona de delivery activa dentro de Pallasca.');
                    if(centimos(vigente.tarifa)!==centimos(zona?.tarifa))throw new Error('La tarifa de delivery cambió. Revisa el resumen y vuelve a confirmar.');
                }
                const cuerpo={items:carrito.items.map(i=>({id_libro:i.id_libro,cantidad:i.cantidad})),tipo_entrega:tipo,
                    cliente_tipo_documento:tipoDoc,cliente_documento:documento.trim(),idempotencia_clave:crypto.randomUUID(),
                    ...(tipo==='domicilio' ? {id_zona_delivery:Number(zonaId),direccion:direccion.trim(),referencia:referencia.trim()} : {})};
                intento={id_usuario:idUsuario,cuerpo,items:cuerpo.items,carrito:carrito.items,
                    resumen:{lineas:carrito.items.map(i=>({id_libro:i.id_libro,cantidad:i.cantidad,
                        titulo:actuales.find(l=>l.id===i.id_libro).titulo,precio_centimos:centimos(actuales.find(l=>l.id===i.id_libro).precioFinal)})),
                        envio_centimos:centimos(envio),zona_nombre:zona?.nombre || ''}};
                guardar(t.claveIntento,intento);
            }
            // Otra pestaña pudo crear el pedido mientras se esperaba el bloqueo.
            return intento.orden ? intento : enviarIntento(intento,t.sesion);
            });
            exigirSesion(t.sesion);setLectura({intento:recuperado,error:''});t.notificarIntento();irArriba();
        } catch(e) {
            if(e.name!=='SesionCambiada'){setLectura(leerPrevio());t.notificarIntento();setError(e.message);}
        } finally {setOcupado(false);bloqueo.current=false;}
    }
    if(t.revisando || t.errorSesion)return <EstadoSesion titulo="Entrega y pago"/>;
    if(!t.usuario)return <section className="compra-pagina contenedor"><h1>Entrega y pago</h1><p>Inicia sesión o crea una cuenta para completar tu compra.</p>
        <Link className="boton boton--compra" to="/cuenta?continuar=/checkout">Ingresar para comprar</Link></section>;
    if(orden)return <section className="compra-pagina contenedor"><h1>Tu pedido está creado</h1>
        {error && <p role="alert" className="compra-error">{error}</p>}
        <p>Compra #{orden.id_venta}. Total definitivo: <strong>{soles(orden.total)}</strong>.</p><p>El pedido sigue pendiente hasta que PayU confirme el pago.</p>
        {orden.checkout_url && <a className="boton boton--compra" href={checkoutSeguro(orden.checkout_url)}>Pagar con PayU</a>}
        <Link className="boton boton--linea" to="/mis-compras">Consultar mis compras</Link></section>;
    if(!t.items.length && !previo && !lectura.error)return <section className="compra-pagina contenedor"><h1>Entrega y pago</h1><p>Tu carrito está vacío.</p><Link to="/catalogo">Explorar catálogo</Link></section>;
    const recuperando=Boolean(previo && !previo.orden);
    const lineas=recuperando ? previo.resumen?.lineas || previo.cuerpo.items : t.lineas;
    const subtotal=recuperando ? previo.resumen?.lineas?.reduce((s,i)=>s+i.precio_centimos*i.cantidad,0)/100 : t.subtotal;
    const envioResumen=recuperando ? previo.resumen?.envio_centimos/100 : envio;
    const tipoResumen=recuperando ? previo.cuerpo.tipo_entrega : tipo;
    return <section className="compra-pagina contenedor"><h1>Entrega y pago</h1><p>Recojo gratuito o delivery dentro de Pallasca.</p>
        {error && <p role="alert" className="compra-error">{error}</p>}
        {lectura.error && <p role="alert" className="compra-error">{lectura.error}</p>}
        {recuperando && <p role="status" className="compra-aviso">Recuperaremos tu solicitud anterior antes de crear otro pedido.</p>}
        <form className="compra-distribucion" onSubmit={comprar}>
            <div className="compra-formulario">{recuperando ? <><h2>Solicitud anterior</h2>
                <p>{tipoResumen==='tienda'?'Recojo gratuito en Pallasca':`Delivery en Pallasca · ${previo.resumen?.zona_nombre || 'Zona de la solicitud'}`}</p>
                {previo.cuerpo.direccion && <p>{previo.cuerpo.direccion}</p>}
                {previo.cuerpo.referencia && <p>{previo.cuerpo.referencia}</p>}
                <p>{previo.cuerpo.cliente_tipo_documento}: {previo.cuerpo.cliente_documento}</p></>
                : <fieldset disabled={ocupado}><legend>Cómo recibir tus libros</legend>
                <label className="entrega-opcion"><input type="radio" name="entrega" value="tienda" checked={tipo==='tienda'} onChange={()=>setTipo('tienda')}/>Recojo en Pallasca — Gratis</label>
                <label className="entrega-opcion"><input type="radio" name="entrega" value="domicilio" checked={tipo==='domicilio'} onChange={()=>setTipo('domicilio')}/>Delivery dentro de Pallasca — Tarifa por zona</label>
                {tipo==='domicilio' && <>{errorZonas && <p role="alert">{errorZonas}</p>}
                    {!zonas.length && <p>No hay zonas de delivery activas. Puedes elegir recojo gratuito.</p>}
                    <label htmlFor="web-zona-delivery">Zona de delivery</label><select id="web-zona-delivery" value={zonaId} required onChange={e=>setZonaId(e.target.value)}><option value="">Selecciona una zona</option>
                        {zonas.map(z=><option key={z.id_zona} value={z.id_zona}>{z.nombre} · {soles(z.tarifa)}</option>)}</select>
                    <label>Dirección<input required minLength={5} maxLength={255} autoComplete="street-address" value={direccion} onChange={e=>setDireccion(e.target.value)}/></label>
                    <label>Referencia de dirección (opcional)<input maxLength={255} value={referencia} onChange={e=>setReferencia(e.target.value)}/></label></>}
                <label htmlFor="web-tipo-documento">Tipo de documento</label><select id="web-tipo-documento" value={tipoDoc} onChange={e=>setTipoDoc(e.target.value)}><option>DNI</option><option>RUC</option><option>CE</option></select>
                <label>Número de documento<input required inputMode={tipoDoc==='CE'?'text':'numeric'} maxLength={tipoDoc==='DNI'?8:tipoDoc==='RUC'?11:20}
                    value={documento} onChange={e=>setDocumento(e.target.value)}/></label>
            </fieldset>}</div><aside className="compra-resumen"><h2>Resumen del pedido</h2>
                {lineas.map(i=><p key={i.id_libro}>{i.titulo || i.libro?.titulo || `Libro #${i.id_libro}`} × {i.cantidad}</p>)}
                <p>Subtotal <strong>{Number.isFinite(subtotal)?soles(subtotal):'Se confirmará al recuperar el pedido'}</strong></p>
                <p>Entrega <strong>{tipoResumen==='tienda'?'Gratis':Number.isFinite(envioResumen) && (recuperando || zona)?soles(envioResumen):'Se confirmará al recuperar el pedido'}</strong></p>
                <p>Total <strong>{Number.isFinite(subtotal) && Number.isFinite(envioResumen)?soles((centimos(subtotal)+centimos(envioResumen))/100):'Se confirmará al recuperar el pedido'}</strong></p>
                {recuperando && <p>Este resumen corresponde a la solicitud anterior, no a los cambios posteriores del carrito.</p>}
                <p>El importe definitivo se calcula en el servidor antes de pagar.</p>
                <button className="boton boton--compra" type="submit" disabled={Boolean(lectura.error) || (!recuperando && !disponible) || ocupado || (!recuperando && tipo==='domicilio' && !zona)}>{ocupado?'Creando pedido…':recuperando?'Recuperar mi pedido':'Crear pedido y continuar al pago'}</button>
                <Link className="enlace-texto" to="/carrito">Volver al carrito</Link></aside>
        </form></section>;
}
