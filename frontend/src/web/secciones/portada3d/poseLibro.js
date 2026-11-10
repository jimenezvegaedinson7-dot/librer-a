export function poseInicialLibro(ancho, alto, aspecto = 2 / 3, compacto = ancho <= 900) {
    const anchoSeguro = Math.max(1, ancho);
    const altoSeguro = Math.max(1, alto);
    const proporcion = Number.isFinite(aspecto) && aspecto > 0 ? aspecto : 2 / 3;
    const alturaLibro = 3.2;
    const anchuraLibro = alturaLibro * proporcion;
    const fov = compacto ? 42 : 34;
    const tangente = Math.tan((fov * Math.PI) / 360);
    const distancia = Math.max(10, anchuraLibro / (2 * tangente * (anchoSeguro / altoSeguro) * 0.62));
    const focal = altoSeguro / (2 * tangente);
    const escala = compacto ? 0.74 : 0.94;
    const x = compacto ? 0 : 2 * distancia * tangente * (anchoSeguro / altoSeguro) * 0.17;
    const y = compacto ? 0.05 : 0.12;
    const rotacion = { x: 0.08, y: -0.16, z: -0.04 };
    const [sx, cx, sy, cy, sz, cz] = [Math.sin(rotacion.x), Math.cos(rotacion.x), Math.sin(rotacion.y), Math.cos(rotacion.y), Math.sin(rotacion.z), Math.cos(rotacion.z)];
    const ejeX = [cy * cz, cx * sz + sx * sy * cz, sx * sz - cx * sy * cz];
    const ejeY = [-cy * sz, cx * cz - sx * sy * sz, sx * cz + cx * sy * sz];
    const ejeZ = [sy, -sx * cy, cx * cy];
    const anchoImagen = 200;
    const altoImagen = anchoImagen / proporcion;
    const origen = [x, y, 0].map((centro, i) => centro + escala * ((-anchuraLibro * ejeX[i]) / 2 + (alturaLibro * ejeY[i]) / 2 + 0.1605 * ejeZ[i]));
    const horizontal = ejeX.map((valor) => (valor * escala * anchuraLibro) / anchoImagen);
    const vertical = ejeY.map((valor) => (-valor * escala * alturaLibro) / altoImagen);
    const profundidad = distancia - origen[2];
    const proyectarEje = (eje) => [
        (focal * eje[0] - (anchoSeguro * eje[2]) / 2) / profundidad,
        (-focal * eje[1] - (altoSeguro * eje[2]) / 2) / profundidad,
        0,
        -eje[2] / profundidad
    ];
    const matriz = [
        ...proyectarEje(horizontal),
        ...proyectarEje(vertical),
        0,
        0,
        1,
        0,
        anchoSeguro / 2 + (focal * origen[0]) / profundidad,
        altoSeguro / 2 - (focal * origen[1]) / profundidad,
        0,
        1
    ];
    const borde = Array.from({ length: 32 }, (_, i) => {
        const angulo = (i * Math.PI) / 16;
        const z = -0.3 + Math.sin(angulo) * 1.93;
        return { x: anchoSeguro / 2 + (focal * (x + Math.cos(angulo) * 1.93)) / (distancia - z), y: altoSeguro / 2 + (focal * 2.244) / (distancia - z) };
    });
    const izquierda = Math.min(...borde.map((p) => p.x));
    const superior = Math.min(...borde.map((p) => p.y));
    return {
        fov,
        distancia,
        escala,
        x,
        y,
        rotacion,
        anchoImagen,
        altoImagen,
        matriz,
        pedestal: { left: izquierda, top: superior, width: Math.max(...borde.map((p) => p.x)) - izquierda, height: Math.max(...borde.map((p) => p.y)) - superior }
    };
}
