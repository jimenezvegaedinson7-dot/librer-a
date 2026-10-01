---
name: Librería del Saber — Web pública
description: Librería comercial clara y ordenada, en verde de marca sobre fondos blancos, con un libro 3D en el hero que pasa sus hojas al acercar el cursor.
colors:
  verde-900: "#013a33"
  marco: "#013a33"
  marco-texto: "#dfe6dd"
  marco-tenue: "#b8c9c2"
  verde-700: "#004d43"
  verde-600: "#0b5c51"
  salvia-100: "#dfe6dd"
  salvia-50: "#f2f6f4"
  ambar-500: "#ebaa20"
  blanco: "#ffffff"
  gris-50: "#f7f7f7"
  gris-100: "#f3f3f3"
  gris-300: "#cfcfcf"
  gris-500: "#757575"
  gris-700: "#4a4a4a"
  negro: "#111111"
typography:
  display:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(2rem, 1.35rem + 2.3vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.5rem, 1.3rem + 0.7vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(1rem, 0.96rem + 0.2vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
  meta:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  tapa: "2px 4px 4px 2px"
  control: "6px"
  tarjeta: "8px"
  panel: "12px"
  telefono: "44px"
  pildora: "999px"
spacing:
  e-2: "1rem"
  e-3: "1.5rem"
  e-4: "2.5rem"
  e-5: "4rem"
  gutter: "clamp(16px, 4vw, 56px)"
  seccion: "clamp(2.75rem, 2rem + 3vw, 5rem)"
  ancho: "1280px"
components:
  button-primary:
    backgroundColor: "{colors.verde-700}"
    textColor: "{colors.blanco}"
    typography: "{typography.body}"
    rounded: "{rounded.pildora}"
    padding: "0 1.5rem"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.verde-900}"
    textColor: "{colors.blanco}"
  button-white:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.verde-700}"
    rounded: "{rounded.pildora}"
    padding: "0 1.5rem"
    height: "48px"
  button-white-hover:
    backgroundColor: "{colors.salvia-100}"
    textColor: "{colors.verde-700}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.negro}"
    rounded: "{rounded.pildora}"
    padding: "0 1.5rem"
    height: "48px"
  button-small:
    backgroundColor: "{colors.verde-700}"
    textColor: "{colors.blanco}"
    typography: "{typography.label}"
    rounded: "{rounded.pildora}"
    padding: "0 1rem"
    height: "38px"
  search-field:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.negro}"
    rounded: "{rounded.control}"
    padding: "0 0.9rem"
    height: "44px"
  chip:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.verde-700}"
    typography: "{typography.label}"
    rounded: "{rounded.pildora}"
    padding: "0 0.95rem"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.verde-700}"
    textColor: "{colors.blanco}"
  card-book:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.negro}"
    rounded: "{rounded.tarjeta}"
    padding: "14px"
  badge-category:
    backgroundColor: "{colors.salvia-100}"
    textColor: "{colors.verde-700}"
    rounded: "{rounded.pildora}"
    padding: "0.15rem 0.55rem"
  badge-ambar:
    backgroundColor: "{colors.ambar-500}"
    textColor: "{colors.negro}"
    rounded: "{rounded.pildora}"
    padding: "0.15rem 0.55rem"
  announcement-bar:
    backgroundColor: "{colors.salvia-100}"
    textColor: "{colors.verde-700}"
    typography: "{typography.label}"
    height: "44px"
  green-strip:
    backgroundColor: "{colors.verde-700}"
    textColor: "{colors.blanco}"
    typography: "{typography.label}"
    height: "40px"
  footer:
    backgroundColor: "{colors.marco}"
    textColor: "{colors.salvia-100}"
---

# Design System: Librería del Saber — Web pública

Alcance: la web pública (`src/public-site/`, todo bajo la clase raíz `.sitio`, tokens en `public-site.css`). El panel administrativo (`src/features/**`, `src/styles/theme.css`) es una superficie hermana con su propio sistema; este documento no lo describe.

## Overview

**Creative North Star: "La librería que pasa sus hojas"**

