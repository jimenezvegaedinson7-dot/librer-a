import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronLeft, FaHeart, FaHeartCrack } from 'react-icons/fa6';
import { clienteApi } from './clienteApi';
import { useTienda } from './TiendaContext';
import { listaLibros } from './libroComercial';
import PortadaLibro from './PortadaLibro';
import ComprarLibro from './ComprarLibro';
import { soles } from '../lib/formato';
import EstadoSesion from './EstadoSesion';
import { referenciaPortadaLibro, AVISO_PORTADA_REFERENCIA } from '../../lib/utils/portadasLibro';

// ============================================================
// MIS FAVORITOS
// Los libros que el cliente marcó con el corazón en la ficha (web o
// app, misma cuenta). Precio y stock vienen del servidor en cada visita.
// ============================================================
export default function FavoritosPage() {
    const t = useTienda();
    return <FavoritosCliente key={t.generacion} t={t}/>;
}
function FavoritosCliente({ t }) {
    const idUsuario = t.usuario?.id_usuario;
    const [libros, setLibros] = useState([]), [cargando, setCargando] = useState(true), [error, setError] = useState(''), [quitando, setQuitando] = useState(null);

    const cargar = useCallback(async () => {
        try { setLibros(listaLibros(await clienteApi.favoritos(t.sesion))); setError(''); }
        catch (e) { setError(e.message); } finally { setCargando(false); }
    }, [t.sesion]);
    useEffect(() => { if (idUsuario && !t.revisando && !t.errorSesion) Promise.resolve().then(cargar); }, [idUsuario, t.revisando, t.errorSesion, cargar]);

    async function quitar(libro) {
        if (quitando) return;
        setQuitando(libro.id); setError('');
        try { await clienteApi.quitarFavorito(libro.id,t.sesion); setLibros((lista) => lista.filter((l) => l.id !== libro.id)); }
        catch (e) { setError(e.message); } finally { setQuitando(null); }
    }

    if(t.revisando || t.errorSesion)return <EstadoSesion titulo="Mis favoritos"/>;
    return <section className="compra-pagina contenedor favoritos">
        <Link to="/cuenta" className="enlace-texto favoritos__volver"><FaChevronLeft aria-hidden="true"/> Mi cuenta</Link>
        <h1>Mis favoritos</h1>
        <p>Los libros que guardaste con el corazón, en la web o en la app.</p>
        {!t.usuario ? <div className="compra-vacio"><FaHeart aria-hidden="true"/><p>Inicia sesión para ver tus libros favoritos.</p><Link className="boton boton--compra" to="/cuenta?continuar=/favoritos">Ingresar</Link></div>
            : <>
                {error && <p role="alert" className="compra-error">{error}</p>}
                {cargando ? <p role="status">Cargando favoritos…</p> : !libros.length ? <div className="compra-vacio"><FaHeartCrack aria-hidden="true"/><p>Todavía no tienes favoritos. Abre un libro y pulsa «Agregar a favoritos».</p><Link className="boton boton--compra" to="/catalogo">Explorar catálogo</Link></div>
                    : <ul className="favoritos-lista">{libros.map((l) => <li key={l.id} className="favorito">
                        <div className="favorito__tapa">
                            <Link to={`/libro/${l.id}`} className="favorito__portada" aria-label={`Ver ${l.titulo}`}><PortadaLibro libro={l} /></Link>
                            {l.descuento > 0 && <span className="favorito__oferta">-{l.descuento}%</span>}
                            <button type="button" className="favorito__quitar" disabled={quitando === l.id} onClick={() => quitar(l)} aria-label={`Quitar ${l.titulo} de favoritos`} title="Quitar de favoritos">
                                {quitando === l.id ? <FaHeartCrack aria-hidden="true" /> : <FaHeart aria-hidden="true" />}</button>
                        </div>
                        <div className="favorito__cuerpo">
                            <h2><Link to={`/libro/${l.id}`}>{l.titulo}</Link></h2>
                            {referenciaPortadaLibro(l) && <p className="portada-referencia">{AVISO_PORTADA_REFERENCIA}</p>}
                            {l.autor && <p className="favorito__autor">{l.autor}</p>}
                            <p className="favorito__precio"><strong>{soles(l.precioFinal)}</strong>{l.descuento > 0 && <s>{soles(l.precio)}</s>}</p>
                            <p className={`favorito__stock${l.disponible ? '' : ' favorito__stock--agotado'}`}>{l.disponible ? `${l.stock} ${l.stock === 1 ? 'ejemplar disponible' : 'ejemplares disponibles'}` : 'Agotado por ahora'}</p>
                            {l.disponible && <div className="favorito__acciones"><ComprarLibro libro={l} /></div>}
                        </div>
                    </li>)}</ul>}
            </>}
    </section>;
}
