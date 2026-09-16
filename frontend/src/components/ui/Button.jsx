import { Spinner } from './Spinner';

const variantes = {
    primary:
        'bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-md shadow-primary-600/25 hover:from-primary-600 hover:to-primary-700 hover:shadow-primary-600/30 focus-visible:ring-primary-300 active:from-primary-700 active:to-primary-800',
    secondary:
        'border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-200 active:bg-slate-100',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-slate-200',
    danger:
        'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-md shadow-red-600/25 hover:from-red-600 hover:to-red-700 focus-visible:ring-red-300 active:from-red-700 active:to-red-800',
    'danger-outline':
        'border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 focus-visible:ring-red-200 active:bg-red-100',
};

const tamanos = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-9.5 px-4 text-sm gap-2 rounded-xl',
    lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
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
        'inline-flex items-center justify-center font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]',
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