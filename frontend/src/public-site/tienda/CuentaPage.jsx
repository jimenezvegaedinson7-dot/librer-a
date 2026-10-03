import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowRightFromBracket, FaBookOpen, FaBoxOpen, FaCartShopping, FaChevronRight, FaMobileScreen } from 'react-icons/fa6';
import { clienteApi } from './clienteApi';
import { useTienda } from './TiendaContext';

const titulos = {login:'Iniciar sesión',registro:'Crear cuenta',verificar:'Verifica tu correo',recuperar:'Recuperar contraseña',restablecer:'Nueva contraseña',otp:'Verificación de dos pasos'};
export default function CuentaPage() {
    const tienda = useTienda();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const continuar = params.get('continuar') || '';
    const destino = ['/checkout','/carrito','/mis-compras'].includes(continuar) || /^\/libro\/[1-9]\d{0,9}$/.test(continuar) ? continuar : '/mis-compras';
    const [modo,setModo] = useState('login');
    const [form,setForm] = useState({nombre:'',apellido:'',email:'',password:'',confirmacion:'',codigo:''});
    const [temporal,setTemporal] = useState('');
    const [ocupado,setOcupado] = useState(false);
    const [error,setError] = useState('');
    const [mensaje,setMensaje] = useState('');
    const campo = (clave,valor) => setForm(prev => ({...prev,[clave]:valor}));
    const cambiar = nuevo => {setModo(nuevo);setError('');setMensaje('');campo('password','');campo('confirmacion','');campo('codigo','');};
    async function enviar(e) {
        e.preventDefault(); if (ocupado) return;
        setError('');setMensaje('');setOcupado(true);
        try {
            const email=form.email.trim().toLowerCase();
            if (['registro','restablecer'].includes(modo) && form.password!==form.confirmacion) throw new Error('Las contraseñas no coinciden.');
            let respuesta;
            switch (modo) {
                case 'registro':
                    respuesta=await clienteApi.registro({nombre:form.nombre.trim(),apellido:form.apellido.trim(),email,password:form.password});
                    cambiar('verificar');setMensaje(respuesta.mensaje);break;
                case 'verificar':
                    respuesta=await clienteApi.verificarEmail({email,codigo:form.codigo});
                    cambiar('login');setMensaje(respuesta.mensaje);break;
                case 'recuperar':
                    respuesta=await clienteApi.solicitarReseteo(email);
                    cambiar('restablecer');setMensaje(respuesta.mensaje);break;
                case 'restablecer':
                    respuesta=await clienteApi.restablecer({email,codigo:form.codigo,password:form.password});
                    cambiar('login');setMensaje(respuesta.mensaje);break;
                default:
                    respuesta=modo==='otp' ? await clienteApi.verificar2fa({two_factor_token:temporal,codigo:form.codigo})
                        : await clienteApi.login({email,password:form.password});
                    if (respuesta.requires_2fa) {setTemporal(respuesta.two_factor_token);cambiar('otp');break;}
                    tienda.iniciarSesion(respuesta);navigate(destino,{replace:true});
            }
        } catch (e) {
            setError(e.message);
            if (modo==='login' && /verificar tu correo/i.test(e.message)) setModo('verificar');
        } finally {setOcupado(false);}
    }
    async function reenviar() {
        if (ocupado) return;
        setOcupado(true);setError('');
        try {setMensaje((await clienteApi.reenviarCodigo(form.email.trim().toLowerCase())).mensaje);}
        catch(e){setError(e.message);} finally{setOcupado(false);}
    }
    if (tienda.revisando) return <section className="compra-pagina contenedor"><h1>Mi cuenta</h1><p role="status">Verificando tu sesión…</p></section>;
    if (tienda.usuario) {
        const {nombre='',apellido='',email}=tienda.usuario;
        const iniciales=`${nombre.trim()[0] || ''}${apellido.trim()[0] || ''}`.toUpperCase() || '?';
        const unidades=tienda.items.reduce((s,i)=>s+i.cantidad,0);
        return <section className="compra-pagina contenedor cuenta-perfil">
            <h1>Mi cuenta</h1>
            <div className="cuenta-perfil__rejilla">
                <div className="cuenta-perfil__tarjeta">
                    <span className="cuenta-perfil__avatar" aria-hidden="true">{iniciales}</span>
                    <div><p className="cuenta-perfil__nombre">Hola, {nombre} {apellido}.</p><p className="cuenta-perfil__correo">{email}</p></div>
                    <button className="enlace-texto cuenta-perfil__salir" type="button" onClick={tienda.cerrarSesion}>
                        <FaArrowRightFromBracket aria-hidden="true"/> Cerrar sesión de cliente</button>
                </div>
                <nav className="cuenta-accesos" aria-label="Accesos de mi cuenta">
                    <Link to="/mis-compras" className="cuenta-acceso"><FaBoxOpen aria-hidden="true"/>
                        <span><strong>Mis compras</strong><small>Estado del pago y de la entrega</small></span><FaChevronRight aria-hidden="true"/></Link>
                    <Link to="/carrito" className="cuenta-acceso" aria-label="Ver carrito"><FaCartShopping aria-hidden="true"/>
                        <span><strong>Mi carrito</strong><small>{unidades ? `${unidades} ${unidades===1?'libro':'libros'} por comprar` : 'Tu carrito está vacío'}</small></span><FaChevronRight aria-hidden="true"/></Link>
                    <Link to="/catalogo" className="cuenta-acceso"><FaBookOpen aria-hidden="true"/>
                        <span><strong>Catálogo</strong><small>Precios y stock actuales</small></span><FaChevronRight aria-hidden="true"/></Link>
                    <Link to="/descargar" className="cuenta-acceso"><FaMobileScreen aria-hidden="true"/>
                        <span><strong>La app</strong><small>Favoritos y reservas con la misma cuenta</small></span><FaChevronRight aria-hidden="true"/></Link>
                </nav>
            </div>
        </section>;
    }
    return <section className="compra-pagina contenedor"><div className="cuenta-cliente">
        <h1>{titulos[modo]}</h1><p>Compra desde la web con tu misma cuenta de la app.</p>
        {error && <p role="alert" className="compra-error">{error}</p>}
        {mensaje && <p role="status" className="compra-aviso">{mensaje}</p>}
        <form onSubmit={enviar} className="compra-formulario">
            {modo==='registro' && <div className="cuenta-fila"><label>Nombre<input name="nombre" autoComplete="given-name" maxLength={100} required value={form.nombre} onChange={e=>campo('nombre',e.target.value)} /></label>
                <label>Apellido<input name="apellido" autoComplete="family-name" maxLength={100} required value={form.apellido} onChange={e=>campo('apellido',e.target.value)} /></label></div>}
            {modo!=='otp' && <label>Correo electrónico<input type="email" autoComplete="email" name="email" maxLength={255} required value={form.email} onChange={e=>campo('email',e.target.value)} /></label>}
            {['verificar','restablecer','otp'].includes(modo) && <label>{modo==='otp' ? 'Código del autenticador' : 'Código de seis dígitos'}
                <input inputMode="numeric" autoComplete="one-time-code" name="codigo" pattern="[0-9]{6}" maxLength={6} required value={form.codigo} onChange={e=>campo('codigo',e.target.value)} /></label>}
            {['login','registro','restablecer'].includes(modo) && <label>Contraseña<input type="password" autoComplete={modo==='login'?'current-password':'new-password'} minLength={modo==='login'?undefined:8} required
                value={form.password} onChange={e=>campo('password',e.target.value)} /></label>}
            {['registro','restablecer'].includes(modo) && <><label>Confirmar contraseña<input type="password" autoComplete="new-password" minLength={8} required value={form.confirmacion} onChange={e=>campo('confirmacion',e.target.value)} /></label>
                <p className="cuenta-ayuda">Al menos 8 caracteres, con una letra y un número.</p></>}
            <button className="boton boton--compra" type="submit" disabled={ocupado}>{ocupado?'Procesando…':modo==='login'?'Entrar':modo==='registro'?'Crear cuenta':'Continuar'}</button>
        </form>
        <div className="compra-acciones">
            {modo==='login' ? <><button type="button" className="enlace-texto" onClick={()=>cambiar('registro')}>Crear una cuenta</button>
                <button type="button" className="enlace-texto" onClick={()=>cambiar('recuperar')}>Olvidé mi contraseña</button></>
                : <button type="button" className="enlace-texto" onClick={()=>cambiar('login')}>Ya tengo una cuenta</button>}
            {modo==='verificar' && <button className="enlace-texto" type="button" disabled={ocupado} onClick={reenviar}>Reenviar código</button>}
        </div>
    </div></section>;
}
