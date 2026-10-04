import { Link, useNavigate } from 'react-router-dom';
import { FaCartPlus } from 'react-icons/fa6';
import { useTienda } from './TiendaContext';

export default function ComprarLibro({ libro, detalle = false, cantidad = 1, onCantidadChange }) {
    const {agregar} = useTienda();
    const navigate = useNavigate();
    const valida = Number.isInteger(cantidad) && cantidad >= 1 && cantidad <= Math.min(libro.stock,999);
    return <div className="compra-libro">
        {detalle && <label className="ficha-cantidad">Cantidad
            <input type="number" min="1" max={Math.min(libro.stock,999)} value={cantidad} disabled={!libro.disponible}
                onChange={e=>onCantidadChange(e.target.value)} aria-label="Cantidad de ejemplares" />
        </label>}
        <button type="button" className="boton boton--compra boton--chico" disabled={!libro.disponible || !valida}
            aria-label={`Agregar ${libro.titulo} al carrito`} onClick={() => agregar(libro,cantidad)}>
            <FaCartPlus aria-hidden="true" /> {libro.disponible ? 'Agregar al carrito' : 'Agotado'}
        </button>
        {detalle ? <button type="button" className="boton boton--linea" disabled={!libro.disponible || !valida}
            onClick={async()=>{if(await agregar(libro,cantidad))navigate('/checkout');}}>Comprar ahora</button>
            : <Link className="enlace-texto" to={`/libro/${libro.id}`}>Ver detalle</Link>}
    </div>;
}
