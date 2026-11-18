import { FaArrowRight } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { DataTable } from '../ui/DataTable';

function RecentBooks({ libros = [], stockBajo = [] }) {
    const navigate = useNavigate();

    const idsStockBajo = stockBajo ? new Set(stockBajo.map((item) => Number(item.id_libro))) : null;

    const obtenerStock = (libro) => {
        const cantidad = Number(libro.stock || 0);

        if (Number(libro.estado) === 0) {
            return { texto: 'Inactivo', clase: 'estado--neutro' };
        }

        if (cantidad <= 0) {
            return { texto: 'Sin stock', clase: 'estado--peligro' };
        }

        if (!idsStockBajo) {
            return { texto: `${cantidad} disp.`, clase: 'estado--neutro' };
        }

        if (idsStockBajo.has(Number(libro.id_libro))) {
            return { texto: `${cantidad} disp.`, clase: 'estado--aviso' };
        }

        return { texto: `${cantidad} disp.`, clase: 'estado--exito' };
    };

    const librosRecientes = libros.slice(0, 5);
    const columnas = [
        { titulo: 'Libro', className: 'tabla-col-principal', render: (libro) => <span className="tabla-dato">{libro.titulo || 'Sin título'}</span> },
        { titulo: 'Autor', className: 'tabla-col-nota', campo: 'autor', render: (libro) => libro.autor || 'Sin autor' },
        { titulo: 'Categoría', campo: 'categoria', render: (libro) => libro.categoria || 'Sin categoría' },
        {
            titulo: 'Stock',
            alineacion: 'derecha',
            className: 'tabla-col-importe',
            render: (libro) => {
                const stock = obtenerStock(libro);
                return <span className={`estado-pildora ${stock.clase}`}>{stock.texto}</span>;
            }
        }
    ];

    return (
        <div className="tabla-panel">
            <Card>
                <CardHeader
                    titulo="Últimos libros agregados"
                    subtitulo="Libros registrados recientemente"
                    acciones={
                        <Button variante="secondary" onClick={() => navigate('/libros')}>
                            Ver todos <FaArrowRight aria-hidden="true" />
                        </Button>
                    }
                />
                <CardBody className="p-0">
                    <DataTable
                        etiqueta="Últimos libros agregados"
                        columnas={columnas}
                        filas={librosRecientes}
                        keyExtractor={(libro) => libro.id_libro}
                        vacio="No hay libros registrados. Los últimos libros agregados aparecerán aquí."
                    />
                </CardBody>
            </Card>
        </div>
    );
}

export default RecentBooks;
