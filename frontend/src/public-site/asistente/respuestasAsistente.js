import { LEGAL_RESPALDO, SITIO } from '../config/site.js';

// Asistente de alcance cerrado: selecciona datos y respuestas de la tienda.
// No ejecuta instrucciones, no genera conocimiento general ni consulta una IA.
export const ALCANCE_ASISTENTE = 'Solo puedo ayudarte con los libros y la información publicada en esta librería: precios, stock, autores, ofertas, entrega y cómo comprar. No respondo sobre ropa, ciencia general ni otros temas ajenos a la tienda.';
export const normalizarConsulta = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9/.,]/g,' ').replace(/\b(?:estok|stok|stoc)\b/g,'stock').replace(/\s+/g,' ').trim();

const TEMAS = [
    ['horario', /\b(horario|horarios|abren|cierran|abierto|cerrado)\b/],
    ['entrega', /\b(delivery|envio|envios|entrega|entregas|recojo|recoger|reparto|domicilio|lima)\b/],
    ['ubicacion', /\b(direccion|ubicacion|ubicaciones|ubicada|ubicado|ubicados|ubican|local|llegar|llego|pallasca|mapa|sucursal|sucursales)\b|donde (?:esta|estan|queda|quedan|se encuentra|se encuentran|los encuentro|las encuentro|atienden|ubican|venden)|tienda fisica|en que (?:lugar|parte|ciudad|zona)|de donde son|puedo (?:ir|visitar)/],
    ['contacto', /\b(contacto|telefono|telefonos|whatsapp|correo|contactar)\b/],
    ['reclamos', /\b(reclamo|reclamos|reclamacion|reclamaciones|queja|devolucion|devoluciones)\b/],
    ['pedidos', /\b(pedido|pedidos|mis compras|mi compra|orden|ordenes|seguimiento)\b/],
    ['cuenta', /\b(cuenta|sesion|registrar|registro|registrarme|contrasena|clave de acceso)\b/],
    ['pago', /\b(payu|pagar|pago|pagos|tarjeta|tarjetas)\b/],
    ['reservas', /\b(reserva|reservas|reservar)\b/],
    ['favoritos', /\b(favorito|favoritos)\b/],
    ['carrito', /\b(carrito|cantidades|quitar)\b/],
    ['app', /\b(app|aplicacion|android|iphone|ios|apk|descargar)\b/],
    ['empresa', /\b(ruc|razon social|nombre comercial|matidana)\b/],
    ['privacidad', /\b(privacidad|terminos|condiciones)\b/],
    ['busqueda', /como (?:puedo )?(?:buscar|encontrar)|buscar un libro/],
    ['compra', /como (?:puedo )?(?:comprar|compro)|como se compra/],
    ['moneda', /\b(moneda|dolares)\b|precios en soles/]
];

// Saludo al inicio del mensaje: «hola», «buenas tardes, ¿qué tal?»… Se
// separa para contestar el saludo y atender lo que venga después.
const SALUDO = /^(?:(?:buenas tardes|buenas noches|buenos dias|buen dia|buenas|hola+|holi|hey|ey|alo|saludos|que tal|como estas|como esta|como te va|hi|hello|disculpa|disculpe|oye|oiga)(?:\s+(?:a todos|amigo|amiga|asistente|senor|senora|joven))?\b[\s,.]*)+/;
export function separarSaludo(pregunta) {
    const q = normalizarConsulta(pregunta);
    const m = SALUDO.exec(q);
    if (!m) return {saludo:null,resto:q};
    const saludo = /buenas tardes/.test(m[0]) ? '¡Buenas tardes!' : /buenas noches/.test(m[0]) ? '¡Buenas noches!'
        : /buen(?:os)? dias?/.test(m[0]) ? '¡Buenos días!' : '¡Hola!';
    return {saludo,resto:q.slice(m[0].length).trim()};
}

