---
name: Librería del Saber — Web pública
description: Librería comercial con portada espacial y navegación y footer claros inspirados en Ibero Librerías, sin franja superior.
colors:
  verde-900: "#033a2c"
  marco: "#033a2c"
  marco-texto: "#dfe6dd"
  marco-tenue: "#b8c9c2"
  verde-700: "#064e3b"
  marfil: "#fffdf7"
  dorado: "#d6a84b"
  tinta: "#17221d"
  verde-600: "#0b5c51"
  salvia-100: "#dfe6dd"
  salvia-50: "#f2f6f4"
  ambar-500: "#d6a84b"
  oferta: "#c2410c"
  oferta-fondo: "#ffedd5"
  oferta-sobre-oscuro: "#fdba74"
  blanco: "#ffffff"
  gris-50: "#f7f7f7"
  gris-100: "#f3f3f3"
  gris-300: "#cfcfcf"
  gris-500: "#757575"
  gris-700: "#4a4a4a"
  negro: "#17221d"
  portal-negro: "#060609"
  portal-texto: "#f1eee8"
  portal-luz: "#a48bcb"
  portal-metal: "#89808f"
  portal-borde: "#57515e"
  portal-texto-secundario: "#bdb4c4"
  novedades-papel: "#f7f1e8"
  novedades-tinta: "#342a21"
  novedades-nota: "#6b5947"
  novedades-luz: "#fffaf2"
  novedades-filete: "#bba58c"
  nav-fondo: "#f5f7f9"
  nav-marfil: "#ffffff"
  nav-tinta: "#24304b"
  nav-secundario: "#556078"
  nav-acento: "#00bfd6"
  nav-teal-legible: "#00788a"
  nav-filete: "#e4e8ee"
  nav-accion: "#24304b"
  nav-sobre-accion: "#ffffff"
  nav-hover: "#354563"
  nav-papel: "#ffffff"
  nav-seleccion: "#ccf0f4"
  nav-activo: "#e8f5f7"
  nav-hover-claro: "#e9edf3"
typography:
  navigation-label:
    fontFamily: "'Work Sans', sans-serif"
    fontSize: ".75rem"
    fontWeight: 600
    lineHeight: 1.5
  navigation-note:
    fontFamily: "'Work Sans', sans-serif"
    fontSize: ".6875rem"
    fontWeight: 400
    lineHeight: 1.7
  navigation-brand-mobile:
    fontFamily: "'Work Sans', sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.15
  editorial-display:
    fontFamily: "'Serif Editorial', 'Source Serif 4', Georgia, serif"
    fontSize: "clamp(3.25rem, 7vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.035em"
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
  buscador-comercial: "10px"
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
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.nav-secundario}"
---

# Design System: Librería del Saber — Web pública

Alcance: la web pública (`src/web/`, todo bajo la clase raíz `.sitio`, tokens en `public-site.css`). El panel administrativo (`src/panel/**`, `src/panel/estilos/theme.css`) es una superficie hermana con su propio sistema; este documento no lo describe.

## Overview

### Excepción vigente del inicio: portada espacial (20/10/2026)

La nueva instrucción del usuario sustituye el carrusel público inicial por `sections/portada3d/PortadaEspacial.jsx`: un único libro real con volumen Three.js, movimiento por scroll y audio opcional. Tras la última corrección del usuario, **toda la escena del libro usa fondo hueso cálido**, no negro; las cintas escultóricas conservan reflejos suaves. Su dirección concreta se documenta en `.impeccable/surfaces/src-public-site-sections-portada3d-portadaespacial-jsx.md`. Esta excepción prevalece sobre las descripciones históricas de «sin libro 3D» de este documento y del brief del carrusel. La administración de imágenes y videos permanece disponible; las demás superficies conservan su sistema visual.

El usuario confirmó después la dirección **Portal editorial**, tras revisar su video real: Source Serif 4 autoalojada para titulares, Work Sans para datos y controles y portal escultórico/volumétrico violeta. Los botones de la escena son blancos con texto marino y radio de 6px.

### Cabecera y footer vigentes: Ibero, sin franja superior (20/10/2026)

