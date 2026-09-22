import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

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
        <nav
            aria-label="Paginación"
            className="pagination-bar flex flex-col gap-3 border-t border-primary-100 bg-parchment-100/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
            <p className="text-xs text-slate-500" aria-live="polite">
                Página <span className="font-semibold tabular-nums text-slate-800">{pagina}</span> de{' '}
                <span className="font-semibold tabular-nums text-slate-800">{totalPaginas}</span>
            </p>

            <div className="flex flex-wrap items-center gap-1">
                <Button
                    variante="ghost"
                    tamano="sm"
                    disabled={pagina === 1}
                    onClick={() => onCambiarPagina(pagina - 1)}
                    aria-label="Página anterior"
                >
                    <FaChevronLeft className="text-[10px]" aria-hidden="true" />
                    <span className="hidden sm:inline">Anterior</span>
                </Button>

                {paginas.map((numero, i) =>
                    numero === '...' ? (
                        <span key={`dots-${i}`} className="px-1.5 text-xs text-primary-400" aria-hidden="true">…</span>
                    ) : (
                        <Button
                            key={numero}
                            tamano="sm"
                            variante={numero === pagina ? 'primary' : 'ghost'}
                            onClick={() => onCambiarPagina(numero)}
                            aria-label={`Página ${numero}`}
                            aria-current={numero === pagina ? 'page' : undefined}
                            className="min-w-8 !px-2 tabular-nums"
                        >
                            {numero}
                        </Button>
                    )
                )}

                <Button
                    variante="ghost"
                    tamano="sm"
                    disabled={pagina === totalPaginas}
                    onClick={() => onCambiarPagina(pagina + 1)}
                    aria-label="Página siguiente"
                >
                    <span className="hidden sm:inline">Siguiente</span>
                    <FaChevronRight className="text-[10px]" aria-hidden="true" />
                </Button>
            </div>
        </nav>
    );
}
