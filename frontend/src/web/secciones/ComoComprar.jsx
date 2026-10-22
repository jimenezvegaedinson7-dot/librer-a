import { Search, CreditCard, PackageCheck } from 'lucide-react';

// ============================================================
// DEL ESTANTE A SUS MANOS
// Una sola sección para el proceso de compra (antes había otra que repetía
// delivery, recojo y PayU). Tres pasos reales.
// ============================================================

const PASOS = [
    { Icono: Search, titulo: 'Elija su libro', texto: 'Busque por título, autor o categoría y revise el precio y el stock en su ficha.' },
    { Icono: CreditCard, titulo: 'Pague con PayU', texto: 'Desde el sitio web o la aplicación, con su cuenta de cliente.' },
    { Icono: PackageCheck, titulo: 'Reciba o recoja', texto: 'Delivery en la ciudad de Pallasca o recojo gratuito en la librería.' },
];

export default function ComoComprar() {
    return (
        <section className="seccion comprar" aria-labelledby="comprar-titulo">
            <div className="contenedor comprar__rejilla">
                <div className="comprar__texto">
                    <h2 id="comprar-titulo" className="comprar__titulo" data-revelar="">Del estante a sus manos</h2>
                    <ol className="comprar__pasos">
                        {PASOS.map(({ Icono, titulo, texto }) => (
                            <li key={titulo} className="comprar__paso">
                                <span className="comprar__icono" aria-hidden="true"><Icono strokeWidth={1.6} /></span>
                                <div>
                                    <h3>{titulo}</h3>
                                    <p>{texto}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}
