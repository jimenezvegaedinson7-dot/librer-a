const limitar = (n) => Math.max(0, Math.min(1, n));
export const tramoCine = (p, a, b) => limitar((p-a)/(b-a));
export const interpolarCine = (a,b,p) => a+(b-a)*p;
export const suavizarCine = (p) => { const t=limitar(p); return t*t*(3-2*t); };
export const ENCUADERNACION = Object.freeze({ giroMaximo:Math.PI*.58, offsetLomo:.07, offsetPrimeraHoja:.055, profundidadHojas:.075, reduccionBloque:.62 });

export function estadoReveladoNavegacion(progreso) {
    const p=Number.isFinite(progreso)?limitar(progreso):0;
    return {linea:suavizarCine(tramoCine(p,0,.24)),cuerpo:suavizarCine(tramoCine(p,.12,.74)),enlaces:suavizarCine(tramoCine(p,.34,1))};
}

// Una única coreografía reversible. Durante la ficha se conserva la cara
// frontal: el visitante no tiene que leer un precio junto a la contratapa.
export function estadoCinematico(progreso, entrada=1) {
    const p=Number.isFinite(progreso)?limitar(progreso):0;
    const e=suavizarCine(Number.isFinite(entrada)?entrada:0);
    return {
        p, entrada:e,
        navegacion:suavizarCine(tramoCine(p,.01,.09)),
        acercamiento:suavizarCine(tramoCine(p,.13,.38)),
        apertura:suavizarCine(tramoCine(p,.39,.64)),
        energia:suavizarCine(tramoCine(p,.59,.80)),
        disolucion:suavizarCine(tramoCine(p,.69,.83)),
        // El cierre llega mientras el libro se disuelve y permanece hasta que
        // la sección sale de pantalla: no queda ningún cuadro vacío.
        presentacionFinal:suavizarCine(tramoCine(p,.72,.86)),
        salida:suavizarCine(tramoCine(p,.87,1)),
    };
}

// Todas las hojas siguen a la tapa, con retardo por profundidad. La curva se
// dirige al interior del libro: una hoja nunca adelanta ni atraviesa la tapa.
export function estadoEncuadernacion(apertura, cantidad=16) {
    const a=limitar(Number.isFinite(apertura)?apertura:0);
    const total=Number.isFinite(cantidad)?Math.max(1,Math.min(32,Math.floor(cantidad))):16;
    const tapa=a*ENCUADERNACION.giroMaximo;
    const hojas=Array.from({length:total},(_,i)=>{
        const orden=total===1?0:i/(total-1);
        const seguimiento=suavizarCine(tramoCine(a,.08+orden*.58,1));
        return {
            orden,
            angulo:tapa*(.74-.52*orden)*seguimiento,
            curvatura:.10*(1-orden*.4)*Math.sin(Math.PI*seguimiento)*Math.sin(tapa),
        };
    });
    return {tapa,hojas,escalaBloque:1-ENCUADERNACION.reduccionBloque*a};
}
