import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PrecioOferta } from '../../PrecioOferta';
import { urlPortada } from '../../../../services/web/formato';
import { LIBROS_RECIENTES } from './cachePortada';
import './portada3d.css';

function ultimosAgregados(libros = []) {
    const fecha = (libro) => Date.parse(libro.creadoEn) || 0;
    return [...libros]
        .filter((libro) => libro.estado === 1 && urlPortada(libro.portada) && libro.precio > 0)
        .sort((a, b) => fecha(b) - fecha(a) || b.id - a.id)
        .slice(0, LIBROS_RECIENTES);
}

function animacionesDelCarrusel(pista) {
    return (pista.current?.getAnimations({ subtree: true }) ?? []).filter(
        (animacion) => animacion.animationName === 'p3-carrusel-orbita' || animacion.animationName === 'p3-carrusel-endereza'
    );
}

function Carrusel({ libros }) {
    const [giro, setGiro] = useState(0);
    const [arrastrando, setArrastrando] = useState(false);
    const arrastre = useRef(null);
    const giroRef = useRef(0);
    const pista = useRef(null);
    const suprimClick = useRef(false);
    const temporizador = useRef(0);

    useEffect(() => () => window.clearTimeout(temporizador.current), []);
    useEffect(() => {
        const mover = (evento) => {
            const estado = arrastre.current;
            if (!estado) return;
            const delta = evento.clientX - estado.x;
            estado.x = evento.clientX;
            if (Math.abs(evento.clientX - estado.inicio) > 6) estado.movido = true;
            if (estado.movido && delta) {
                giroRef.current += delta * 0.35;
                const desplazamiento = (giroRef.current / 360) * 42000;
                estado.animaciones.forEach(({ animacion, tiempo }) => {
                    animacion.currentTime = tiempo + desplazamiento;
                });
            }
        };
        const soltar = () => {
            const estado = arrastre.current;
            if (!estado) return;
            estado.animaciones.forEach(({ animacion }) => animacion.play());
            arrastre.current = null;
            setArrastrando(false);
            setGiro(giroRef.current);
            if (!estado.movido) return;
            suprimClick.current = true;
            window.clearTimeout(temporizador.current);
            temporizador.current = window.setTimeout(() => { suprimClick.current = false; }, 80);
        };
        window.addEventListener('pointermove', mover, { passive: true });
        window.addEventListener('pointerup', soltar);
        window.addEventListener('pointercancel', soltar);
        return () => {
            window.removeEventListener('pointermove', mover);
            window.removeEventListener('pointerup', soltar);
            window.removeEventListener('pointercancel', soltar);
        };
    }, []);

    if (!libros.length) return null;
    const medio = (libros.length - 1) / 2;
    const paso = 360 / libros.length;
    const estilo = { '--giro-manual': `${giro}deg` };
    const empezarArrastre = (evento) => {
        if (evento.pointerType === 'mouse' && evento.button !== 0) return;
        const animaciones = animacionesDelCarrusel(pista).map((animacion) => {
            const tiempo = animacion.currentTime;
            animacion.pause();
            return { animacion, tiempo };
        });
        arrastre.current = { x: evento.clientX, inicio: evento.clientX, movido: false, animaciones };
        setArrastrando(true);
    };
    const evitarClickTrasArrastre = (evento) => {
        if (!suprimClick.current) return;
        evento.preventDefault();
        evento.stopPropagation();
        suprimClick.current = false;
    };

    return (
        <section
            className="portada3d__carrusel portada-unica__recientes portada3d__ultimos"
            style={estilo}
            aria-label="Últimos libros agregados">
            <div
                ref={pista}
                className="portada3d__carrusel-pista portada-unica__rejilla"
                role="list"
                data-final="true"
                data-arrastrando={arrastrando ? 'true' : undefined}
                onPointerDown={empezarArrastre}
                onClickCapture={evitarClickTrasArrastre}>
                {libros.map((libro, i) => (
                    <article
                        key={libro.id}
                        className="portada3d__carrusel-item portada-unica__reciente"
                        role="listitem"
                        style={{ '--lado': i - medio, '--orden': Math.abs(i - medio), '--angulo': `${paso * i}deg` }}>
                        <Link
                            to={`/libro/${libro.id}`}
                            className="portada3d__apilar-link portada3d__carrusel-link">
                            <div className="portada3d__apilar-tapa">
                                <img src={urlPortada(libro.portada, 320)} alt={`Portada de ${libro.titulo}`} width="160" height="240" loading="lazy" decoding="async" />
                                {libro.descuento > 0 && <span className="portada3d__apilar-descuento">-{libro.descuento}%</span>}
                            </div>
                            <div className="portada3d__apilar-info">
                                <h3 className="portada3d__apilar-titulo">{libro.titulo}</h3>
                                {libro.autor && <p className="portada3d__apilar-autor">{libro.autor}</p>}
                                <PrecioOferta libro={libro} clase="portada3d__apilar-precio" />
                            </div>
                        </Link>
                    </article>
                ))}
            </div>
            <div className="portada3d__plataforma" aria-hidden="true" />
        </section>
    );
}

export default function PortadaEspacial({ recientes = [] }) {
    const libros = ultimosAgregados(recientes);
    return (
        <section className="portada3d portada-unica portada3d--estatica" aria-label="Portada de MATIDANA Libros y Cultura">
            <h1 className="sr-only">Libros y anuncios de MATIDANA Libros y Cultura</h1>
            <div className="portada3d__orbite">
                <div className="portada3d__orbite-texto">
                    <h2>Las ideas no se quedan quietas. <em>Tampoco nuestros libros.</em></h2>
                    <p className="portada3d__orbite-subtitulo">Últimos libros agregados</p>
                </div>
                <Carrusel libros={libros} />
            </div>
        </section>
    );
}
