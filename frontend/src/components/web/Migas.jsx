import { Link } from 'react-router-dom';

export default function Migas({ actual, padres = [] }) {
    return (
        <nav className="migas" aria-label="Estás aquí">
            <ol className="contenedor">
                <li>
                    <Link to="/">Inicio</Link>
                </li>
                {padres.map(({ ruta, texto }) => (
                    <li key={ruta}>
                        <Link to={ruta}>{texto}</Link>
                    </li>
                ))}
                <li aria-current="page">{actual}</li>
            </ol>
        </nav>
    );
}
