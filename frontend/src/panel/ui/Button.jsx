import { Spinner } from './Spinner';

const variantes = {
    primary:
        'admin-primary-button border border-mahogany-700 bg-mahogany-700 text-parchment-100 hover:bg-mahogany-600 focus-visible:ring-gold-300 active:bg-mahogany-800',
    secondary:
        'admin-secondary-button border border-primary-200 bg-white text-primary-500 hover:border-gold-400 hover:bg-parchment-100 focus-visible:ring-gold-300 active:bg-parchment-200',
    ghost: 'text-primary-600 hover:bg-parchment-200 hover:text-primary-900 focus-visible:ring-gold-300',
    danger:
        'bg-crimson-500 text-parchment-100 shadow-sm hover:bg-crimson-600 focus-visible:ring-crimson-200 active:bg-crimson-700',
    'danger-outline':
        'border border-crimson-200 bg-white text-crimson-500 hover:bg-crimson-50 focus-visible:ring-crimson-200 active:bg-crimson-100',
};

const tamanos = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
    md: 'h-10 px-4 text-sm gap-2 rounded-lg',
    lg: 'h-11 px-5 text-[15px] gap-2 rounded-lg',
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
        'relative inline-flex select-none items-center justify-center overflow-hidden font-semibold tracking-[0.005em] transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
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
