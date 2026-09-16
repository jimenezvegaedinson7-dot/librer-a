export function Card({ children, className = '', hover = false }) {
    return (
        <section className={`card overflow-hidden ${hover ? 'card-hover' : ''} ${className}`}>
            {children}
        </section>
    );
}

export function CardHeader({ titulo, subtitulo, acciones = null, icono = null }) {
    return (
        <div className="card-header">
            <div className="flex items-center gap-3">
                {icono && (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm text-white shadow-md shadow-primary-600/25">
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