Una librería comercial de barrio grande, clara y ordenada: fondos blancos y gris claro, verde oscuro para la marca y para cada acción, y un acento ámbar mínimo. La navegación se lee como la de una librería en línea real: barra de avisos en verde oscuro, cabecera blanca con buscador y un menú con separadores finos. Cada entrada del menú es una página propia con migas de pan.

La densidad es de comercio, no de revista: tipografía Work Sans compacta en una sola familia, tarjetas blancas con borde fino y radio pequeño, botones en píldora. El único gesto espectacular vive en el hero: un libro 3D de cuero verde, cerrado en reposo, que sigue al cursor y, con el cursor encima, se abre y pasa sus hojas una a una. Todo el movimiento es de salida suave y se apaga con `prefers-reduced-motion`.

La paleta es verde, blanca y gris; el ámbar es escaso a propósito. No hay marrón, burdeos ni rosa en la interfaz.

**Key Characteristics:**
- Una sola familia tipográfica (Work Sans 400/500/600/700), jerarquía por tamaño y peso.
- Verde #004d43 para marca, enlaces y botones; verde #013a33 para pie, hover y profundidad.
- Ámbar solo en la cinta del libro 3D y en distintivos pequeños.
- Tarjetas blancas, borde gris fino, radio 8px; sombras suaves que aparecen al pasar el cursor.
- Zonas oscuras (`.oscuro`) que invierten los tokens semánticos de texto y borde sobre verde.
- Logo "f" en verde sobre claro, en blanco sobre verde.

## Colors

Verde profundo y blancos de tienda, con un único acento ámbar escaso.

### Primary
- **Verde Librería** (verde-700): marca, enlaces del menú y de migas, botón principal, chip seleccionado, fondo del hero y de las zonas `.oscuro`, anillo de foco.
- **Verde Encuadernación** (verde-900): hover de botones, fondo de la tercera promo, extremo inferior del degradado del hero, enlace destacado del menú.
- **Verde Luz** (verde-600): solo el resplandor radial del hero y el énfasis `em` de las frases tipográficas grandes.

### Secondary
- **Ámbar Marcapáginas** (ambar-500): la cinta de seda que cuelga del libro 3D y los distintivos pequeños ("Agotado", "Tu equipo"), siempre con texto negro.

### Marco
- **Verde Marco** (marco, mismo tono que verde-900): barra de avisos superior y pie de página; enmarca la página con el verde oscuro de la marca. Texto claro (marco-texto) y legal tenue (marco-tenue), ambos con contraste AA.

### Neutral
- **Blanco** (blanco): fondo base, cabecera, tarjetas, botón invertido sobre verde.
- **Salvia** (salvia-100): barra de avisos, fondo del distintivo de categoría, texto secundario y del pie sobre verde, hover del botón blanco.
- **Salvia Pálida** (salvia-50): bandas `.salvia`, opción de entrega seleccionada, ítem activo del cajón móvil.
- **Gris Papel** (gris-50, gris-100): fondo de recortes de pantallas, migas, bandas `.gris`, pie del cajón, fondo de tapas mientras cargan.
- **Gris Filete** (gris-300): bordes de tarjetas, buscador, chips, separadores del menú.
- **Gris Nota** (gris-500): texto terciario (autor, resultados, notas) sobre blanco.
- **Gris Texto** (gris-700): texto secundario sobre claro.
- **Tinta** (negro): texto principal y precios.

### Named Rules
**The Ámbar Escaso Rule.** El ámbar solo aparece en la cinta del libro 3D y en distintivos de una o dos palabras. Nunca en botones, fondos de sección, títulos ni enlaces.

**The Zona Oscura Rule.** Sobre verde no se pintan colores a mano: la clase `.oscuro` redefine `--texto`, `--texto-2`, `--texto-3` y `--borde`, y los componentes leen los tokens semánticos.

## Typography

**Display Font:** Work Sans (autoalojada en public/fonts, declarada y precargada desde index.html) (con ui-sans-serif, system-ui, Segoe UI)
**Body Font:** Work Sans
**Label Font:** Work Sans

**Character:** Una sans humanista, compacta y comercial, en cuatro pesos autoalojados (@fontsource, latin 400/500/600/700). La escala práctica es 28/20/16/14, con el hero como único tamaño mayor.

