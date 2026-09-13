import { Button } from './Button';

const colores = {
    ver: 'secondary',
    editar: 'secondary',
    eliminar: 'danger-outline',
};

export function BtnAccion({ tipo, onClick, titulo, children, disabled = false }) {
    return (
        <Button
            variante={colores[tipo]}
            tamano="sm"
            onClick={onClick}
            title={titulo}
            aria-label={titulo}
            disabled={disabled}
            className="!h-8 !w-8 !p-0"
        >
            {children}
        </Button>
    );
}
