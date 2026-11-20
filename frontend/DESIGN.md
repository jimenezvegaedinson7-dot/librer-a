# MATIDANA — Diseño del frontend

## Superficies

El frontend contiene dos superficies con sesiones y navegación independientes:

- **Tienda pública:** portada, catálogo, ficha, cuenta, carrito, checkout y compras.
- **Panel administrativo:** listados, formularios, inventario y gestión comercial.

Los estilos globales se organizan en `src/styles/`; los estilos específicos de componentes y pantallas permanecen junto a ellos.

## Marca y tipografía

Los recursos de marca compartidos están en `src/assets/compartido/`. Work Sans se utiliza en datos y controles de la tienda; Source Serif 4 se reserva para titulares editoriales. Las fuentes públicas se sirven localmente desde `public/fonts/`.

La configuración del panel está centralizada en `src/styles/panel/theme.css` y sus capas editoriales. La tienda define su tema en `src/styles/web/tema-editorial.css` y lo adapta por superficie.

## Portada

La portada editorial presenta los libros reales del catálogo en un estante horizontal estático, alineado a la derecha del texto y separado de él para evitar cruces visuales. El bloque de texto usa una jerarquía tipográfica descendente serif/sans: etiqueta de catálogo, titular sobrio, énfasis en verde, «Últimos libros agregados» como etiqueta versal contenida, descripción breve y enlace discreto al catálogo completo. No hay comilla decorativa, halo, pista circular ni plataforma. Su implementación está en `src/components/web/secciones/portada3d/`.

No hay libro protagonista destacado, gestión administrativa para elegirlo ni escena WebGL. El estante usa hasta 16 portadas reales de la API, ordenadas por fecha, en una fila desplazable con scroll horizontal y `scroll-snap`; no hay rotación, perspectiva, arrastre forzado ni animaciones continuas. Cada tarjeta conserva portada, título, autor y precio real de la API. El movimiento reducido no cambia la composición porque no hay animaciones que detener.

Los estilos de la portada viven en `portada3d.css`; la identidad visual usa los tokens editoriales compartidos de `src/styles/web/`.

## Navegación y adaptación