### Hierarchy
- **Display** (700, clamp 32–52px, 1.1, -0.01em): solo el titular del hero, en líneas cortas (máx. 14ch) que se revelan línea a línea.
- **Headline** (700, clamp 24–28px, 1.2): título de cada página y de las secciones (máx. 30ch), sobre un filete inferior.
- **Title** (700, 20px, 1.2): títulos de ventajas (en verde de marca), tarjetas de descarga; las promos usan clamp 20–24px.
- **Lead** (400, clamp 16–18px, 1.55): entradilla bajo títulos, máx. 62ch (44ch en el hero).
- **Body** (400, 16px, 1.5): texto corrido; párrafos con `text-wrap: pretty`, títulos con `balance`.
- **Label** (600, 14px): menú, barra de avisos, franja, enlaces de cabecera, chips.
- **Meta** (400, 13px): migas, notas, estado de descarga, legal del pie.

Los precios van en 700, 16px, negro, con cifras tabulares; los títulos de libro en 500, 16px, recortados a dos líneas.

### Named Rules
**The Una Familia Rule.** Todo el sitio, incluido el texto pintado en las texturas del libro 3D, usa Work Sans. La jerarquía se construye con tamaño y peso, sin segunda familia ni mayúsculas decorativas.

## Layout

Contenedor centrado de ancho máximo 1280px con márgenes laterales fluidos (gutter de 16 a 56px). El ritmo vertical de sección es fluido (44 a 80px); dentro de las secciones la escala es 16 / 24 / 40 / 64px.