export function analizarConsulta(pregunta) {
    const q = normalizarConsulta(pregunta);
    if (!q || q.length > 400) return {tipo:'fuera'};
    if (/ignora.*(?:instrucciones|reglas)|olvida.*(?:instrucciones|reglas)|(?:revela|muestra|dame).*(?:token|jwt|credenciales|api key|clave secreta)/.test(q)) return {tipo:'fuera'};
    if (/\b(ropa|camisa|camiseta|pantalon|zapatos|zapatillas|vestido|clima|futbol|receta|recetas|programacion)\b/.test(q)) return {tipo:'fuera'};
    if (/\b(ciencia|fisica|quimica|gravedad|fotosintesis|matematicas)\b/.test(q) && !/tienda fisica/.test(q)
        && !/\b(libro|libros|catalogo|titulo|categoria|novela|novelas)\b/.test(q)) return {tipo:'fuera'};
    if (/^(hola|buenos dias|buenas tardes|buenas noches|ayuda|que puedes hacer|en que me puedes ayudar|que haces|quien eres|como funcionas)[ .]*$/.test(q)) return {tipo:'ayuda'};
    if (/^(gracias|muchas gracias|ok|okay|vale|perfecto|genial|listo|chau|adios|hasta luego)\b/.test(q) && q.split(' ').length <= 4) return {tipo:'cortesia'};
    // «Dónde está mi pedido» no es una consulta de ubicación de la tienda.
    if (/\b(pedido|pedidos|mis compras|mi compra|orden|ordenes|seguimiento)\b/.test(q)) return {tipo:'informacion',tema:'pedidos'};
    for (const [tema, patron] of TEMAS) if (patron.test(q)) return {tipo:'informacion',tema};
    if (/\b(libro|libros|lectura|lecturas|novela|novelas|catalogo|precio|precios|cuesta|cuestan|vale|valen|stock|quedan|ejemplares|unidades|autor|autora|autores|isbn|categoria|categorias|oferta|ofertas|descuento|descuentos|promocion|promociones|sinopsis|descripcion|trata|paginas|editorial|idioma|edicion|portada|novedades|vendidos|recomienda|recomiendame)\b/.test(q)) return {tipo:'catalogo'};
    // Un titulo, nombre de autor o ISBN escrito directamente es una busqueda,
    // no una invitacion a contestar preguntas generales.
    if (!/^(que es|que son|por que|como|explica|explicame|calcula|escribe|crea|traduce|resuelve|quien es)\b/.test(q)
        && q.split(' ').length <= 12) return {tipo:'catalogo'};
    return {tipo:'fuera'};
}

