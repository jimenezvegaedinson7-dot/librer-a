import { FaUser, FaTag, FaMoneyBillWave, FaBoxesStacked, FaImage } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Ficha } from '../../components/ui/Ficha';

import { construirUrlArchivo } from '../../lib/utils/url';
import { formatearMoneda } from '../../lib/utils/format';
import { StockBadge } from './libroUi';
import { soportaPromociones } from './promocion';

// descuento_hasta es un DATE, no un instante: UTC conserva el día guardado
// aunque el navegador esté en Perú u otra zona horaria.
function fechaPromocion(fecha) {
    const dia = String(fecha || '').slice(0, 10);
    const fechaUtc = new Date(`${dia}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || Number.isNaN(fechaUtc.getTime())) return 'Fecha no válida';
    return fechaUtc.toLocaleDateString('es-PE', {
        timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric',
    });
}

export default function LibroViewModal({ libro, abierto, onCerrar }) {
    if (!abierto || !libro) return null;

    const activo = Number(libro.estado) === 1;
    const informacionPromocion = soportaPromociones(libro);
    const urlPortada = construirUrlArchivo(libro.portada);
    const conPorcentaje = Number(libro.descuento_porcentaje) > 0;
    const conOferta = libro.precio_oferta !== null && libro.precio_oferta !== undefined && libro.precio_oferta !== '';
    const tienePromocion = conPorcentaje || conOferta || Number(libro.descuento_vigente) === 1;
    const vigente = Number(libro.descuento_vigente) === 1 && Number.isFinite(Number(libro.precio_final))
        && Number(libro.precio_final) < Number(libro.precio);
    const hoyEnLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    const vencida = tienePromocion && !vigente && libro.descuento_hasta
        && String(libro.descuento_hasta).slice(0, 10) < hoyEnLima;
    const estadoPromocion = !informacionPromocion ? 'Información no disponible' : !tienePromocion ? 'Sin descuento'
        : vigente ? 'Descuento vigente' : vencida ? 'Descuento vencido' : 'Sin rebaja vigente';

    return (
        <Modal abierto={abierto} titulo="Detalle del libro" subtitulo="Información registrada en el sistema" onCerrar={onCerrar} grande>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[180px_1fr]">
                <div>
                    <p className="field-label">Portada</p>
                    <div className="mx-auto flex h-[250px] w-full max-w-[180px] items-center justify-center overflow-hidden rounded-xl md:max-w-none border border-primary-200 bg-parchment-200">
                        {urlPortada ? (
                            <img
                                src={urlPortada}
                                alt={`Portada de ${libro.titulo}`}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const siguiente = e.currentTarget.nextElementSibling;
                                    if (siguiente) siguiente.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div
                            style={urlPortada ? { display: 'none' } : {}}
                            className="flex h-full w-full flex-col items-center justify-center text-slate-500"
                        >
                            <FaImage size={38} />
                            <span className="mt-2 text-xs font-medium">
                                {urlPortada ? 'No se pudo cargar la portada' : 'Sin portada'}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="border-b border-primary-200 pb-4">
                        <h3 className="font-title text-[26px] font-semibold leading-tight tracking-[-0.015em] text-slate-900">{libro.titulo}</h3>
                        <p className="mt-2 text-sm text-primary-500">
                            ISBN: <span className="font-medium text-slate-700">{libro.isbn || 'No registrado'}</span>
                        </p>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Ficha color="blue" icono={<FaUser size={16} />} etiqueta="Autor">{libro.autor || 'No registrado'}</Ficha>
                        <Ficha color="blue" icono={<FaTag size={16} />} etiqueta="Categoría">{libro.categoria || 'No registrada'}</Ficha>
                        <Ficha color="blue" icono={<FaMoneyBillWave size={16} />} etiqueta="Precio actual">
                            <div className="space-y-1">
                                {vigente && (
                                    <p className="text-sm font-medium text-slate-500">
                                        Precio normal: <span className="line-through">{formatearMoneda(libro.precio)}</span>
                                    </p>
                                )}
                                <span className={`text-lg font-bold${vigente ? ' descuento-resaltado' : ''}`}>
                                    {formatearMoneda(vigente ? libro.precio_final : libro.precio)}
                                </span>
                                {vigente && Number(libro.descuento_porcentaje_efectivo) > 0 && (
                                    <p className="descuento-resaltado text-sm font-medium">
                                        Ahorro: {libro.descuento_porcentaje_efectivo}%
                                    </p>
                                )}
                            </div>
                        </Ficha>
                        <Ficha color="blue" icono={<FaBoxesStacked size={16} />} etiqueta="Stock">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">{Number(libro.stock || 0)}</span>
                                <span className="text-sm font-medium text-primary-500">
                                    {Number(libro.stock) === 1 ? 'unidad' : 'unidades'}
                                </span>
                                <span className="ml-auto"><StockBadge stock={libro.stock} stockMinimo={libro.stock_minimo} /></span>
                            </div>
                        </Ficha>
                    </div>

                    <div className="mt-4">
                        <Ficha icono={<FaTag size={16} />} etiqueta="Promoción">
                            <Badge color={!informacionPromocion ? 'warning' : vigente ? 'offer' : vencida ? 'warning' : 'neutral'} className={vigente ? 'descuento-resaltado' : ''}>{estadoPromocion}</Badge>
                            {!informacionPromocion ? (
                                <p className="mt-2 text-sm font-medium text-slate-600">La API conectada no devuelve los datos de promoción. No se puede comprobar el descuento hasta actualizar el backend.</p>
                            ) : tienePromocion ? (
                                <div className="mt-3 space-y-2 text-sm font-medium">
                                    <dl className="space-y-2">
                                        {conPorcentaje && <div><dt className="text-slate-500">Descuento configurado</dt><dd className="descuento-resaltado">{libro.descuento_porcentaje}%</dd></div>}
                                        {conOferta && <div><dt className="text-slate-500">Precio de oferta configurado</dt><dd className="descuento-resaltado">{formatearMoneda(libro.precio_oferta)}</dd></div>}
                                        <div>
                                            <dt className="text-slate-500">Fin de la promoción</dt>
                                            <dd>{libro.descuento_hasta ? `${fechaPromocion(libro.descuento_hasta)} (inclusive, hora de Perú)` : 'Sin límite de fecha'}</dd>
                                        </div>
                                    </dl>
                                    {conOferta && conPorcentaje && <p className="text-slate-600">El precio de oferta tiene prioridad sobre el porcentaje.</p>}
                                    {vencida && <p className="text-slate-600">La promoción terminó. Actualmente se cobra el precio normal.</p>}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm font-medium text-slate-600">Este libro no tiene una promoción configurada.</p>
                            )}
                        </Ficha>
                    </div>

                    <div className="mt-5">
                        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Descripción</h4>
                        <div className="min-h-[80px] rounded-xl border border-primary-200 bg-parchment-200 px-4 py-3">
                            <p className="text-sm leading-6 text-primary-500">
                                {libro.descripcion || 'No se registró una descripción para este libro.'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-700">Estado:</span>
                        <Badge color={activo ? 'success' : 'danger'}>{activo ? 'Activo' : 'Inactivo'}</Badge>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-primary-200 pt-5">
                <Button variante="secondary" onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
