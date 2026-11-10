import { useEffect } from 'react';
import { TiendaProvider } from '../tienda/TiendaProvider';
import LibroReclamacionesPage from '../../panel/reclamaciones/LibroReclamacionesPage';
import { PAGINAS, SITIO } from '../config/site';

export default function ReclamacionesPublicasPage() {
    useEffect(() => {
        const pagina = PAGINAS[SITIO.rutaReclamaciones];
        const tituloPrevio = document.title;
        const metadatos = [
            [document.querySelector('meta[name="description"]'), 'content', pagina.descripcion],
            [document.querySelector('link[rel="canonical"]'), 'href', `${SITIO.url}${SITIO.rutaReclamaciones}`]
        ].filter(([elemento]) => elemento);
        const previos = metadatos.map(([elemento, atributo, valor]) => [elemento, atributo, elemento.getAttribute(atributo), valor]);
        document.title = pagina.titulo;
        metadatos.forEach(([elemento, atributo, valor]) => elemento.setAttribute(atributo, valor));
        return () => {
            if (document.title === pagina.titulo) document.title = tituloPrevio;
            previos.forEach(([elemento, atributo, previo, valor]) => {
                if (elemento.getAttribute(atributo) === valor) {
                    if (previo === null) elemento.removeAttribute(atributo);
                    else elemento.setAttribute(atributo, previo);
                }
            });
        };
    }, []);
    return (
        <TiendaProvider catalogo={{ libros: [], cargando: false }}>
            <LibroReclamacionesPage />
        </TiendaProvider>
    );
}
