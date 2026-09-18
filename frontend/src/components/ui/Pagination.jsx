import { Button } from './Button';

function paginasVisibles(pagina, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const paginas = [];
    paginas.push(1);
    if (pagina > 3) paginas.push('...');
    for (let i = Math.max(2, pagina - 1); i <= Math.min(total - 1, pagina + 1); i++) {
        paginas.push(i);
    }
    if (pagina < total - 2) paginas.push('...');
    paginas.push(total);
    return paginas;
}

export function Pagination({ pagina, totalPaginas, onCambiarPagina }) {
    if (totalPaginas <= 1) return null;

    const paginas = paginasVisibles(pagina, totalPaginas);

    return (
        <div className="pagination-bar flex flex-col gap-2.5 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
                Página <span className="font-bold text-slate-700">{pagina}</span> de{' '}
                <span className="font-bold text-slate-700">{totalPaginas}</span>
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
                <Button
                    variante="secondary"
                    tamano="sm"
                    disabled={pagina === 1}
                    onClick={() => onCambiarPagina(pagina - 1)}
                >
                    Anterior
                </Button>

                {paginas.map((numero, i) =>
                    numero === '...' ? (
                        <span key={`dots-${i}`} className="px-1.5 text-xs text-slate-400">...</span>
                    ) : (
                        <Button
                            key={numero}
                            tamano="sm"
                            variante={numero === pagina ? 'primary' : 'secondary'}
                            onClick={() => onCambiarPagina(numero)}
                        >
                            {numero}
                        </Button>
                    )
                )}

                <Button
                    variante="secondary"
                    tamano="sm"
                    disabled={pagina === totalPaginas}
                    onClick={() => onCambiarPagina(pagina + 1)}
                >
                    Siguiente
                </Button>
            </div>
        </div>
    );
}
