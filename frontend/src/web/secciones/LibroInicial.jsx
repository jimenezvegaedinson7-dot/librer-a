import { useLayoutEffect, useMemo, useState } from 'react';
import { urlPortada } from '../lib/formato';
import { poseInicialLibro } from './portada3d/poseLibro';
import './portada-unica.css';

export default function LibroInicial({ libro, escenario }) {
    const [aspecto, setAspecto] = useState(2 / 3);
    const [fallida, setFallida] = useState(false);
    const [medidas, setMedidas] = useState({ ancho: 1, alto: 1 });
    useLayoutEffect(() => {
        if (!escenario) return undefined;
        const medir = () => {
            const { width: ancho, height: alto } = escenario.getBoundingClientRect();
            if (!ancho || !alto) return;
            setMedidas((anterior) => (anterior.ancho === ancho && anterior.alto === alto ? anterior : { ancho, alto }));
        };
        medir();
        const observador = new ResizeObserver(medir);
        observador.observe(escenario);
        return () => observador.disconnect();
    }, [escenario]);
    const pose = useMemo(() => poseInicialLibro(medidas.ancho, medidas.alto, aspecto), [medidas.ancho, medidas.alto, aspecto]);
    const src = urlPortada(libro.portada, 1024);
    return (
        <div className="portada-unica__poster" aria-hidden="true">
            <div className="portada-unica__pedestal" style={pose.pedestal} />
            <div className="portada-unica__cubierta" style={{ width: pose.anchoImagen, height: pose.altoImagen, transform: `matrix3d(${pose.matriz.join(',')})` }}>
                {src && !fallida ? (
                    <img
                        src={src}
                        alt={`Portada de ${libro.titulo}`}
                        width="200"
                        height="300"
                        fetchPriority="high"
                        decoding="async"
                        onLoad={(evento) => {
                            const imagen = evento.currentTarget;
                            if (imagen.naturalWidth && imagen.naturalHeight) setAspecto(imagen.naturalWidth / imagen.naturalHeight);
                        }}
                        onError={() => setFallida(true)}
                    />
                ) : (
                    <span>Portada no disponible</span>
                )}
            </div>
        </div>
    );
}
