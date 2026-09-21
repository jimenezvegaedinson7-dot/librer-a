export function Spinner({ tamano = 'md', className = '' }) {
    const dimensiones = tamano === 'sm' ? 'h-4 w-4 border-2' : tamano === 'lg' ? 'h-10 w-10 border-3' : 'h-6 w-6 border-2';
    return (
        <span
            role="status"
            aria-label="Cargando"
            className={`inline-block animate-spin rounded-full border-current border-t-transparent ${dimensiones} ${className}`}
        />
    );
}

export function CargandoPantalla({ texto = 'Cargando...' }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-primary-400">
            <Spinner tamano="lg" className="text-mahogany-500" />
            <p className="text-xs font-medium">{texto}</p>
        </div>
    );
}
