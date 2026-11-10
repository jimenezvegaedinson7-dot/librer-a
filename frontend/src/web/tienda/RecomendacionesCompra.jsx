import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clienteApi, firmaSesion } from './clienteApi';
import { libroComercial } from './libroComercial';
import { TarjetaLibro } from '../paginas/CatalogoPage';
import { analitica } from '../lib/analitica';
import './recomendaciones-compra.css';

const motivos = { autor_categoria: 'Coincide en autor y categoría con tus compras', autor: 'De un autor de tus compras', categoria: 'De una categoría de tus compras' };

export default function RecomendacionesCompra({ compras, sesion }) {
    const { key } = useLocation();
    const seccion = useRef(null);
    const [revision, setRevision] = useState(0);
    const [estado, setEstado] = useState({ clave: '', libros: [], error: '' });
    const pagadas = compras.filter((v) => ['pagada', 'entregada'].includes(v.estado));
    const historial = JSON.stringify(
        pagadas.map((v) => ({ id: Number(v.id_venta), libros: (v.detalle || []).map((i) => Number(i.id_libro)).sort((a, b) => a - b) })).sort((a, b) => a.id - b.id)
    );
    const clave = `${firmaSesion(sesion)}:${historial}:${revision}`;
    const vigentes = estado.clave === clave;
    const libros = useMemo(() => (vigentes ? estado.libros : []), [vigentes, estado.libros]);
    useEffect(() => {
        if (historial === '[]') return undefined;
        let activo = true;
        const comprados = new Set(JSON.parse(historial).flatMap((v) => v.libros));
        clienteApi
            .recomendados(sesion)
            .then((json) => {
                if (!activo) return;
                const lista = (Array.isArray(json.data) ? json.data : [])
                    .map((l) => ({ ...libroComercial(l), motivoRecomendacion: motivos[l.motivo_recomendacion] || 'Según tus compras' }))
                    .filter((l) => l.disponible && !comprados.has(l.id))
                    .slice(0, 8);
                setEstado({ clave, libros: lista, error: '' });
            })
            .catch((error) => {
                if (activo && error.name !== 'SesionCambiada') setEstado({ clave, libros: [], error: 'No pudimos consultar tus sugerencias en este momento.' });
            });
        return () => {
            activo = false;
        };
    }, [clave, historial, sesion]);
    useEffect(() => {
        if (!vigentes || !libros.length || !seccion.current) return undefined;
        const registrar = () => analitica.lista(libros, `${key}:${libros.map((l) => l.id).join(',')}`);
        if (!('IntersectionObserver' in window)) {
            registrar();
            return undefined;
        }
        const observador = new IntersectionObserver(
            (entradas) => {
                if (entradas.some((e) => e.isIntersecting)) {
                    registrar();
                    observador.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        observador.observe(seccion.current);
        return () => observador.disconnect();
    }, [vigentes, libros, key]);
    if (historial === '[]') return null;
    return (
        <section className="recomendaciones-compra" ref={seccion} aria-labelledby="recomendaciones-compra-titulo" aria-busy={!vigentes}>
            <h2 id="recomendaciones-compra-titulo">Otros libros que podrían gustarte</h2>
            <p className="recomendaciones-compra__explicacion">Elegidos por los autores y categorías de tus compras pagadas.</p>
            {!vigentes ? (
                <p role="status">Buscando libros según tus compras…</p>
            ) : estado.error ? (
                <div role="status">
                    <p>{estado.error}</p>
                    <button type="button" className="boton boton--linea boton--chico" onClick={() => setRevision((n) => n + 1)}>
                        Reintentar sugerencias
                    </button>
                </div>
            ) : libros.length ? (
                <ul className="rejilla-libros">
                    {libros.map((libro, indice) => (
                        <TarjetaLibro
                            key={libro.id}
                            libro={libro}
                            indice={indice}
                            nivelTitulo="h3"
                            nota={libro.motivoRecomendacion}
                            onSeleccion={() => analitica.seleccionar(libro)}
                        />
                    ))}
                </ul>
            ) : (
                <p>
                    No hay otros títulos disponibles de esos autores o categorías por ahora. <Link to="/catalogo">Explorar el catálogo</Link>
                </p>
            )}
        </section>
    );
}
