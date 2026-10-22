import { Link } from 'react-router-dom';
import { FaDownload } from 'react-icons/fa6';

// Cierre común de las páginas que explican la app: una frase y la acción
// principal del sitio, para que ninguna página termine sin salida.
export default function CierreDescarga({ texto = 'La app es gratis y está disponible para Android.' }) {
    return (
        <div className="cierre-descarga">
            <p>{texto}</p>
            <Link to="/descargar" className="boton">
                <FaDownload aria-hidden="true" /> Descargar la app
            </Link>
        </div>
    );
}
