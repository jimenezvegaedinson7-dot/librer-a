import { FaUser, FaTag, FaMoneyBillWave, FaBoxesStacked, FaImage } from 'react-icons/fa6';

import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Ficha } from '../../components/ui/Ficha';

import { construirUrlArchivo } from '../../lib/utils/url';
import { formatearMoneda } from '../../lib/utils/format';
import { StockBadge } from './libroUi';

export default function LibroViewModal({ libro, abierto, onCerrar }) {
    if (!abierto || !libro) return null;

    const activo = Number(libro.estado) === 1;
    const urlPortada = construirUrlArchivo(libro.portada);

    return (
        <Modal abierto={abierto} titulo="Detalle del libro" subtitulo="Información registrada en el sistema" onCerrar={onCerrar} grande>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[180px_1fr]">
                <div>
                    <p className="field-label">Portada</p>
                    <div className="flex h-[250px] w-full items-center justify-center overflow-hidden rounded-xl border border-primary-200 bg-parchment-200">
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
                            className="flex h-full w-full flex-col items-center justify-center text-primary-400"
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
                        <h3 className="text-2xl font-bold text-mahogany-700">{libro.titulo}</h3>
                        <p className="mt-2 text-sm text-primary-500">
                            ISBN: <span className="font-medium text-mahogany-700">{libro.isbn || 'No registrado'}</span>
                        </p>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Ficha color="blue" icono={<FaUser size={16} />} etiqueta="Autor">{libro.autor || 'No registrado'}</Ficha>
                        <Ficha color="blue" icono={<FaTag size={16} />} etiqueta="Categoría">{libro.categoria || 'No registrada'}</Ficha>
                        <Ficha color="blue" icono={<FaMoneyBillWave size={16} />} etiqueta="Precio">
                            <span className="text-lg font-bold">{formatearMoneda(libro.precio)}</span>
                        </Ficha>
                        <Ficha color="blue" icono={<FaBoxesStacked size={16} />} etiqueta="Stock">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">{Number(libro.stock || 0)}</span>
                                <span className="text-sm font-medium text-primary-500">
                                    {Number(libro.stock) === 1 ? 'unidad' : 'unidades'}
                                </span>
                                <span className="ml-auto"><StockBadge stock={libro.stock} /></span>
                            </div>
                        </Ficha>
                    </div>

                    <div className="mt-5">
                        <h4 className="mb-2 text-sm font-bold text-mahogany-700">Descripción</h4>
                        <div className="min-h-[80px] rounded-xl border border-primary-200 bg-parchment-200 px-4 py-3">
                            <p className="text-sm leading-6 text-primary-500">
                                {libro.descripcion || 'No se registró una descripción para este libro.'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                        <span className="text-sm font-semibold text-mahogany-700">Estado:</span>
                        <Badge color={activo ? 'success' : 'danger'}>{activo ? 'Activo' : 'Inactivo'}</Badge>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-primary-200 pt-5">
                <Button onClick={onCerrar}>Cerrar</Button>
            </div>
        </Modal>
    );
}
