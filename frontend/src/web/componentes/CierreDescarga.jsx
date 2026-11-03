import { Link } from 'react-router-dom';
import { FaDownload } from 'react-icons/fa6';

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
