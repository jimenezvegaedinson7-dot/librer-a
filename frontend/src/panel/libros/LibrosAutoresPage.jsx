import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaBook, FaFeather } from 'react-icons/fa6';

import { PageHeader } from '../ui/PageHeader';
import LibrosPage from './LibrosPage';
import AutoresPage from '../autores/AutoresPage';

const PESTANAS = [
    { id: 'libros', texto: 'Libros', detalle: 'Catálogo y precios', Icono: FaBook },
    { id: 'autores', texto: 'Autores', detalle: 'Registro y edición', Icono: FaFeather },
];

export default function LibrosAutoresPage() {
    const [parametros, setParametros] = useSearchParams();
    const botones = useRef([]);
    const activa = parametros.get('vista') === 'autores' ? 'autores' : 'libros';

    const cambiar = (id) => {
        setParametros(id === 'autores' ? { vista: 'autores' } : {});
    };

    const alTeclear = (e, indice) => {
        let siguiente;
        if (e.key === 'ArrowRight') siguiente = (indice + 1) % PESTANAS.length;
        else if (e.key === 'ArrowLeft') siguiente = (indice - 1 + PESTANAS.length) % PESTANAS.length;
        else if (e.key === 'Home') siguiente = 0;
        else if (e.key === 'End') siguiente = PESTANAS.length - 1;
        else return;
        e.preventDefault();
        cambiar(PESTANAS[siguiente].id);
        botones.current[siguiente]?.focus();
    };

    return (
        <div className="space-y-4">
            <PageHeader titulo="Libros y autores" descripcion="Administra los libros y sus autores en un solo lugar" />
            <div className="pestanas" role="tablist" aria-label="Vistas del catálogo">
                {PESTANAS.map(({ id, texto, detalle, Icono }, indice) => (
                    <button
                        key={id}
                        ref={(el) => { botones.current[indice] = el; }}
                        type="button"
                        role="tab"
                        id={`catalogo-pestana-${id}`}
                        aria-selected={activa === id}
                        aria-controls={`catalogo-panel-${id}`}
                        tabIndex={activa === id ? 0 : -1}
                        onClick={() => cambiar(id)}
                        onKeyDown={(e) => alTeclear(e, indice)}
                        className={`pestana ${activa === id ? 'pestana--activa' : ''}`}
                    >
                        <span className="pestana-icono" aria-hidden="true"><Icono /></span>
                        <span className="text-left">
                            <span className="pestana-texto">{texto}</span>
                            <span className="pestana-detalle">{detalle}</span>
                        </span>
                    </button>
                ))}
            </div>
            <div role="tabpanel" id={`catalogo-panel-${activa}`} aria-labelledby={`catalogo-pestana-${activa}`}>
                {activa === 'autores' ? <AutoresPage incrustado /> : <LibrosPage incrustado />}
            </div>
        </div>
    );
}