Se revisaron [El Virrey](https://www.elvirrey.com/) e [Ibero Librerías](https://www.iberolibrerias.com/) en navegador. Tras rechazar la primera interpretación marfil/cacao, el usuario eligió expresamente **Ibero como referencia principal**, con cabecera clara, buscador amplio, marino/turquesa y footer blanco en columnas. También pidió eliminar por completo la franja superior de delivery, recojo y pago. Esta decisión sustituye las anteriores paletas y la cinta animada.

- `components/public-header.css`: cabecera gris frío `#F5F7F9`, buscador blanco y botón marino `#24304B`; menú blanco con texto marino en mayúsculas compactas. Turquesa `#00BFD6` como acento y `#00788A` para texto/iconos que requieren contraste; bordes `#E4E8EE` y texto secundario `#556078`. El navbar no contiene franja superior, ticker ni CTA de descarga dominante.
- Marca y controles en Work Sans, con nombre en cursiva y monograma oficial; iconos de contorno Lucide. Buscador de 46px con botón interior de radio 6px; en móvil baja a una segunda fila. El contenedor conserva sus márgenes simétricos y ancho máximo, alineados con el título y los controles de la escena.
- En la portada 3D se muestra primero el libro a pantalla completa. Después de un gesto corto, el navbar fijo se despliega en tres capas: línea central, cuerpo con perspectiva y recorte vertical y enlaces. `estadoReveladoNavegacion` suaviza cada capa; el reloj GSAP lineal dura 1s al entrar y 0,5s al cerrar. No cambia la altura del canvas ni el recorrido del scroll.
- El foco de teclado revela inmediatamente los controles. Al saltar después de la escena, la navegación permanece disponible. Las páginas interiores conservan la cabecera sticky; movimiento reducido y respaldos estáticos mantienen la navegación normal visible.
- `components/PublicFooter.jsx` y `public-footer.css`: fondo blanco, títulos marinos y cuatro columnas (marca/dirección real, librería, cuenta y atención al cliente). Medios de pago existentes en una fila aparte; reclamaciones, enlaces de descarga y acceso administrativo funcionales. En móvil pasa a dos columnas, con identidad y atención a todo ancho, sin desbordamiento. El espacio de seguridad evita que el asistente tape los enlaces finales.
- Source Serif 4 permanece exclusivamente en los titulares de la experiencia editorial. El catálogo y sus botones de compra mantienen su estilo comercial existente. Se conservan los datos reales y solo se muestran contactos o enlaces legales configurados.

Estas decisiones vigentes prevalecen para portada, navegación y footer sobre la base histórica descrita a continuación, incluidos sus antiguos colores verdes, pie oscuro y banners iniciales. El scroll actual es nativo; Lenis permanece retirado.

### Movimiento editorial vigente: libro → estante → tienda

Refinamiento solicitado con Impeccable y referencias [Lusion](https://lusion.co/) y [Land-book](https://land-book.com/). Se toma la dirección de profundidad, composición y ritmo; no se incorporan código ni recursos de esas webs.

- **Momento principal:** el libro 3D y su coreografía reversible existente. Al llegar a novedades, un libro central despliega cuatro portadas reales hacia ambos lados en 1,55s más 0,32s de escalonado. Los datos aparecen después, en 550ms. Por la corrección posterior del usuario, el fondo de novedades es ahora hueso cálido.
- **Continuidad:** máscaras verticales en titulares (850ms, `expo.out`), aparición breve de entradillas y estantes (650ms); escalonado de hermanos limitado a 280ms. No se anima toda la página como una sola lista ni se trasladan secciones con controles dentro.
- **Respuesta:** acercamiento leve de las portadas en hover, elevación de 4px y seguimiento de hasta 4px exclusivamente en el icono de enlaces editoriales. El área pulsable permanece fija. Los formularios, catálogo de compra y checkout conservan sus interacciones.
- **Presupuesto:** un único parallax de 18px por lado en el fondo fotográfico de catálogo, solo en escritorio. Sin blur global, bucles nuevos ni scroll artificial. No se fuerza `will-change` de forma permanente.
- **Ciclo de vida:** `PublicLayout` inicia `aplicarAnimacionesGlobales` después de la precarga, limitado a `.sitio`; al cambiar de ruta limpia observadores, eventos, tweens y triggers. Un observador DOM agrupa los cambios de elementos en un cuadro e ignora la escritura del asistente. La portada 3D y el navbar no reciben los revelados genéricos.
- **Accesibilidad:** contenido visible en el estado natural; se anima solo al entrar en vista. Foco de teclado completa el revelado. Cambiar Reduce Motion durante la sesión retira movimiento espacial. En ≤900px, novedades usa carrusel horizontal nativo; en escritorio reducido las cinco portadas ya están desplegadas por CSS.
- **Compatibilidad de datos:** si la API antigua responde 404 al protagonista, se deriva el respaldo del catálogo aunque este llegue después. Una respuesta válida con `libro:null` se respeta; fallos 503/red conservan error y reintento.

Corrección posterior solicitada por el usuario: novedades ocupa cinco columnas reales, con separación fluida de 16–24px; solo las tapas giran. Títulos y autores permanecen rectos, se limitan visualmente a dos líneas y el precio puede envolver dentro de su propia columna. La información entra a partir de 1,05s, cuando las portadas ya están separadas. El recorrido del hero se reduce de 390svh a 250svh (móvil: 335svh a 225svh) y se compactan ambos niveles de padding antes de novedades. Comprobado a 1024/1440px y móvil 390px con datos reales, sin cruces de texto ni errores JS; las 30 pruebas de portada/movimiento incluyen dos regresiones de títulos, autores y precios largos. Lint y build correctos.

**Acabado hueso de novedades:** decisión expresa del usuario tras la revisión anterior. Papel `#F7F1E8`, luz tenue `#FFFAF2`, tinta `#342A21` y notas `#6B5947`; sombras de libro suaves y cálidas. Se retira el indicador horizontal `portada3d__recorrido` y su CSS. El velo final de la escena se funde al mismo color hueso del contenedor siguiente, evitando el corte oscuro; en respaldo estático, el bloque claro ocupa todo el ancho. Título, autores, precio vigente, precio anterior y porcentaje tienen contraste mínimo medido de 5,95:1 contra el papel. Revisión en Chrome a 1440/1024/390px sin errores JS, overflow ni textos cruzados; seis regresiones de movimiento correctas, lint/build correctos. Veredicto: listo en local.

**Corrección de alcance: también el libro 3D en hueso.** La petición incluye el escenario principal, no solo novedades. `escenaLibro.js` usa `0xF7F1E8` en clear color y niebla, y entrega ese mismo color a `PortalEditorial`. El shader volumétrico recibe `uPapel`, conserva ese fondo durante entrada, apertura, energía y salida, y deposita una atmósfera tenue sobre él. El render target de fondo declara `SRGBColorSpace` para impedir que el tone mapping ACES del libro vuelva gris el hueso de la interfaz. CSS de carga y respaldos, títulos, ficha, precios, audio y pantalla final adoptan la misma paleta clara. Verificado por capturas reales en escritorio/móvil en cuatro fases y en Reduce Motion; píxeles libres de geometría del fondo de escritorio RGB 247/241/232, sin errores de shader o JS ni overflow. Las 24 pruebas de portada pasaron. Veredicto: listo en local.

Verificación local: escritorio 1440×1000, móvil 390×844 y versión reducida en Chrome, datos reales mediante proxy `/api`, navegación de ida y vuelta al catálogo, sin errores JavaScript ni overflow. Se verificaron 56 escenarios de compra/navegación/retiro legacy, 24 de portada, 4 regresiones nuevas de movimiento y 12 pruebas unitarias de coreografía/audio. Lint y build correctos; el build conserva el aviso de tamaño de los paquetes principales. El detector Impeccable solo señaló avisos consultivos de tokens y escalas preexistentes del portal. Veredicto: listo para revisión local del usuario.

**Creative North Star: "La librería que destaca sus libros"**

Una librería comercial de barrio grande, clara y ordenada: fondos blancos y gris claro, verde oscuro para la marca y para cada acción, y un acento ámbar mínimo. Las ofertas usan naranja y subrayado para el porcentaje y el precio final; el precio anterior permanece tachado. La navegación se lee como la de una librería en línea real: barra de avisos en verde oscuro, cabecera blanca con buscador y un menú con separadores finos. Cada entrada del menú es una página propia con migas de pan.

La densidad es de comercio, no de revista: tipografía Work Sans compacta en una sola familia, tarjetas blancas con borde fino y radio pequeño, botones en píldora. El inicio destaca imágenes de anuncios cargadas desde Anuncios del panel, a todo el ancho, sin texto promocional superpuesto ni libro 3D. Los banners se muestran completos; la rotación se pausa con foco, hover, pestaña oculta y movimiento reducido.

La paleta es verde, blanca y gris; el ámbar es escaso a propósito. No hay marrón, burdeos ni rosa en la interfaz.

**Key Characteristics:**
- Una sola familia tipográfica (Work Sans 400/500/600/700), jerarquía por tamaño y peso.
- Verde #004d43 para marca, enlaces y botones; verde #013a33 para pie, hover y profundidad.
- Ámbar solo en la cinta del libro 3D y en distintivos pequeños.
- Tarjetas blancas, borde gris fino, radio 8px; sombras suaves que aparecen al pasar el cursor.
- Zonas oscuras (`.oscuro`) que invierten los tokens semánticos de texto y borde sobre verde.
- Logo "f" en verde sobre claro, en blanco sobre verde.

## Colors

Paleta centralizada en las variables de `.sitio` (public-site.css): verde principal #064E3B, verde oscuro #033A2C (pie), verde claro de fondos #E8F3ED, marfil #FFFDF7 (secciones `.crema`), dorado elegante #D6A84B (botones, sellos de la franja de beneficios) y texto #17221D. La franja de beneficios va en verde principal con texto marfil y un sello dorado por beneficio; entran escalonados y reaccionan al pasar el mouse con un subrayado dorado.

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
- **Inicio / carrusel**: banners a todo el ancho bajo la cabecera, proporción recomendada 1600 × 600 (8:3), `object-fit: contain` para no recortar el anuncio. Las imágenes y su contenido proceden del administrador. Flechas, indicadores y pausa cuando hay varios banners; sin controles innecesarios para uno solo. Estado vacío y error con reintento cuando corresponde. Sin escena 3D, imagen de libro fija ni precarga de Three.js.
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

### Catálogo estilo tienda
Cabecera con texto de venta y tres ventajas reales (envío en Lima, recojo gratis, PayU); buscador y "Ordenar por" (Destacados, precio, mayor descuento, título); columna lateral con categorías y su cantidad, "Solo ofertas" y "Solo con stock" (en móvil pasan a una fila desplazable). Tarjeta de producto: etiquetas en cinta con muesca sobre la portada ("Más vendido" naranja #c45500 = top 3 en unidades de ventas pagadas o entregadas; "Agregado recientemente" verde = creado en los últimos 30 días; "Sin stock por ahora"), título que pasa a naranja al pasar el mouse, autor en azul enlace (#007185), precio, "Ahorras S/ X" en rojo #b12704, línea de stock ("En stock" verde #007600, "Quedan solo N" con N ≤ 3), línea de entrega y botón de compra amarillo de tienda (#ffd814, borde #fcd200, texto #0f1111). Ninguna etiqueta se inventa.

### Inicio: categorías y pasos
"Explora por categoría": mosaicos con tres portadas en abanico que se abren al pasar el mouse, nombre y número de títulos; llevan al catálogo filtrado. "Comprar un libro es así de simple": cuatro pasos numerados unidos por una línea punteada, que entran escalonados (los números con un pequeño rebote).

### Mapa de la tienda
En Nosotros, bloque con ancla `#tienda` (destino del enlace "Nuestra tienda" de la cabecera y del cajón móvil): título en verde, dirección con icono de ubicación, nota de recojo y botón chico "Cómo llegar"; a la derecha, mapa embebido de Google Maps (Plaza de Armas de Pallasca) en marco de tarjeta: borde gris filete, radio 8px, sombra de tarjeta, 16:10 (4:3 en móvil). Carga diferida.

### Carrusel de anuncios del inicio
La sección Anuncios ofrece Carrusel de imágenes y Anuncios en video. Para el carrusel se sube un JPG, PNG o WebP de hasta 5 MB, título alternativo, orden, visibilidad y libro vinculado opcional. Las imágenes activas rotan cada 6 s, con navegación manual y pausa; con movimiento reducido se navega manualmente. No hay banners de muestra instalados ni sustitutos inventados. La imagen fija y el efecto del libro que se abre se retiraron por indicación del usuario.

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
