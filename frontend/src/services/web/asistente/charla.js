import { normalizarConsulta } from './respuestasAsistente.js';

const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];

const RELLENO =
    /\b(?:we|wey|guey|bro|brother|pe|pes|pues|causa|pata|compa|amigo|amiga|amig[oa]s|broder|mano|manito|hermano|chato|porfa|porfis|porfavor|por favor|please|pls|plis|oye|oiga|ey|hey|mira|una pregunta|pregunta|disculpa|disculpe|perdon|xfa|xf|plz|jaja+|jeje+|jiji+|ja+|xd+|ok|okey|okay)\b/g;

const quitarRelleno = (texto) => normalizarConsulta(texto).replace(RELLENO, ' ').replace(/\s+/g, ' ').trim();

const PEDIDO_BUSQUEDA =
    /^(?:(?:me |nos )?(?:puedes|podrias|podras|quiero que|necesito que)\s+)?(?:buscame|buscarme|busca|buscas|busco|buscar|encuentrame|encontrar|encuentra|dame|damelo|muestrame|mostrame|ensename|ensenarme|pasame|consigueme|quiero|quisiera|necesito|tienes|tienen|tendras|tendran|hay|venden|vendes|conoces|recomiendame|recomienda|sugiereme|sugiere)\b\s*(?:(?:un|una|unos|unas|algun|alguna|algunos|algunas|el|la|los|las)\s+)?(?:libro|libros|titulo|titulos|novela|novelas|obra|obras)?\s*(?:(?:de|del|sobre|acerca de|llamado|llamada|titulado|titulada|que se llama)\s+)?/;

export function limpiarBusqueda(texto) {
    const q = quitarRelleno(texto);
    const m = PEDIDO_BUSQUEDA.exec(q);
    if (!m || !m[0].trim()) return q;
    const resto = q.slice(m[0].length).trim();

    return resto || q;
}

const ESTADO = [
    '¡Muy bien, gracias! Rodeado de libros, mi lugar favorito.',
    '¡Excelente! Listo para ayudarte con el catálogo.',
    'Todo bien, entre portadas y páginas. ¿Y tú?',
    '¡De maravilla! Buen día para empezar un libro.'
];
const IDENTIDAD = ['Soy el asistente de MATIDANA. Busco libros, precios, stock y ofertas; oriento sobre entrega y compras. También cuento chistes de libros.'];
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
    'Un libro de misterio le dice a otro: «No te puedo contar el final… pero tú ya sabes cómo termina esto».'
];
const HISTORIAS = [
    'Un libro olvidado en un estante de Pallasca esperó años a que alguien lo eligiera. Una niña lo tomó por su portada con estrella, lo leyó en una noche y lo prestó a todo el pueblo. Desde entonces, siempre está en manos de alguien.',
    'Un lector prometió leer una página antes de dormir. A la décima encontró una pregunta que no se había hecho nunca. Amaneció con el libro en el pecho y una idea nueva. Los buenos libros no se leen: te leen a ti.',
    'De noche, los libros de una librería conversan. La enciclopedia sabe mucho, la novela lo vivió todo y el poemario lo siente todo. Pero gana siempre el libro infantil: «Yo fui el primero que leyó cada uno de ustedes».',
    'Un viajero compró un libro de cuentos y se sentó en la plaza. Una señora se acercó: «Ese libro lo leí de joven». Hablaron horas. Al año siguiente ya no era viajero: era un vecino más.',
    'Un libro perdió su última página y cada lector inventó un final. Cuando apareció la original, nadie quiso leerla: todos ya tenían su favorita. Aún viaja con una hoja en blanco al final.'
];
const DATOS = [
    'Dato curioso: Vargas Llosa, peruano de Arequipa, ganó el Nobel de Literatura en 2010.',
    'Dato curioso: «El Principito» se publicó en 1943 y es uno de los libros más traducidos.',
    'Dato curioso: el 23 de abril se celebra el Día del Libro en honor a Cervantes y el Inca Garcilaso.',
    'Dato curioso: la primera parte del «Quijote» se publicó en 1605.',
    'Dato curioso: García Márquez publicó «Cien años de soledad» en 1967 y ganó el Nobel en 1982.',
    'Dato curioso: César Vallejo nació en Santiago de Chuco y escribió «Trilce».',
    'Dato curioso: Gutenberg creó la imprenta de tipos móviles hacia 1450.',
    'Dato curioso: el Inca Garcilaso nació en Cusco en 1539 y escribió los «Comentarios Reales».'
];

