import {
    ACESFilmicToneMapping,
    AdditiveBlending,
    AmbientLight,
    BufferAttribute,
    BufferGeometry,
    CanvasTexture,
    Clock,
    CylinderGeometry,
    DirectionalLight,
    DoubleSide,
    FogExp2,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    PMREMGenerator,
    PointLight,
    Points,
    PointsMaterial,
    SRGBColorSpace,
    Scene,
    Sprite,
    SpriteMaterial,
    TextureLoader,
    Vector3,
    WebGLRenderer
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PortalEditorial, prepararDisolucion, crearTexturaLomo } from './portalEditorial';
import { estadoCinematico, estadoEncuadernacion, tramoCine, ENCUADERNACION } from './cinematografia';

const COLOR = { fondo: 0xf7f1e8, violeta: 0x6d4aff, azul: 0x568cff, papel: 0xf1e9d8, tapa: 0x1b1830 };

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
        for (let x = 0; x < w; x += 2) {
            g.fillStyle = `rgba(120,100,70,${0.05 + ((x * 37) % 7) / 70})`;
            g.fillRect(x, 0, 1, h);
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
        this.entrada = 0;
        this.puntero = { x: 0, y: 0, ox: 0, oy: 0 };
        this.reloj = new Clock();
        this.tiempo = 0;
        this.desechables = [];
        this.titulo = titulo;
        this.autor = autor;
        this.alDibujar = alDibujar;
        this.uniformeDisolver = { value: 0 };

        const r = new WebGLRenderer({ canvas, antialias: !movil, alpha: false, powerPreference: movil ? 'low-power' : 'high-performance' });
        r.setPixelRatio(Math.min(window.devicePixelRatio || 1, movil ? 1.15 : 1.25));
        r.outputColorSpace = SRGBColorSpace;
        r.toneMapping = ACESFilmicToneMapping;
        r.toneMappingExposure = 1.05;
        r.setClearColor(COLOR.fondo, 1);
        this.renderer = r;
        const gl = r.getContext(),
            info = gl.getExtension('WEBGL_debug_renderer_info');
        const dispositivo = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
        this.software = /swiftshader|llvmpipe|software|basic render/i.test(dispositivo);
        this.economico = movil || this.software;
        if (this.economico) r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.software ? Math.min(1, 900 / window.innerWidth) : 1.15));

        this.escena = new Scene();
        this.escena.fog = new FogExp2(COLOR.fondo, 0.012);
        this.camara = new PerspectiveCamera(compacto ? 42 : 34, 1, 0.1, 80);
        this.camara.position.set(0, 0, 10);

        this.crearLuces();
        const generador = new PMREMGenerator(r),
            sala = new RoomEnvironment();
        this.entorno = this.registrar(generador.fromScene(sala, 0.06));
        this.escena.environment = this.entorno.texture;
        this.escena.environmentIntensity = 0.45;
        sala.dispose();
        generador.dispose();
        this.portal = new PortalEditorial(r, this.economico, COLOR.fondo);
        if (this.software) {
            this.escena.environment = null;
        }
        this.escena.background = this.portal.destino.texture;
        this.crearLibro();
        this.crearPedestal();
        this.crearParticulas();
        this.crearBrillos();
        this.cargarPortada(portadaUrl, alCargarPortada);
    }

    registrar(...objetos) {
        this.desechables.push(...objetos);
        return objetos[0];
    }

    crearPedestal() {
        const piedra = this.registrar(texturaPiedra());
        const Fisico = this.software ? MeshStandardMaterial : MeshPhysicalMaterial;
        const pulido = this.software ? {} : { clearcoat: 1, clearcoatRoughness: 0.08 };

        this.matPedestal = this.registrar(new Fisico({ map: piedra, color: 0xf6ece0, roughness: 0.22, metalness: 0.02, transparent: true, ...pulido }));
        const matFuste = this.registrar(new Fisico({ map: piedra, color: 0xe9dccb, roughness: 0.35, metalness: 0.02, transparent: true, ...pulido }));
        const matOro = this.registrar(new MeshStandardMaterial({ color: 0xd9b26b, roughness: 0.18, metalness: 1, transparent: true, envMapIntensity: 1.6 }));
        const matLuz = this.registrar(new MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
        this.matsPedestal = [this.matPedestal, matFuste, matOro, matLuz];
        this.pedestal = new Group();
        const pieza = (geo, mat, y) => {
            const m = new Mesh(this.registrar(geo), mat);
            m.position.y = y;
            this.pedestal.add(m);
            return m;
        };

        pieza(new CylinderGeometry(1.86, 1.92, 0.1, 96), this.matPedestal, 0.12);
        pieza(new CylinderGeometry(1.93, 1.93, 0.025, 96), matOro, 0.055);
        const aro = pieza(new CylinderGeometry(1.7, 1.7, 0.006, 96, 1, true), matLuz, 0.175);
        aro.scale.set(1, 1, 1);

        pieza(new CylinderGeometry(2.08, 2.12, 0.12, 96), matFuste, -0.03);
        pieza(new CylinderGeometry(2.13, 2.13, 0.02, 96), matOro, -0.1);
        pieza(new CylinderGeometry(1.78, 1.95, 0.95, 48), matFuste, -0.58);

        pieza(new CylinderGeometry(2.3, 2.36, 0.14, 96), this.matPedestal, -1.1);
        this.escena.add(this.pedestal);
    }

    crearLuces() {
        const e = this.escena;
        e.add(new AmbientLight(0xf3ead8, 0.42));

        const clave = new DirectionalLight(0xfff2dd, 3.1);
        clave.position.set(-4.5, 5, 5);
        e.add(clave);
        const contorno = new DirectionalLight(0xffcf94, 1.5);
        contorno.position.set(5, 1.5, -3.5);
        e.add(contorno);
        const rebote = new DirectionalLight(0xcddcff, 0.95);
        rebote.position.set(2, -3, 4);
        e.add(rebote);
        this.luzVioleta = new PointLight(COLOR.violeta, 0, 18, 1.6);
        this.luzVioleta.position.set(-3, 0.2, -1.6);
        this.luzAzul = new PointLight(COLOR.azul, 0, 16, 1.6);
        this.luzAzul.position.set(3.2, -1.4, -1.5);
        this.luzInterior = new PointLight(0xb9a3ff, 0, 7, 1.8);
        e.add(this.luzVioleta, this.luzAzul, this.luzInterior);
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
        papel.color.set(0xe9e1cf);
        const canto = this.registrar(new MeshStandardMaterial({ map: this.registrar(texturaCanto()), roughness: 0.95 }));
        const MaterialTapa = this.software ? MeshStandardMaterial : MeshPhysicalMaterial;
        const barniz = this.software ? {} : { clearcoat: 0.22, clearcoatRoughness: 0.35 };
        const tapaNeutra = this.registrar(new MaterialTapa({ color: 0x161419, roughness: 0.48, metalness: 0, ...barniz }));

        const diamante = this.software
            ? {}
            : { clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.35, iridescenceIOR: 1.8, iridescenceThicknessRange: [200, 520], specularIntensity: 1 };
        this.matTapa = this.registrar(new MaterialTapa({ color: 0x242126, roughness: 0.32, metalness: 0, ...barniz, ...diamante }));
        const interiorTapa = this.registrar(new MeshStandardMaterial({ color: 0xe8dfcc, roughness: 0.9 }));
        this.matsLibro.push(papel, canto, tapaNeutra, this.matTapa, interiorTapa);
        const lomoTexto = this.registrar(crearTexturaLomo(CanvasTexture, this.titulo, this.autor));
        lomoTexto.colorSpace = SRGBColorSpace;
        const matLomo = this.registrar(new MeshStandardMaterial({ map: lomoTexto, roughness: 0.72 }));
        this.matsLibro.push(matLomo);
        this.matsLibro.forEach((m) => {
            m.transparent = true;
            prepararDisolucion(m, this.uniformeDisolver);
        });

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
                            [0, 'rgba(69,49,26,0.3)'],
                            [1, 'rgba(69,49,26,0)']
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

    crearParticulas() {
        const n = this.movil ? 160 : 440;
        const pos = new Float32Array(n * 3);
        this.velocidades = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const r = 3.2 + Math.random() * 11,
                a = Math.random() * Math.PI * 2,
                b = Math.acos(2 * Math.random() - 1);
            pos[i * 3] = r * Math.sin(b) * Math.cos(a);
            pos[i * 3 + 1] = r * Math.sin(b) * Math.sin(a) * 0.7;
            pos[i * 3 + 2] = r * Math.cos(b) - 2;
            this.velocidades[i] = 0.2 + Math.random();
        }
        const geo = this.registrar(new BufferGeometry());
        geo.setAttribute('position', new BufferAttribute(pos, 3));
        this.matParticulas = this.registrar(
            new PointsMaterial({
                size: this.movil ? 0.024 : 0.02,
                map: this.registrar(
                    texturaRadial([
                        [0, 'rgba(255,255,255,1)'],
                        [0.3, 'rgba(200,185,255,0.8)'],
                        [1, 'rgba(120,90,255,0)']
                    ])
                ),
                color: 0xcfc2ff,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                blending: AdditiveBlending,
                sizeAttenuation: true
            })
        );
        this.particulas = new Points(geo, this.matParticulas);
        this.escena.add(this.particulas);
    }

    crearBrillos() {
        const halo = this.registrar(
            texturaRadial([
                [0, 'rgba(214,196,255,0.95)'],
                [0.25, 'rgba(140,105,255,0.6)'],
                [1, 'rgba(109,74,255,0)']
            ])
        );
        this.brillo = new Sprite(this.registrar(new SpriteMaterial({ map: halo, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })));
        this.brillo.scale.setScalar(0.01);
        this.libro.add(this.brillo);

        const haz = this.registrar(
            texturaCanvas(512, 512, (g, w, h) => {
                const d = g.createLinearGradient(0, 0, w, h);
                d.addColorStop(0, 'rgba(255,255,255,0)');
                d.addColorStop(0.44, 'rgba(255,255,255,0)');
                d.addColorStop(0.49, 'rgba(255,255,255,.55)');
                d.addColorStop(0.5, 'rgba(235,245,255,.95)');
                d.addColorStop(0.51, 'rgba(255,255,255,.55)');
                d.addColorStop(0.56, 'rgba(255,255,255,0)');
                d.addColorStop(1, 'rgba(255,255,255,0)');
                g.fillStyle = d;
                g.fillRect(0, 0, w, h);
            })
        );
        this.haz = new Mesh(
            this.registrar(new PlaneGeometry(1, 1)),
            this.registrar(new MeshBasicMaterial({ map: haz, transparent: true, opacity: 0.5, depthWrite: false, blending: AdditiveBlending }))
        );
        this.libro.add(this.haz);
        const estrella = this.registrar(
            texturaCanvas(128, 128, (g, w, h) => {
                const c = w / 2;
                const r = g.createRadialGradient(c, c, 0, c, c, c);
                r.addColorStop(0, 'rgba(255,255,255,1)');
                r.addColorStop(0.12, 'rgba(235,245,255,.85)');
                r.addColorStop(0.35, 'rgba(200,220,255,.18)');
                r.addColorStop(1, 'rgba(255,255,255,0)');
                g.fillStyle = r;
                g.fillRect(0, 0, w, h);
                g.globalCompositeOperation = 'lighter';
                for (const [x0, y0, x1, y1] of [
                    [0, c, w, c],
                    [c, 0, c, h]
                ]) {
                    const l = g.createLinearGradient(x0, y0, x1, y1);
                    l.addColorStop(0, 'rgba(255,255,255,0)');
                    l.addColorStop(0.5, 'rgba(255,255,255,.95)');
                    l.addColorStop(1, 'rgba(255,255,255,0)');
                    g.strokeStyle = l;
                    g.lineWidth = 3;
                    g.beginPath();
                    g.moveTo(x0, y0);
                    g.lineTo(x1, y1);
                    g.stroke();
                }
            })
        );

        const puntos = [
            [-0.5, 0.5],
            [0.5, 0.5],
            [0.5, -0.5],
            [-0.5, -0.5],
            [0, 0.5],
            [0.5, 0.1],
            [-0.18, -0.5],
            [-0.5, -0.2],
            [0.28, 0.32],
            [-0.3, 0.18],
            [0.12, -0.3],
            [0.5, -0.32]
        ];
        this.destellos = puntos.slice(0, this.movil ? 7 : puntos.length).map(([u, v], i) => {
            const sprite = new Sprite(this.registrar(new SpriteMaterial({ map: estrella, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })));
            this.libro.add(sprite);
            return { sprite, u, v, fase: i * 1.7, vel: 1.1 + (i % 4) * 0.35, tam: 0.22 + (i % 3) * 0.08 };
        });
    }

    redimensionar(ancho, alto) {
        if (!ancho || !alto) return;
        this.ancho = ancho;
        this.alto = alto;
        this.renderer.setSize(ancho, alto, false);
        this.camara.aspect = ancho / alto;
        this.portal.redimensionar(ancho, alto);

        const distanciaAncho = this.medidas.W / (2 * Math.tan((this.camara.fov * Math.PI) / 360) * this.camara.aspect * 0.62);
        this.distanciaBase = Math.max(10, distanciaAncho);
        this.camara.updateProjectionMatrix();
    }

    setProgreso(p) {
        this.progreso = clamp(p);
    }
    setEntrada(e) {
        this.entrada = Math.max(this.entrada, clamp(e));
    }
    setPuntero(x, y) {
        this.puntero.x = clamp(x, -1, 1);
        this.puntero.y = clamp(y, -1, 1);
    }

    actualizar() {
        const dt = Math.min(this.reloj.getDelta(), 0.05);
        const t = (this.tiempo += dt);

        this.setEntrada(tramoCine(this.progreso, 0, 0.14));
        const estado = estadoCinematico(this.progreso, this.entrada);
        const { entrada: e, acercamiento: rot, apertura: abre, energia: luz, salida: sale, disolucion: funde } = estado;
        const { W } = this.medidas;

        const inercia = 1 - Math.exp(-2.8 * dt);
        this.puntero.ox += (this.puntero.x - this.puntero.ox) * inercia;
        this.puntero.oy += (this.puntero.y - this.puntero.oy) * inercia;
        const px = this.puntero.ox,
            py = this.puntero.oy;

        const L = this.libro;
        const base = this.distanciaBase || 10;
        const anchoEscena = 2 * base * Math.tan((this.camara.fov * Math.PI) / 360) * this.camara.aspect;
        const inicioX = this.compacto ? 0 : anchoEscena * 0.225;
        const inicioY = this.compacto ? 0.05 : 0.12;

        const reposoX = this.compacto ? 0 : anchoEscena * 0.17;
        const escalaReposo = this.compacto ? 0.74 : 0.94;

        const r = 1 - e;
        L.scale.setScalar(mezcla(0.32, escalaReposo, e) * mezcla(1, 1.12 / escalaReposo, rot) * mezcla(1, 0.91, abre));
        L.position.y = Math.sin(t * 0.65) * 0.022 + inicioY + rot * (this.compacto ? 0.25 : -0.05) - r * r * 1.4;
        L.position.x = this.compacto ? 0 : mezcla(inicioX * (1 - e) + reposoX * e, -1, rot) * (1 - abre) + abre * W * 0.12;
        L.position.z = -r * r * 6;
        L.rotation.y = mezcla(-0.62, -0.18, e) - r * Math.PI * 2.5 + rot * 0.42 - abre * 0.62 + px * 0.06 + Math.sin(t * 0.3) * 0.02;
        L.rotation.x = mezcla(0.08, 0.24, abre) + r * 0.45 - py * 0.05;
        L.rotation.z = mezcla(-0.04, 0.035, rot) + Math.sin(t * 0.4) * 0.006;
        const tope = inicioY - (this.medidas.H * 1.34) / 2 - 0.22 - L.position.y;
        this.pedestal.position.y = tope;
        const opacidadPedestal = (1 - tramoCine(rot, 0, 0.8)) * tramoCine(e, 0.35, 0.9);
        this.matPedestal.opacity = opacidadPedestal;
        this.matsPedestal.forEach((m, i) => {
            m.opacity = i === 3 ? opacidadPedestal * (0.6 + 0.3 * Math.sin(t * 1.4)) : opacidadPedestal;
        });
        this.pedestal.visible = this.matPedestal.opacity > 0.005;

        const encuadernacion = estadoEncuadernacion(0, this.hojas.length);
        this.bisagra.rotation.y = -encuadernacion.tapa;
        this.bloque.scale.z = encuadernacion.escalaBloque;
        this.bloque.position.z = (-(this.medidas.T - 0.09) / 2) * (1 - encuadernacion.escalaBloque);
        this.hojas.forEach((piv, i) => {
            const movimiento = encuadernacion.hojas[i];
            piv.rotation.y = -movimiento.angulo;
            const g = piv.children[0].geometry,
                original = g.userData.original;
            const posiciones = g.attributes.position,
                normales = g.attributes.normal,
                w = g.userData.ancho,
                h = g.userData.alto;
            const curvatura = movimiento.curvatura;
            for (let j = 0; j < posiciones.count; j++) {
                const x = original[j * 3],
                    y = original[j * 3 + 1],
                    u = (x + w / 2) / w;
                const ondulacion = 1 + 0.06 * Math.sin((Math.PI * y) / h);
                posiciones.setZ(j, -curvatura * Math.sin(u * Math.PI) * ondulacion);
                const nx = ((curvatura * Math.PI) / w) * Math.cos(u * Math.PI) * ondulacion;
                const ny = ((curvatura * Math.sin(u * Math.PI) * 0.06 * Math.PI) / h) * Math.cos((Math.PI * y) / h);
                const longitud = Math.sqrt(1 + nx * nx + ny * ny);
                normales.setXYZ(j, nx / longitud, ny / longitud, 1 / longitud);
            }
            posiciones.needsUpdate = true;
            normales.needsUpdate = true;
        });

        this.uniformeDisolver.value = 0;
        const visible = 1 - funde;
        this.matsLibro.forEach((m) => {
            m.opacity = visible;
            m.depthWrite = funde < 0.5;
        });
        L.visible = funde < 0.995;

        this.pedestal.position.x = L.position.x;
        this.pedestal.position.z = L.position.z - 0.3;

        this.luzVioleta.intensity = e * mezcla(8, 15, luz) * (1 - sale);
        this.luzAzul.intensity = e * mezcla(3, 7, rot) * (1 - sale);
        this.luzInterior.intensity = luz * 12 * (1 - sale);
        this.luzInterior.position.set(L.position.x * 0.3, L.position.y, 0.9);
        this.portal.actualizar(t, e, luz, sale, abre);

        this.brillo.position.set(-W * 0.02, 0, this.medidas.T / 2 + 0.25);
        this.brillo.scale.setScalar(0.05 + luz * 1.2);
        this.brillo.material.opacity = luz * 0.12 * (1 - sale) * visible;

        const enteroVisible = e > 0.05;
        const { W: anchoTapa, H: altoTapa, T: grosor } = this.medidas;
        this.haz.visible = enteroVisible && funde < 0.99;
        if (enteroVisible) {
            const ciclo = (t * 0.22) % 1.6;
            this.haz.scale.set(anchoTapa, altoTapa, 1);
            this.haz.position.set(0, 0, grosor / 2 + 0.03);
            this.haz.material.map.offset.set(1 - ciclo * 1.5, 0);
            this.haz.material.opacity = 0.45 * e * visible;
        }
        for (const d of this.destellos) {
            const pulso = Math.pow(Math.max(0, Math.sin(t * d.vel + d.fase)), 10);
            d.sprite.visible = enteroVisible && funde < 0.99 && pulso > 0.01;
            if (!d.sprite.visible) continue;
            d.sprite.position.set(d.u * anchoTapa, d.v * altoTapa, grosor / 2 + 0.06);
            d.sprite.scale.setScalar(d.tam * (0.35 + pulso));
            d.sprite.material.opacity = pulso * e * visible;
        }

        this.particulas.rotation.y = t * 0.012 + px * 0.06;
        this.particulas.rotation.x = py * 0.04;
        this.particulas.scale.setScalar(1 + luz * 1.6);
        this.matParticulas.opacity = e * mezcla(0.22, 0.55, luz) * (1 - sale);

        this.sombra.material.opacity = e * (1 - abre * 0.7) * (1 - luz);
        this.sombra.position.set(L.position.x, L.position.y - this.medidas.H / 2 - 0.62, L.position.z - 0.35);

        const c = this.camara;
        c.position.z = mezcla(base + 1.8, base, e) - rot * 0.65 - abre * 0.5 - luz * 1.4;
        c.position.x = px * 0.12 + rot * 0.32 * (1 - abre) + L.position.x * abre * 0.7;
        c.position.y = py * 0.12 + rot * 0.22 + abre * 0.75 * (1 - luz);
        c.lookAt(L.position.x * mezcla(0, 0.85, abre), L.position.y * rot * 0.5, 0);
        this.renderer.toneMappingExposure = 1.05;
        return { ...estado, tapa: encuadernacion.tapa, hojas: encuadernacion.hojas.map((h) => h.angulo) };
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
        this.portal.dibujar();

        this.renderer.render(this.escena, this.camara);
        if (this.alDibujar && this.progreso < 0.26) {
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
        this.portal.destruir();
        this.desechables.forEach((o) => o?.dispose?.());
        this.desechables = [];
        this.escena.clear();
        this.renderer.dispose();
        this.renderer.forceContextLoss?.();
    }
}
