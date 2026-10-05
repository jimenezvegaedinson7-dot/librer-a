import { normalizarConsulta } from './respuestasAsistente.js';

// ============================================================
// CHARLA DEL ASISTENTE
// Conversación natural alrededor de los libros: saludos, "¿cómo estás?",
// chistes, micro‑historias, datos curiosos, ánimo del lector y frases cortas.
// Todo el contenido está escrito aquí (no inventa precios ni stock); cuando
// la persona en realidad busca un libro, se devuelve la búsqueda limpia
// para que la atienda el catálogo.
// ============================================================

const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];

// Muletillas y modismos que no cambian el sentido: «oye we», «porfa», «bro».
const RELLENO = /\b(?:we|wey|guey|bro|brother|pe|pes|pues|causa|pata|compa|amigo|amiga|amig[oa]s|broder|mano|manito|hermano|chato|porfa|porfis|porfavor|por favor|please|pls|plis|oye|oiga|ey|hey|mira|una pregunta|pregunta|disculpa|disculpe|perdon|xfa|xf|plz|jaja+|jeje+|jiji+|ja+|xd+|ok|okey|okay)\b/g;
export const quitarRelleno = (texto) => normalizarConsulta(texto).replace(RELLENO, ' ').replace(/\s+/g, ' ').trim();

// Pedidos de búsqueda en lenguaje natural → consulta limpia para el catálogo.
// «búscame libros de el principito» → «el principito».
const PEDIDO_BUSQUEDA = /^(?:(?:me |nos )?(?:puedes|podrias|podras|quiero que|necesito que)\s+)?(?:buscame|buscarme|busca|buscas|busco|buscar|encuentrame|encontrar|encuentra|dame|damelo|muestrame|mostrame|ensename|ensenarme|pasame|consigueme|quiero|quisiera|necesito|tienes|tienen|tendras|tendran|hay|venden|vendes|conoces|recomiendame|recomienda|sugiereme|sugiere)\b\s*(?:(?:un|una|unos|unas|algun|alguna|algunos|algunas|el|la|los|las)\s+)?(?:libro|libros|titulo|titulos|novela|novelas|obra|obras)?\s*(?:(?:de|del|sobre|acerca de|llamado|llamada|titulado|titulada|que se llama)\s+)?/;
export function limpiarBusqueda(texto) {
    const q = quitarRelleno(texto);
    const m = PEDIDO_BUSQUEDA.exec(q);
    if (!m || !m[0].trim()) return q;
    const resto = q.slice(m[0].length).trim();
    // «búscame libros» a secas: sin nada que buscar, se deja la frase original.
    return resto || q;
}