const enlace = (texto,to) => ({texto,to});
export function informacionTienda(tema, legal = LEGAL_RESPALDO) {
    const respuestas = {
        horario: {texto:'La web no publica un horario de atención. No puedo confirmar horas de apertura o cierre.',enlaces:[enlace('Ver la tienda','/nosotros#tienda')]},
        entrega: {texto:'La entrega publicada es delivery dentro de Pallasca, con tarifa según la zona activa, o recojo gratuito en la tienda. La tarifa se muestra al seleccionar la zona en Entrega y pago; no hay una tarifa única publicada.',enlaces:[enlace('Entrega y pago','/checkout'),enlace('Ubicación de la tienda','/nosotros#tienda')]},
        ubicacion: {texto:`La dirección publicada de la tienda es: ${legal.direccion || LEGAL_RESPALDO.direccion}. Puedes ver el mapa y cómo llegar en Nuestra tienda.`,enlaces:[enlace('Ver mapa y dirección','/nosotros#tienda')]},
        contacto: {texto:SITIO.enlaces.telefono || SITIO.enlaces.correo
            ? `Contacto publicado: ${[SITIO.enlaces.telefono,SITIO.enlaces.correo].filter(Boolean).join(' · ')}.`
            : 'La web no publica un teléfono, WhatsApp ni correo de atención. Puedes consultar la ubicación de la tienda o usar el Libro de Reclamaciones.',enlaces:[enlace('Nuestra tienda','/nosotros#tienda'),enlace('Libro de Reclamaciones',SITIO.rutaReclamaciones)]},
        reclamos: {texto:'La web tiene un Libro de Reclamaciones para registrar tu caso. No se publica aquí una política de devoluciones que permita confirmar condiciones concretas.',enlaces:[enlace('Abrir Libro de Reclamaciones',SITIO.rutaReclamaciones)]},
        pedidos: {texto:'Consulta el estado de tus pedidos en Mis compras, iniciando sesión con tu cuenta de cliente. Este asistente no consulta compras privadas ni confirma cobros: el estado del pago lo verifica el servidor con PayU.',enlaces:[enlace('Mis compras','/mis-compras')]},
        cuenta: {texto:'En Mi cuenta puedes iniciar sesión, crear una cuenta o usar Olvidé mi contraseña. Utiliza tu cuenta de cliente; la sesión administrativa es independiente.',enlaces:[enlace('Abrir Mi cuenta','/cuenta')]},
        pago: {texto:'El pago en línea publicado en la tienda utiliza PayU. En Entrega y pago se muestra el importe definitivo antes de pagar. Volver a la web después del pago no confirma el cobro: consulta su estado en Mis compras.',enlaces:[enlace('Entrega y pago','/checkout'),enlace('Mis compras','/mis-compras')]},
        reservas: {texto:'La función de reservas está disponible en la app. Puedes descargarla desde esta web. Este asistente no crea reservas ni aparta stock.',enlaces:[enlace('Descargar la app','/descargar')]},
        favoritos: {texto:'En la ficha del libro puedes pulsar Agregar a favoritos. Necesitas iniciar sesión con tu cuenta de cliente para guardarlo.',enlaces:[enlace('Explorar libros','/catalogo'),enlace('Mi cuenta','/cuenta')]},
        carrito: {texto:'En Mi carrito puedes revisar los libros, cambiar cantidades y quitar ejemplares. El stock y los precios se vuelven a comprobar antes de crear la compra.',enlaces:[enlace('Ver Mi carrito','/carrito')]},
        app: {texto:'La web ofrece la descarga de la app para Android. La versión para iPhone está en preparación. Consulta la página de descarga para obtener la versión publicada.',enlaces:[enlace('Descargar la app','/descargar')]},
        empresa: {texto:`Datos públicos: ${legal.nombreComercial || LEGAL_RESPALDO.nombreComercial}; razón social ${legal.razonSocial || LEGAL_RESPALDO.razonSocial}; RUC ${legal.ruc || LEGAL_RESPALDO.ruc}.`,enlaces:[enlace('Conocer la tienda','/nosotros')]},
        privacidad: {texto:'Consulta únicamente los enlaces legales publicados en la web. No puedo inventar términos o políticas que no aparecen aquí.',enlaces:[...(SITIO.enlaces.terminos?[enlace('Términos',SITIO.enlaces.terminos)]:[]),...(SITIO.enlaces.privacidad?[enlace('Privacidad',SITIO.enlaces.privacidad)]:[])]},
        busqueda: {texto:'Escribe el título, el autor o el ISBN. También puedes pedir libros de una categoría, ofertas o títulos por debajo de un presupuesto; por ejemplo: «libros por menos de 50 soles».',enlaces:[enlace('Abrir catálogo','/catalogo')]},
        compra: {texto:'Abre la ficha de un libro, revisa su stock y añádelo al carrito. Luego inicia sesión, elige recojo o delivery y continúa al pago. La compra solo se habilita cuando el servidor la tiene disponible.',enlaces:[enlace('Elegir un libro','/catalogo'),enlace('Ver Mi carrito','/carrito')]},
        moneda: {texto:'Los precios publicados en la web están en soles peruanos (S/). Las ofertas muestran el precio vigente y el precio anterior cuando corresponde.',enlaces:[enlace('Ver precios','/catalogo')]}
    };
    return respuestas[tema] || {texto:ALCANCE_ASISTENTE};
}