const HORA_DE_LEER = [
    '¡Ya va siendo hora de comprar un libro! 📚',
    'Y justo a esta hora… ¡un libro nuevo cae perfecto! 😄',
    'Hora exacta para empezar un capítulo… o para llevarte un libro nuevo. 📖',
    'Según mi reloj de lector, ya es hora de tu próxima lectura. 😉'
];
const ANIMO = [
    {
        patron: /\b(aburrid[oa]|aburro|aburre)\b/,
        texto: 'Contra el aburrimiento, un buen libro siempre ayuda. Mira estos:',
        consulta: 'mas vendidos'
    },
    {
        patron: /\b(triste|desanimad[oa]|mal dia|deprimid[oa]|baj[oa] de animo)\b/,
        texto: 'Una buena historia acompaña mucho. Mira estas novedades:',
        consulta: 'novedades'
    },
    {
        patron: /\b(no se que leer|que (?:me )?recomiendas|que leo|sugerencia|algo para leer|algo bueno|recomiendame algo|recomienda algo)\b/,
        texto: '¡Con gusto! Estos son los más llevados:',
        consulta: 'mas vendidos'
    },
    {
        patron: /\b(regalo|regalar|cumpleanos|obsequio)\b/,
        texto: 'Un libro es gran regalo. Dime para quién es y afino la búsqueda:',
        consulta: 'mas vendidos'
    }
];

const RISAS = [
    '😄 ¡Me alegra sacarte una sonrisa!',
    '¡Jaja! Sabía que ese te iba a gustar. 😁',
    '😂 Tengo más donde vino ese… ¿otro?',
    '¡Esa risa me dio energía para buscar diez libros más! 😄'
];
const GRACIAS = ['¡Con gusto{n}! Para eso estoy. 📚', '¡De nada{n}! Con gusto te ayudo cuando quieras.', '¡Con gusto{n}! Me encanta ayudar a encontrar buenas lecturas. 😊'];
const ADIOS = [
    '¡Hasta pronto{n}! Que tengas una gran lectura. 📖',
    '¡Chau{n}! Aquí te espero con más libros. 👋',
    '¡Nos vemos{n}! Recuerda: un capítulo antes de dormir nunca falla. 😉'
];
const DORMIR = [
    '¡Que descanses{n}! 🌙 Un par de páginas antes de dormir y sueños de novela.',
    '¡Buenas noches{n}! Si no tienes qué leer antes de dormir, mañana te recomiendo algo. 😴'
];
const FAVORITOS = [
    'Si tuviera que elegir uno: «El Principito». ¿Y el tuyo?',
    'Me atrapan las novelas que empiezan fuerte. Ahora ando con García Márquez. ¿Y tú?',
    'Difícil elección, pero «Cien años de soledad» siempre está en mi lista. ¿Tienes un favorito?'
];

const nombreBonito = (t) =>
    t
        .split(' ')
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');

const conNombre = (texto, nombre) => texto.replace('{n}', nombre ? `, ${nombre}` : '');