const ESTADO = [
    '¡Muy bien, gracias por preguntar! Rodeado de libros, que es mi lugar favorito.',
    '¡Excelente! Acabo de ordenar mentalmente todo el catálogo, así que estoy listo para ayudarte.',
    'Todo bien por aquí, entre portadas y páginas. ¿Y tú, qué tal?',
    '¡De maravilla! Un buen día para empezar un libro nuevo.',
];
const IDENTIDAD = [
    'Soy el asistente virtual de Librería del Saber. Busco libros del catálogo, te digo precios y stock reales, te recomiendo lecturas y respondo dudas sobre entrega, pagos y la tienda. Y si quieres, también te cuento un chiste o una historia de libros.',
];
const CHISTES = [
    '¿Por qué el libro de matemáticas estaba triste? Porque tenía demasiados problemas. 📚',
    '—¿Cuál es el colmo de un libro? —Que lo dejen en blanco el día de su presentación.',
    '¿Qué le dijo una página a otra? «Nos vemos en el siguiente capítulo».',
    'Un diccionario entra a una fiesta y todos le preguntan: «¿Y tú qué significas?».',
    '¿Por qué los libros nunca tienen frío? Porque siempre tienen una buena tapa.',
    'Le pregunté a un libro de historia cómo estaba y me dijo: «Uf, he pasado por muchas épocas».',
    '¿Cuál es el animal más lector? El ratón… de biblioteca.',
    '—Doctor, no puedo dejar de leer. —Tranquilo, eso tiene cura: se llama «fin».',
    '¿Qué hace un libro en el gimnasio? Ejercita sus capítulos… ¡y saca lomo!',
    'Mi libro favorito de antigravedad es imposible de soltar.',
    '¿Por qué el lápiz no termina sus novelas? Porque siempre le falta punta final.',
    'Un libro de misterio le dice a otro: «No te puedo contar el final… pero tú ya sabes cómo termina esto».',
];
const HISTORIAS = [
    'Había una vez un libro olvidado en el último estante de una librería de Pallasca. Cada tarde veía pasar lectores que nunca lo elegían. Un día, una niña lo tomó solo porque su portada tenía una estrella. Lo leyó en una noche, lo recomendó a su abuelo, y su abuelo a todo el pueblo. Desde entonces, ese libro nunca volvió al estante: siempre está en las manos de alguien.',
    'Un lector prometió leer solo una página antes de dormir. A la tercera página encontró un personaje que se parecía a él; a la décima, una pregunta que no se había hecho nunca. Amaneció con el libro en el pecho y una idea nueva en la cabeza. Dicen que los buenos libros no se leen: te leen a ti.',
    'En una librería pequeña, los libros conversan cuando cierran las puertas. La enciclopedia presume de saberlo todo, la novela de vivirlo todo y el poemario de sentirlo todo. Pero el que siempre gana la discusión es el libro infantil, que dice: «Yo fui el primero que cada uno de ustedes leyó».',
    'Un viajero llegó a una ciudad sin conocer a nadie. Entró a una librería, compró un libro de cuentos y se sentó en la plaza. Una señora se acercó: «Ese libro lo leí de joven». Hablaron horas. Volvió al día siguiente con otro libro y otra conversación. Un año después, ya no era un viajero: era un vecino más.',
    'Una vez, un libro perdió su última página. Los lectores inventaron miles de finales distintos. Cuando por fin apareció la página original, nadie quiso leerla: cada uno ya tenía su final favorito. Desde entonces, el libro viaja de mano en mano con una hoja en blanco al final, por si acaso.',
];
const DATOS = [
    'Dato curioso: Mario Vargas Llosa, escritor peruano nacido en Arequipa, ganó el Premio Nobel de Literatura en 2010.',
    'Dato curioso: «El Principito», de Antoine de Saint‑Exupéry, se publicó en 1943 y es uno de los libros más traducidos del mundo.',
    'Dato curioso: el 23 de abril se celebra el Día Internacional del Libro, en recuerdo de Cervantes, Shakespeare y el Inca Garcilaso de la Vega.',
    'Dato curioso: la primera parte de «Don Quijote de la Mancha» se publicó en 1605.',
    'Dato curioso: Gabriel García Márquez publicó «Cien años de soledad» en 1967 y recibió el Premio Nobel en 1982.',
    'Dato curioso: César Vallejo, poeta nacido en Santiago de Chuco (La Libertad), escribió «Los heraldos negros» y «Trilce».',
    'Dato curioso: la imprenta de tipos móviles de Gutenberg, hacia 1450, permitió que los libros llegaran a muchísimas más personas.',
    'Dato curioso: el Inca Garcilaso de la Vega, autor de los «Comentarios Reales», nació en Cusco en 1539.',
];
// Remate al dar la hora: siempre es buen momento para un libro.
const HORA_DE_LEER = [
    '¡Ya va siendo hora de comprar un libro! 📚',
    'Y justo a esta hora… ¡un libro nuevo cae perfecto! 😄',
    'Hora exacta para empezar un capítulo… o para llevarte un libro nuevo. 📖',
    'Según mi reloj de lector, ya es hora de tu próxima lectura. 😉',
];
const ANIMO = [
    { patron: /\b(aburrid[oa]|aburro|aburre)\b/, texto: 'Un buen libro es la mejor cura contra el aburrimiento. Te muestro algunos de los más vendidos para que elijas uno:', consulta: 'mas vendidos' },
    { patron: /\b(triste|desanimad[oa]|mal dia|deprimid[oa]|baj[oa] de animo)\b/, texto: 'Siento que estés así. A veces una buena historia acompaña mucho. Mira estas novedades, quizá alguna te levante el ánimo:', consulta: 'novedades' },
    { patron: /\b(no se que leer|que (?:me )?recomiendas|que leo|sugerencia|algo para leer|algo bueno|recomiendame algo|recomienda algo)\b/, texto: '¡Con gusto! Estos son algunos de los libros que más se llevan en la librería:', consulta: 'mas vendidos' },
    { patron: /\b(regalo|regalar|cumpleanos|obsequio)\b/, texto: 'Un libro siempre es un gran regalo. Te muestro algunas opciones; si me dices para quién es (niño, joven, adulto) o qué le gusta, afino la búsqueda:', consulta: 'mas vendidos' },
];