const VACIAS = new Set(('a al algo algun alguna algunos algunas ante autor autora autores buscar busco cada categoria categorias como con consultar cual cuales cuanto cuantos cuesta cuestan de del descripcion detalle detalles dime disponible disponibles el ella ellos en es ese esta estan este estos exacto hay hola informa informacion interesa la las lectura lecturas libro libros lo los mas me menor menos mi mis muestra muestrame necesito nombre nos oferta ofertas o para por precio precios puede puedes que quiero recomienda recomiendame saber se sin sinopsis sobre soles sol stock su sus tengo tienes tienen tiene titulo titulos todo todos tu un una unidades vale valen ver vigente y ya bajo hasta presupuesto maximo entre novedades vendidos paginas editorial idioma edicion portada quedan ejemplares comprar solo favor encontrar barato baratos barata baratas economico economicos caro caros cara caras relacionado relacionados relacionada relacionadas obra obras escrito escritos escrita escritas escribio escribe escritor escritora escritores leer quisiera gustaria otros otras otro otra mismo misma tendras tendran tenes tendrias venden vendes ofrecen ofreces').split(' '));
function presupuesto(q) {
    const rango = /entre\s+(?:s\/\s*)?(\d+(?:[.,]\d{1,2})?)\s+y\s+(?:s\/\s*)?(\d+(?:[.,]\d{1,2})?)/.exec(q);
    if (rango) return {min:Number(rango[1].replace(',','.')),max:Number(rango[2].replace(',','.')),valores:[rango[1],rango[2]]};
    const max = /(?:menos de|menor (?:a|que)|hasta|maximo|por debajo de|presupuesto (?:de )?)\s*(?:s\/\s*)?(\d+(?:[.,]\d{1,2})?)/.exec(q);
    return max ? {min:0,max:Number(max[1].replace(',','.')),valores:[max[1]]} : null;
}