function personalidad(q, memoria = {}) {
    const nombre = memoria.nombre;
    const m = /^(?:me llamo|mi nombre es|puedes llamarme|llamame)\s+([a-z]{2,20}(?:\s+[a-z]{2,20})?)$/.exec(q);
    if (m) {
        const n = nombreBonito(m[1]);
        return {
            texto: `¡Mucho gusto, ${n}! 😊 Me encanta conocer a nuevos lectores. ¿Qué te gustaría leer hoy?`,
            recordar: { nombre: n },
            sugerencias: ['Recomiéndame algo', 'Cuéntame un chiste']
        };
    }
    if (/\b(como me llamo|sabes (?:como me llamo|mi nombre)|te acuerdas de mi|recuerdas mi nombre)\b/.test(q))
        return { texto: nombre ? `¡Claro que me acuerdo! Eres ${nombre}. 😄` : 'Todavía no me lo has dicho… ¿cómo te llamas? Dime «me llamo…» y no lo olvido.' };
    if (/^(?:gracias|muchas gracias|mil gracias|te pasaste|grax|thanks)\b/.test(q)) return { texto: conNombre(azar(GRACIAS), nombre) };
    if (/\b(me voy a dormir|ya me voy a dormir|buenas noches me voy|hasta manana)\b/.test(q)) return { texto: conNombre(azar(DORMIR), nombre) };
    if (/^(?:chau|chao|adios|hasta luego|nos vemos|bye|me voy)\b/.test(q)) return { texto: conNombre(azar(ADIOS), nombre) };
    if (/\b(tu libro favorito|que te gusta leer|que lees|que estas leyendo|cual es tu favorito|te gusta leer)\b/.test(q)) return { texto: azar(FAVORITOS) };
    if (/\b(de donde eres|donde vives|donde estas)\b/.test(q))
        return { texto: 'Vivo entre los estantes de MATIDANA, en Pallasca, Áncash. 🏔️ Lleno de buenas historias.' };
    if (/\b(cuantos anos tienes|tu edad|que edad tienes)\b/.test(q))
        return { texto: 'Joven en años, viejo en lecturas. 📚 Tantos años como páginas he leído… y ya perdí la cuenta.' };
    if (/\b(estas vivo|eres real|tienes sentimientos|sientes|tienes corazon|eres humano)\b/.test(q))
        return { texto: 'Soy virtual, pero cuando alguien halla su libro ideal siento algo parecido a la alegría. 😊' };
    if (/^(?:estas ahi|sigues ahi|hay alguien|me escuchas|me lees|holaa+|alo)\b/.test(q))
        return { texto: `¡Aquí estoy${nombre ? `, ${nombre}` : ''}! 👋 Siempre atento. ¿Qué buscamos?` };
    if (/\b(que haces|que estas haciendo|en que andas)\b/.test(q)) return { texto: 'Ordenando estantes imaginarios y esperando que alguien me pida un buen libro… ¿serás tú? 😄' };
    if (/\b(cantas|bailas|sabes cantar|sabes bailar)\b/.test(q)) return { texto: 'Cantar no es lo mío… pero recito sinopsis como nadie. 🎤📚 ¿Te busco una?' };
    if (/\b(eres (?:bonito|lindo|guapo|tierno|chevere|bacan)|que lindo|me gustas)\b/.test(q))
        return { texto: '¡Ay, me sonrojé! ☺️ Pero los verdaderamente bonitos son los libros del catálogo. ¿Te muestro alguno?' };
    if (/^(?:si|claro|dale|ya|bueno|obvio|por supuesto)$/.test(q))
        return {
            texto: '¡Genial! Dime título, autor o tema y lo busco. También recomiendo según tu ánimo.',
            sugerencias: ['Recomiéndame algo', 'Ver ofertas']
        };
    if (/^(?:no|nada|no gracias|ninguno)$/.test(q)) return { texto: '¡Está bien! Aquí estaré cuando quieras buscar tu próxima lectura. 📖' };
    return null;
}

function charlaLocal(q, memoria) {
    if (!q) return null;
    const propio = personalidad(q, memoria);
    if (propio) return propio;
    if (/^(?:como (?:estas|esta|te va|andas|vas|te encuentras|amaneciste)|que tal|todo bien|que (?:hay|cuentas|haces)|como va todo)\b/.test(q))
        return { texto: azar(ESTADO) };
    if (/\b(quien eres|que eres|como te llamas|tu nombre|eres (?:un )?(?:robot|bot|humano|persona|ia|inteligencia artificial)|con quien hablo)\b/.test(q))
        return { texto: azar(IDENTIDAD) };
    if (/\b(chiste|chistes|hazme reir|algo gracioso|algo divertido|cuentame algo chistoso|me haces reir)\b/.test(q))
        return { texto: azar(CHISTES), sugerencias: ['Otro chiste', 'Cuéntame una historia'] };
    if (
        /\b(historia|historias|cuento|cuentos|relato|relatos|cuentame algo)\b/.test(q) &&
        /\b(cuenta|cuentame|narra|narrame|dime|quiero|una|un)\b/.test(q) &&
        !/\b(libro|libros)\s+de\s+historia\b/.test(q) &&
        !/\bcategoria\b/.test(q)
    )
        return { texto: azar(HISTORIAS), sugerencias: ['Libros de cuentos', 'Otra historia'] };
    if (/\b(dato curioso|datos curiosos|curiosidad|curiosidades|sabias que|algo interesante)\b/.test(q))
        return { texto: azar(DATOS), sugerencias: ['Otro dato curioso', 'Cuéntame un chiste'] };
    if (/^(?:te quiero|eres (?:genial|lo maximo|buenisimo|increible|el mejor|muy util|inteligente)|me caes bien|buen trabajo|excelente)\b/.test(q))
        return { texto: '¡Gracias! Me alegra mucho ayudarte. 😊 ¿Buscamos tu próxima lectura?' };
    if (/\b(tonto|idiota|inutil|estupido|no sirves|malo)\b/.test(q) && q.split(' ').length <= 6)
        return { texto: 'Lamento no ayudarte como esperabas. Dime qué libro o dato buscas y lo intento de nuevo.' };

    if (/\b(que horas? (?:es|son)|dime la hora|me (?:das|dices) la hora|la hora porfa|tienes hora)\b/.test(q) && !/\b(abren|cierran|atienden|horario|a que hora)\b/.test(q)) {
        const hora = new Date().toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
        return { texto: `Son las ${hora}${hora.endsWith('.') ? '' : '.'} ${azar(HORA_DE_LEER)}`, sugerencias: ['Recomiéndame algo', 'Ver ofertas'] };
    }
    if (/\b(que dia es|que fecha es|hoy que fecha|que dia es hoy)\b/.test(q))
        return {
            texto: `Hoy es ${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}. ¡Un día perfecto para estrenar un libro nuevo! 📖`,
            sugerencias: ['Recomiéndame algo']
        };
    for (const animo of ANIMO) if (animo.patron.test(q)) return { texto: animo.texto, consulta: animo.consulta };
    return null;
}

