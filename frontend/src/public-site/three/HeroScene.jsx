import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { aleatorio, texturaCanto, texturaCuero, texturaPagina, texturaPortada, texturaSombra } from './texturas';

// ============================================================
// ESCENA DEL HERO: un libro de cuero verde. En reposo está cerrado,
// con la portada al frente. Con el cursor encima se abre y pasa sus
// hojas una por una; al retirarlo, las hojas se posan y el libro se
// vuelve a cerrar. Sigue al cursor y deja caer su cinta de seda.
// ============================================================

const W = 1.5; // ancho de hoja
const H = 2.08; // alto de hoja
const D = 0.17; // grosor de cada bloque de hojas
const T = 0.06; // grosor de la tapa
const ANCHO_TAPA = W + 0.07;
const ALTO_TAPA = H + 0.1;
const COLUMNAS = 28;
const CERRADO = Math.PI / 2; // semiángulo de las tapas con el libro cerrado

const suave = (a, b, x) => {
    const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};

// Aceleración y frenado suaves: la hoja despega, cruza rápido y se posa.
const facil = (x) => {
    const t = THREE.MathUtils.clamp(x, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};

// Media tapa con su bloque de hojas. El grupo gira en el lomo, a la
// altura de la superficie de las páginas (z = 0), así ambas mitades se
// juntan exactamente al cerrarse.
function Mitad({ lado, materiales, cuero, tapaGeo, portada }) {
    return (
        <>
            <mesh position={[(lado * ANCHO_TAPA) / 2, 0, -D - T / 2]} material={cuero} geometry={tapaGeo} castShadow receiveShadow />
            {portada && (
                <mesh position={[(lado * ANCHO_TAPA) / 2, 0, -D - T - 0.0015]} rotation={[0, Math.PI, 0]} material={portada}>
                    <planeGeometry args={[ANCHO_TAPA - 0.02, ALTO_TAPA - 0.02]} />
                </mesh>
            )}
            <mesh position={[lado * (W / 2 + 0.012), 0, -D / 2]} material={materiales} castShadow receiveShadow>
                <boxGeometry args={[W, H, D]} />
            </mesh>
        </>
    );
}

// Lomo: un arco de cuero que une las dos tapas y se curva al cerrar.
function Lomo({ apertura, cuero }) {
    const malla = useRef(null);
    const previo = useRef(-1);
    const radio = D + T / 2;

    useFrame(() => {
        const a = apertura.current;
        if (!malla.current || Math.abs(a - previo.current) < 0.002) return;
        previo.current = a;
        const anterior = malla.current.geometry;
        malla.current.geometry = new THREE.CylinderGeometry(radio, radio, ALTO_TAPA, 24, 1, true, Math.PI - a, 2 * a);
        anterior?.dispose();
    });
    useEffect(() => () => malla.current?.geometry?.dispose(), []);

    return <mesh ref={malla} material={cuero} castShadow />;
}

// ------------------------------------------------------------
// PASO DE HOJAS
// Con el libro abierto y el cursor encima, las hojas se pasan una por
// una en ráfagas cortas: cada hoja arranca HOJA_INTERVALO después de la
// anterior y gira en HOJA_DURACION. Primero se levanta la hoja del ex
// libris; después pasan HOJAS_LISAS hojas en ciclo. Al salir el cursor,
// las hojas en vuelo terminan su giro y el ex libris vuelve con calma.
//
// Una hoja que termina a la izquierda es idéntica a la página de ese
// lado, y en reposo a la derecha es idéntica a la página derecha: por
// eso puede volver al inicio del ciclo sin que se note.
// ------------------------------------------------------------
const HOJAS_LISAS = 7;
const HOJA_INTERVALO = 0.065; // s entre hojas
const HOJA_DURACION = 0.26; // s de giro de cada hoja
const HOJA_PAUSA = 0.42; // s de respiro entre ráfagas
const CICLO = (HOJAS_LISAS - 1) * HOJA_INTERVALO + HOJA_DURACION + HOJA_PAUSA;
const EXLIBRIS_IDA = 0.3;
const EXLIBRIS_VUELTA = 0.6;
const SEPARACION = 0.0035; // desfase para apilar hojas sin parpadeo

function giroLisa(j, t, pase) {
    if (pase.entrada === null) return 0;
    if (pase.salida !== null && t >= pase.vuelta) return 0;
    const inicio = pase.entrada + HOJA_INTERVALO * (j + 1);
    const hasta = pase.salida === null ? t : Math.min(t, pase.finLisas[j] ?? t);
    if (hasta < inicio) return 0;
    const fase = (hasta - inicio) % CICLO;
    return facil(fase / HOJA_DURACION);
}

// Una hoja de dos caras, cada una con su material para no verse en espejo.
function Hoja({ anverso, reverso, apertura, giro, zDerecha, zIzquierda }) {
    const geo = useRef(null);
    const dorso = useRef(null);
    const bisagra = useRef(null);
    const previo = useRef({ g: -1, a: -1 });

    useFrame(() => {
        if (!geo.current) return;
        if (dorso.current && dorso.current.geometry !== geo.current) dorso.current.geometry = geo.current;
        const g = giro.current;
        const a = apertura.current;
        if (bisagra.current) bisagra.current.position.z = 0.006 + THREE.MathUtils.lerp(zDerecha, zIzquierda, g);
        if (Math.abs(g - previo.current.g) < 1e-4 && Math.abs(a - previo.current.a) < 1e-4) return;
        previo.current = { g, a };

        const base = THREE.MathUtils.lerp(a, Math.PI - a, g);
        // En vuelo la hoja se arquea: el borde libre va por detrás del lomo.
        const curva = -0.62 * Math.sin(Math.PI * g);
        const pos = geo.current.attributes.position;
        const paso = W / COLUMNAS;
        for (let fila = 0; fila < 2; fila += 1) {
            let x = 0;
            let z = 0;
            for (let i = 0; i <= COLUMNAS; i += 1) {
                pos.setXYZ(fila * (COLUMNAS + 1) + i, x, fila === 0 ? H / 2 : -H / 2, z);
                const ang = base + curva * (i / COLUMNAS) ** 1.6;
                x += Math.cos(ang) * paso;
                z += Math.sin(ang) * paso;
            }
        }
        pos.needsUpdate = true;
        geo.current.computeVertexNormals();
        geo.current.computeBoundingSphere();
    });

    return (
        <group ref={bisagra} position={[0.004, 0, 0.006]}>
            <mesh material={anverso} castShadow receiveShadow>
                <planeGeometry ref={geo} args={[W, H, COLUMNAS, 1]} />
            </mesh>
            <mesh ref={dorso} material={reverso} receiveShadow />
        </group>
    );
}

function HojasQueSePasan({ materiales, apertura, activo, abierto, alMoverse }) {
    const pase = useRef({ entrada: null, salida: null, vuelta: 0, finLisas: [] });
    const exLibris = useRef({ desde: 0, hasta: 0, inicio: 0, duracion: EXLIBRIS_IDA, valor: 0 });
    const giroExLibris = useRef(0);
    const [girosLisas] = useState(() => Array.from({ length: HOJAS_LISAS }, () => ({ current: 0 })));
    const estadoPrevio = useRef(false);

    useFrame((estado) => {
        const t = estado.clock.elapsedTime;
        const p = pase.current;
        const ex = exLibris.current;
        const sobre = activo.current;

        if (sobre !== estadoPrevio.current) {
            estadoPrevio.current = sobre;
            if (sobre) {
                p.entrada = t;
                p.salida = null;
                Object.assign(ex, { desde: ex.valor, hasta: 1, inicio: t, duracion: EXLIBRIS_IDA * (1 - ex.valor) + 0.001 });
            } else if (p.entrada !== null) {
                p.salida = t;
                let ultimo = t;
                p.finLisas = girosLisas.map((_, j) => {
                    const inicio = p.entrada + HOJA_INTERVALO * (j + 1);
                    if (t < inicio) return inicio - 1; // no había empezado: se queda
                    const fase = (t - inicio) % CICLO;
                    if (fase >= HOJA_DURACION) return t; // ya posada
                    const fin = t + (HOJA_DURACION - fase);
                    ultimo = Math.max(ultimo, fin);
                    return fin;
                });
                p.vuelta = ultimo + 0.04;
                Object.assign(ex, { desde: ex.valor, hasta: 0, inicio: p.vuelta, duracion: EXLIBRIS_VUELTA * ex.valor + 0.001 });
            }
        }

        const avance = THREE.MathUtils.clamp((t - ex.inicio) / ex.duracion, 0, 1);
        ex.valor = THREE.MathUtils.lerp(ex.desde, ex.hasta, facil(avance));
        // Con el libro abierto, la hoja del ex libris respira apenas.
        const respiro = (0.03 + 0.02 * Math.sin(t * 0.9)) * abierto.current;
        giroExLibris.current = ex.valor + (1 - ex.valor) * respiro;

        let enMovimiento = ex.valor > 0.002 || (p.salida !== null && t < p.vuelta);
        girosLisas.forEach((g, j) => {
            g.current = giroLisa(j, t, p);
            if (g.current > 0.0005) enMovimiento = true;
        });
        alMoverse(sobre || enMovimiento);
    });

    return (
        <>
            {girosLisas.map((giro, j) => (
                <Hoja
                    key={j}
                    anverso={materiales.hojaTexto}
                    reverso={materiales.hojaReverso}
                    apertura={apertura}
                    giro={giro}
                    zDerecha={0}
                    zIzquierda={SEPARACION}
                />
            ))}
            <Hoja
                anverso={materiales.hojaExLibris}
                reverso={materiales.hojaReverso}
                apertura={apertura}
                giro={giroExLibris}
                zDerecha={SEPARACION}
                zIzquierda={0}
            />
        </>
    );
}

// ---------- Cinta de seda ----------

const N_CINTA = 48;

function indicesCinta() {
    const indices = [];
    for (let i = 0; i < N_CINTA - 1; i += 1) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    return new Uint16Array(indices);
}

function CintaDeSeda({ cuerpo, abierto }) {
    const geo = useRef(null);
    const aux = useRef(null);
    const [datos] = useState(() => ({ posiciones: new Float32Array(N_CINTA * 2 * 3), indices: indicesCinta() }));

    useFrame((estado) => {
        if (!cuerpo.current || !geo.current) return;
        aux.current ??= {
            inicio: new THREE.Vector3(),
            curva: new THREE.CatmullRomCurve3([0, 1, 2, 3, 4].map(() => new THREE.Vector3())),
            punto: new THREE.Vector3(),
            tangente: new THREE.Vector3(),
            lado: new THREE.Vector3(),
            frente: new THREE.Vector3(0, 0, 1),
        };
        const { inicio, curva, punto, tangente, lado, frente } = aux.current;
        const t = estado.clock.elapsedTime;
        const o = abierto.current;
        // Abierto, la cinta sale de entre las páginas; cerrado, del canto inferior.
        inicio.set(0.06 * o, THREE.MathUtils.lerp(-H / 2 - 0.01, -H / 2 + 0.3, o), 0.012 * o);
        cuerpo.current.localToWorld(inicio);
        const salida = 0.06 + 0.12 * o;
        const [p0, p1, p2, p3, p4] = curva.points;
        p0.copy(inicio);
        p1.set(inicio.x + 0.04, inicio.y - 0.32, inicio.z + salida);
        p2.set(inicio.x + 0.16 + Math.sin(t * 0.8) * 0.05, inicio.y - 0.8, inicio.z + salida + 0.02);
        p3.set(inicio.x + 0.04 + Math.sin(t * 0.8 + 1) * 0.08, inicio.y - 1.2, inicio.z + salida * 0.6);
        p4.set(inicio.x + 0.12 + Math.sin(t * 0.8 + 2) * 0.1, inicio.y - 1.6, inicio.z);
        const pos = geo.current.attributes.position;
        for (let i = 0; i < N_CINTA; i += 1) {
            const u = i / (N_CINTA - 1);
            curva.getPoint(u, punto);
            curva.getTangent(u, tangente);
            lado.crossVectors(tangente, frente).normalize().multiplyScalar(0.055);
            pos.setXYZ(i * 2, punto.x - lado.x, punto.y - lado.y, punto.z - lado.z);
            pos.setXYZ(i * 2 + 1, punto.x + lado.x, punto.y + lado.y, punto.z + lado.z);
        }
        pos.needsUpdate = true;
        geo.current.computeVertexNormals();
    });

    return (
        <mesh frustumCulled={false} castShadow>
            <bufferGeometry ref={geo}>
                <bufferAttribute attach="attributes-position" args={[datos.posiciones, 3]} />
                <bufferAttribute attach="index" args={[datos.indices, 1]} />
            </bufferGeometry>
            <meshPhysicalMaterial color="#ebaa20" roughness={0.38} sheen={1} sheenColor="#fff1c9" sheenRoughness={0.4} side={THREE.DoubleSide} />
        </mesh>
    );
}

function Polvo() {
    const cantidad = 70;
    const ref = useRef(null);
    const [posiciones] = useState(() => {
        const azar = aleatorio(20260930);
        const p = new Float32Array(cantidad * 3);
        for (let i = 0; i < cantidad; i += 1) {
            p[i * 3] = (azar() - 0.5) * 6;
            p[i * 3 + 1] = (azar() - 0.5) * 4.5;
            p[i * 3 + 2] = (azar() - 0.5) * 2.5;
        }
        return p;
    });
    useFrame((_, delta) => {
        const pos = ref.current?.geometry.attributes.position;
        if (!pos) return;
        for (let i = 0; i < cantidad; i += 1) {
            let y = pos.getY(i) + delta * (0.05 + (i % 5) * 0.012);
            if (y > 2.3) y = -2.3;
            pos.setY(i, y);
        }
        pos.needsUpdate = true;
    });
    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[posiciones, 3]} />
            </bufferGeometry>
            <pointsMaterial color="#f4eee0" size={0.022} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
    );
}

