import { FaRotate } from 'react-icons/fa6';
import { Alert } from './Alert';
import { Button } from './Button';

export function ErrorCarga({ mensaje, onReintentar, cargando = false }) {
    return <Alert tipo="error">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{mensaje}</p>
            <Button variante="secondary" tamano="sm" onClick={onReintentar} disabled={cargando} className="shrink-0">
                <FaRotate aria-hidden="true" /> Reintentar
            </Button>
        </div>
    </Alert>;
}
