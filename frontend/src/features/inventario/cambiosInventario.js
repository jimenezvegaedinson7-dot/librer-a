// Un formulario abierto no debe reenviar existencias que ya pudieron cambiar.
export function cambiosInventario(formulario, anterior) {
    const cambios = {};
    for (const campo of ['stock', 'stock_minimo']) {
        if (Number(formulario[campo]) !== Number(anterior[campo])) cambios[campo] = Number(formulario[campo]);
    }
    if (Object.hasOwn(cambios, 'stock')) cambios.stock_esperado = Number(anterior.stock);
    if (formulario.ubicacion.trim() !== String(anterior.ubicacion || '').trim()) {
        cambios.ubicacion = formulario.ubicacion.trim() || null;
    }
    return cambios;
}
