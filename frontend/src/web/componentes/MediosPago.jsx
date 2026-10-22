import imgVisa from '../../compartido/assets/pagos/visa-blanco.svg';
import imgMastercard from '../../compartido/assets/pagos/mastercard.svg';
import imgAmericanExpress from '../../compartido/assets/pagos/americanexpress.svg';
import imgDiners from '../../compartido/assets/pagos/dinersclub.svg';
import imgTarjetaBcp from '../../compartido/assets/tarjeta-bcp.webp';

// ============================================================
// MEDIOS DE PAGO
// Los que PayU acepta en Perú: Visa, Mastercard (crédito y débito),
// American Express y Diners. Los bancos griegos (Interbank, Banco de
// la Nación y otros) no son un método aparte: sus tarjetas se
// procesan por esas redes, así que se muestran sus marcas.
// No se anuncian billeteras ni efectivo: el local no los cobra.
// ============================================================

const MEDIOS = [
    { src: imgVisa, nombre: 'Visa' },
    { src: imgMastercard, nombre: 'Mastercard' },
    { src: imgAmericanExpress, nombre: 'American Express' },
    { src: imgDiners, nombre: 'Diners Club' },
    { src: imgTarjetaBcp, nombre: 'Tarjeta de débito de banco peruano' },
];

export default function MediosPago() {
    return <div className="pie__pagos-medios">
        <ul className="pie__pagos-lista" aria-label="Medios de pago con PayU">
            {MEDIOS.map(({ src, nombre }) => (
                <li key={nombre} title={nombre}>
                    <img src={src} alt={nombre} loading="lazy" />
                </li>
            ))}
        </ul>
        <p className="pie__pagos-nota">Pago en línea con PayU</p>
    </div>;
}
