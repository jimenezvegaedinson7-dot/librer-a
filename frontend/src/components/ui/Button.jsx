import { Spinner } from './Spinner';

const variantes = {
    primary:
        'bg-primary-600 text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 focus-visible:ring-primary-300 active:bg-primary-800',
    secondary:
        'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:ring-slate-200 active:bg-slate-100',
    ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-200',
    danger:
        'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 focus-visible:ring-red-300 active:bg-red-800',
    'danger-outline':
        'border border-red-200 bg-white text-red-600 hover:bg-red-50 focus-visible:ring-red-200 active:bg-red-100',
};

const tamanos = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-3.5 text-sm gap-2',
    lg: 'h-10 px-4 text-sm gap-2',
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
        'inline-flex items-center justify-center rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
        variantes[variante],
        tamanos[tamano],
        bloque ? 'w-full' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button type={type} className={clases} disabled={disabled || cargando} {...props}>
            {cargando ? <Spinner tamano="sm" /> : icono}
            {children}
        </button>
    );
}
