import imgVisa from '../../compartido/assets/pagos/visa-blanco.svg';
import imgMastercard from '../../compartido/assets/pagos/mastercard.svg';
import imgAmericanExpress from '../../compartido/assets/pagos/americanexpress.svg';
import imgDiners from '../../compartido/assets/pagos/dinersclub.svg';
import imgTarjetaBcp from '../../compartido/assets/tarjeta-bcp.webp';

const MEDIOS = [
    { src: imgVisa, nombre: 'Visa' },
    { src: imgMastercard, nombre: 'Mastercard' },
    { src: imgAmericanExpress, nombre: 'American Express' },
    { src: imgDiners, nombre: 'Diners Club' },
    { src: imgTarjetaBcp, nombre: 'Tarjeta de débito de banco peruano' }
];

export default function MediosPago() {
    return (
        <div className="pie__pagos-medios">
            <ul className="pie__pagos-lista" aria-label="Medios de pago con PayU">
                {MEDIOS.map(({ src, nombre }) => (
                    <li key={nombre} title={nombre}>
                        <img src={src} alt={nombre} loading="lazy" />
                    </li>
                ))}
            </ul>
            <p className="pie__pagos-nota">Pago en línea con PayU</p>
        </div>
    );
}
