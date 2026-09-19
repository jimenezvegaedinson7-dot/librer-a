import { Spinner } from './Spinner';

const variantes = {
    primary:
        'admin-primary-button border border-primary-700 bg-primary-700 text-white hover:bg-primary-800 focus-visible:ring-primary-300 active:bg-primary-900',
    secondary:
        'admin-secondary-button border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-200 active:bg-slate-100',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-slate-200',
    danger:
        'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-300 active:bg-red-800',
    'danger-outline':
        'border border-red-200 bg-white text-red-600 hover:bg-red-50 focus-visible:ring-red-200 active:bg-red-100',
};

const tamanos = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-sm gap-2 rounded-lg',
    lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
};

export function Button({
    children,
    variante = 'primary',
    tamano = 'md',
    cargando = false,
    icono = null,
    className = '',
    disabled = false,
    bloque = false,
    type = 'button',
    ...props
}) {
    const clases = [
        'relative inline-flex items-center justify-center overflow-hidden font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
        variantes[variante],
        tamanos[tamano],
        cargando ? 'button-loading' : '',
        bloque ? 'w-full' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button type={type} className={clases} disabled={disabled || cargando} aria-busy={cargando} {...props}>
            {cargando ? <Spinner tamano="sm" /> : icono}
            {children}
        </button>
    );
}