- Desde 1024 px se muestra la navegación horizontal.
- La cabecera reproduce la estructura de Casa del Libro: dos franjas superiores a ancho completo (`#dfe6dd` y `#004d43`) visibles desde 992 px, bloque principal blanco con logotipo verde, buscador con marco `#cfcfcf` que ocupa toda su columna y botón de lupa integrado, acciones en verde `#004d43` y fila de navegación blanca con separadores `|` y subrayado inferior verde en hover/activo. Hasta 1023 px el buscador de escritorio se oculta: menú, marca y acciones comparten la primera fila y el buscador móvil ocupa la segunda a ancho completo; por debajo de 576 px la cabecera pasa a fondo verde con controles blancos. El pie usa tres franjas: crema `#fff5e6` con enlace real al catálogo y cuatro servicios, bloque verde `#004d43` con cuatro columnas de enlaces y franja legal gris `#f3f3f3`; no se añade formulario de suscripción falso.
- La fila de navegación de escritorio abre con `Inicio`, continúa con hasta cinco categorías del catálogo real priorizadas como en la referencia (`Cómic y Manga`, `Ficción`, `No Ficción`, `Juvenil`, `Infantil`, después por cantidad) y separa por `|` el resto de páginas. No incluye un enlace genérico `Catálogo`: ese acceso permanece en el pie y en la barra inferior móvil, y la fila ofrece `Ofertas` como `/catalogo?ofertas=1`. Cada categoría muestra al pasar el cursor o recibir foco un panel desplegable con tres bloques: enlace filtrado a esa categoría con su cantidad real, enlaces de MATIDANA (páginas y libro de reclamaciones) y hasta ocho libros reales de esa misma categoría con portada, título y autor. El panel se cierra al salir, pulsar Escape o cambiar de ruta, y no aparece por debajo de 1024 px; en móvil las categorías se muestran como píldoras dentro del cajón.
- Hasta 1023 px se utiliza el cajón móvil, con cierre por Escape y devolución del foco al control que lo abrió.
- El catálogo muestra, como en la referencia, un bloque de «Categorías destacadas» con hasta ocho enlaces de texto derivados de `libro.categoria`, ordenados por la misma prioridad de la cabecera y luego por cantidad real, que filtran por `/catalogo?categoria=...`. «Ver más temáticas» lleva al filtro completo del lateral; sin datos reales no aparece ninguna categoría inventada.
- Al presionar el buscador de cabecera se abre `/buscar` en una pestaña nueva, sin necesidad de escribir.
- `/buscar` es una página de resultados dedicada, sin cabecera, navegación ni pie de la web pública: fondo blanco, logotipo arriba a la izquierda y `Salir` con `X` a la derecha; título centrado de 26-30 px «¿Qué estás buscando?» y una única barra integrada de 1020-1050 px con selector, campo «Busca por autor, título, género o ISBN» y botón de lupa, sin botones negros separados ni resplandores; `Salir`, `Ver todos`, flechas, limpiar, lupa y `Ver detalle` usan bordes redondeados; `Ver detalle` pasa a amarillo `#ebaa20` al pasar el cursor o recibir foco y a dorado `#d99a12` al pulsarse, con texto negro. El selector ofrece `Todos`, `Título`, `Autor`, `Género`, `ISBN` y las categorías reales del catálogo. Sin consulta se muestran secciones de descubrimiento por categoría con recuento real, `Ver todos` y carruseles de tarjetas con portada, título, autor, categoría, precio real, precio anterior y etiquetas de oferta cuando corresponda; las tarjetas abren `/libro/:id`. Con consulta se muestran solo los resultados relevantes y, si no hay coincidencias, un aviso sobrio. Sin degradados, pistas, chips ni mensajes de estado vacío innecesarios; carruseles táctiles y responsive con `prefers-reduced-motion`.
- La cuenta y el carrito permanecen accesibles en las páginas públicas.
- Las rutas interiores usan desplazamiento nativo y foco en el contenido principal al navegar.
- En móviles estrechos, las tarjetas envuelven títulos y autores; los carruseles se desplazan dentro de su contenedor.
- Los controles táctiles de cuenta y navegación mantienen un área de interacción de al menos 44 px.
- Todos los botones de la web pública (`.boton` y `.btn`, incluidos `Agregar`, `Ver detalle`, `Comprar ahora` y las acciones de descargas) usan bordes rectos de `6px`, altura mínima de `44px` y tipografía Work Sans compacta, sin importar el tema cargado. El acceso grande al catálogo sigue la misma escala.

## Aplicación y descargas

La descarga de la app vive en `/descargar`: portada con capturas reales de la aplicación, disponibilidad por plataforma (Android e iPhone), pasos de instalación en Android y consulta de la versión publicada con código QR. La antigua ruta `/aplicacion` se eliminó; tampoco existe `/caracteristicas` ni la entrada `Características` en el menú.

Las páginas públicas de descargas y contenido usan el mismo lenguaje visual de referencia: cabeceras con etiqueta píldora magenta `#d9017a`, títulos Work Sans en verde `#004d43`, fondo blanco en la portada, tarjetas blancas con borde `#dcdfe6` y radio `16px`, superficies secundarias crema `#fff5e6` o gris `#f7f8f9`, botones verdes de bordes rectos y sin degradados ni resplandores. Las reglas finales viven en `src/styles/web/secciones-casa.css`, importadas después de `limpia.css` y `botones-vortex.css` para conservar la paleta sin reactivar animaciones ni sombras.

## Componentes comerciales

Los controles de compra se comparten mediante `ComprarLibro.jsx`. Agregar actualiza el carrito; Comprar ahora continúa al checkout después de guardar correctamente los ejemplares. Un error de stock mantiene al cliente en la ficha.

