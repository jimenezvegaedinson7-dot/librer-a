import {
    ACESFilmicToneMapping,
    AmbientLight,
    CanvasTexture,
    Clock,
    CylinderGeometry,
    DirectionalLight,
    DoubleSide,
    Group,
    HemisphereLight,
    Mesh,
    MeshBasicMaterial,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    SRGBColorSpace,
    Scene,
    TextureLoader,
    Vector3,
    WebGLRenderer
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { crearTexturaLomo } from './portalEditorial';
import { amortiguarProgreso, estadoCinematico, estadoEncuadernacion, tramoCine, ENCUADERNACION } from './cinematografia';
import { poseInicialLibro } from './poseLibro';


const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const mezcla = (a, b, t) => a + (b - a) * t;

function texturaCanvas(ancho, alto, dibujar) {
    const c = document.createElement('canvas');
    c.width = ancho;
    c.height = alto;
    dibujar(c.getContext('2d'), ancho, alto);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
}

function texturaRadial(colores) {
    return texturaCanvas(256, 256, (g, w, h) => {
        const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        colores.forEach(([p, c]) => r.addColorStop(p, c));
        g.fillStyle = r;
        g.fillRect(0, 0, w, h);
    });
}

function texturaCanto() {
    return texturaCanvas(64, 256, (g, w, h) => {
        g.fillStyle = '#efe6d3';
        g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 2) {
            g.fillStyle = `rgba(120,100,70,${0.04 + ((y * 37) % 7) / 140})`;
            g.fillRect(0, y, w, 1);
        }
    });
}

function texturaPapel() {
    return texturaCanvas(256, 384, (g, w, h) => {
        g.fillStyle = '#f4eddd';
        g.fillRect(0, 0, w, h);
        const sombra = g.createLinearGradient(0, 0, w, 0);
        sombra.addColorStop(0, 'rgba(90,70,40,0.22)');
        sombra.addColorStop(0.12, 'rgba(90,70,40,0)');
        g.fillStyle = sombra;
        g.fillRect(0, 0, w, h);
        let semilla = 3;
        for (let i = 0; i < 900; i++) {
            semilla = (semilla * 16807) % 2147483647;
            const x = semilla % w;
            semilla = (semilla * 16807) % 2147483647;
            const y = semilla % h;
            g.fillStyle = 'rgba(120,100,70,0.05)';
            g.fillRect(x, y, 1, 1);
        }
    });
}

function texturaPiedra() {
    return texturaCanvas(256, 256, (g, w, h) => {
        g.fillStyle = '#e6d5b9';
        g.fillRect(0, 0, w, h);
        let semilla = 37;
        for (let i = 0; i < 18000; i++) {
            semilla = (semilla * 16807) % 2147483647;
            const x = semilla % w;
            semilla = (semilla * 16807) % 2147483647;
            g.fillStyle = i % 3 ? 'rgba(116,89,57,.10)' : 'rgba(255,250,237,.45)';
            g.fillRect(x, semilla % h, 1 + (i % 2), 1);
        }
    });
}

