import { useState } from 'react';
import { FaTag } from 'react-icons/fa6';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CamposDescuento } from './CamposLibro';
import { avisoDescuentoLibro } from './promocion';
import { formatearMoneda } from '../../compartido/lib/utils/format';

export function BotonDescuentoLibro({ formulario, onAbrir, disabled }) {
    const hayDescuento = Boolean(formulario.descuento_porcentaje || formulario.precio_oferta);
    const resumen = formulario.descuento_porcentaje ? `${formulario.descuento_porcentaje}% de descuento` : `Precio de oferta: ${formatearMoneda(formulario.precio_oferta)}`;

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variante="secondary" onClick={onAbrir} disabled={disabled} aria-haspopup="dialog">
                <FaTag aria-hidden="true" /> {hayDescuento ? 'Editar descuento' : 'Agregar descuento'}
            </Button>
            {hayDescuento ? <span className="text-sm text-slate-700">{resumen}</span> : <span className="text-xs text-slate-600">Opcional: porcentaje o precio de oferta.</span>}
        </div>
    );
}

export default function DescuentoLibroModal({ formulario, onAplicar, onCerrar }) {
    const [borrador, setBorrador] = useState(() => ({
        precio: formulario.precio,
        descuento_porcentaje: formulario.descuento_porcentaje ?? '',
        precio_oferta: formulario.precio_oferta ?? '',
        descuento_hasta: formulario.descuento_hasta ?? ''
    }));
    const aviso = avisoDescuentoLibro(borrador);

    const aplicar = (e) => {
        e.preventDefault();
        if (aviso) return;
        const hayDescuento = Boolean(borrador.descuento_porcentaje || borrador.precio_oferta);
        onAplicar({ descuento_porcentaje: borrador.descuento_porcentaje, precio_oferta: borrador.precio_oferta, descuento_hasta: hayDescuento ? borrador.descuento_hasta : '' });
    };

    return (
        <Modal abierto titulo="Descuento del libro" subtitulo="Configura la oferta y aplícala al formulario del libro." onCerrar={onCerrar}>
            <form onSubmit={aplicar} className="space-y-5">
                <CamposDescuento flotante formulario={borrador} manejarCambio={(e) => setBorrador((anterior) => ({ ...anterior, [e.target.name]: e.target.value }))} />
                <p className="text-sm text-slate-600">Los cambios se guardarán cuando guardes el libro.</p>
                <div className="flex flex-wrap justify-end gap-3 border-t border-primary-200 pt-4">
                    {(borrador.descuento_porcentaje || borrador.precio_oferta) && (
                        <Button variante="ghost" onClick={() => onAplicar({ descuento_porcentaje: '', precio_oferta: '', descuento_hasta: '' })}>
                            Quitar descuento
                        </Button>
                    )}
                    <Button variante="secondary" onClick={onCerrar}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={Boolean(aviso)}>
                        Aplicar descuento
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
