const estilos = {
    primary: 'bg-mahogany-100 text-mahogany-600 ring-mahogany-400/20',
    success: 'bg-success-bg text-success ring-success/20',
    warning: 'bg-warning-bg text-warning ring-warning/20',
    danger: 'bg-danger-bg text-danger ring-danger/20',
    neutral: 'bg-parchment-300 text-primary-500 ring-primary-400/20',
    info: 'bg-gold-100 text-gold-700 ring-gold-500/20',
};

const puntos = {
    primary: 'bg-mahogany-500',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    neutral: 'bg-primary-400',
    info: 'bg-gold-500',
};

export function Badge({ children, color = 'neutral', className = '', punto = true }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${estilos[color]} ${className}`}
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