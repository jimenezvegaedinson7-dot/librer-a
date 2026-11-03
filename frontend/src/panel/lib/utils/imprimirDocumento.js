import '../../estilos/impresion.css';

let impresionActiva = null;

export function imprimirDocumento(elemento) {
    if (!elemento || impresionActiva) return Promise.resolve(false);
    const contenedor = document.createElement('div');
    contenedor.className = 'documento-impresion';
    const copia = elemento.cloneNode(true);
    copia.removeAttribute('id');
    copia.querySelectorAll('[id]').forEach((nodo) => nodo.removeAttribute('id'));
    contenedor.append(copia);
    document.body.append(contenedor);
    document.body.classList.add('imprimiendo-documento');
    const operacion = {};
    impresionActiva = operacion;
    const medio = window.matchMedia('print');
    let entroEnImpresion = false;

    return new Promise((resolve, reject) => {
        const limpiar = () => {
            window.removeEventListener('afterprint', terminar);
            medio.removeEventListener('change', cambiarMedio);
            contenedor.remove();
            document.body.classList.remove('imprimiendo-documento');
            if (impresionActiva === operacion) impresionActiva = null;
        };
        const terminar = () => {
            limpiar();
            resolve(true);
        };
        const cambiarMedio = (evento) => {
            if (evento.matches) entroEnImpresion = true;
            else if (entroEnImpresion) terminar();
        };
        window.addEventListener('afterprint', terminar, { once: true });
        medio.addEventListener('change', cambiarMedio);
        const iniciar = async () => {
            try {
                await document.fonts.ready;
                await new Promise(requestAnimationFrame);
                if (impresionActiva !== operacion) return;
                window.print();
            } catch (error) {
                limpiar();
                reject(error);
            }
        };
        iniciar();
    });
}
