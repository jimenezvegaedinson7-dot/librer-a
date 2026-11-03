import { formatearFecha } from '../../compartido/lib/utils/format';

export function FechaTabla({ valor, vacio = 'Sin fecha' }) {
    const texto = formatearFecha(valor);
    if (!texto) return <span className="tabla-nota">{vacio}</span>;
    const [fecha, ...hora] = texto.split(', ');
    return (
        <span className="tabla-fecha">
            <span>{fecha}</span>
            {hora.length > 0 && <span>{hora.join(', ')}</span>}
        </span>
    );
}
