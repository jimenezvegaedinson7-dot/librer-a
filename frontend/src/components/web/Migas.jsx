import { Link } from 'react-router-dom';

export default function Migas({ actual }) {
    return (
        <nav className="migas" aria-label="Estás aquí">
            <ol className="contenedor">
                <li>
                    <Link to="/">Inicio</Link>
                </li>
                <li aria-current="page">{actual}</li>
            </ol>
        </nav>
    );
}
