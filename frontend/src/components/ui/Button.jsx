import { Spinner } from './Spinner';

const variantes = {
    primary:
        'admin-primary-button border border-mahogany-700 bg-mahogany-700 text-parchment-100 hover:bg-mahogany-600 focus-visible:ring-gold-300 active:bg-mahogany-800',
    secondary:
        'admin-secondary-button border border-primary-200 bg-parchment-50 text-primary-500 hover:border-gold-500 hover:bg-parchment-100 focus-visible:ring-parchment-300 active:bg-parchment-200',
    ghost: 'text-primary-500 hover:bg-parchment-300 hover:text-mahogany-700 focus-visible:ring-parchment-300',
    danger:
        'bg-crimson-500 text-parchment-100 shadow-sm hover:bg-crimson-600 focus-visible:ring-crimson-200 active:bg-crimson-700',
    'danger-outline':
        'border border-crimson-200 bg-parchment-50 text-crimson-500 hover:bg-crimson-50 focus-visible:ring-crimson-200 active:bg-crimson-100',
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
