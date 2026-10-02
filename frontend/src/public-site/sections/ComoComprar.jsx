import { FaDownload, FaMagnifyingGlass, FaCreditCard, FaBoxOpen } from 'react-icons/fa6';

// ============================================================
// CÓMO COMPRAR EN 3 PASOS (+ recibir)
// Explica el flujo real de la app: buscar, pagar con PayU y recibir en
// Pallasca o recoger en tienda. Los pasos entran escalonados al hacer scroll.
// ============================================================
const PASOS = [
    {
        Icono: FaDownload,
        titulo: 'Descarga la app',
        texto: 'Es gratis y está disponible para Android. Crea tu cuenta con tu correo en menos de un minuto.',
    },
    {
        Icono: FaMagnifyingGlass,
        titulo: 'Encuentra tu libro',
        texto: 'Busca por título, autor o categoría, revisa la sinopsis y el stock, y guárdalo en favoritos.',
    },
    {
        Icono: FaCreditCard,
        titulo: 'Paga seguro',
        texto: 'Completa el pago en la ventana de PayU. Los datos de tu tarjeta nunca pasan por la app.',
    },
    {
        Icono: FaBoxOpen,
        titulo: 'Recíbelo o recógelo',
        texto: 'Elige delivery dentro de Pallasca con tarifa por zona, o recojo sin costo de envío en nuestra tienda de Pallasca.',
    },
];

export default function ComoComprar() {
    return (
        <section className="seccion como-comprar" aria-labelledby="como-comprar-titulo">
            <div className="contenedor">
                <h2 id="como-comprar-titulo" className="seccion__titulo" data-revelar="">
                    <span className="linea"><span>Comprar un libro es así de simple</span></span>
                </h2>
                <p className="seccion__entrada">
                    Desde la búsqueda hasta tenerlo en tus manos, todo pasa en la app de Librería del Saber.
                </p>
                <ol className="pasos" data-revelar="">
                    {PASOS.map(({ Icono, titulo, texto }, i) => (
                        <li key={titulo} className="paso" style={{ '--i': i }}>
                            <span className="paso__numero" aria-hidden="true">{i + 1}</span>
                            <span className="paso__icono" aria-hidden="true"><Icono /></span>
                            <h3>{titulo}</h3>
                            <p>{texto}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
