import { FaTruckFast, FaStore, FaShieldHalved } from 'react-icons/fa6';

// ============================================================
// BENEFICIOS (antes del pie)
// Los tres servicios reales de la librería, los mismos de la franja
// superior, con una línea que los explica.
// ============================================================
const BENEFICIOS = [
    { Icono: FaTruckFast, titulo: 'Delivery dentro de Pallasca', texto: 'En zonas activas, con tarifa que ves antes de pagar.' },
    { Icono: FaStore, titulo: 'Recojo sin costo en Pallasca', texto: 'Sin costo de envío, frente a la Plaza de Armas.' },
    { Icono: FaShieldHalved, titulo: 'Pago seguro con PayU', texto: 'Tus datos de tarjeta se ingresan en PayU.' },
];

export default function Beneficios() {
    return (
        <section className="beneficios" aria-label="Por qué comprar con nosotros">
            <ul className="contenedor">
                {BENEFICIOS.map(({ Icono, titulo, texto }) => (
                    <li key={titulo}>
                        <Icono aria-hidden="true" />
                        <span>
                            <strong>{titulo}</strong>
                            <span>{texto}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
