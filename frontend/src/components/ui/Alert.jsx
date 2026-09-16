import { cn } from '@/lib/utils';

export function Alert({
    tipo = 'info',
    titulo,
    descripcion,
    ...props
}) {
    const variants = {
        info: 'bg-primary-50 text-primary-600 border border-primary-200',
        success: 'bg-success-50 text-success-600 border border-success-200',
        warning: 'bg-warning-50 text-warning-600 border border-warning-200',
        error: 'bg-error-50 text-error-600 border border-error-200',
    };

    return (
        <div
            className={cn(
                'rounded-lg border p-4 mb-4',
                variants[tipo],
                'transition-all duration-300',
                'animate-in fade-in-0',
                ...props
            )}
        >
            {titulo && <p className="font-medium text-foreground mb-1">{titulo}</p>}
            <p className="text-sm text-foreground/80 leading-relaxed">{descripcion}</p>
        </div>
    );
}