function charlaLocal(q) {
    if (!q) return null;
    if (/^(?:como (?:estas|esta|te va|andas|vas|te encuentras|amaneciste)|que tal|todo bien|que (?:hay|cuentas|haces)|como va todo)\b/.test(q))
        return { texto: `${azar(ESTADO)} ¿En qué libro te ayudo hoy?` };
    if (/\b(quien eres|que eres|como te llamas|tu nombre|eres (?:un )?(?:robot|bot|humano|persona|ia|inteligencia artificial)|con quien hablo)\b/.test(q))
        return { texto: azar(IDENTIDAD) };
    if (/\b(chiste|chistes|hazme reir|algo gracioso|algo divertido|cuentame algo chistoso|me haces reir)\b/.test(q))
        return { texto: `${azar(CHISTES)}\n\n¿Otro chiste, o te busco algún libro?`, sugerencias: ['Otro chiste', 'Cuéntame una historia'] };
    if (/\b(historia|historias|cuento|cuentos|relato|relatos|cuentame algo)\b/.test(q) && /\b(cuenta|cuentame|narra|narrame|dime|quiero|una|un)\b/.test(q)
        && !/\b(libro|libros)\s+de\s+historia\b/.test(q) && !/\bcategoria\b/.test(q))
        return { texto: `${azar(HISTORIAS)}\n\n¿Te gustaría que te recomiende un libro de cuentos del catálogo?`, sugerencias: ['Libros de cuentos', 'Otra historia'] };
    if (/\b(dato curioso|datos curiosos|curiosidad|curiosidades|sabias que|algo interesante)\b/.test(q))
        return { texto: azar(DATOS), sugerencias: ['Otro dato curioso', 'Cuéntame un chiste'] };
    if (/^(?:te quiero|eres (?:genial|lo maximo|buenisimo|increible|el mejor|muy util|inteligente)|me caes bien|buen trabajo|excelente)\b/.test(q))
        return { texto: '¡Gracias! Me alegra mucho ayudarte. 😊 ¿Buscamos tu próxima lectura?' };
    if (/\b(tonto|idiota|inutil|estupido|no sirves|malo)\b/.test(q) && q.split(' ').length <= 6)
        return { texto: 'Lamento no haberte ayudado como esperabas. Cuéntame qué libro o información buscas y lo intento de nuevo con gusto.' };
    if (/\b(que horas? (?:es|son|tienes)|dime la hora|me (?:das|dices) la hora|la hora porfa|tienes hora|que hora)\b/.test(q)) {
        const hora = new Date().toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
        return { texto: `Son las ${hora}. ${azar(HORA_DE_LEER)}`, sugerencias: ['Recomiéndame algo', 'Ver ofertas'] };
    }
    if (/\b(que dia es|que fecha es|hoy que fecha|que dia es hoy)\b/.test(q))
        return { texto: `Hoy es ${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}. ¡Un día perfecto para estrenar un libro nuevo! 📖`, sugerencias: ['Recomiéndame algo'] };
    for (const animo of ANIMO) if (animo.patron.test(q)) return { texto: animo.texto, consulta: animo.consulta };
    return null;
}

/**
 * Interpreta la frase y decide si es charla. Devuelve:
 *  - { texto, sugerencias? }               respuesta de conversación lista
 *  - { texto, consulta }                   texto + búsqueda en el catálogo
 *  - null                                  no es charla: seguir con el catálogo
 */
export function responderCharla(pregunta) {
    const q = quitarRelleno(pregunta);
    // «Otro chiste» / «otra historia» / «otro dato»
    if (/^(?:otro|otra|uno mas|una mas)\s+(?:chiste|historia|cuento|dato(?: curioso)?)$/.test(q)) {
        if (/chiste/.test(q)) return { texto: azar(CHISTES), sugerencias: ['Otro chiste', 'Cuéntame una historia'] };
        if (/dato/.test(q)) return { texto: azar(DATOS), sugerencias: ['Otro dato curioso'] };
        return { texto: azar(HISTORIAS), sugerencias: ['Otra historia', 'Libros de cuentos'] };
    }
    return charlaLocal(q);
}

// Respuesta amable cuando no se entiende la frase y no hay IA disponible.
export const NO_ENTENDI = [
    'Mmm, no estoy seguro de haberte entendido. Puedo buscar un libro por título o autor, mostrarte ofertas, contarte un chiste o un dato curioso de libros. ¿Qué te gustaría?',
    'Creo que se me escapó lo que quisiste decir. Prueba con algo como «libros de Vargas Llosa», «ofertas» o «cuéntame un chiste».',
];
export const respuestaNoEntendi = () => azar(NO_ENTENDI);
