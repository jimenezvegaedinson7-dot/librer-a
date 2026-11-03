import {
    Color, Data3DTexture, LinearFilter, RedFormat, RepeatWrapping, SRGBColorSpace, UnsignedByteType,
    Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderTarget,
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
    }
    redimensionar(ancho, alto) {
        const w = Math.round(Math.min(this.movil?260:520, ancho*.4));
        this.destino.setSize(Math.max(1,w), Math.max(1,Math.round(w*alto/ancho)));
        this.uniforms.uAspect.value = ancho/alto;
    }
    actualizar(t, entrada, energia, salida) {
        this.uniforms.uTime.value=t; this.uniforms.uEntry.value=entrada;
        this.uniforms.uEnergy.value=energia; this.uniforms.uExit.value=salida;
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
        this.plano.geometry.dispose(); this.material.dispose(); this.destino.dispose(); this.ruido.dispose();
        this.escena.clear();
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