export function responderCharla(pregunta, memoria = {}) {
    const crudo = normalizarConsulta(pregunta);

    if (/^(?:(?:ja|je|ji|jo)+[as]*|xd+|lol|jsjs+|ajaj+a*)(?:\s+(?:ja|je|xd)+)*$/.test(crudo) || /^[\s😂🤣😄😆😁]+$/u.test(String(pregunta).trim()))
        return { texto: azar(RISAS), sugerencias: ['Otro chiste', 'Recomiéndame algo'] };
    const q = quitarRelleno(pregunta);

    if (/^(?:otro|otra|uno mas|una mas)\s+(?:chiste|historia|cuento|dato(?: curioso)?)$/.test(q)) {
        if (/chiste/.test(q)) return { texto: azar(CHISTES), sugerencias: ['Otro chiste', 'Cuéntame una historia'] };
        if (/dato/.test(q)) return { texto: azar(DATOS), sugerencias: ['Otro dato curioso'] };
        return { texto: azar(HISTORIAS), sugerencias: ['Otra historia', 'Libros de cuentos'] };
    }
    const respuesta = charlaLocal(q, memoria);

    if (respuesta?.recordar?.nombre) {
        const m = /(?:me llamo|mi nombre es|puedes llamarme|ll[aá]mame)\s+(\p{L}{2,20}(?:\s+\p{L}{2,20})?)/iu.exec(String(pregunta));
        if (m) {
            const n = m[1]
                .split(/\s+/)
                .map((p) => p.charAt(0).toLocaleUpperCase('es') + p.slice(1).toLocaleLowerCase('es'))
                .join(' ');
            respuesta.texto = respuesta.texto.replace(respuesta.recordar.nombre, n);
            respuesta.recordar.nombre = n;
        }
    }
    return respuesta;
}

const NO_ENTENDI = [
    'Mmm, no te entendí. Puedo buscar libros, ofertas o contarte un chiste. ¿Qué te gustaría?',
    'Se me escapó lo que quisiste decir. Prueba con «libros de Vargas Llosa» o «cuéntame un chiste».'
];

export const respuestaNoEntendi = () => azar(NO_ENTENDI);

export function saludoDelMomento(fecha = new Date()) {
    const h = fecha.getHours();
    if (h < 5) return '¡Hola, lector nocturno! 🌙';
    if (h < 12) return '¡Buenos días! ☀️';
    if (h < 19) return '¡Buenas tardes!';
    return '¡Buenas noches! 🌙';
}

const EMPUJONES = [
    '¿Sigues por ahí? 👀 Si no sabes qué leer, dime cómo te sientes y te recomiendo algo.',
    'Psst… 📚 ¿Te cuento un dato curioso de libros mientras decides?',
    'Aquí sigo. Escríbeme como a un amigo: «búscame misterio» o «qué me recomiendas»…'
];

export const empujon = () => azar(EMPUJONES);
