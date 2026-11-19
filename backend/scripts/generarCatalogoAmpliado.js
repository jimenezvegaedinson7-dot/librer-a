const fs = require('fs');
const path = require('path');

const SALIDA = path.join(__dirname, '..', 'database', 'seeds', 'libros-catalogo-ampliado.json');
const ORIGINAL = path.join(__dirname, '..', 'database', 'seeds', 'libros-catalogo.json');

const COMPLEMENTOS = ['sal', 'viento', 'luz', 'niebla', 'tinta', 'mar'];

const CATEGORIAS = [
    {
        nombre: 'Cómic y Manga',
        cantidad: 60,
        autores: ['Dario Quintana', 'Mina Rojas'],
        bases: ['El claustro', 'La máscara', 'Los astros', 'El duelo', 'La ciudadela', 'Un verano', 'El dragón', 'La espada', 'Las sombras', 'El taller']
    },
    {
        nombre: 'Ficción',
        cantidad: 60,
        autores: ['Alba Ferrer', 'Mateo Ríos'],
        bases: ['El mapa', 'La casa', 'Los días', 'El río', 'La ventana', 'Un invierno', 'La ciudad', 'El jardín', 'Las cartas', 'El viaje']
    },
    {
        nombre: 'Infantil',
        cantidad: 60,
        autores: ['Lucía Pardo', 'Bruno Cisne'],
        bases: ['El osito', 'La luna', 'Los colores', 'El bosque', 'La abuela', 'Un cuento', 'La escuela', 'El globo', 'Las estrellas', 'El parque']
    },
    {
        nombre: 'Juvenil',
        cantidad: 60,
        autores: ['Lucía Pardo', 'Bruno Cisne'],
        bases: ['El instituto', 'La amistad', 'Los secretos', 'El primer amor', 'La mudanza', 'Un verano', 'La banda', 'El concurso', 'Las notas', 'El viaje']
    },
    {
        nombre: 'No Ficción',
        cantidad: 60,
        autores: ['Rocío Ibáñez', 'Tomás Aguirre'],
        bases: ['El método', 'La memoria', 'Los datos', 'El cuerpo', 'La economía', 'Una historia', 'La mente', 'El trabajo', 'Las ideas', 'El futuro']
    },
    {
        nombre: 'Animación',
        cantidad: 50,
        autores: ['Lucía Pardo', 'Bruno Cisne'],
        bases: ['El estudio', 'La escena', 'Los fotogramas', 'El personaje', 'La secuencia', 'Un guion', 'La voz', 'El color', 'Las capas', 'El estreno']
    },
    {
        nombre: 'Arte',
        cantidad: 50,
        autores: ['Rocío Ibáñez', 'Tomás Aguirre'],
        bases: ['El museo', 'La pintura', 'Los maestros', 'El taller', 'La colección', 'Un retrato', 'La luz', 'El grabado', 'Las formas', 'El taller']
    },
    {
        nombre: 'Biografía',
        cantidad: 50,
        autores: ['Rocío Ibáñez', 'Tomás Aguirre'],
        bases: ['El retrato', 'La infancia', 'Los años', 'El archivo', 'La carta', 'Un viaje', 'La vida', 'El legado', 'Las memorias', 'El encuentro']
    },
    {
        nombre: 'Ciencia ficción',
        cantidad: 50,
        autores: ['Sofía Landa', 'Emilio Vargas'],
        bases: ['La nave', 'El planeta', 'Los androides', 'El futuro', 'La estación', 'Un viaje', 'La señal', 'El tiempo', 'Las colonias', 'El horizonte']
    },
    {
        nombre: 'Ciencias',
        cantidad: 50,
        autores: ['Rocío Ibáñez', 'Tomás Aguirre'],
        bases: ['El laboratorio', 'La célula', 'Los elementos', 'El clima', 'La teoría', 'Un experimento', 'La energía', 'El genoma', 'Las estrellas', 'El océano']
    },
    {
        nombre: 'Cómic',
        cantidad: 50,
        autores: ['Dario Quintana', 'Mina Rojas'],
        bases: ['La viñeta', 'El héroe', 'Los globos', 'El entintado', 'La portada', 'Un episodio', 'La serie', 'El personaje', 'Las planchas', 'El color']
    },
    {
        nombre: 'Cuento',
        cantidad: 50,
        autores: ['Alba Ferrer', 'Mateo Ríos'],
        bases: ['El relato', 'La anécdota', 'Los cuentos', 'El final', 'La voz', 'Un encuentro', 'La ciudad', 'El tren', 'Las cartas', 'El domingo']
    },
    {
        nombre: 'Ensayo',
        cantidad: 50,
        autores: ['Inés Salazar', 'Rafael Llerena'],
        bases: ['La idea', 'El ensayo', 'Los conceptos', 'La lectura', 'La cultura', 'Un debate', 'La memoria', 'El lenguaje', 'Las palabras', 'El tiempo']
    },
    {
        nombre: 'Fantasía',
        cantidad: 50,
        autores: ['Sofía Landa', 'Emilio Vargas'],
        bases: ['El bosque', 'La torre', 'Los hechizos', 'El dragón', 'La profecía', 'Un reino', 'La espada', 'El portal', 'Las hadas', 'El grimorio']
    },
    {
        nombre: 'Historia',
        cantidad: 50,
        autores: ['Rocío Ibáñez', 'Tomás Aguirre'],
        bases: ['El imperio', 'La batalla', 'Los reyes', 'El tratado', 'La ciudad', 'Un siglo', 'La cronología', 'El archivo', 'Las ruinas', 'El calendario']
    },
    {
        nombre: 'Historietas',
        cantidad: 50,
        autores: ['Dario Quintana', 'Mina Rojas'],
        bases: ['La tira', 'El gag', 'Los personajes', 'El guion', 'La viñeta', 'Un capítulo', 'La historieta', 'El dibujo', 'Las planchas', 'El humor']
    },
    {
        nombre: 'Misterio / Suspenso',
        cantidad: 50,
        autores: ['Néstor Arce', 'Vera Lemos'],
        bases: ['El caso', 'La pista', 'Los testigos', 'El crimen', 'La noche', 'Un secreto', 'La casa', 'El silencio', 'Las huellas', 'El final']
    },
    {
        nombre: 'Novela',
        cantidad: 50,
        autores: ['Alba Ferrer', 'Mateo Ríos'],
        bases: ['La herencia', 'El pueblo', 'Los vecinos', 'El verano', 'La verdad', 'Un regreso', 'La hermana', 'El secreto', 'Las cartas', 'La playa']
    },
    {
        nombre: 'Poesía',
        cantidad: 50,
        autores: ['Inés Salazar', 'Rafael Llerena'],
        bases: ['El poema', 'La luz', 'Los versos', 'El silencio', 'La lluvia', 'Un suspiro', 'La rosa', 'El viento', 'Las palabras', 'La noche']
    },
    {
        nombre: 'Romance',
        cantidad: 50,
        autores: ['Sofía Landa', 'Emilio Vargas'],
        bases: ['El encuentro', 'La promesa', 'Los novios', 'El beso', 'La carta', 'Un verano', 'La boda', 'El regreso', 'Las flores', 'El destino']
    },
    {
        nombre: 'Terror',
        cantidad: 50,
        autores: ['Néstor Arce', 'Vera Lemos'],
        bases: ['La sombra', 'El grito', 'Los muertos', 'La casa', 'El bosque', 'Un susurro', 'La máscara', 'El sótano', 'Las voces', 'La noche']
    }
];