export default class EscenaLibro {
    constructor(canvas, { portadaUrl, titulo = '', autor = '', movil = false, compacto = movil, alCargarPortada, alDibujar } = {}) {
        this.canvas = canvas;
        this.movil = movil;
        this.compacto = compacto;
        this.progreso = 0;
        this.objetivoProgreso = 0;
        this.entrada = 0;
        this.puntero = { x: 0, y: 0, ox: 0, oy: 0 };
        this.reloj = new Clock();
        this.tiempo = 0;
        this.animando = false;
        this.desechables = [];
        this.titulo = titulo;
        this.autor = autor;
        this.alDibujar = alDibujar;

        const r = new WebGLRenderer({ canvas, antialias: !movil, alpha: true, powerPreference: movil ? 'low-power' : 'high-performance' });
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, movil ? 1.15 : 1.25));
        r.outputColorSpace = SRGBColorSpace;
        r.toneMapping = ACESFilmicToneMapping;
        r.toneMappingExposure = 1.12;
        r.setClearColor(0x000000, 0);
        this.renderer = r;
        const gl = r.getContext(),
            info = gl.getExtension('WEBGL_debug_renderer_info');
        const dispositivo = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
        this.software = /swiftshader|llvmpipe|software|basic render/i.test(dispositivo);
        this.economico = movil || this.software;
        if (this.economico) r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.software ? Math.min(0.85, 600 / window.innerWidth) : 1.15));

        this.escena = new Scene();
        this.camara = new PerspectiveCamera(compacto ? 42 : 34, 1, 0.1, 80);
        this.camara.position.set(0, 0, 10);

        this.crearLuces();
        this.crearLibro();
        this.encuadernacion = estadoEncuadernacion(0, this.hojas.length);
        this.hojasCerradas = this.encuadernacion.hojas.map((hoja) => hoja.angulo);
        this.crearPedestal();
        this.portadaLista = new Promise((resolver) =>
            this.cargarPortada(portadaUrl, (correcta) => {
                alCargarPortada?.(correcta);
                resolver(correcta);
            })
        );
    }

    async preparar() {
        if (!(await this.portadaLista) || this.destruida) return false;
        this.actualizar();
        await this.renderer.compileAsync(this.escena, this.camara);
        return !this.destruida;
    }

    registrar(...objetos) {
        this.desechables.push(...objetos);
        return objetos[0];
    }

    crearPedestal() {
        const piedra = this.registrar(texturaPiedra());
        const Fisico = this.software ? MeshStandardMaterial : MeshPhysicalMaterial;
        const pulido = this.software ? {} : { clearcoat: 0.08, clearcoatRoughness: 0.85 };

        this.matPedestal = this.registrar(new Fisico({ map: piedra, color: 0x1b2b3a, roughness: 0.82, metalness: 0, transparent: true, ...pulido }));
        const matFuste = this.registrar(new Fisico({ map: piedra, color: 0x101b27, roughness: 0.85, metalness: 0, transparent: true, ...pulido }));
        const matOro = this.registrar(new MeshStandardMaterial({ color: 0xc6a15b, roughness: 0.45, metalness: 0.35, transparent: true }));
        this.matsPedestal = [this.matPedestal, matFuste, matOro];
        this.pedestal = new Group();
        const pieza = (geo, mat, y) => {
            const m = new Mesh(this.registrar(geo), mat);
            m.position.y = y;
            this.pedestal.add(m);
            return m;
        };

        pieza(new CylinderGeometry(1.86, 1.92, 0.1, 96), this.matPedestal, 0.12);
        pieza(new CylinderGeometry(1.93, 1.93, 0.025, 96), matOro, 0.055);
        pieza(new CylinderGeometry(2.08, 2.12, 0.12, 96), matFuste, -0.03);
        this.escena.add(this.pedestal);
    }

    crearLuces() {
        const e = this.escena;
        e.add(new AmbientLight(0xb8cad9, 0.28));
        e.add(new HemisphereLight(0xdce7f2, 0x101b26, 0.55));

        const clave = new DirectionalLight(0xffe6b8, 2.2);
        clave.position.set(-4.5, 6, 5);
        e.add(clave);
        const contorno = new DirectionalLight(0xc6a15b, 1.35);
        contorno.position.set(5, 1.5, -3.5);
        e.add(contorno);
        const rebote = new DirectionalLight(0xafc0cc, 0.6);
        rebote.position.set(2, -3, 4);
        e.add(rebote);
    }

    crearLibro() {
        const H = 3.2,
            W = H * (2 / 3),
            T = 0.32;
        this.medidas = { H, W, T };
        this.libro = new Group();
        this.escena.add(this.libro);

        const papel = this.registrar(new MeshStandardMaterial({ map: this.registrar(texturaPapel()), roughness: 0.92, side: DoubleSide }));
        this.matPapel = papel;
        this.matsLibro = [];
        papel.color.set(0xf1e8da);
        const canto = this.registrar(new MeshStandardMaterial({ map: this.registrar(texturaCanto()), roughness: 0.95 }));
        const MaterialTapa = this.software ? MeshStandardMaterial : MeshPhysicalMaterial;
        const barniz = this.software ? {} : { clearcoat: 0.12, clearcoatRoughness: 0.62 };
        const tapaNeutra = this.registrar(new MaterialTapa({ color: 0x101b27, roughness: 0.52, metalness: 0, ...barniz }));

        this.matTapa = this.registrar(new MaterialTapa({ color: 0x17222f, roughness: 0.52, metalness: 0, ...barniz }));
        const interiorTapa = this.registrar(new MeshStandardMaterial({ color: 0xd8cbb6, roughness: 0.9 }));
        this.matsLibro.push(papel, canto, tapaNeutra, this.matTapa, interiorTapa);
        const lomoTexto = this.registrar(crearTexturaLomo(CanvasTexture, this.titulo, this.autor));
        lomoTexto.colorSpace = SRGBColorSpace;
        const matLomo = this.registrar(new MeshStandardMaterial({ map: lomoTexto, roughness: 0.72 }));
        this.matsLibro.push(matLomo);

        this.bloque = new Mesh(this.registrar(new RoundedBoxGeometry(W - 0.09, H - 0.1, T - 0.09, 2, 0.014)), [canto, canto, canto, canto, papel, papel]);
        this.bloque.position.set(0.02, 0, 0);
        const contratapa = new Mesh(this.registrar(new RoundedBoxGeometry(W, H, 0.045, 3, 0.019)), tapaNeutra);
        contratapa.position.set(0, 0, -T / 2 + 0.022);
        const lomo = new Mesh(this.registrar(new CylinderGeometry(T * 0.52, T * 0.52, H, 24, 1)), matLomo);
        lomo.position.set(-W / 2 + 0.08, 0, 0);
        this.contratapa = contratapa;
        this.lomo = lomo;
        this.libro.add(this.bloque, contratapa, lomo);

        this.bisagra = new Group();
        this.bisagra.position.set(-W / 2, 0, T / 2 - 0.022);
        this.tapa = new Mesh(this.registrar(new RoundedBoxGeometry(W, H, 0.045, 3, 0.019)), [tapaNeutra, tapaNeutra, tapaNeutra, tapaNeutra, this.matTapa, interiorTapa]);
        this.tapa.position.x = W / 2;
        this.bisagra.add(this.tapa);
        this.libro.add(this.bisagra);

        this.hojas = [];
        const total = this.movil ? 9 : 16;
        for (let i = 0; i < total; i++) {
            const piv = new Group();
            piv.visible = false;
            const orden = total === 1 ? 0 : i / (total - 1);
            piv.position.set(-W / 2 + ENCUADERNACION.offsetLomo, 0, T / 2 - ENCUADERNACION.offsetPrimeraHoja - orden * ENCUADERNACION.profundidadHojas);
            const geoHoja = this.registrar(new PlaneGeometry(W - 0.14, H - 0.16, this.movil ? 14 : 24, this.movil ? 3 : 5));
            geoHoja.userData.original = new Float32Array(geoHoja.attributes.position.array);
            geoHoja.userData.ancho = W - 0.14;
            geoHoja.userData.alto = H - 0.16;
            const hoja = new Mesh(geoHoja, papel);
            hoja.position.x = (W - 0.14) / 2;
            piv.add(hoja);
            this.libro.add(piv);
            this.hojas.push(piv);
        }

        const sombra = new Mesh(
            this.registrar(new PlaneGeometry(4.4, 2)),
            this.registrar(
                new MeshBasicMaterial({
                    map: this.registrar(
                        texturaRadial([
                            [0, 'rgba(0,0,0,0.55)'],
                            [1, 'rgba(0,0,0,0)']
                        ])
                    ),
                    transparent: true,
                    depthWrite: false
                })
            )
        );
        sombra.rotation.x = -Math.PI / 2;
        sombra.position.y = -H / 2 - 0.62;
        this.sombra = sombra;
        this.escena.add(sombra);
    }

    cargarPortada(url, alCargar) {
        if (!url) {
            alCargar?.(false);
            return;
        }
        const cargador = new TextureLoader();
        cargador.setCrossOrigin('anonymous');
        cargador.load(
            url,
            (tex) => {
                if (this.destruida) {
                    tex.dispose();
                    return;
                }
                tex.colorSpace = SRGBColorSpace;
                tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
                this.registrar(tex);
                this.matTapa.map = tex;
                this.matTapa.color.set(0xffffff);
                this.matTapa.needsUpdate = true;
                const img = tex.image;
                const aspecto = img && img.width && img.height ? img.width / img.height : 2 / 3;
                this.ajustarProporcion(aspecto);
                this.redimensionar(this.ancho, this.alto);
                alCargar?.(true);
            },
            undefined,
            () => {
                if (!this.destruida) alCargar?.(false);
            }
        );
    }

    ajustarProporcion(aspecto) {
        const { H } = this.medidas;
        const W = H * aspecto;
        const f = W / (H * (2 / 3));
        this.bloque.scale.x = f;
        this.bloque.position.x = 0.02 * f;
        this.contratapa.scale.x = f;
        this.lomo.position.x = -W / 2 + 0.08;
        this.bisagra.position.x = -W / 2;
        this.tapa.scale.x = f;
        this.tapa.position.x = W / 2;
        this.hojas.forEach((piv) => {
            const hoja = piv.children[0];
            hoja.scale.x = f;
            hoja.position.x = ((H * (2 / 3) - 0.14) * f) / 2;
            piv.position.x = -W / 2 + ENCUADERNACION.offsetLomo * f;
        });
        this.medidas.W = W;
    }

    redimensionar(ancho, alto) {
        if (!ancho || !alto) return;
        this.ancho = ancho;
        this.alto = alto;
        this.renderer.setSize(ancho, alto, false);
        this.camara.aspect = ancho / alto;

        this.poseInicial = poseInicialLibro(ancho, alto, this.medidas.W / this.medidas.H, this.compacto);
        this.distanciaBase = this.poseInicial.distancia;
        this.camara.fov = this.poseInicial.fov;
        this.camara.updateProjectionMatrix();
    }

    setProgreso(p) {
        this.objetivoProgreso = clamp(p);
    }
    setEntrada(e) {
        this.entrada = Math.max(this.entrada, clamp(e));
    }
    setAnimando(animando) {
        this.animando = animando;
        this.reloj.getDelta();
    }
    setPuntero(x, y) {
        this.puntero.x = clamp(x, -1, 1);
        this.puntero.y = clamp(y, -1, 1);
    }
    setDestinoFinal(destino) {
        if (destino?.ancho > 0 && destino?.alto > 0) this.destinoFinal = destino;
    }

    actualizar() {
        const dt = Math.min(this.reloj.getDelta(), 0.05);
        const t = this.animando ? (this.tiempo += dt) : this.tiempo;
        if (this.animando) this.progreso = amortiguarProgreso(this.progreso, this.objetivoProgreso, dt);

        this.setEntrada(tramoCine(this.progreso, 0, 0.14));
        const estado = estadoCinematico(this.progreso, this.entrada);
        const { entrada: e, acercamiento: rot, apertura: abre, energia: luz, disolucion: funde } = estado;
        const { W } = this.medidas;

        const inercia = this.animando ? 1 - Math.exp(-14 * dt) : 0;
        this.puntero.ox += (this.puntero.x - this.puntero.ox) * inercia;
        this.puntero.oy += (this.puntero.y - this.puntero.oy) * inercia;
        const px = this.puntero.ox,
            py = this.puntero.oy;

        const L = this.libro;
        const base = this.distanciaBase || 10;
        const anchoEscena = 2 * base * Math.tan((this.camara.fov * Math.PI) / 360) * this.camara.aspect;
        const inicioX = this.compacto ? 0 : anchoEscena * 0.225;
        const inicioY = this.poseInicial.y;

        const reposoX = this.poseInicial.x;
        const escalaReposo = this.poseInicial.escala;

        const r = 1 - e;
        const vida = tramoCine(t, 0, 0.8);
        L.scale.setScalar(mezcla(0.32, escalaReposo, e) * mezcla(1, 1.12 / escalaReposo, rot) * mezcla(1, 0.91, abre));
        L.position.y = Math.sin(t * 0.8) * 0.014 * vida + inicioY + rot * (this.compacto ? 0.2 : -0.05) - r * r * 1.4;
        L.position.x = this.compacto ? 0 : mezcla(inicioX * (1 - e) + reposoX * e, -1, rot) * (1 - abre) + abre * W * 0.12;
        L.position.z = -r * r * 6;
        L.rotation.y = mezcla(-0.62, this.poseInicial.rotacion.y, e) - r * Math.PI * 2.5 + rot * 0.42 - abre * 0.62 + px * 0.035 + Math.sin(t * 0.3) * 0.012 * vida;
        L.rotation.x = mezcla(this.poseInicial.rotacion.x, 0.16, abre) + r * 0.45 - py * 0.025;
        L.rotation.z = mezcla(this.poseInicial.rotacion.z, 0.035, rot) + Math.sin(t * 0.4) * 0.008 * vida;
        const tope = inicioY - (this.medidas.H * escalaReposo) / 2 - 0.2;
        this.pedestal.position.y = tope;
        const opacidadPedestal = (1 - tramoCine(rot, 0, 0.8)) * tramoCine(e, 0.35, 0.9);
        this.matPedestal.opacity = opacidadPedestal;
        this.matsPedestal.forEach((m) => {
            m.opacity = opacidadPedestal;
        });
        this.pedestal.visible = this.matPedestal.opacity > 0.005;

        L.visible = funde < 0.995;

        this.pedestal.position.x = L.position.x;
        this.pedestal.position.z = L.position.z - 0.3;

        this.sombra.material.opacity = e * (1 - abre * 0.7) * (1 - luz);
        this.sombra.position.set(L.position.x, this.pedestal.position.y + 0.18, L.position.z - 0.35);

        const c = this.camara;
        c.position.z = mezcla(base + 1.8, base, e) - rot * 0.35 - abre * 0.2 - luz * 0.3;
        c.position.x = px * 0.05 + rot * 0.24 * (1 - abre) + L.position.x * abre * 0.7;
        c.position.y = py * 0.05 + rot * 0.16 + abre * 0.45 * (1 - luz);
        const encajar = this.destinoFinal ? tramoCine(this.progreso, 0.56, 0.76) : 0;
        const encaje = encajar * encajar * (3 - 2 * encajar);
        if (encaje > 0) {
            const { H, T } = this.medidas;
            const focal = this.alto / (2 * Math.tan((c.fov * Math.PI) / 360));
            const altura = Math.min(this.destinoFinal.alto, this.destinoFinal.ancho * H / W);
            const frente = T / 2 + 0.0005;
            const escala = altura * base / (focal * H + altura * frente);
            const profundidad = base - frente * escala;
            const x = (this.destinoFinal.x - this.ancho / 2) * profundidad / focal;
            const y = (this.alto / 2 - this.destinoFinal.y) * profundidad / focal;
            L.scale.setScalar(mezcla(L.scale.x, escala, encaje));
            L.position.x = mezcla(L.position.x, x, encaje);
            L.position.y = mezcla(L.position.y, y, encaje);
            L.rotation.set(L.rotation.x * (1 - encaje), L.rotation.y * (1 - encaje), L.rotation.z * (1 - encaje));
            c.position.x *= 1 - encaje;
            c.position.y *= 1 - encaje;
            c.position.z = mezcla(c.position.z, base, encaje);
            this.sombra.material.opacity *= 1 - encaje;
        }
        c.lookAt(L.position.x * mezcla(0, 0.85, abre) * (1 - encaje), L.position.y * rot * 0.5 * (1 - encaje), 0);
        this.renderer.toneMappingExposure = 1.12;
        return { ...estado, tapa: this.encuadernacion.tapa, hojas: this.hojasCerradas };
    }

    dibujar() {
        if (this.destruida) return;
        const ahora = performance.now();
        if (!this.economico && this.ultimoDibujo && this.tiempo > 1.8 && !this.calidadAjustada) {
            this.intervalos = this.intervalos || [];
            this.intervalos.push(ahora - this.ultimoDibujo);
            if (this.intervalos.length >= 15) {
                const promedio = this.intervalos.reduce((a, b) => a + b, 0) / this.intervalos.length;
                if (promedio > 25) {
                    this.renderer.setPixelRatio(1);
                    this.redimensionar(this.ancho, this.alto);
                    this.calidadAjustada = true;
                }
                this.intervalos = [];
            }
        }
        this.ultimoDibujo = ahora;
        const estado = this.actualizar();

        this.renderer.render(this.escena, this.camara);
        if (this.alDibujar && this.progreso < 0.14) {
            const { W, H, T } = this.medidas,
                puntos = [];
            for (const x of [-W / 2, W / 2])
                for (const y of [-H / 2, H / 2])
                    for (const z of [-T / 2, T / 2]) {
                        const v = new Vector3(x, y, z).applyMatrix4(this.libro.matrixWorld).project(this.camara);
                        puntos.push({ x: (v.x * 0.5 + 0.5) * this.ancho, y: (-0.5 * v.y + 0.5) * this.alto });
                    }
            this.alDibujar(puntos, this.ancho, this.alto);
        }
        this.estadoDibujado = estado;
        return estado;
    }

    destruir() {
        if (this.destruida) return;
        this.destruida = true;
        this.desechables.forEach((o) => o?.dispose?.());
        this.desechables = [];
        this.escena.clear();
        this.renderer.dispose();
        this.renderer.forceContextLoss?.();
    }
}
