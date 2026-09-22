export function Card({ children, className = '', hover = false }) {
    return (
        <section className={`card ${hover ? 'card-hover' : ''} ${className}`}>
            {children}
        </section>
    );
}

const iconColores = {
    blue: 'bg-[#f6e6e4] text-[#8a2c36]',
    rose: 'bg-[#ffe4e6] text-[#e11d48]',
    emerald: 'bg-[#d1fae5] text-[#059669]',
    amber: 'bg-[#fef3c7] text-[#d97706]',
    violet: 'bg-[#ede9fe] text-[#7c3aed]',
    sky: 'bg-[#e0f2fe] text-[#0284c7]',
    slate: 'bg-[#f3efe9] text-[#5c544b]',
};

export function CardHeader({ titulo, subtitulo, acciones = null, icono = null, color = 'slate' }) {
    const ic = iconColores[color] || iconColores.slate;
    return (
        <div className="card-header">
            <div className="flex items-center gap-3">
                {icono && (
                    <span className={`card-header-icon page-header-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ic}`}>
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
