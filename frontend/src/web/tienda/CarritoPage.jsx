import { Link } from 'react-router-dom';
import { FaCartShopping, FaTrashCan } from 'react-icons/fa6';
import { useTienda } from './TiendaContext';
import { portada, soles } from '../lib/formato';
import { centimos } from './libroComercial';

export default function CarritoPage() {
    const t=useTienda();
    const invalido=t.lineas.some(i=>!i.libro || i.cantidad>i.libro.stock);
    if(t.cargando && t.items.length)return <section className="compra-pagina contenedor"><h1>Mi carrito</h1><p role="status">Actualizando libros y precios…</p></section>;
    return <section className="compra-pagina contenedor">
        <h1>Mi carrito</h1><p>Revisa tus libros antes de elegir la entrega.</p>
        {!t.items.length ? <div className="compra-vacio"><FaCartShopping aria-hidden="true"/><p>Tu carrito está vacío.</p><Link className="boton boton--compra" to="/catalogo">Explorar libros</Link></div>
            : <div className="compra-distribucion"><div className="carrito-lineas">
                {t.lineas.map(({id_libro,cantidad,libro})=><article key={id_libro} className="carrito-linea">
                    {libro && <img src={portada(libro.portada,160)} alt={`Portada de ${libro.titulo}`} width="70" height="100" />}
                    <div className="carrito-linea-datos"><h2>{libro?.titulo || 'Libro no disponible'}</h2>
                        <p>{libro?.autor}</p><p>{soles(libro?.precioFinal || 0)} por unidad</p>
                        {(!libro || cantidad>libro.stock) && <p role="alert" className="compra-error">Revisa la cantidad: {libro?.stock || 0} unidades disponibles.</p>}
                        <div className="carrito-linea__controles"><label><span aria-hidden="true">Cantidad</span><span className="visualmente-oculto">Cantidad de {libro?.titulo || 'libro'}</span><input type="number" min="1" max={Math.max(1,libro?.stock || 1)}
                            value={cantidad} onChange={e=>t.cantidad(id_libro,e.target.value)} /></label>
                        <button type="button" className="enlace-texto carrito-linea__quitar" onClick={()=>t.quitar(id_libro)} aria-label={`Quitar ${libro?.titulo || 'libro'}`}><FaTrashCan aria-hidden="true"/> Quitar</button></div>
                    </div><strong>{soles(centimos(libro?.precioFinal)*cantidad/100)}</strong>
                </article>)}
            </div><aside className="compra-resumen"><h2>Resumen</h2><p>Subtotal de libros <strong>{soles(t.subtotal)}</strong></p>
                <p>El costo de delivery se informa al seleccionar la zona. Recojo gratuito en Pallasca.</p>
                {invalido ? <p role="alert">Actualiza las cantidades o quita los libros no disponibles para continuar.</p>
                    : <Link className="boton boton--compra" to="/checkout">Continuar con la compra</Link>}
                <Link className="enlace-texto" to="/catalogo">Seguir comprando</Link>
            </aside></div>}
    </section>;
}