Las tarjetas muestran disponibilidad real, precio final y promociones vigentes. Una promoción vencida vuelve al precio normal. La ficha agrupa portada, información comercial, ficha técnica, descripción y libros relacionados.

`PerfilCliente.jsx` presenta `Mi cuenta` como una página simple, sin dashboard ni personalización: barra lateral izquierda de 260-280 px sobre fondo `#f7f7f7` y área de contenido blanca. La barra muestra solo el avatar con cámara y el botón `Actualizar foto de perfil`; no repite el título ni el estado verificado. Los grupos `Mis actividades`, `Información de cuenta` y `Otras opciones` aparecen plegados al entrar y se abren con `+`/`−`; sus ítems son enlaces de texto sin estado activo, sin transiciones ni cambios de fondo, y `Salir` queda al pie separado por una línea. El contenido muestra exclusivamente `Mis datos` con la información real de la sesión y se edita desde el enlace lateral `Editar datos personales`, sin botones duplicados arriba. La paleta se limita a blanco, gris claro y texto carbón, con verde `#004d43` solo en verification y focos; no hay acentos dorados, magenta ni tarjetas de acceso. El input de archivo permanece oculto y la foto se puede ampliar en un modal. En móvil el menú se pliega tras un botón de menú de icono solo con nombre accesible `Menú`, mantiene objetivos táctiles de 44 px y no genera desplazamiento horizontal.

## Asistente de tienda

El chat utiliza una paleta propia: nogal `#30251f` en cabecera y envío, cacao `#584235` en mensajes del cliente, marfil `#fffdf8` en respuestas y acento dorado `#a78655`. La textura de biblioteca se mezcla con el fondo cálido para evitar dominantes celestes.

El avatar del asistente acompaña cada respuesta a la izquierda, incluido el texto en escritura y el estado de consulta. Mide 36 px, reserva su espacio junto a la burbuja y permanece visible mientras se recorre una respuesta larga. La foto del cliente conserva su posición a la derecha con el mismo comportamiento; si no está disponible se muestran sus iniciales. Los retratos dentro de la conversación no registran seguimiento global del puntero.

Las acciones de los libros recomendados son compactas: «Agregar» y «Ver detalle» usan botones de 30 px de altura, tipografía reducida y el borde cálido del chat para no dominar la respuesta.

## Panel administrativo

El panel usa el layout y los componentes de `src/components/panel/`. Las tablas comparten encabezados, columnas y desplazamiento accesible. Las altas se abren a demanda en un modal; cancelar desmonta el borrador y un fallo de guardado conserva los datos editados.

Los diálogos mantienen el foco y el bloqueo de desplazamiento. Los estados de carga, vacío y error se presentan de forma explícita; los indicadores sin respuesta no se sustituyen por ceros ficticios.

## Organización de estilos

- `src/styles/index.css`: entrada global del panel.
- `src/components/web/PublicLayout.jsx`: carga las capas públicas en su orden de aplicación.
- `src/styles/web/formal-base.css`: reglas comunes.
- `formal-compra.css`, `formal-asistente.css`, `formal-cuenta.css`, `formal-favoritos.css` y `formal-catalogo.css`: reglas por función.
- `src/styles/web/responsive-movil.css`: ajustes de tamaño y objetivos táctiles.
- `src/styles/web/secciones-casa.css`: capa final de aplicación/características integradas y descargas.
- `src/components/web/secciones/portada3d/`: estilos de la portada y sus respaldos.

El orden de importación forma parte de la cascada. Los cambios compartidos deben comprobarse tanto en la tienda como en el panel.

## Accesibilidad y comprobación

Los formularios deben tener etiquetas, los controles deben funcionar con teclado y los mensajes recuperables deben indicar cómo reintentar. El movimiento reducido conserva contenido y operaciones.

Las pruebas de navegador verifican navegación, compra, sesiones, disponibilidad, formularios y adaptación. Los comandos de ejecución están en `README.md`.