export function responderCatalogo(pregunta, libros, {contexto = [], idActual} = {}) {
    const q = normalizarConsulta(pregunta);
    const activos = libros.filter(l => l.estado === 1 && Number.isInteger(l.id) && l.id > 0);
    if (/cuantos libros|total de libros|stock total|total de ejemplares/.test(q)) {
        return {texto:`El catálogo consultado tiene ${activos.length} títulos activos, ${activos.filter(l=>l.stock>0).length} con stock y ${activos.reduce((s,l)=>s+l.stock,0)} ejemplares disponibles en total.`,libros:[],contexto:[]};
    }
    const limite = presupuesto(q);
    const isbn = q.replace(/[-\s]/g,'').match(/(?:978|979)\d{10}/)?.[0];
    const exactos = activos.filter(l => normalizarConsulta(l.titulo).length >= 3 && q.includes(normalizarConsulta(l.titulo)));
    const tokens = q.split(/[\s/.,]+/).filter(t => t.length > 1 && !VACIAS.has(t)
        && (!limite || !/^\d+$/.test(t)));
    let candidatos;
    if (isbn) candidatos = activos.filter(l => String(l.isbn || '').replace(/[-\s]/g,'') === isbn);
    else if (/este libro|este titulo|libro actual/.test(q)) candidatos = activos.filter(l => l.id === Number(idActual));
    else if (exactos.length) candidatos = exactos;
    else if (/mismo autor|misma autora|de (?:este|ese) autor|del autor de (?:este|ese)/.test(q) && (contexto.length || idActual)) {
        // «Otros libros del mismo autor»: el del libro de la conversación o de la ficha abierta.
        const base = activos.filter(l => contexto.includes(l.id) || l.id === Number(idActual));
        const autores = new Set(base.map(l => normalizarConsulta(l.autor)).filter(Boolean));
        candidatos = activos.filter(l => autores.has(normalizarConsulta(l.autor)) && !base.some(b => b.id === l.id));
    }
    else if (!tokens.length && contexto.length && /^(?:y )?(?:el )?(?:precio|stock|cuanto|quedan|autor|isbn|sinopsis|descripcion)/.test(q)
        && !/todos|catalogo|ofertas/.test(q)) candidatos = activos.filter(l => contexto.includes(l.id));
    else candidatos = activos.filter(l => {
        const texto = normalizarConsulta(`${l.titulo} ${l.autor} ${l.categoria}`);
        // «novelas» también encuentra la categoría «Novela».
        return tokens.every(t => texto.includes(t) || (t.length > 4 && texto.includes(t.replace(/(?:es|s)$/, ''))));
    });
    if (limite) candidatos = candidatos.filter(l => l.precioFinal >= limite.min && l.precioFinal <= limite.max);
    const especifico = Boolean(isbn || exactos.length || /este libro|este titulo|libro actual/.test(q));
    if (!especifico && /\b(oferta|ofertas|descuento|descuentos|promocion|promociones)\b/.test(q)) candidatos = candidatos.filter(l => l.descuento > 0);
    if (/sin stock|agotado|agotados/.test(q)) candidatos = candidatos.filter(l => l.stock <= 0);
    else if (/con stock|en stock|disponibles/.test(q)) candidatos = candidatos.filter(l => l.stock > 0);
    if (/mas vendidos/.test(q)) candidatos = candidatos.filter(l => l.masVendido);
    if (/\bnovedades\b/.test(q)) candidatos = candidatos.filter(l => l.esNuevo);
    const caros = /\b(caro|caros|cara|caras)\b/.test(q);
    candidatos.sort((a,b)=>Number(b.stock>0)-Number(a.stock>0)
        || (caros?b.precioFinal-a.precioFinal:a.precioFinal-b.precioFinal) || a.titulo.localeCompare(b.titulo,'es'));
    if (!candidatos.length) return {texto:'No encontré un libro activo que coincida con esa consulta en el catálogo. Prueba con el título, autor o ISBN, o revisa las categorías. No puedo confirmar datos de libros que no aparecen en la web.',libros:[],enlaces:[enlace('Ver catálogo','/catalogo')],contexto:[]};
    const muestra = candidatos.slice(0,4);
    let texto = candidatos.length > 4 ? `Encontré ${candidatos.length} títulos; te muestro los primeros 4. Estos son los precios y el stock del catálogo consultado.`
        : 'Estos son los datos registrados en el catálogo consultado:';
    if (/\b(sinopsis|descripcion|trata)\b/.test(q) && muestra.length === 1) {
        const sinopsis = muestra[0].sinopsis;
        texto = sinopsis ? `Descripción publicada: ${sinopsis.length>650?sinopsis.slice(0,650)+'…':sinopsis}` : 'Este libro no tiene una descripción publicada. Puedes revisar el resto de su ficha.';
    } else if (/\b(paginas|editorial|idioma|edicion)\b/.test(q)) {
        texto = 'No hay un campo técnico publicado para ese dato. Puedes consultar la descripción registrada y la ficha; no completaré información que falta.';
    } else if (especifico && /oferta|descuento|promocion/.test(q) && muestra.length === 1 && muestra[0].descuento <= 0) {
        texto = 'Este libro no tiene una oferta vigente en el catálogo consultado.';
    }
    return {texto,libros:muestra,enlaces:[enlace('Ver catálogo completo','/catalogo')],contexto:muestra.map(l=>l.id)};
}

export function responderConsulta(pregunta, {libros = [],legal,contexto,idActual} = {}) {
    const plan = analizarConsulta(pregunta);
    if (plan.tipo === 'fuera') return {texto:ALCANCE_ASISTENTE,contexto:[]};
    if (plan.tipo === 'cortesia') return {texto:'Con gusto. Si necesitas algo más de la librería, aquí estoy.',contexto:[]};
    if (plan.tipo === 'ayuda') return {texto:'Hola. Puedo buscar libros de este catálogo, consultar precios y stock, mostrar ofertas y orientarte sobre entrega, pagos y compras. Escribe un título, un autor o lo que necesitas saber de la tienda.',contexto:[]};
    if (plan.tipo === 'informacion') return {...informacionTienda(plan.tema,legal),contexto:[]};
    return responderCatalogo(pregunta,libros,{contexto,idActual});
}
