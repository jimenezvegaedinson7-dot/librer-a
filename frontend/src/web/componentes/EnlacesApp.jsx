import { Link } from 'react-router-dom';
import { FaApple, FaGooglePlay } from 'react-icons/fa6';

import { CANALES, DESCARGAS, plataformaDisponible } from '../config/downloads';
import './enlaces-app.css';

const PLATAFORMAS = [
    { clave: 'android', Icono: FaGooglePlay, nombre: 'Google Play' },
    { clave: 'ios', Icono: FaApple, nombre: 'App Store' },
];

export default function EnlacesApp() {
    return <div className="app-tiendas" role="group" aria-label="Descargas de la app">
        {PLATAFORMAS.filter(({ clave }) => DESCARGAS[clave]?.habilitado).map(({ clave, Icono, nombre }) => {
            const datos = DESCARGAS[clave];
            const disponible = plataformaDisponible(clave);
            const android = datos.tipo === 'apk';
            const contenido = <>
                <span className="app-tiendas__icono" aria-hidden="true"><Icono /></span>
                <span className="app-tiendas__texto">
                    <small>{disponible ? (android ? 'Descarga directa' : 'Descargar en') : CANALES[datos.tipo].formato}</small>
                    <strong>{android ? 'Android' : nombre}</strong>
                </span>
            </>;
            return disponible
                ? <Link key={clave} to="/descargar" className="app-tiendas__enlace" aria-label={CANALES[datos.tipo].accion}>{contenido}</Link>
                : <span key={clave} className="app-tiendas__enlace" aria-disabled="true">{contenido}</span>;
        })}
    </div>;
}
