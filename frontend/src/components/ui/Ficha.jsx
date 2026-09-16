import { cn } from '@/lib/utils';

export default function Ficha({
    icono,
    etiqueta,
    valor,
    className,
    ...props
}) {
    return (
        <div className={cn(
            'rounded-lg border border-border bg-card p-3 flex items-start gap-2',
            className
        )}
    >
        <icono className="shrink-0 w-5 h-5 text-primary" aria-hidden="true" />
        <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground">{etiqueta}</p>
            <p className="text-sm font-medium text-foreground">{valor}</p>
        </div>
    </div>
}