- **Cabecera** en tres bandas: avisos (44px, verde oscuro con texto claro), cabecera principal blanca y pegajosa (76px: logo, buscador de hasta 640px, "Nuestra tienda", "Descargar app") y menú (44px) con separadores verticales de 1px. La cabecera gana una sombra suave al desplazarse.
- **Hero**: rejilla 5/7 (texto a la izquierda, escena 3D a la derecha), alto mínimo min(640px, 76svh). Fondo animado propio, sin imágenes (sections/HeroFondo.jsx): degradado esmeralda luminoso (#01362f a #0a7563) con resplandores esmeralda, ámbar y turquesa, aurora que respira, tres haces de luz que barren despacio desde arriba y 14 burbujas de vidrio (7 en móvil) que suben con vaivén; un velo verde a la izquierda mantiene el texto sereno. Quieto con movimiento reducido.
- **Páginas interiores**: migas de pan en banda gris, luego la sección con cabecera (título + filete) y contenido.
- **Rejillas**: catálogo en `auto-fill` de mínimo 190px (dos columnas bajo 520px); carrusel horizontal con scroll-snap en el inicio; promos en 3 columnas; ventajas en 12 columnas alternando texto (5) y visual (6); descarga en 2 columnas; pie 2/1/1.
- **Responsive**: bajo 1024px desaparecen el menú y los enlaces de cabecera; aparece un botón de menú que abre un cajón lateral (máx. 360px) y el buscador baja a su propia fila; las rejillas pasan a una columna. Bajo 520px el botón de descarga de la cabecera queda solo con icono.

## Elevation & Depth

Plano en reposo; la profundidad llega por capas tonales (blanco, gris, salvia, verde) y por sombras suaves y difusas, nunca duras. Las sombras son de dos clases: estructurales para objetos físicos (tapas de libro, teléfonos) y de respuesta para tarjetas al pasar el cursor.

### Shadow Vocabulary
- **Tarjeta** (`box-shadow: 0 12px 30px -18px rgba(0,0,0,0.25)`): tarjeta de libro al pasar el cursor; fichas ilustrativas en reposo.
- **Tapa** (`box-shadow: 0 14px 30px -12px rgba(0,0,0,0.35), 0 3px 8px -3px rgba(0,0,0,0.25)`): toda portada de libro.
- **Teléfono** (`box-shadow: 0 40px 80px -30px rgba(0,0,0,0.45), 0 12px 24px -12px rgba(0,0,0,0.3)`): marcos de teléfono con capturas reales de la app.
- **Cabecera** (`box-shadow: 0 4px 18px -10px rgba(0,0,0,0.3)`): solo cuando la página se ha desplazado.

### Named Rules
**The Objeto Físico Rule.** Solo lo que existe como objeto (un libro, un teléfono) o una ventana a algo real (el mapa) lleva sombra en reposo. Las tarjetas son planas con borde y se elevan al pasar el cursor.

## Shapes

Formas de tienda: radios pequeños y constantes, píldoras para lo que se pulsa.

- **Píldora** (999px): botones, chips, distintivos.
- **Tarjeta** (8px): tarjetas de libro, promos, fichas, tarjetas de descarga, avisos.
- **Control** (6px): buscador, botón de menú, enlace de salto.
- **Panel** (12px): recortes de capturas y opciones del selector de entrega.
- **Tapa** (2px 4px 4px 2px): portadas, con un degradado de lomo en el 7% izquierdo.
- **Teléfono** (44px): marco del teléfono, pantalla a 33px.

Bordes de 1px en gris filete; 1.5px en las opciones de entrega. Los separadores del menú son trazos verticales de 14px; las migas usan "›".

## Components

### Buttons
- **Shape:** píldora (999px), alto mínimo 48px, Work Sans 600 16px, icono opcional a 1.1em.
- **Primary:** verde librería con texto blanco; hover a verde encuadernación; al pulsar baja 1px.
- **Blanco:** sobre zonas verdes (hero, promos): fondo blanco, texto verde; hover salvia.
- **Línea:** transparente con borde del token semántico; hover con velo de 5% (10% blanco sobre verde).
- **Chico:** 38px de alto, 14px, padding 0 1rem. **Icono:** 44×44.
- **Enlace "más":** texto verde 600 con flecha que avanza 3px al pasar el cursor.

### Chips
- **Style:** píldora de 36px, borde gris filete, fondo blanco, texto verde 600 14px.
- **State:** hover con borde verde; seleccionado (`aria-pressed`) relleno verde con texto blanco. Filtran categorías en el catálogo.

### Cards / Containers
- **Tarjeta de libro:** blanco, borde gris filete, radio 8px, padding 14px (10px en móvil); tapa 2:3 con sombra de tapa, distintivo de categoría, título, autor, precio y botón a todo el ancho. Hover: sombra de tarjeta, borde #bdbdbd y la tapa sube 4px.
- **Libro del carrusel:** sin tarjeta; tapa de 150–200px que gira en perspectiva (-14°) y sube 6px al pasar el cursor.
- **Promo:** radio 8px, alto mínimo 320px; en verde, verde encuadernación o blanco con borde; captura de la app inclinada -8° asomando por la esquina.
- **Tarjeta de descarga:** blanco, borde gris; la plataforma del visitante se destaca con doble borde verde y el distintivo ámbar "Tu equipo".

### Inputs / Fields
- **Buscador:** 44px, borde gris filete, radio 6px, texto 14px, botón de lupa separado por un filete vertical.
- **Focus:** borde verde y halo de 3px rgba(0,77,67,0.15). Foco global de teclado: contorno verde de 2px con 3px de separación (blanco sobre zonas verdes).

### Navigation
- **Menú:** enlaces verdes 600 14px separados por filetes verticales; subrayado de 2px que crece desde la izquierda al pasar el cursor y queda fijo en la página actual. El ítem destacado va en verde encuadernación 700.
- **Cajón móvil:** panel blanco desde la izquierda sobre velo negro al 45%; filas de 16px con filete, ítem actual en salvia pálida, pie gris con datos.
- **Migas:** banda gris, 13px, enlaces verdes 600.
- **Pie:** verde encuadernación, texto salvia, títulos blancos 700 14px, logo blanco, legal sobre filete blanco al 20%.

### Pantalla de carga
Solo en las rutas públicas y en la primera carga. Vive en `index.html` (`#precarga`) para pintarse antes del JavaScript; la retira `components/Precarga.jsx` cuando la página está montada, las fuentes y el evento load están listos y no quedan recursos registrados (imagen del hero, primer cuadro del libro 3D). Sobria: fondo de papel claro (degradado radial de blanco a #ece6db), el logo "f" en verde (public/precarga/logo-f-verde.webp, 96 a 128px) que llega en cinco pedazos (recortes con clip-path) que se juntan en unos 0.75s y luego respira 5px cada 5s con un reflejo de luz recortado a su silueta, y debajo "Librería del Saber" en verde (700) y "Preparando tu experiencia de lectura...". Sin barras, partículas ni líneas doradas. Mínimo 800ms en pantalla (lo que tarda en unirse el logo), salida con opacidad en 380ms. Con movimiento reducido solo aparece, sin respiración ni reflejo.

### Cierre de descarga
Al final de las páginas que explican la app (Aplicación, Características): banda salvia pálida con borde gris filete y radio 8px, una frase en 600 y el botón principal "Descargar la app". Ninguna página termina sin salida.

### Promos del inicio
Tres tarjetas de radio 8px (verde, blanca con borde, verde encuadernación). Cuando llevan captura de la app, el texto ocupa como máximo el 58% del ancho (66% en móvil) y queda por encima de la imagen: la captura nunca tapa texto.

### Mapa de la tienda
En Nosotros, bloque con ancla `#tienda` (destino del enlace "Nuestra tienda" de la cabecera y del cajón móvil): título en verde, dirección con icono de ubicación, nota de recojo y botón chico "Cómo llegar"; a la derecha, mapa embebido de Google Maps (Plaza de Armas de Pallasca) en marco de tarjeta: borde gris filete, radio 8px, sombra de tarjeta, 16:10 (4:3 en móvil). Carga diferida.

### Libro 3D del hero (signature)
Libro de cuero verde granulado (con relieve y un leve brillo de entorno), lomo curvo y portada con filete gofrado y título "Librería del Saber" estampado en salvia; páginas de papel marfil con fibras, texto compuesto, folio y sombra del lomo. En reposo está cerrado, con la portada al frente; sigue al puntero y deja caer una cinta ámbar. Con el cursor encima se abre (≈0.5s) y, ya abierto, las hojas se pasan una por una en ráfagas cortas (65ms entre hojas, 0.26s de giro por hoja, curvadas en vuelo, pausa de 0.42s entre ráfagas); primero se levanta la hoja del ex libris. En pantallas táctiles (sin hover) aparece la pista "Toca el libro para abrirlo" (píldora verde translúcida, 13px); un toque abre el libro y otro toque, o tocar fuera, lo cierra. La parte baja del lienzo se desvanece (máscara 82% a 100%) para que la sombra de contacto no se corte en línea recta. Al retirar el cursor, las hojas en vuelo terminan su giro y el ex libris vuelve a la derecha en 0.6s y el libro se cierra. Las hojas proyectan sombra sobre las páginas. Se carga en tiempo libre, se pausa fuera de pantalla y tiene un póster WebP (720/1200) como respaldo y como versión sin 3D.

### Motion
Salida `cubic-bezier(0.16, 1, 0.3, 1)` (expo.out en GSAP), duraciones de 200ms (estados), 500ms (subrayados, sombras), 0.9–1.4s (revelados y escena). Los titulares se revelan línea a línea (1.1s, 90ms de escalonado); los libros entran subiendo 32px. Scroll suave con Lenis. Todo se reduce a 1ms con `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** usar Work Sans en todo, con la escala 28/20/16/14 y el hero como única excepción.
- **Do** pintar marca, enlaces y acciones en verde #004d43 y reservar #013a33 para pie, hover y profundidad.
- **Do** mantener las tarjetas blancas con borde fino #cfcfcf y radio 8px, y los botones y chips en píldora.
- **Do** envolver las zonas verdes en `.oscuro` para que texto y bordes se inviertan por token.
- **Do** dar a todo movimiento una versión quieta bajo `prefers-reduced-motion`.

### Don't:
- **Don't** usar el ámbar en botones, fondos, títulos o enlaces; es la cinta del libro 3D y los distintivos.
- **Don't** introducir marrón, burdeos ni rosa en la interfaz.
- **Don't** añadir una segunda familia tipográfica ni titulares en serif.
- **Don't** usar sombras duras o desplazadas; la profundidad es tonal o difusa.
- **Don't** convertir el acceso administrativo en algo más que un enlace discreto al final del pie (no va en la cabecera ni en el menú).
- **Don't** usar otra etiqueta para la acción principal: siempre "Descargar la app" ("Descargar para Android" solo donde se descarga el archivo).
