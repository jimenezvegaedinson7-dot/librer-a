import { useTienda } from './TiendaContext';

export default function EstadoSesion({ titulo }) {
    const t = useTienda();
    return <section className="compra-pagina contenedor"><h1>{titulo}</h1>
        {t.errorSesion ? <><p role="alert">No pudimos verificar tu cuenta. Tu sesión y tu carrito se conservan. {t.errorSesion}</p>
            <button className="boton boton--linea" onClick={t.reintentarSesion}>Reintentar verificación</button></>
            : <p role="status">Verificando tu sesión…</p>}
    </section>;
}
