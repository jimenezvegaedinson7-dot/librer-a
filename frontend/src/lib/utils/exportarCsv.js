function celdaSegura(valor) {
    const texto = String(valor ?? '');
    // Evita la inyección de fórmulas en Excel / LibreOffice: si la celda
    // empieza con =, +, - o @, se prefija con una comilla simple.
    if (/^[=+\-@]/.test(texto)) {
        return `'${texto}`;
    }
    return texto;
}

export function exportarCsv({ nombreArchivo, columnas, filas }) {
    const encabezados = columnas.map((col) => `"${celdaSegura(col.titulo).replace(/"/g, '""')}"`).join(';');
    const lineas = filas.map((fila) =>
        columnas
            .map((col) => {
                const valor = col.exportar ? col.exportar(fila) : fila?.[col.campo];
                return `"${celdaSegura(valor).replace(/"/g, '""')}"`;
            })
            .join(';'),
    );

    const csv = [encabezados, ...lineas].join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
}