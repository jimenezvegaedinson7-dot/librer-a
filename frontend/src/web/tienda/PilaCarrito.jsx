import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FaCartPlus, FaXmark } from 'react-icons/fa6';
import { useTienda } from './TiendaContext';
import PortadaLibro from './PortadaLibro';
import { soles } from '../lib/formato';
import './pila-carrito.css';

// ============================================================
// PILA FLOTANTE DEL CARRITO (esquina inferior derecha).
// Al agregar un libro aparece una tarjeta con su portada, la cantidad
// agregada, el subtotal de esa línea y el total del carrito. Se retira
// sola; cada libro nuevo se apila encima.
// ============================================================
const DURACION = 4200;
const MAX = 3;

export default function PilaCarrito() {
    const tienda = useTienda();
    const reducido = useReducedMotion();
    const { pathname } = useLocation();
    const [pila, setPila] = useState([]);

    // El contexto avisa con "carrito-agregado" cada vez que entra una línea;
    // se guarda quién y cuántas unidades para dibujar el aviso.
    useEffect(() => {
        const alAgregar = (e) => {
            const { libro, unidades } = e.detail || {};
            if (!libro || !unidades) return;
            setPila((p) => [...p, { clave: `${libro.id}-${Date.now()}-${Math.random()}`, libro, cantidad: unidades }].slice(-MAX));
        };
        window.addEventListener('carrito-agregado', alAgregar);
        return () => window.removeEventListener('carrito-agregado', alAgregar);
    }, []);

    // Cada aviso vive unos segundos; su temporizador lo retira de la pila.
    useEffect(() => {
        if (!pila.length) return undefined;
        const temporizadores = pila.map((f) => setTimeout(() => {
            setPila((p) => p.filter((x) => x.clave !== f.clave));
        }, DURACION));
        return () => temporizadores.forEach(clearTimeout);
    }, [pila]);

    // Al cambiar de página se limpia: el carrito ya está a la vista.
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
                    <motion.div key={f.clave} className="pila-carrito__tarjeta"
                        initial={reducido ? false : { opacity: 0, x: 24, scale: .96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={reducido ? { opacity: 0 } : { opacity: 0, x: 24, scale: .96 }}
                        transition={{ duration: reducido ? 0 : .28, ease: [0.22, 1, 0.36, 1] }}>
                        <span className="pila-carrito__icono" aria-hidden="true"><FaCartPlus /></span>
                        <div className="pila-carrito__portada"><PortadaLibro libro={f.libro} mini /></div>
                        <div className="pila-carrito__datos">
                            <p className="pila-carrito__titulo">{f.libro.titulo}</p>
                            <p className="pila-carrito__detalle">
                                {f.cantidad} {f.cantidad === 1 ? 'ejemplar' : 'ejemplares'} · {soles(f.libro.precioFinal * f.cantidad)}
                            </p>
                        </div>
                        <button type="button" className="pila-carrito__cerrar" aria-label="Quitar este aviso"
                            onClick={() => setPila((p) => p.filter((x) => x.clave !== f.clave))}>
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
