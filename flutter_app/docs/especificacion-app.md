# Especificación de diseño y funcional de la app "Librería"

> Referencia para replicar el diseño actual en la herramienta de diseño (Framer/Stitch).
> App Flutter 100% Android. Nombre visible en Android: **Librería**.
> Package: `com.jimenezvega.libreria`. Backend de producción: `https://libreria-api-v9h0.onrender.com`.

---

## 1. Identidad de marca

- **Concepto**: editorial / "biblioteca personal" — sobrio, académico, minimalista.
- **Estilo**: mínimo y formal. Sin líneas de tarjeta ni bordes decorativos. Superficies
  limpias con sombras muy sutiles. Botones planos.
- **Serif para títulos**, sans-serif para cuerpo (Android: serif genérico + Roboto).
- Lenguaje de UI: español (Perú). Moneda: **S/** (soles).

---

## 2. Paleta de colores (tokens)

| Token | Hex | Uso |
|---|---|---|
| `background` | `#F4F0E7` | Fondo de pantallas (marfil) |
| `surface` | `#FFFCF6` | Tarjetas, campos, barras inferiores |
| `surfaceElevated` | `#EAE4D8` | Fondo de chips de contador / steppers |
| `primary` | `#4A3020` | Acciones, precios, íconos activos (marrón biblioteca) |
| `primaryDark` | `#332013` | Snackbars, texto sobre contenedores, onPrimaryContainer |
| `primaryContainer` | `#F0E6D8` | Chips de categoría, avatares sin foto |
| `secondary` / `gold` | `#B58A3A` | Cobre: acentos de marca (eyebrow del hero, anillo de cámara) |
| `secondaryContainer` | `#F0E3C5` | Indicador de la barra de navegación |
| `tertiary` | `#77433E` | Hero del inicio, "Ver catálogo", availability en rojo-marrón |
| `paper` | `#F8F3E9` | Placeholder de portadas |
| `success` | `#6B5528` | "Activo", "Confirmada", "Pagada" (bronce) |
| `warning` | `#B46D25` | "Pendiente" (ámbar sobrio) |
| `error` | `#A43E36` | Errores, eliminar, cancelar, "Agotado"/"Inactivo" |
| `errorContainer` | `#F5E2DE` | Fondo de vistas de error |
| `onErrorContainer` | `#762720` | Texto sobre errorContainer |
| `textPrimary` | `#202925` | Texto principal |
| `textSecondary` | `#68716C` | Texto secundario |
| `textTertiary` | `#969D98` | Hints, notas, eyebrows |
| `divider` | `#D8D0C2` | Divisores puntuales (recibos, listas del perfil) |
| `price` | `#8B6425` | (heredado; los precios usan `primary`) |

ColorScheme M3 de referencia:
`primary=#4A3020 onPrimary=#FFF secondary=#B58A3A onSecondary=#332013
tertiary=#77433E onTertiary=#FFF primaryContainer=#F0E6D8 onPrimaryContainer=#332013
secondaryContainer=#F0E3C5 onSecondaryContainer=#4D3814 error=#A43E36 onError=#FFF
errorContainer=#F5E2DE onErrorContainer=#762720 surface=#FFFCF6 onSurface=#202925
surfaceContainerHighest=#EAE4D8 onSurfaceVariant=#68716C outline=outlineVariant=#D8D0C2`

---

## 3. Tipografía

- **`headlineLarge/titleLarge`**: serif, `w700`.
- **`headlineMedium`**: serif, `w700`, `letterSpacing -0.35`.
- **`headlineSmall`**: serif, `w700`.
- **AppBar title**: serif, `w700`, 20px.
- **Eyebrow (AppPageHeader)**: `labelSmall`, `textTertiary`, `w700`, `letterSpacing 1.8`, en MAYÚSCULAS.
- **Botones**: `w700`, 15px, `letterSpacing 0.2`, altura mínima **54px**.
- **Etiquetas de navegación inferior**: 11px; seleccionado `primary` `w700`; no seleccionado `textSecondary` `w500`.
- **Cuerpo**: sans (Roboto), estándar Material 3.

---

## 4. Componentes globales

### Botones
- **FilledButton**: fondo `primary`, texto `onPrimary`, altura 54, radio 10, `w700`/15px. Planos (sin sombra).
- **ElevatedButton**: idéntico al anterior.
- **OutlinedButton**: texto `primary`, borde `divider`, radio 10, `w600`. Uso en chips de filtro y "Cerrar sesión" (en rojo error).
- **TextButton**: texto `primary`, `w700`. Uso "Ver catálogo", acciones secundarias.

### Campos de texto
- **Filled, sin borde** (`InputBorder.none` en normal/enabled/focused/error/focusedError).
- Fondo `surface`, hint `textTertiary`, padding horizontal 16 / vertical 16, radio por defecto del tema.
- Excepción: campos tipo OTP en pantallas de verificación/autorización (login/registro/2FA) usan cajas con borde.

### Tarjetas
- Fondo `surface`, **radio 14**, **sin borde**, sombra mínima o nula. (El tema quita el `side` de todas las Cards.)
- Tarjetas de lista (catálogo): radio 14, sin borde.
- Tarjetas de producto del inicio: radio ~14, portada con radio 8.
- **Portada de libro (BookCover)**: fondo `paper`, radio 8 por defecto, sombra `#000` 8% blur 12 y+5, **sin borde**. Placeholder: fondo `surfaceElevated` + ícono `auto_stories` `primary` 40px.

### Barra de navegación inferior
- Altura **72**, fondo `surface`, indicador `secondaryContainer`, **sin línea superior** (se quitó el borde).
- Íconos Material `outlined`/`rounded`; badge de carrito encima del icono Carrito (véase §5).

### Overlays
- **Bottom sheet**: fondo `surface`, `surfaceTint` transparente, radio superior 20. `showDragHandle: true`.
- **Dialog**: fondo `surface`, radio 16, sin tint.
- **Snackbar**: fondo `primaryDark`, texto blanco, flotante.

### Divisores
- Color `divider` (`#D8D0C2`), grosor 1. Solo en lugares funcionales: resumen de pedido, detalle de compra, filas del perfil (indent 56), tarjeta de reserva.

### Espaciado (ritmo)
- Márgenes de pantalla: **20** (lista de tarjetas usa 16).
- Separación entre secciones: **32**; entre elementos de un bloque: **16**.
- Encabezado de página: padding superior 20.

---

## 5. Anatomía por pantalla

### 0. Splash
- Logo de marca centrado (`AppLogo`). Ruta inicial.

### Login / Registro *(NO MODIFICAR — ya aprobados)*
- Se dejan intactos: campos con subrayado dorado, enlaces entre login↔registro, OTP 6 dígitos, verificaciones de email/2FA.

### 1. Inicio (tab "Inicio") — pestaña principal
- **Hero card** (fondo `tertiary #77433E`, radio **18**, sombra `#000` 10% blur 18 y+6, sin borde):
  - Fila superior: tile del logo **54×54** (fondo `paper`, radio 12, `AppLogo` 44×44) + bloque de texto:
    - "BIBLIOTECA PERSONAL" — `labelSmall`, `gold`, `w800`, `letterSpacing 1.4`, MAYÚS.
    - "Hola, {nombre}" — `headlineSmall`, blanco, 2 líneas máx (ellipsis).
    - "Encuentra tu próxima lectura." — `bodySmall`, blanco al 72%.
  - Botón de carrito a la derecha: `IconButton` blanco sobre círculo `#FFF` 10%.
  - **Buscador dentro del hero**: `TextField` readOnly (toca → abre Catálogo), fondo `surface`, hint "Buscar por título o autor", ícono `search_rounded`. Sin borde.
- **Dos carruseles automáticos de libros** (recuerda: son el corazón del inicio):
  - Comportamiento: `Timer` cada **3s**, animación 500ms `easeInOut`, avanza de a un libro, **regresa al inicio** al llegar al final. No avanza si hay ≤1 libro o no hay viewport.
  - Ancho de tarjeta adaptativo: pantalla <520 → **190**; ≥520 → **205**; ≥750 → **225**; ≥1000 → **245**. Paso entre ítems = ancho + **16**.
  - Alto del carrusel = `ancho × 1.34 + 140`. Padding horizontal 20, separador entre tarjetas **16**.
  - Fila 1: título **"Selección de la casa"** (`titleLarge`, serif) + botón **"Ver catálogo"** (TextButton `tertiary`).
  - Fila 2: título **"Más para descubrir"** (sin botón).
- Pull-to-refresh. Estados: carga, error (Reintentar) y vacío (ícono `menu_book_outlined`).

### 2. Catálogo (tab, AppPageHeader: eyebrow "Colección", título "Catálogo")
- **Buscador** (`TextField` filled, sin borde, prefijo `search`, sufijo `close` al escribir).
- **3 chips de filtro** (OutlinedButton, radio 10, fondo `surface`, borde `outlineVariant`, flecha `keyboard_arrow_down`): **Categoría**, **Estado** (Disponible/Agotado), **Ordenar**.
- **Conteo de resultados**: bodyMedium `textSecondary` ("Encontramos N libros").
- **Lista de tarjetas** (`LibroListCard`, radio 14, sin borde, sombra sutil): portada a la izquierda, derecha: título (`titleSmall` w700 2 líneas), autor (`bodySmall textSecondary`), badge estado (Activo `success` / Inactivo `error` sobre alpha 12%), precio `primary` w700, label de stock, acción de agregar al carrito.
- **Bottom sheets** de Categorías (Todas + lista), Estado (Todos/Disponibles/Agotados), Ordenar (Título A-Z / Z-A / Precio menor / Precio mayor): `ListTile`, check `primary` en la opción actual.
- Estados: carga, error, vacío (ícono `search_off`).

### 3. Ficha del libro (detalle)
- AppBar: "Ficha del libro".
- Portada grande (ancho 230 vertical / 260 ancho≥700) con sombra.
- **Bloque de información** (superficie sin borde): chip categoría (`primaryContainer`, radio 6, texto `primaryDark` w600), título `headlineMedium` serif, autor `titleMedium onSurfaceVariant`, **precio** `headlineSmall` `primary` bold, filas ISBN (`qr_code_2`) y Stock (`inventory_2`), descripción `bodyMedium` alto 1.5.
- **Botón de reserva** FilledButton altura **58**, plano, texto "Reservar este libro"; estados "No disponible" / "Agotado" (deshabilitado con icono `block`).
- Nota: "La disponibilidad se confirmará al registrar la reserva." (`bodySmall onSurfaceVariant`).

### 4. Mi carrito
- Encabezado (embedded): eyebrow "Pedido", título "Mi carrito". (Como página: AppBar "Carrito de compra").
- **Secciones** con contador (`surfaceElevated` + label `textSecondary`): "Mis libros", "Guardados para más tarde".
- **Ítem de carrito** (superficie, radio 16, sin borde, sombra 4% blur8): portada **92×132** radio 10; derecha: título (`titleSmall` w700), autor, badge de estado, "S/ x c/u" (`primary` w700), control de cantidad (− / número / + sobre `surfaceElevated` radio 12, botones `primary`), subtotal (`titleSmall` w800), acciones TextButton **Guardar** (`primary`) y **Eliminar** (`error`) con confirmación.
- **Ítem guardado**: portada 62×90, precio, acciones "Mover al carrito" (`primary`) y borrar (`error`).
- **Barra inferior fija** (superficie, sin línea superior, sombra hacia arriba 16px `#0D2B24` al 9%): "Subtotal" + valor `primary` w800, nota "El envío y la entrega se definen en el siguiente paso.", botón **"Continuar con la compra"** (FilledButton 54).
- Vacío: ícono `shopping_cart_outlined`.

### 5. Entrega y pago
- AppBar "Finalizar pedido". Encabezado eyebrow "Último paso", título "Entrega y pago".
- **Tipo de entrega**: chips — Recoger en tienda / Agencia / A domicilio.
- **Datos** según tipo: dirección (campo filled sin borde), selector provincia → distrito; o agencia.
- **Resumen del pedido** (superficie): filas Subtotal / Envío, divisores, **Total** `primary` w800.
- **Barra inferior**: FilledButton **"Ir al pago seguro"** + nota `bodySmall textTertiary`: **"Serás redirigido a PayU para completar tu pago de forma segura."**
- **Pantalla "Compra en proceso"**: ícono `hourglass_top` 80 `warning`, "¡Gracias por tu compra!", "Tu orden por S/ {total} quedó creada. Ahora solo falta pagarla en **PayU** para confirmarla.", aviso de ventana cerrada, FilledButton **"Ya pagué, verificar"**, TextButtons "**Reabrir pago en PayU**" y "Volver al catálogo".
- **Pantalla "Compra realizada"** (pago ya confirmado): ícono `check_circle` 80 `success`.

### 6. Mis compras
- Encabezado: eyebrow "Historial", título "Mis compras".
- **Tarjeta de venta** (superficie, radio 14, sin borde, sombra `primaryDark` 5% blur10): "Compra #{id}" (`w700` 16px) + **chip de estado** (Cancelada: `error`; Pagada/Entregada: `success`; Pendiente: `warning`; fondo alpha 12%, `labelMedium` w700), fecha, "Entrega: …", distrito/provincia o agencia, dirección, fila "Total: S/ x" (`primary` w800 17px).
- Si está **pendiente**: botones "Verificar" (ícono refresh) y "Continuar pago" (ícono payment) — abren/reabren el checkout de **PayU**.
- **Detalle (bottom sheet)**: "Detalle de la compra", ítems (título + subtotal, "cantidad × precio_unitario"), divisor, Costo de envío, **Total** destacado `primary` w800.

### 7. Mis reservas
- Encabezado: eyebrow "Lecturas apartadas", título "Mis reservas".
- **Tarjeta** (superficie, sin borde, sombra): título + **badge** (Confirmada `success`, Cancelada `error`, Completada `primary`, Pendiente `warning`), "Reserva N° {id}" + fecha, divisor, filas **Cantidad** y **Vence**, botón **"Cancelar reserva"** (OutlinedButton `error`) solo en pendiente/confirmada.

### 8. Mi perfil
- Encabezado: eyebrow "Cuenta personal", título "Mi perfil".
- **Hero** (fondo `primary #4A3020`, radio 16, sombra `primaryDark` 18% blur18 y7): avatar **92** (foto o iniciales en círculo `primaryContainer` 82px), **anillo de cámara** círculo `gold` 30px con borde `primary` 2, nombre `titleLarge` blanco, email `bodySmall` al 72%, "Toca la foto para actualizarla" `labelSmall gold` w700.
- **Datos** (Card superficie sin borde): filas Correo/Teléfono/Rol con ícono `primary` y divisores indent 56.
- **Cuenta** (Card): "Editar perfil", "Cambiar contraseña", "Mis reservas", "Activar/Desactivar doble factor" (con check `success` si activo), chevron derecho.
- **Cerrar sesión**: OutlinedButton `error`, altura 54, radio 14, con confirmación (borra carrito y sesión).
- Sub-pantallas (sin bordes de campo): Editar perfil, Cambiar contraseña, 2FA (QR setup → verificación de 6 dígitos → desactivación).

---

## 6. Comportamiento / estados

- **Carrito global** (`CarritoService` con `ListenableBuilder`): badge en icono del carrito (oculto si 0; "99+" si >99), usado en barra inferior y hero.
- **Pestañas en `IndexedStack`** (se conserva el estado); "Mis compras" se recarga al entrar; "Inicio" refresca el saludo.
- **Pull-to-refresh** en Inicio, Catálogo, Mis compras, Reservas, Perfil.
- **Pago**: el carrito SOLO se limpia cuando el pago se confirma ("Ya pagué, verificar"). Orden idempotente; se puede "Reabrir pago en PayU" o continuar desde Mis compras si se cerró el navegador.
- **Estados de compra**: Pendiente → Pagada → Entregada; Cancelada.
- **Estados de reserva**: Pendiente / Confirmada / Completada / Cancelada.
- **Login obligatorio** para compras/reservas/perfil. 2FA opcional en la cuenta.
- Íconos Material: variante outline en estado inactivo y redondeada en seleccionado/uso (ej. `home_outlined`/`home_rounded`).

---

## 7. Reglas de coherencia (al rediseñar)

1. Marrón `#4A3020` + cobre `#B58A3A` + marfil `#F4F0E7`. **Nunca verdes**.
2. Serif solo en títulos/hero; sans en cuerpo.
3. Tarjetas y campos **sin bordes de línea**; jerarquía con sombras sutiles.
4. Botones principales siempre `FilledButton` `primary`; altura 54.
5. Estados con los colores semánticos definidos, nunca con colores crudos.
6. Los carruseles del inicio son obligatorios (auto-scroll, ancho adaptativo, wrap).
7. Precios siempre en **S/** con formato de 2 decimales.
8. Navegación inferior fija con 5 pestañas.
9. Textos de pago siempre nombran a **PayU** (nunca Mercado Pago).