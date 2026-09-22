import { useEffect, useState } from 'react';

import { FaFloppyDisk, FaRotateLeft } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Alert';

import { actualizarInventario } from './inventarioService';
import { numeroNoNegativo, validarFormulario } from '../../lib/utils/validaciones';

const REGLAS = {
    stock: [(v) => numeroNoNegativo(v, 'El stock')],
    stock_minimo: [(v) => numeroNoNegativo(v, 'El stock mínimo')],
};

function inicialFormulario(inventario) {
    return {
        stock: inventario.stock !== undefined && inventario.stock !== null ? String(inventario.stock) : '0',
        stock_minimo: inventario.stock_minimo !== undefined && inventario.stock_minimo !== null ? String(inventario.stock_minimo) : '5',
        ubicacion: inventario.ubicacion || '',
    };
}

export default function InventarioEditModal({ inventario, abierto, onCerrar, onActualizado }) {
    const [formulario, setFormulario] = useState(inicialFormulario(inventario || {}));
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!abierto || !inventario) return;
        setFormulario(inicialFormulario(inventario));
        setErrores({});
        setError('');
    }, [abierto, inventario]);

    if (!abierto || !inventario) return null;

    const validarCampo = (nombre, valor) => {
        for (const validador of REGLAS[nombre] || []) {
            const mensaje = validador(valor, formulario);
            if (mensaje) return mensaje;
        }
        return '';
    };

    const manejarCambio = (e) => {
        const { name, value } = e.target;
        setFormulario((anterior) => ({ ...anterior, [name]: value }));
        setError('');
        const mensaje = validarCampo(name, value);
        setErrores((anterior) => {
            const copia = { ...anterior };
            if (mensaje) copia[name] = mensaje;
            else delete copia[name];
            return copia;
        });
    };

    const restablecerFormulario = () => {
        setFormulario(inicialFormulario(inventario));
        setErrores({});
        setError('');
    };

    const actualizar = async (e) => {
        e.preventDefault();
        const { errores: nuevosErrores, valido } = validarFormulario(formulario, REGLAS);
        setErrores(nuevosErrores);
        setError('');
        if (!valido) {
            setError('Revisa los campos marcados en rojo antes de continuar.');
            return;
        }
        try {
            setGuardando(true);
            await actualizarInventario(inventario.id_libro, formulario);
            if (onActualizado) await onActualizado();
            onCerrar();
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al actualizar el inventario');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={abierto} titulo="Editar inventario" subtitulo="Actualiza stock, stock mínimo y ubicación" onCerrar={onCerrar}>
            <div className="rounded-xl border border-primary-200 bg-parchment-200 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Libro</p>
                <p className="mt-1 font-bold text-slate-700">{inventario.titulo}</p>
            </div>

            {error && <div className="mt-5"><Alert tipo="error">{error}</Alert></div>}

            <form onSubmit={actualizar} className="mt-4 space-y-3">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Input label="Stock" name="stock" type="number" min="0" value={formulario.stock} error={errores.stock} onChange={manejarCambio} required />
                    <Input label="Stock mínimo" name="stock_minimo" type="number" min="0" value={formulario.stock_minimo} error={errores.stock_minimo} onChange={manejarCambio} required />
                </div>

                <Input
                    label="Ubicación"
                    name="ubicacion"
                    value={formulario.ubicacion}
                    onChange={manejarCambio}
                    placeholder="Ej. Estante A - Nivel 2"
                />

                <div className="flex flex-col-reverse gap-3 border-t border-primary-200 pt-5 sm:flex-row sm:justify-end">
                    <Button variante="secondary" type="button" onClick={restablecerFormulario} disabled={guardando}>
                        <FaRotateLeft /> Restablecer
                    </Button>
                    <Button variante="secondary" type="button" onClick={onCerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" cargando={guardando}>
                        <FaFloppyDisk /> {guardando ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
