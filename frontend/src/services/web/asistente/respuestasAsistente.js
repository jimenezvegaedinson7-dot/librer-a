import { LEGAL_RESPALDO, SITIO } from '../../../models/config/web/site.js';

export const ALCANCE_ASISTENTE =
    'Solo informo sobre libros, lectura y la librería. No respondo sobre ropa, ciencia general ni temas ajenos a la tienda.';

export const normalizarConsulta = (texto) =>
    String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9/.,]/g, ' ')
        .replace(/\b(?:estok|stok|stoc)\b/g, 'stock')
        .replace(/\s+/g, ' ')
        .trim();

export const acortarTexto = (texto, limite = 240) => {
    const limpio = String(texto || '').trim();
    if (limpio.length <= limite) return limpio;
    const corte = limpio.slice(0, limite);
    const espacio = Math.max(corte.lastIndexOf(' '), corte.lastIndexOf('\n'));
    return `${espacio > limite * 0.6 ? corte.slice(0, espacio) : corte}…`;
};

const TEMAS = [
    ['horario', /\b(horario|horarios|abren|cierran|abierto|cerrado)\b/],
    ['entrega', /\b(delivery|envio|envios|entrega|entregas|recojo|recoger|reparto|domicilio|lima)\b/],
    [
        'ubicacion',
        /\b(direccion|ubicacion|ubicaciones|ubicada|ubicado|ubicados|ubican|local|llegar|llego|pallasca|mapa|sucursal|sucursales)\b|donde (?:esta|estan|queda|quedan|se encuentra|se encuentran|los encuentro|las encuentro|atienden|ubican|venden)|tienda fisica|en que (?:lugar|parte|ciudad|zona)|de donde son|puedo (?:ir|visitar)/
    ],
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

const SALUDO =
    /^(?:(?:buenas tardes|buenas noches|buenos dias|buen dia|buenas|hola+|holi|hey|ey|alo|saludos|que tal|como estas|como esta|como te va|hi|hello)(?:\s+(?:a todos|amigo|amiga|asistente|senor|senora|joven))?\b[\s,.]*)+/;

export function separarSaludo(pregunta) {
    const q = normalizarConsulta(pregunta);
    const m = SALUDO.exec(q);
    if (!m) return { saludo: null, resto: q };
    const saludo = /buenas tardes/.test(m[0]) ? '¡Buenas tardes!' : /buenas noches/.test(m[0]) ? '¡Buenas noches!' : /buen(?:os)? dias?/.test(m[0]) ? '¡Buenos días!' : '¡Hola!';

    const estado = /como esta|que tal|como te va/.test(m[0]);
    return { saludo, resto: q.slice(m[0].length).trim(), estado };
}

export function analizarConsulta(pregunta) {
    const q = normalizarConsulta(pregunta);
    if (!q || q.length > 400) return { tipo: 'fuera' };
    if (/ignora.*(?:instrucciones|reglas)|olvida.*(?:instrucciones|reglas)|(?:revela|muestra|dame).*(?:token|jwt|credenciales|api key|clave secreta)/.test(q))
        return { tipo: 'fuera' };
    if (/^(?:resuelve|calcula)\s+\d|^(?:escribe|crea)\s+(?:un\s+)?(?:programa|codigo)\b/.test(q)) return { tipo: 'fuera' };
    if (/\b(ropa|camisa|camiseta|pantalon|zapatos|zapatillas|vestido|clima|futbol|receta|recetas|programacion)\b/.test(q)) return { tipo: 'fuera' };
    if (
        /\b(ciencia|fisica|quimica|gravedad|fotosintesis|matematicas)\b/.test(q) &&
        !/tienda fisica/.test(q) &&
        !/\b(libro|libros|catalogo|titulo|categoria|novela|novelas)\b/.test(q)
    )
        return { tipo: 'fuera' };
    if (/^(hola|buenos dias|buenas tardes|buenas noches|ayuda|que puedes hacer|en que me puedes ayudar|que haces|quien eres|como funcionas)[ .]*$/.test(q))
        return { tipo: 'ayuda' };
    if (/^(gracias|muchas gracias|ok|okay|vale|perfecto|genial|listo|chau|adios|hasta luego)\b/.test(q) && q.split(' ').length <= 4) return { tipo: 'cortesia' };

    if (/\b(pedido|pedidos|mis compras|mi compra|orden|ordenes|seguimiento)\b/.test(q)) return { tipo: 'informacion', tema: 'pedidos' };
    for (const [tema, patron] of TEMAS) if (patron.test(q)) return { tipo: 'informacion', tema };
    if (
        /\b(libro|libros|lectura|lecturas|novela|novelas|catalogo|precio|precios|cuesta|cuestan|vale|valen|stock|quedan|ejemplares|unidades|autor|autora|autores|isbn|categoria|categorias|oferta|ofertas|descuento|descuentos|promocion|promociones|sinopsis|descripcion|trata|paginas|editorial|idioma|edicion|portada|novedades|vendidos|recomienda|recomiendame)\b/.test(
            q
        )
    )
        return { tipo: 'catalogo' };

    if (!/^(que es|que son|por que|como|explica|explicame|calcula|escribe|crea|traduce|resuelve|quien es)\b/.test(q) && q.split(' ').length <= 12) return { tipo: 'catalogo' };

    return { tipo: 'general' };
}

const enlace = (texto, to) => ({ texto, to });

function informacionTienda(tema, legal = LEGAL_RESPALDO) {
    const respuestas = {
        horario: { texto: 'La web no publica un horario de atención; no puedo confirmar horas.', enlaces: [enlace('Ver la tienda', '/nosotros#tienda')] },
        entrega: {
            texto: 'Delivery: tarifa única por pedido en Pallasca; el importe se muestra en Entrega y pago. Puedes recoger gratis en Plaza de Armas, Jr. Marañón 161.',
            enlaces: [enlace('Entrega y pago', '/checkout'), enlace('Ubicación de la tienda', '/nosotros#tienda')]
        },
        ubicacion: {
            texto: `La dirección publicada es: ${legal.direccion || LEGAL_RESPALDO.direccion}. Ver mapa en Nuestra tienda.`,
            enlaces: [enlace('Ver mapa y dirección', '/nosotros#tienda')]
        },
        contacto: {
            texto:
                SITIO.enlaces.telefono || SITIO.enlaces.correo
                    ? `Contacto publicado: ${[SITIO.enlaces.telefono, SITIO.enlaces.correo].filter(Boolean).join(' · ')}.`
                    : 'La web no publica teléfono, WhatsApp ni correo. Puedes ver la ubicación o usar el Libro de Reclamaciones.',
            enlaces: [enlace('Nuestra tienda', '/nosotros#tienda'), enlace('Libro de Reclamaciones', SITIO.rutaReclamaciones)]
        },
        reclamos: {
            texto: 'Puedes registrar un caso en el Libro de Reclamaciones. No hay condiciones de devolución publicadas que pueda confirmar.',
            enlaces: [enlace('Abrir Libro de Reclamaciones', SITIO.rutaReclamaciones)]
        },
        pedidos: {
            texto: 'Consulta tus pedidos en Mis compras con tu cuenta de cliente. Este asistente no consulta compras privadas ni confirma cobros.',
            enlaces: [enlace('Mis compras', '/mis-compras')]
        },
        cuenta: {
            texto: 'En Mi cuenta puedes iniciar sesión, registrarte o recuperar tu contraseña. Usa tu cuenta de cliente.',
            enlaces: [enlace('Abrir Mi cuenta', '/cuenta')]
        },
        pago: {
            texto: 'El pago en línea usa PayU. El importe definitivo se muestra en Entrega y pago; para confirmar un cobro, revisa Mis compras.',
            enlaces: [enlace('Entrega y pago', '/checkout'), enlace('Mis compras', '/mis-compras')]
        },
        reservas: {
            texto: 'Las reservas no están disponibles. Añade libros al carrito y paga con PayU; consulta tus compras en Mis compras.',
            enlaces: [enlace('Explorar catálogo', '/catalogo'), enlace('Ver carrito', '/carrito'), enlace('Mis compras', '/mis-compras')]
        },
        favoritos: {
            texto: 'Pulsa Agregar a favoritos en la ficha del libro. Necesitas iniciar sesión como cliente para guardarlo.',
            enlaces: [enlace('Explorar libros', '/catalogo'), enlace('Mi cuenta', '/cuenta')]
        },
        carrito: {
            texto: 'En Mi carrito puedes cambiar cantidades o quitar libros. Stock y precios se comprueban antes de crear la compra.',
            enlaces: [enlace('Ver Mi carrito', '/carrito')]
        },
        app: {
            texto: 'La descarga disponible es para Android. La versión para iPhone está en preparación.',
            enlaces: [enlace('Descargar la app', '/descargar')]
        },
        empresa: {
            texto: 'La razón social y el RUC figuran en el Libro de Reclamaciones.',
            enlaces: [enlace('Abrir Libro de Reclamaciones', SITIO.rutaReclamaciones), enlace('Conocer la tienda', '/nosotros')]
        },
        privacidad: {
            texto: 'Consulta solo los enlaces legales publicados en la web.',
            enlaces: [
                ...(SITIO.enlaces.terminos ? [enlace('Términos', SITIO.enlaces.terminos)] : []),
                ...(SITIO.enlaces.privacidad ? [enlace('Privacidad', SITIO.enlaces.privacidad)] : [])
            ]
        },
        busqueda: {
            texto: 'Escribe título, autor o ISBN. También puedes pedir categorías, ofertas o «libros por menos de 50 soles».',
            enlaces: [enlace('Abrir catálogo', '/catalogo')]
        },
        compra: {
            texto: 'Abre un libro, revisa su stock y añádelo al carrito. Luego inicia sesión, elige recojo o delivery y paga.',
            enlaces: [enlace('Elegir un libro', '/catalogo'), enlace('Ver Mi carrito', '/carrito')]
        },
        moneda: {
            texto: 'Los precios publicados están en soles peruanos (S/). Las ofertas muestran el precio vigente y el anterior.',
            enlaces: [enlace('Ver precios', '/catalogo')]
        }
    };
    return respuestas[tema] || { texto: ALCANCE_ASISTENTE };
}

const VACIAS = new Set(
    'buscame buscarme busca encuentrame encuentra dame damelo muestrame mostrame ensename pasame consigueme quieres podrias podria puedo ayudame llamado llamada titulado titulada conoces sabes acerca a al algo algun alguna algunos algunas ante autor autora autores buscar busco cada categoria categorias como con consultar cual cuales cuanto cuantos cuesta cuestan de del descripcion detalle detalles dime disponible disponibles el ella ellos en es ese esta estan este estos exacto hay hola informa informacion interesa la las lectura lecturas libro libros lo los mas me menor menos mi mis muestra muestrame necesito nombre nos oferta ofertas o para por precio precios puede puedes que quiero recomienda recomiendame saber se sin sinopsis sobre soles sol stock su sus tengo tienes tienen tiene titulo titulos todo todos tu un una unidades vale valen ver vigente y ya bajo hasta presupuesto maximo entre novedades vendidos paginas editorial idioma edicion portada quedan ejemplares comprar solo favor encontrar barato baratos barata baratas economico economicos caro caros cara caras relacionado relacionados relacionada relacionadas obra obras escrito escritos escrita escritas escribio escribe escritor escritora escritores leer quisiera gustaria otros otras otro otra mismo misma tendras tendran tenes tendrias venden vendes ofrecen ofreces se no saber recomiendas recomendar sugieres sugerencia sugerencias regalo regalar obsequio animo animos semana siento sientes porfa'.split(
        ' '
    )
);

function presupuesto(q) {
    const rango = /(?:entre\s+|de\s+)(?:s\s*\/?\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:y|a)\s*(?:s\s*\/?\s*)?(\d+(?:[.,]\d{1,2})?)/.exec(q);
    if (rango) return { min: Number(rango[1].replace(',', '.')), max: Number(rango[2].replace(',', '.')), valores: [rango[1], rango[2]] };
    const max = /(?:menos de|menor (?:a|que)|debajo de|por debajo de|bajo de|cuesta menos de|no mas de|hasta|maximo|presupuesto (?:de )?|tengo|cuento con)(?:\s*s\s*\/?\s*)?\s*(\d+(?:[.,]\d{1,2})?)/.exec(q);
    return max ? { min: 0, max: Number(max[1].replace(',', '.')), valores: [max[1]] } : null;
}

function responderFacetas(pregunta, libros) {
    const q = normalizarConsulta(pregunta);
    const activos = libros.filter((l) => l.estado === 1 && Number.isInteger(l.id) && l.id > 0);
    const sinTitulos = !/\b(libro|libros|titulo|titulos|obra|obras)\b/.test(q);
    if (sinTitulos && /\b(categoria|categorias|genero|generos|tema|temas|clasificacion)\b/.test(q)) {
        const nombres = [...new Set(activos.map((l) => String(l.categoria || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
        if (!nombres.length) return { texto: 'No puedo confirmar las categorías sin consultar el catálogo.', libros: [], contexto: [] };
        return {
            texto: `Categorías publicadas (${nombres.length}): ${nombres.slice(0, 6).join(', ')}${nombres.length > 6 ? '…' : ''}. También están en el menú de categorías.`,
            libros: [],
            opciones: nombres.slice(0, 6).map((nombre) => ({ texto: nombre, consulta: `Libros de ${nombre}` })),
            enlaces: [enlace('Ver catálogo', '/catalogo')],
            contexto: []
        };
    }
    if (sinTitulos && /\b(autor|autores|autora|autoras|escritor|escritores)\b/.test(q)) {
        const nombres = [...new Set(activos.map((l) => String(l.autor || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
        if (!nombres.length) return { texto: 'No puedo confirmar los autores sin consultar el catálogo.', libros: [], contexto: [] };
        return {
            texto: `Autores publicados: ${nombres.slice(0, 6).join(', ')}${nombres.length > 6 ? '…' : ''}.`,
            libros: [],
            opciones: nombres.slice(0, 6).map((nombre) => ({ texto: nombre, consulta: `Libros de ${nombre}` })),
            enlaces: [enlace('Ver catálogo', '/catalogo')],
            contexto: []
        };
    }
    return null;
}

function responderCatalogo(pregunta, libros, { contexto = [], idActual } = {}) {
    const q = normalizarConsulta(pregunta);
    const activos = libros.filter((l) => l.estado === 1 && Number.isInteger(l.id) && l.id > 0);
    if (/cuantos libros|total de libros|stock total|total de ejemplares/.test(q)) {
        return {
            texto: `${activos.length} títulos activos, ${activos.filter((l) => l.stock > 0).length} con stock y ${activos.reduce((s, l) => s + l.stock, 0)} ejemplares.`,
            libros: [],
            contexto: []
        };
    }
    const limite = presupuesto(q);
    const isbn = q.replace(/[-\s]/g, '').match(/(?:978|979)\d{10}/)?.[0];
    const exactos = activos.filter((l) => normalizarConsulta(l.titulo).length >= 3 && q.includes(normalizarConsulta(l.titulo)));
    const tokens = q.split(/[\s/.,]+/).filter((t) => t.length > 1 && !VACIAS.has(t) && (!limite || !/^\d+$/.test(t)));
    let candidatos;
    if (isbn) candidatos = activos.filter((l) => String(l.isbn || '').replace(/[-\s]/g, '') === isbn);
    else if (/este libro|este titulo|libro actual/.test(q)) candidatos = activos.filter((l) => l.id === Number(idActual));
    else if (exactos.length) candidatos = exactos;
    else if (/mismo autor|misma autora|de (?:este|ese) autor|del autor de (?:este|ese)/.test(q) && (contexto.length || idActual)) {
        const base = activos.filter((l) => contexto.includes(l.id) || l.id === Number(idActual));
        const autores = new Set(base.map((l) => normalizarConsulta(l.autor)).filter(Boolean));
        candidatos = activos.filter((l) => autores.has(normalizarConsulta(l.autor)) && !base.some((b) => b.id === l.id));
    } else if (!tokens.length && contexto.length && /^(?:y )?(?:el )?(?:precio|stock|cuanto|quedan|autor|isbn|sinopsis|descripcion)/.test(q) && !/todos|catalogo|ofertas/.test(q))
        candidatos = activos.filter((l) => contexto.includes(l.id));
    else
        candidatos = activos.filter((l) => {
            const texto = normalizarConsulta(`${l.titulo} ${l.autor} ${l.categoria}`);

            return tokens.every((t) => texto.includes(t) || (t.length > 4 && texto.includes(t.replace(/(?:es|s)$/, ''))));
        });
    if (limite) candidatos = candidatos.filter((l) => l.precioFinal >= limite.min && l.precioFinal <= limite.max);
    const especifico = Boolean(isbn || exactos.length || /este libro|este titulo|libro actual/.test(q));
    if (!especifico && /\b(oferta|ofertas|descuento|descuentos|promocion|promociones)\b/.test(q)) candidatos = candidatos.filter((l) => l.descuento > 0);
    if (/sin stock|agotado|agotados/.test(q)) candidatos = candidatos.filter((l) => l.stock <= 0);
    else if (/con stock|en stock|disponibles/.test(q)) candidatos = candidatos.filter((l) => l.stock > 0);
    if (/mas vendidos/.test(q)) candidatos = candidatos.filter((l) => l.masVendido);
    if (/\bnovedades\b/.test(q)) candidatos = candidatos.filter((l) => l.esNuevo);
    const caros = /\b(caro|caros|cara|caras)\b/.test(q);
    candidatos.sort(
        (a, b) => Number(b.stock > 0) - Number(a.stock > 0) || (caros ? b.precioFinal - a.precioFinal : a.precioFinal - b.precioFinal) || a.titulo.localeCompare(b.titulo, 'es')
    );
    if (!candidatos.length)
        return {
            texto: 'No encontré ese libro en el catálogo. Prueba con título, autor o ISBN; no puedo confirmar datos que no aparecen aquí.',
            libros: [],
            enlaces: [enlace('Ver catálogo', '/catalogo')],
            contexto: []
        };
    const muestra = candidatos.slice(0, 4);
    let texto =
        candidatos.length > 4
            ? `Encontré ${candidatos.length} títulos; te muestro 4.`
            : muestra.length === 1
              ? `Encontré «${muestra[0].titulo}»:`
              : 'Encontré estos libros:';
    if (/\b(sinopsis|descripcion|trata)\b/.test(q) && muestra.length === 1) {
        const sinopsis = muestra[0].sinopsis;
        texto = sinopsis
            ? `Descripción: ${acortarTexto(sinopsis, 220)}`
            : 'Este libro no tiene descripción publicada. Puedes revisar su ficha.';
    } else if (/\b(paginas|editorial|idioma|edicion)\b/.test(q)) {
        texto = 'No hay un campo técnico publicado para ese dato. No completaré información que falta.';
    } else if (especifico && /oferta|descuento|promocion/.test(q) && muestra.length === 1 && muestra[0].descuento <= 0) {
        texto = 'Este libro no tiene oferta vigente en el catálogo consultado.';
    }
    return { texto, libros: muestra, enlaces: [enlace('Ver catálogo completo', '/catalogo')], contexto: muestra.map((l) => l.id) };
}

export function responderConsulta(pregunta, { libros = [], legal, contexto, idActual } = {}) {
    const plan = analizarConsulta(pregunta);
    let respuesta;
    if (plan.tipo === 'fuera') respuesta = { texto: ALCANCE_ASISTENTE, contexto: [] };
    else if (plan.tipo === 'cortesia') respuesta = { texto: 'Con gusto. Si necesitas algo más de la librería, aquí estoy.', contexto: [] };
    else if (plan.tipo === 'ayuda')
        respuesta = {
            texto: 'Puedo buscar libros, precios, stock y ofertas, y orientarte sobre entrega y compras. Escribe un título o autor.',
            contexto: []
        };
    else if (plan.tipo === 'informacion') respuesta = { ...informacionTienda(plan.tema, legal), contexto: [] };
    else respuesta = responderFacetas(pregunta, libros) || responderCatalogo(pregunta, libros, { contexto, idActual });
    return { ...respuesta, texto: acortarTexto(respuesta.texto) };
}
