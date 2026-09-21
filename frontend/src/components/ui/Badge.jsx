const estilos = {
    primary: 'bg-mahogany-50 text-mahogany-600 ring-mahogany-400/20',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
    warning: 'bg-amber-50 text-amber-700 ring-amber-500/20',
    danger: 'bg-crimson-50 text-crimson-600 ring-crimson-400/20',
    neutral: 'bg-parchment-200 text-primary-500 ring-primary-400/20',
    info: 'bg-sky-50 text-sky-700 ring-sky-500/20',
};

const puntos = {
    primary: 'bg-mahogany-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-crimson-500',
    neutral: 'bg-primary-400',
    info: 'bg-sky-500',
};

export function Badge({ children, color = 'neutral', className = '', punto = true }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${estilos[color]} ${className}`}
        >
            {punto && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${puntos[color]}`} />}
            {children}
        </span>
    );
}

export function EstadoActivo({ activo }) {
    const esActivo = Number(activo) === 1;
    return (
        <Badge color={esActivo ? 'success' : 'neutral'}>
            {esActivo ? 'Activo' : 'Inactivo'}
        </Badge>
    );
}
