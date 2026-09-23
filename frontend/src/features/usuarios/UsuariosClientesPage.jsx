import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FaUserGroup, FaUsers } from 'react-icons/fa6';

import { PageHeader } from '../../components/ui/PageHeader';
import ClientesPage from '../clientes/ClientesPage';
import UsuariosPage from './UsuariosPage';

// Usuarios y clientes en una sola página: las cuentas (roles y estado) y la
// actividad de compras de los clientes, cada una en su pestaña.
const PESTANAS = [
    { id: 'cuentas', texto: 'Cuentas', detalle: 'Roles y acceso', Icono: FaUsers },
    { id: 'clientes', texto: 'Clientes y compras', detalle: 'Actividad de compra', Icono: FaUserGroup },
];

export default function UsuariosClientesPage() {
    const [parametros, setParametros] = useSearchParams();
    const reducir = useReducedMotion();
    const botones = useRef([]);

    const activa = parametros.get('vista') === 'clientes' ? 'clientes' : 'cuentas';

    const cambiar = (id) => {
        setParametros(id === 'clientes' ? { vista: 'clientes' } : {}, { replace: true });
    };

    // Flechas izquierda/derecha entre pestañas (patrón de tabs accesibles).
    const alTeclear = (e, indice) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const siguiente = (indice + (e.key === 'ArrowRight' ? 1 : -1) + PESTANAS.length) % PESTANAS.length;
        cambiar(PESTANAS[siguiente].id);
        botones.current[siguiente]?.focus();
    };

    return (
        <div className="space-y-4">
            <PageHeader
                titulo="Usuarios"
                descripcion="Cuentas registradas, permisos y actividad de compras de los clientes"
                icono={<FaUsers />}
            />

            <div className="pestanas" role="tablist" aria-label="Vistas de usuarios">
                {PESTANAS.map(({ id, texto, detalle, Icono }, i) => (
                    <button
                        key={id}
                        ref={(el) => { botones.current[i] = el; }}
                        type="button"
                        role="tab"
                        id={`pestana-${id}`}
                        aria-selected={activa === id}
                        aria-controls={`panel-${id}`}
                        tabIndex={activa === id ? 0 : -1}
                        onClick={() => cambiar(id)}
                        onKeyDown={(e) => alTeclear(e, i)}
                        className={`pestana ${activa === id ? 'pestana--activa' : ''}`}
                    >
                        <span className="pestana-icono" aria-hidden="true"><Icono /></span>
                        <span className="text-left">
                            <span className="pestana-texto">{texto}</span>
                            <span className="pestana-detalle">{detalle}</span>
                        </span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={activa}
                    role="tabpanel"
                    id={`panel-${activa}`}
                    aria-labelledby={`pestana-${activa}`}
                    initial={reducir ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducir ? { opacity: 1 } : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                >
                    {activa === 'clientes' ? <ClientesPage incrustado /> : <UsuariosPage incrustado />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
