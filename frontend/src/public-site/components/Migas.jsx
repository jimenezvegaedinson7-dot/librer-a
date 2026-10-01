import { Link } from 'react-router-dom';

// Migas de pan de las páginas interiores (Inicio › Página).
export default function Migas({ actual }) {
    return (
        <nav className="migas" aria-label="Estás aquí">
            <ol className="contenedor">
                <li><Link to="/">Inicio</Link></li>
                <li aria-current="page">{actual}</li>
            </ol>
        </nav>
    );
}
