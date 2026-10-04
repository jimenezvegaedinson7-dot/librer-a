// Índice empaquetado para que Render pueda ejecutar backend/ por separado.
// Se sincroniza en npm ci (prepare) cuando el checkout incluye frontend/.
const fs = require('node:fs');
const path = require('node:path');
const destino = path.resolve(__dirname, '../src/config/portadasCatalogo.json');
const tienda = path.resolve(__dirname, '../../frontend/src/public-site/tienda');

function sincronizar() {
    const indice = path.join(tienda, 'portadasCatalogo.json');
    if (!fs.existsSync(indice)) {
        if (!fs.existsSync(destino)) throw new Error('No existe el índice de portadas empaquetado');
        console.log('Portadas: usando el índice empaquetado del backend.');
        return;
    }
    const portadas = require('../../frontend/src/public-site/tienda/portadasCatalogo.json');
    const referencias = require('../../frontend/src/public-site/tienda/portadasReferencia.json');
    for (const [isbn, archivo] of Object.entries(portadas)) {
        if (!/^\d{13}$/.test(isbn) || !/^\/portadas\/\d{13}(?:-referencia)?\.jpg$/.test(archivo)) {
            throw new Error('Índice de portadas inválido');
        }
        const publico = path.resolve(__dirname, '../../frontend/public', `.${archivo}`);
        if (!fs.existsSync(publico)) throw new Error(`Portada no encontrada: ${isbn}`);
    }
    for (const [isbn, referencia] of Object.entries(referencias)) {
        if (portadas[isbn] !== referencia.archivo || !referencia.isbnEdicion || !referencia.edicion) {
            throw new Error(`Referencia incompleta: ${isbn}`);
        }
    }
    const contenido = JSON.stringify({ portadas, referencias }, null, 2) + '\n';
    if (!fs.existsSync(destino) || fs.readFileSync(destino, 'utf8') !== contenido) {
        fs.writeFileSync(destino, contenido);
    }
    console.log(`Portadas sincronizadas: ${Object.keys(portadas).length}, referencias: ${Object.keys(referencias).length}.`);
}
if (require.main === module) sincronizar();
module.exports = { sincronizar };