function Libro({ puntero, progreso, alPrimerCuadro }) {
    const libro = useRef(null);
    const cuerpo = useRef(null);
    const izquierda = useRef(null);
    const derecha = useRef(null);
    const apertura = useRef(CERRADO); // semiángulo de las tapas
    const abierto = useRef(0); // 0 cerrado · 1 abierto
    const encima = useRef(false);
    const activo = useRef(false);
    const ocupado = useRef(false);
    const avisado = useRef(false);
    const marcarOcupado = (v) => { ocupado.current = v; };
    const tipoToque = useRef('mouse');

    // Táctil: tocar fuera del libro lo cierra.
    useEffect(() => {
        const fuera = (e) => {
            if (e.pointerType === 'touch' && !(e.target instanceof HTMLCanvasElement)) encima.current = false;
        };
        document.addEventListener('pointerdown', fuera, { passive: true });
        return () => document.removeEventListener('pointerdown', fuera);
    }, []);
    const { viewport } = useThree();
    const escala = Math.min(1, viewport.width / 4.4);

    const mat = useMemo(() => {
        const piel = texturaCuero();
        piel.mapa.repeat.set(1.2, 1.2);
        piel.relieve.repeat.set(1.2, 1.2);
        const cuero = new THREE.MeshPhysicalMaterial({
            map: piel.mapa,
            bumpMap: piel.relieve,
            bumpScale: 1.4,
            roughness: 0.62,
            clearcoat: 0.18,
            clearcoatRoughness: 0.55,
            sheen: 0.35,
            sheenColor: new THREE.Color('#4f8f7d'),
            side: THREE.DoubleSide,
        });
        const tapa = texturaPortada();
        const portada = new THREE.MeshStandardMaterial({
            map: tapa.mapa,
            bumpMap: tapa.relieve,
            bumpScale: 2,
            transparent: true,
            roughness: 0.5,
            metalness: 0.1,
            polygonOffset: true,
            polygonOffsetFactor: -2,
        });
        const papel = { roughness: 0.93, metalness: 0 };
        const cantoV = new THREE.MeshStandardMaterial({ map: texturaCanto(true), ...papel });
        const cantoH = new THREE.MeshStandardMaterial({ map: texturaCanto(false), ...papel });
        const dorso = new THREE.MeshStandardMaterial({ color: '#efe7d6', ...papel });
        const paginaDer = new THREE.MeshStandardMaterial({ map: texturaPagina(true), ...papel });
        const mapaIzq = texturaPagina(false);
        // Mismo modo de repetición que el reverso: así ambos comparten la
        // imagen ya dibujada y una sola subida a la GPU.
        mapaIzq.wrapS = THREE.RepeatWrapping;
        const paginaIzq = new THREE.MeshStandardMaterial({ map: mapaIzq, ...papel });
        // Las hojas que se pasan comparten el papel de las páginas de debajo.
        const hojaTexto = new THREE.MeshStandardMaterial({ map: paginaDer.map, side: THREE.FrontSide, shadowSide: THREE.DoubleSide, ...papel });
        const hojaExLibris = new THREE.MeshStandardMaterial({ map: texturaPagina(true, 'ex-libris'), side: THREE.FrontSide, shadowSide: THREE.DoubleSide, ...papel });
        // Reverso: la textura de la página izquierda invertida en X para leerse al derecho.
        const mapaReverso = mapaIzq.clone();
        mapaReverso.repeat.x = -1;
        const hojaReverso = new THREE.MeshStandardMaterial({ map: mapaReverso, side: THREE.BackSide, shadowSide: THREE.DoubleSide, ...papel });
        const tapaGeo = new RoundedBoxGeometry(ANCHO_TAPA, ALTO_TAPA, T, 3, 0.022);
        return {
            cuero,
            portada,
            tapaGeo,
            hojaTexto,
            hojaExLibris,
            hojaReverso,
            derecha: [cantoV, cantoV, cantoH, cantoH, paginaDer, dorso],
            izquierda: [cantoV, cantoV, cantoH, cantoH, paginaIzq, dorso],
            todos: [cuero, portada, cantoV, cantoH, dorso, paginaDer, paginaIzq, hojaTexto, hojaExLibris, hojaReverso],
            texturas: [piel.relieve, tapa.relieve],
        };
    }, []);
    useEffect(() => () => {
        mat.todos.forEach((m) => { m.map?.dispose(); m.dispose(); });
        mat.texturas.forEach((t) => t.dispose());
        mat.tapaGeo.dispose();
    }, [mat]);

    useFrame((estado, delta) => {
        const t = estado.clock.elapsedTime;
        const p = progreso.current;

        // Se abre con el cursor encima; se cierra cuando las hojas ya se posaron.
        const objetivo = encima.current || ocupado.current ? 1 : 0;
        abierto.current = THREE.MathUtils.damp(abierto.current, objetivo, objetivo ? 5 : 3.5, delta);
        if (Math.abs(abierto.current - objetivo) < 0.001) abierto.current = objetivo;
        const o = abierto.current;
        activo.current = encima.current && o > 0.94;

        const anguloAbierto = THREE.MathUtils.lerp(0.5, 0.2, suave(0, 0.8, p));
        apertura.current = THREE.MathUtils.lerp(CERRADO, anguloAbierto, facil(o));
        if (izquierda.current) izquierda.current.rotation.y = apertura.current;
        if (derecha.current) derecha.current.rotation.y = -apertura.current;

        // Cerrado, el libro gira para mostrar la portada y se centra.
        const c = 1 - facil(o);
        if (cuerpo.current) {
            cuerpo.current.rotation.y = (Math.PI / 2) * c;
            cuerpo.current.position.x = (-ANCHO_TAPA / 2) * c;
        }

        const g = libro.current;
        if (g) {
            g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -0.55 - puntero.current.y * 0.12 + p * 0.25, 3, delta);
            g.rotation.y = THREE.MathUtils.damp(g.rotation.y, puntero.current.x * 0.3, 3, delta);
            g.rotation.z = 0.04 * o;
            g.position.y = -0.02 + Math.sin(t * 0.6) * 0.035 + p * 0.3;
        }
        if (!avisado.current) {
            avisado.current = true;
            alPrimerCuadro?.();
        }
    });

    return (
        <group scale={escala}>
            <group ref={libro} position={[0, -0.02, 0]}>
                <group ref={cuerpo}>
                    <group ref={izquierda}>
                        <Mitad lado={-1} materiales={mat.izquierda} cuero={mat.cuero} tapaGeo={mat.tapaGeo} portada={mat.portada} />
                    </group>
                    <group ref={derecha}>
                        <Mitad lado={1} materiales={mat.derecha} cuero={mat.cuero} tapaGeo={mat.tapaGeo} />
                    </group>
                    <HojasQueSePasan materiales={mat} apertura={apertura} activo={activo} abierto={abierto} alMoverse={marcarOcupado} />
                    <Lomo apertura={apertura} cuero={mat.cuero} />
                </group>
                {/* Zona invisible que detecta el cursor sobre el libro. Con ratón o
                    lápiz se abre al pasar por encima; en pantallas táctiles (sin
                    hover) un toque lo abre y otro toque, o tocar fuera, lo cierra. */}
                <mesh
                    position={[0, 0, 0.3]}
                    onPointerOver={(e) => { if (e.pointerType !== 'touch') encima.current = true; }}
                    onPointerOut={(e) => { if (e.pointerType !== 'touch') encima.current = false; }}
                    onPointerDown={(e) => { tipoToque.current = e.pointerType; }}
                    onClick={() => { if (tipoToque.current === 'touch') encima.current = !encima.current; }}
                >
                    <boxGeometry args={[2 * ANCHO_TAPA + 0.2, ALTO_TAPA + 0.3, 1]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
                </mesh>
            </group>
            <CintaDeSeda cuerpo={cuerpo} abierto={abierto} />
        </group>
    );
}

