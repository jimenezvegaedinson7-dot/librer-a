import {
    BufferAttribute, Color, Data3DTexture, Group, IcosahedronGeometry, LinearFilter, OctahedronGeometry, RedFormat, RepeatWrapping, SRGBColorSpace, UnsignedByteType,
    Mesh, MeshPhysicalMaterial, MeshStandardMaterial,
    OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderTarget,
} from 'three';

// Campo de densidad tridimensional, calculado a resolución acotada. No se
// superponen imágenes de humo: el rayo atraviesa un volumen con turbulencia.
const VERTEX = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform float uTime,uAspect,uEnergy,uEntry,uExit;
uniform vec3 uPapel;
uniform highp sampler3D uRuido;
float fbm(vec3 p){return texture(uRuido,p*.045).r*.65+texture(uRuido,p*.093+vec3(.2)).r*.35;}
void main(){
 vec2 uv=(vUv-.5)*vec2(uAspect,1.);
 // Luz de ventana oblicua sobre un estudio de papel hueso, como la
 // referencia: bandas anchas y suaves, nunca rayas dibujadas sobre la UI.
 float ventana=smoothstep(.38,.85,.5+.5*sin(vUv.x*13.+vUv.y*9.));
 float lateral=smoothstep(.35,1.,vUv.x)*.09;
 float suelo=1.-smoothstep(.05,.28,vUv.y);
 vec3 base=mix(uPapel,vec3(.66,.49,.32),ventana*.14+lateral);
 base=mix(base,uPapel,suelo*.45);
 float radius=mix(1.35,4.8,uEnergy);
 vec3 ray=normalize(vec3(uv*.28,-1.));
 vec3 origin=vec3(uv*5.8,3.1);
 vec3 sum=vec3(0.); float absorption=0.;
 for(int i=0;i<VOLUME_STEPS;i++){
   vec3 q=origin+ray*(float(i)*6./float(VOLUME_STEPS));
   float angle=uTime*.045+q.z*.32;
   q.xy=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*q.xy;
   float n=fbm(q*2.1+vec3(0.,uTime*.055,uTime*.025));
   float r=length(q.xy);
   float fold=sin(atan(q.y,q.x)*3.+q.z*.9+uTime*.08)*.12;
   float shell=length(vec2(r-radius-fold, q.z*.7));
   float density=exp(-shell*shell*mix(4.5,1.05,uEnergy))*(.2+.8*n);
   density*=mix(.12,.83,uEnergy)*uEntry;
   vec3 tint=mix(vec3(.18,.105,.35),vec3(.63,.35,.88),n);
   sum+=(1.-absorption)*density*tint*.31;
   absorption+=density*.12;
 }
 float heart=exp(-dot(uv,uv)*9.)*uEnergy*.12;
 // La atmósfera se deposita sobre papel claro: nunca vuelve al negro
 // al abrir, disolver el libro o salir. El volumen permanece sutil.
 vec3 color=mix(base,vec3(.53,.42,.32),clamp(absorption*.13,0.,.12));
 color+=sum*.045+vec3(.12,.08,.04)*heart;
 float vignette=smoothstep(.25,1.3,length(uv));
 color=mix(color,base,vignette*.64);
 color=mix(color,base,uExit);
 gl_FragColor=vec4(color,1.);
}`;

// Cristales tallados que orbitan el libro: talla diamante (octaedro
// alargado) y gema facetada (icosaedro), con sombreado plano para que
// cada faceta devuelva su propio reflejo. Posiciones deterministas.
function azar(semilla) { let x = semilla; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
function crearCristales(cantidad) {
    const r = azar(4211);
    const tallas = [new OctahedronGeometry(1, 0), new IcosahedronGeometry(1, 0)];
    tallas[0].scale(.62, 1, .62);
    // Dispersión de diamante: cada faceta devuelve un matiz distinto del
    // espectro (rosa, cian, lila, oro y blanco), visible en todo equipo.
    const espectro = [[1, .86, .94], [.82, .96, 1], [.9, .86, 1], [1, .95, .8], [1, 1, 1], [.84, 1, .93]];
    tallas.forEach((g, k) => {
        const n = g.attributes.position.count, colores = new Float32Array(n * 3);
        for (let i = 0; i < n; i += 3) {
            const c = espectro[(i / 3 + k * 2) % espectro.length];
            for (let j = 0; j < 3; j++) colores.set(c, (i + j) * 3);
        }
        g.setAttribute('color', new BufferAttribute(colores, 3));
    });
    const cristales = Array.from({ length: cantidad }, (_, i) => ({
        talla: i % 3 === 0 ? 1 : 0,
        radio: 2.15 + r() * 1.5,
        angulo: (i / cantidad) * Math.PI * 2 + r() * .4,
        altura: (r() - .5) * 2.6,
        profundidad: -.4 + (r() - .5) * 1.6,
        velocidad: (.06 + r() * .1) * (i % 2 ? 1 : -1) * .7,
        tamano: .07 + Math.pow(r(), 2) * .2,
        giro: [r() * 1.2 + .3, r() * 1.4 + .3, r() * .8],
        fase: r() * Math.PI * 2,
        retardo: r() * .35,
    }));
    return { tallas, cristales };
}

export class PortalEditorial {
    constructor(renderer, movil, papel = 0xf7f1e8) {
        this.renderer = renderer; this.movil = movil;
        const datos=new Uint8Array(32*32*32); let semilla=7127;
        for(let i=0;i<datos.length;i++){semilla=(semilla*16807)%2147483647;datos[i]=semilla%256;}
        this.ruido=new Data3DTexture(datos,32,32,32);
        this.ruido.format=RedFormat; this.ruido.minFilter=LinearFilter; this.ruido.magFilter=LinearFilter;
        this.ruido.wrapS=RepeatWrapping; this.ruido.wrapT=RepeatWrapping; this.ruido.wrapR=RepeatWrapping;
        this.ruido.unpackAlignment=1; this.ruido.needsUpdate=true;
        this.uniforms = { uPapel:{value:new Color(papel)}, uRuido:{value:this.ruido}, uTime:{value:0}, uAspect:{value:1}, uEnergy:{value:0}, uEntry:{value:0}, uExit:{value:0} };
        this.destino = new WebGLRenderTarget(8, 8, { type: UnsignedByteType, depthBuffer:false, stencilBuffer:false });
        // Fondo de interfaz: preservar el hueso original. Sin sRGB, Three
        // aplica de nuevo el tone mapping del libro y lo convierte en gris.
        this.destino.texture.colorSpace = SRGBColorSpace;
        this.material = new ShaderMaterial({ uniforms:this.uniforms, defines:{VOLUME_STEPS:movil?8:12}, vertexShader:VERTEX, fragmentShader:FRAGMENT, depthTest:false, depthWrite:false });
        this.plano = new Mesh(new PlaneGeometry(2,2), this.material);
        this.escena = new Scene(); this.escena.add(this.plano);
        this.camara = new OrthographicCamera(-1,1,1,-1,0,1);
        this.grupo = new Group();
        // Material de diamante: superficie pulida con irisación prismática.
        this.materialCristal = movil
             ? new MeshStandardMaterial({ color:0xffffff, vertexColors:true, metalness:.55, roughness:.07, flatShading:true,
                 emissive:0xfff6ea, emissiveIntensity:.18, envMapIntensity:4 })
             : new MeshPhysicalMaterial({ color:0xffffff, vertexColors:true, metalness:.6, roughness:.03, clearcoat:1, clearcoatRoughness:.02,
                 iridescence:1, iridescenceIOR:2.1, iridescenceThicknessRange:[260, 900],
                 emissive:0xfff6ea, emissiveIntensity:.12, envMapIntensity:5, flatShading:true });
        const { tallas, cristales } = crearCristales(movil ? 10 : 22);
        this.tallas = tallas;
        this.cristales = cristales.map((datos) => {
            const malla = new Mesh(tallas[datos.talla], this.materialCristal);
            this.grupo.add(malla);
            return { malla, ...datos };
        });
        this.grupo.position.z = -.6;
    }
    redimensionar(ancho, alto) {
        const w = Math.round(Math.min(this.movil?260:520, ancho*.4));
        this.destino.setSize(Math.max(1,w), Math.max(1,Math.round(w*alto/ancho)));
        this.uniforms.uAspect.value = ancho/alto;
    }
    actualizar(t, entrada, energia, salida, apertura) {
        this.uniforms.uTime.value=t; this.uniforms.uEntry.value=entrada;
        this.uniforms.uEnergy.value=energia; this.uniforms.uExit.value=salida;
        this.grupo.visible = entrada>.01 && salida<.99;
        // Los cristales orbitan desde el arranque y se abren con la energía.
        this.grupo.scale.setScalar((.82+entrada*.18)*(1+energia*.75));
        this.grupo.rotation.set(.11+apertura*.3, Math.sin(t*.08)*.12, -.12+energia*.42);
        for (const c of this.cristales) {
            const a = c.angulo + t * c.velocidad;
            const llegada = Math.min(1, Math.max(0, (entrada - c.retardo) / (1 - c.retardo)));
            const brote = 1 - Math.pow(1 - llegada, 3);
            const radio = c.radio * (.35 + .65 * brote);
            c.malla.position.set(Math.cos(a) * radio, c.altura * .55 + Math.sin(a) * radio * .42 + Math.sin(t * .6 + c.fase) * .06, c.profundidad + Math.sin(a) * radio * .55);
            c.malla.rotation.set(t * c.giro[0] + c.fase, t * c.giro[1], t * c.giro[2]);
            c.malla.scale.setScalar(c.tamano * brote);
        }
    }
    dibujar() {
        const t=this.uniforms.uTime.value;
        if(this.movil && this.ultimoTiempo!==undefined && t-this.ultimoTiempo<1/18)return;
        this.ultimoTiempo=t;
        const previo=this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(this.destino);
        this.renderer.render(this.escena,this.camara);
        this.renderer.setRenderTarget(previo);
    }
    destruir() {
        this.tallas.forEach(g=>g.dispose());
        this.materialCristal.dispose(); this.plano.geometry.dispose(); this.material.dispose(); this.destino.dispose(); this.ruido.dispose();
        this.escena.clear(); this.grupo.clear();
    }
}

export function prepararDisolucion(material, uniforme) {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uDisolver = uniforme;
        shader.vertexShader = 'varying vec3 vPapelFisico;\n'+shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPapelFisico=position;');
        shader.fragmentShader = 'uniform float uDisolver; varying vec3 vPapelFisico;\n'+shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `
            #include <alphatest_fragment>
            vec3 grano=fract(floor(vPapelFisico*150.)*vec3(.1031,.11369,.13787));
            float trama=fract((grano.x+grano.y)*grano.z*97.1);
            float campo=clamp(vPapelFisico.x*.19+.5+vPapelFisico.y*.015+trama*.06,0.,1.);
            if(uDisolver>0.001 && campo<uDisolver) discard;
            diffuseColor.rgb+=vec3(.28,.13,.52)*(1.-smoothstep(0.,.035,abs(campo-uDisolver)))*step(.001,uDisolver)*.28;
        `);
    };
    material.customProgramCacheKey=()=> 'papel-editorial-disolucion-v1';
}

export function crearTexturaLomo(CanvasTexture, titulo, autor) {
    const canvas=document.createElement('canvas'); canvas.width=128; canvas.height=1024;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#19171e'; ctx.fillRect(0,0,128,1024);
    const brillo=ctx.createLinearGradient(0,0,128,0);
    brillo.addColorStop(0,'rgba(0,0,0,.6)'); brillo.addColorStop(.4,'rgba(255,255,255,.07)'); brillo.addColorStop(1,'rgba(0,0,0,.5)');
    ctx.fillStyle=brillo; ctx.fillRect(0,0,128,1024);
    ctx.translate(64,90); ctx.rotate(Math.PI/2); ctx.fillStyle='#d9d2c7';
    ctx.font='500 27px "Work Sans", sans-serif';
    ctx.fillText(String(titulo || ''),0,0,790);
    ctx.font='400 18px "Work Sans", sans-serif'; ctx.fillStyle='#99918c';
    ctx.fillText(String(autor || ''),0,31,790);
    const textura=new CanvasTexture(canvas); return textura;
}
