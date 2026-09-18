export function Card({ children, className = '', hover = false }) {
    return (
        <section className={`card ${hover ? 'card-hover' : ''} ${className}`}>
            {children}
        </section>
    );
}

export function CardHeader({ titulo, subtitulo, acciones = null, icono = null }) {
    return (
        <div className="card-header">
            <div className="flex items-center gap-3">
                {icono && (
                    <span className="card-header-icon flex h-8 w-8 shrink-0 items-center justify-center text-primary-700">
                        {icono}
                    </span>
                )}
                <div>
                    <h2 className="card-title">{titulo}</h2>
                    {subtitulo && <p className="card-subtitle">{subtitulo}</p>}
                </div>
            </div>
            {acciones}
        </div>
    );
}

export function CardBody({ children, className = '' }) {
    return <div className={`p-5 ${className}`}>{children}</div>;
}