const digitoControl = (doceDigitos) => {
    let suma = 0;
    for (let i = 0; i < 12; i++) suma += Number(doceDigitos[i]) * (i % 2 === 0 ? 1 : 3);
    return (10 - (suma % 10)) % 10;
};

const esbnValido = (valor) => {
    const digits = String(valor || '').replace(/[^0-9]/g, '');
    if (!/^\d{13}$/.test(digits)) return false;
    return digitoControl(digits.slice(0, 12)) === Number(digits[12]);
};

const originales = JSON.parse(fs.readFileSync(ORIGINAL, 'utf8'));
const isbnsUsados = new Set(originales.libros.map((libro) => String(libro.isbn).replace(/[^0-9]/g, '')));
const libros = [];
let consecutivo = 600000000000;

for (const categoria of CATEGORIAS) {
    const complementos = categoria.cantidad === 60 ? COMPLEMENTOS : COMPLEMENTOS.slice(0, 5);

    for (let indice = 0; indice < categoria.cantidad; indice++) {
        const base = categoria.bases[indice % categoria.bases.length];
        const complemento = complementos[Math.floor(indice / categoria.bases.length) % complementos.length];
        const autor = categoria.autores[indice % categoria.autores.length];
        const cuerpo = String(consecutivo++);
        const isbn = `${cuerpo}${digitoControl(cuerpo)}`;

        if (isbnsUsados.has(isbn) || !esbnValido(isbn)) throw new Error(`ISBN inválido o repetido: ${isbn}`);
        isbnsUsados.add(isbn);

        libros.push({
            isbn,
            titulo: `${base} de ${complemento} (${categoria.nombre})`,
            autor,
            categoria: categoria.nombre,
            precio: Number((18 + ((indice * 7) % 42) + 0.9).toFixed(2)),
            descuento_porcentaje: indice % 4 === 0 ? 10 + (indice % 3) * 5 : null,
            stock: 12 + (indice % 25),
            descripcion: `Obra de muestra del catálogo ampliado de MATIDANA en ${categoria.nombre}.`
        });
    }
}

const catalogo = {
    generado_por: 'scripts/generarCatalogoAmpliado.js',
    fuente: 'Catálogo de demostración generado localmente',
    nota: 'Títulos y autores de muestra para poblar la navegación y los libros relacionados; ISBN-13 válido por checksum y único.',
    total: libros.length,
    categorias: CATEGORIAS.map(({ nombre, cantidad, autores }) => ({ nombre, cantidad, autores })),
    libros
};

fs.writeFileSync(SALIDA, `${JSON.stringify(catalogo, null, 2)}\n`, 'utf8');
console.log(`✅ ${libros.length} libros en ${CATEGORIAS.length} categorías → ${path.relative(process.cwd(), SALIDA)}`);