// Reflejos suaves de una habitación: el cuero y el papel ganan volumen.
function Entorno() {
    const obtener = useThree((s) => s.get);
    useEffect(() => {
        const { gl, scene } = obtener();
        const pmrem = new THREE.PMREMGenerator(gl);
        const sala = new RoomEnvironment();
        const mapa = pmrem.fromScene(sala, 0.04).texture;
        scene.environment = mapa;
        scene.environmentIntensity = 0.3;
        return () => {
            scene.environment = null;
            mapa.dispose();
            pmrem.dispose();
            sala.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
        };
    }, [obtener]);
    return null;
}

// Si los primeros ~2 s van por debajo de 40 fps, baja la resolución.
function ControlRendimiento() {
    const setDpr = useThree((s) => s.setDpr);
    const medida = useRef({ cuadros: 0, tiempo: 0, hecho: false });
    useFrame((_, delta) => {
        const m = medida.current;
        if (m.hecho) return;
        m.cuadros += 1;
        m.tiempo += delta;
        if (m.tiempo > 2) {
            m.hecho = true;
            if (m.cuadros / m.tiempo < 40) setDpr(1);
        }
    });
    return null;
}

function Sombra() {
    const [mapa] = useState(texturaSombra);
    useEffect(() => () => mapa.dispose(), [mapa]);
    return (
        <mesh position={[0, -1.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[5.2, 3]} />
            <meshBasicMaterial map={mapa} transparent depthWrite={false} opacity={0.75} />
        </mesh>
    );
}

// Compila los shaders sin bloquear el hilo principal (KHR_parallel_shader_compile)
// antes del primer cuadro. Sin soporte, three compila igual en el primer cuadro.
function Precompilar({ alTerminar }) {
    const obtener = useThree((s) => s.get);
    useEffect(() => {
        let hecho = false;
        const terminar = () => {
            if (hecho) return;
            hecho = true;
            alTerminar();
        };
        const { gl, scene, camera } = obtener();
        const tope = setTimeout(terminar, 4000);
        Promise.resolve()
            .then(() => gl.compileAsync(scene, camera))
            .catch(() => {})
            .finally(() => {
                clearTimeout(tope);
                terminar();
            });
        return () => clearTimeout(tope);
    }, [obtener, alTerminar]);
    return null;
}

export default function HeroScene({ puntero, progreso, activo, alListo }) {
    const [compilado, setCompilado] = useState(false);
    const alCompilar = useCallback(() => setCompilado(true), []);
    return (
        <Canvas
            shadows="percentage"
            dpr={[1, 1.6]}
            frameloop={activo && compilado ? 'always' : 'never'}
            camera={{ fov: 28, position: [0, 0.1, 7.4] }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            aria-hidden="true"
        >
            <ControlRendimiento />
            <Entorno />
            <hemisphereLight args={['#fff7ec', '#013a33', 0.5]} />
            <directionalLight
                position={[2.5, 4.5, 5]}
                intensity={1.9}
                color="#fff1dc"
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-bias={-0.0004}
                shadow-normalBias={0.025}
                shadow-camera-left={-3}
                shadow-camera-right={3}
                shadow-camera-top={3}
                shadow-camera-bottom={-3}
                shadow-camera-near={1}
                shadow-camera-far={14}
            />
            <directionalLight position={[-4, 1.5, -2]} intensity={0.8} color="#9fe0cf" />
            <pointLight position={[-1.5, 1.2, 2.4]} intensity={2.2} distance={6} color="#fff0d8" />
            <Libro puntero={puntero} progreso={progreso} alPrimerCuadro={alListo} />
            <Polvo />
            <Sombra />
            {/* Al final: sus efectos corren cuando la escena (y el entorno) ya existen. */}
            {!compilado && <Precompilar alTerminar={alCompilar} />}
        </Canvas>
    );
}
