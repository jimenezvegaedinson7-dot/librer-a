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

La portada editorial utiliza un libro real del catálogo y hasta cinco novedades. Su implementación está en `src/components/web/secciones/portada3d/`.

La capa vigente `atelier-nocturno.css` define:

| Token | Valor | Uso |
|---|---|---|
| `--atelier-tinta` | `#0d1823` | Fondo |
| `--atelier-papel` | `#f1e8da` | Texto principal |
| `--atelier-laton` | `#c6a15b` | Acentos y controles |
| `--atelier-secundario` | `#afc0cc` | Información secundaria |

El libro permanece cerrado durante el recorrido de cámara. El movimiento depende del scroll, puede recorrerse en ambas direcciones y no incorpora audio. La identidad, los datos del libro y los accesos comerciales se mantienen disponibles durante la preparación del motor.

La falta o pérdida de WebGL, el movimiento reducido y los errores de carga activan una presentación estática. Si el motor no avanza, se ofrece un respaldo con los últimos libros agregados y una acción de reintento. Los datos y precios proceden de la API.

## Navegación y adaptación

- Desde 1024 px se muestra la navegación horizontal.
- Hasta 1023 px se utiliza el cajón móvil, con cierre por Escape y devolución del foco al control que lo abrió.
- El buscador de cabecera conduce al catálogo con la consulta.
- La cuenta y el carrito permanecen accesibles en las páginas públicas.
- Las rutas interiores usan desplazamiento nativo y foco en el contenido principal al navegar.
- En móviles estrechos, las tarjetas envuelven títulos y autores; los carruseles se desplazan dentro de su contenedor.
- Los controles táctiles de cuenta y navegación mantienen un área de interacción de al menos 44 px.

## Componentes comerciales

Los controles de compra se comparten mediante `ComprarLibro.jsx`. Agregar actualiza el carrito; Comprar ahora continúa al checkout después de guardar correctamente los ejemplares. Un error de stock mantiene al cliente en la ficha.

Las tarjetas muestran disponibilidad real, precio final y promociones vigentes. Una promoción vencida vuelve al precio normal. La ficha agrupa portada, información comercial, ficha técnica, descripción y libros relacionados.

`PerfilCliente.jsx` concentra los datos de cuenta y sus accesos. La fotografía utiliza un control compacto con distintivo de cámara.

## Panel administrativo

El panel usa el layout y los componentes de `src/components/panel/`. Las tablas comparten encabezados, columnas y desplazamiento accesible. Las altas se abren a demanda en un modal; cancelar desmonta el borrador y un fallo de guardado conserva los datos editados.

Los diálogos mantienen el foco y el bloqueo de desplazamiento. Los estados de carga, vacío y error se presentan de forma explícita; los indicadores sin respuesta no se sustituyen por ceros ficticios.

## Organización de estilos

- `src/styles/index.css`: entrada global del panel.
- `src/components/web/PublicLayout.jsx`: carga las capas públicas en su orden de aplicación.
- `src/styles/web/formal-base.css`: reglas comunes.
- `formal-compra.css`, `formal-asistente.css`, `formal-cuenta.css`, `formal-favoritos.css` y `formal-catalogo.css`: reglas por función.
- `src/styles/web/responsive-movil.css`: ajustes de tamaño y objetivos táctiles.
- `src/components/web/secciones/portada3d/`: estilos de la portada y sus respaldos.

El orden de importación forma parte de la cascada. Los cambios compartidos deben comprobarse tanto en la tienda como en el panel.

## Accesibilidad y comprobación

Los formularios deben tener etiquetas, los controles deben funcionar con teclado y los mensajes recuperables deben indicar cómo reintentar. El movimiento reducido conserva contenido y operaciones.

Las pruebas de navegador verifican navegación, compra, sesiones, disponibilidad, formularios y adaptación. Los comandos de ejecución están en `README.md`.
