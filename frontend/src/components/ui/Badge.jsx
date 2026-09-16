const estilos = {
    primary: 'bg-primary-50 text-primary-700 ring-primary-600/20',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    danger: 'bg-red-50 text-red-700 ring-red-600/20',
    neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

const puntos = {
    primary: 'bg-primary-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    neutral: 'bg-slate-500',
    info: 'bg-sky-500',
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