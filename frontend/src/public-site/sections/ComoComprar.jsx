import { FaUser, FaMagnifyingGlass, FaCreditCard, FaBoxOpen } from 'react-icons/fa6';

// ============================================================
// CÓMO COMPRAR: proceso de 4 pasos en línea de tiempo.
// Escritorio: horizontal, una línea fina une los iconos. Tablet: 2 × 2.
// Móvil: vertical, con la línea a la izquierda. Explica el flujo real:
// cuenta, búsqueda, pago con PayU y delivery o recojo en Pallasca.
// ============================================================
const PASOS = [
    { Icono: FaUser, titulo: 'Crea tu cuenta', texto: 'Regístrate con tu correo y verifica tu cuenta.' },
    { Icono: FaMagnifyingGlass, titulo: 'Encuentra tu libro', texto: 'Busca por título, autor o categoría y agrégalo al carrito.' },
    { Icono: FaCreditCard, titulo: 'Paga seguro', texto: 'Completa tu compra de forma segura mediante PayU.' },
    { Icono: FaBoxOpen, titulo: 'Recíbelo o recógelo', texto: 'Elige delivery o recojo según disponibilidad.' },
];

export default function ComoComprar() {
    return (
        <section className="seccion como-comprar" aria-labelledby="como-comprar-titulo">
            <div className="contenedor">
                <h2 id="como-comprar-titulo" className="seccion__titulo" data-revelar="">
                    <span className="linea"><span>Comprar un libro es así de simple</span></span>
                </h2>
                <p className="seccion__entrada">
                    Desde la búsqueda hasta tenerlo en tus manos, compra desde la web o la app de Librería del Saber.
                </p>
                <ol className="proceso" data-revelar="">
                    {PASOS.map(({ Icono, titulo, texto }, i) => (
                        <li key={titulo} className="proceso__paso" style={{ '--i': i }}>
                            <span className="proceso__numero" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                            <span className="proceso__icono" aria-hidden="true"><Icono /></span>
                            <h3 className="proceso__titulo">{titulo}</h3>
                            <p className="proceso__texto">{texto}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
