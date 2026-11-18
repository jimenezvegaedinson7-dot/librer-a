import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCartPlus, FaEye } from 'react-icons/fa6';
import { useTienda } from './TiendaContext';

export default function ComprarLibro({ libro, detalle = false, enlaceDetalle = false, cantidad = 1, onCantidadChange, onDetalle }) {
    const { agregar } = useTienda();
    const navegar = useNavigate();
    const [presionado, setPresionado] = useState(false);
    const valida = Number.isInteger(cantidad) && cantidad >= 1 && cantidad <= Math.min(libro.stock, 999);
    const manejarAgregar = () => {
        agregar(libro, cantidad);
        setPresionado(true);
        setTimeout(() => setPresionado(false), 1500);
    };
    return (
        <div className="compra-libro">
            {detalle && (
                <label className="ficha-cantidad">
                    Cantidad
                    <input
                        type="number"
                        min="1"
                        max={Math.min(libro.stock, 999)}
                        value={cantidad}
                        disabled={!libro.disponible}
                        onChange={(e) => onCantidadChange(e.target.value)}
                        aria-label="Cantidad de ejemplares"
                    />
                </label>
            )}
            <button
                type="button"
                className={`boton boton--compra boton--chico ${presionado ? 'presionado' : ''}`}
                disabled={!libro.disponible || !valida}
                aria-label={`Agregar ${libro.titulo} al carrito`}
                onClick={manejarAgregar}>
                <FaCartPlus aria-hidden="true" /> Agregar
            </button>
            {detalle ? (
                <button
                    type="button"
                    className="boton boton--linea"
                    disabled={!libro.disponible || !valida}
                    onClick={async () => {
                        if (await agregar(libro, cantidad)) navegar('/checkout');
                    }}>
                    Comprar ahora
                </button>
            ) : enlaceDetalle ? (
                <Link to={`/libro/${libro.id}`} className="boton boton--linea boton--detalle" aria-label={`Ver detalle de ${libro.titulo}`} onClick={onDetalle}>
                    <FaEye aria-hidden="true" /> Ver detalle
                </Link>
            ) : (
                <button className="boton boton--linea boton--detalle" aria-label={`Ver detalle de ${libro.titulo}`}>
                    <FaEye /> Ver detalle
                </button>
            )}
        </div>
    );
}
