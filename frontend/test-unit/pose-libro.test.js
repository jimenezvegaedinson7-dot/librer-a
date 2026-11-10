import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Group, PerspectiveCamera, Vector3 } from 'three';
import { poseInicialLibro } from '../src/web/secciones/portada3d/poseLibro.js';

for (const [ancho, alto] of [
    [390, 844],
    [768, 1024],
    [1024, 768],
    [1440, 896]
]) {
    test(`el libro inicial y la cámara 3D proyectan la misma portada a ${ancho}×${alto}`, () => {
        for (const aspecto of [0.55, 2 / 3, 0.8, 1]) {
            const pose = poseInicialLibro(ancho, alto, aspecto);
            const camara = new PerspectiveCamera(pose.fov, ancho / alto, 0.1, 80);
            camara.position.set(0, 0, pose.distancia);
            camara.lookAt(0, 0, 0);
            camara.updateMatrixWorld(true);
            const libro = new Group();
            libro.position.set(pose.x, pose.y, 0);
            libro.rotation.set(pose.rotacion.x, pose.rotacion.y, pose.rotacion.z);
            libro.scale.setScalar(pose.escala);
            libro.updateMatrixWorld(true);
            for (const [x, y] of [
                [0, 0],
                [pose.anchoImagen, 0],
                [pose.anchoImagen, pose.altoImagen],
                [0, pose.altoImagen]
            ]) {
                const punto = new Vector3((x / pose.anchoImagen - 0.5) * 3.2 * aspecto, (0.5 - y / pose.altoImagen) * 3.2, 0.1605).applyMatrix4(libro.matrixWorld).project(camara);
                const esperado = { x: (punto.x * 0.5 + 0.5) * ancho, y: (-punto.y * 0.5 + 0.5) * alto };
                const m = pose.matriz;
                const divisor = m[3] * x + m[7] * y + m[15];
                const inicial = { x: (m[0] * x + m[4] * y + m[12]) / divisor, y: (m[1] * x + m[5] * y + m[13]) / divisor };
                assert.ok(Math.abs(inicial.x - esperado.x) < 0.01);
                assert.ok(Math.abs(inicial.y - esperado.y) < 0.01);
            }
        }
    });
}
