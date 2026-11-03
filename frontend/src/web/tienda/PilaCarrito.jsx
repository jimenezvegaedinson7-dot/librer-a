import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FaCartPlus, FaXmark } from 'react-icons/fa6';
import { useTienda } from './TiendaContext';
import PortadaLibro from './PortadaLibro';
import { soles } from '../lib/formato';
import './pila-carrito.css';

const DURACION = 4200;
const MAX = 3;

export default function PilaCarrito() {
    const tienda = useTienda();
    const reducido = useReducedMotion();
    const { pathname } = useLocation();
    const [pila, setPila] = useState([]);

    useEffect(() => {
        const alAgregar = (e) => {
            const { libro, unidades } = e.detail || {};
            if (!libro || !unidades) return;
            setPila((p) => [...p, { clave: `${libro.id}-${Date.now()}-${Math.random()}`, libro, cantidad: unidades }].slice(-MAX));
        };
        window.addEventListener('carrito-agregado', alAgregar);
        return () => window.removeEventListener('carrito-agregado', alAgregar);
    }, []);

    useEffect(() => {
        if (!pila.length) return undefined;
        const temporizadores = pila.map((f) =>
            setTimeout(() => {
                setPila((p) => p.filter((x) => x.clave !== f.clave));
            }, DURACION)
        );
        return () => temporizadores.forEach(clearTimeout);
    }, [pila]);

    const [rutaPrevia, setRutaPrevia] = useState(pathname);
    if (rutaPrevia !== pathname) {
        setRutaPrevia(pathname);
        if (pila.length) setPila([]);
    }

    if (!pila.length) return null;

    return (
        <div className="pila-carrito" aria-live="polite">
            <AnimatePresence initial={false}>
                {pila.map((f) => (
                    <motion.div
                        key={f.clave}
                        className="pila-carrito__tarjeta"
                        initial={reducido ? false : { opacity: 0, x: 24, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={reducido ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.96 }}
                        transition={{ duration: reducido ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}>
                        <span className="pila-carrito__icono" aria-hidden="true">
                            <FaCartPlus />
                        </span>
                        <div className="pila-carrito__portada">
                            <PortadaLibro libro={f.libro} mini />
                        </div>
                        <div className="pila-carrito__datos">
                            <p className="pila-carrito__titulo">{f.libro.titulo}</p>
                            <p className="pila-carrito__detalle">
                                {f.cantidad} {f.cantidad === 1 ? 'ejemplar' : 'ejemplares'} · {soles(f.libro.precioFinal * f.cantidad)}
                            </p>
                        </div>
                        <button type="button" className="pila-carrito__cerrar" aria-label="Quitar este aviso" onClick={() => setPila((p) => p.filter((x) => x.clave !== f.clave))}>
                            <FaXmark aria-hidden="true" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
            <Link className="pila-carrito__ver" to="/carrito">
                <span>Subtotal: {soles(tienda.subtotal)}</span>
                <span className="pila-carrito__ir">Ver carrito →</span>
            </Link>
        </div>
    );
}
