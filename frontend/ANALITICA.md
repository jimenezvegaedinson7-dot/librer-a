# Google Analytics 4 y recomendaciones de libros

## Activar Google Analytics

El flujo confirmado por el propietario es **libreria**, con ID de flujo **16313005114** e ID de medición **G-5SG4L6QMEN**. El ID de medición es público y está incorporado como configuración de producción para `libreria.my` y `www.libreria.my`.

Después de desplegar esta versión, GA4 utiliza ese flujo automáticamente en esos dominios si `VITE_GA4_ID` no está definida. No utiliza ese valor automático en desarrollo, localhost ni dominios de preview de Vercel.

Para administrar el valor desde Vercel, crea `VITE_GA4_ID=G-5SG4L6QMEN` en **Settings → Environment Variables → Production** y vuelve a desplegar el frontend. Esa variable tiene prioridad sobre el valor incorporado. Un valor explícitamente vacío desactiva la medición; si ya existe vacío en Vercel, complétalo con el ID o elimina la variable para usar el valor de producción.

En **Google Analytics → Administrar → Flujos de datos → libreria**, utiliza `https://libreria.my` como URL del flujo para que coincida con el dominio HTTPS de la tienda.

Para desarrollo local, completa `VITE_GA4_ID` en tu configuración local de Vite y reinicia el servidor. `.env.example` contiene los nombres de las variables, sin una propiedad de Google inventada.

Con un ID explícitamente vacío o inválido no se descarga `gtag.js` ni se encolan eventos. Las recomendaciones de libros funcionan independientemente de esta configuración.

En el flujo Web de GA4, desactiva la **medición mejorada automática**: la integración de React controla las vistas y los eventos comerciales. Así se evitan vistas duplicadas por cambios de historial y la captura automática de interacciones de formularios. No instales otra etiqueta GA4 para la misma propiedad sobre esta integración.

## Qué mide

| Evento | Momento |
|---|---|
| `page_view` | Navegación por la tienda pública; una vez por entrada de navegación. |
| `view_item` | Ficha válida de un libro, con ID, título, categoría, autor y precio vigente. |
| `add_to_cart` | Agregado que terminó de guardarse correctamente en el carrito. |
| `begin_checkout` | Entrada al checkout con sesión de cliente válida y artículos. |
| `purchase` | Confirmación de una compra web asociada al intento de compra local, con estado `pagada` o `entregada` devuelto por la API. |
| `view_item_list` | La sección de recomendaciones entra en el área visible. |
| `select_item` | El cliente abre la ficha desde una recomendación. |

Los importes se envían en **PEN**. En `purchase`, `value` suma los artículos con el precio unitario histórico de la venta; `shipping` contiene el envío por separado. `transaction_id` identifica la venta y se deduplica en memoria y almacenamiento local. Consultar el historial de compras antiguas no las registra como compras nuevas. Los pedidos pendientes, cancelados o reembolsados no disparan `purchase`.

La medición del navegador requiere que el cliente regrese o vuelva a consultar la tienda con el intento local conservado. Las compras de la app no se contabilizan como compras de esta web. Los registros de ventas del backend siguen siendo la fuente comercial definitiva.

## Datos y configuración

- Se envían únicamente los campos explícitos del producto y de la transacción; no se copian los objetos completos de cliente, sesión o entrega.
- Las URL enviadas no contienen consultas, tokens de retorno ni fragmentos. Del referente solo se conserva el origen.
- No se establece un `user_id` de Google con la cuenta del cliente.
- Google Signals y la personalización publicitaria están desactivados en la etiqueta.
- Se respeta `navigator.globalPrivacyControl` cuando está habilitado.
- Un bloqueo de Google o un error de almacenamiento no interrumpe el carrito ni la confirmación comercial.

Para ver autores en GA4, crea una dimensión personalizada de ámbito **Elemento** con el parámetro `autor_libro`. Las categorías utilizan el campo estándar `item_category`.

## Comprobar la conexión

Activa temporalmente `VITE_GA4_DEBUG=true`, reconstruye o reinicia Vite y consulta **DebugView** en Analytics. Abre una ficha y agrega un libro al carrito: deben aparecer `view_item` y `add_to_cart`. Para comprobar `purchase`, utiliza el flujo de prueba comercial y una compra realmente confirmada por el servidor; un parámetro de retorno no confirma un cobro.

Después, desactiva el modo de depuración en producción. Los informes se consultan en la propiedad de GA4; las recomendaciones se muestran dentro de la tienda.

## Cómo se recomiendan otros libros

`GET /api/libros/recomendados` requiere **JWT y rol cliente**. La identidad procede de la sesión verificada, nunca de un ID enviado por el navegador. La respuesta es privada y no se guarda en cachés compartidas.

El backend consulta las compras `pagada` y `entregada` de esa cuenta, tanto web como app. Calcula afinidad por autor y categoría, con mayor peso del autor y un límite al efecto de compras masivas del mismo título. Devuelve hasta ocho libros activos y con stock del inventario, excluyendo los ya comprados. Los precios y ofertas proceden del mismo cálculo del catálogo.

En **Mis compras**, después del primer registro, aparece **Otros libros que podrían gustarte**, con el motivo de cada sugerencia, su precio y las acciones de agregar al carrito o abrir la ficha. La lista se vuelve a consultar cuando cambian las compras confirmadas. Una compra pendiente no genera nuevas afinidades.

Si no hay compras confirmadas, no se presenta una lista personalizada. Si no quedan candidatos disponibles, se explica y se ofrece el catálogo. Los errores permiten reintentar sin ocultar las compras. Las sugerencias son afinidades basadas en compras, no afirmaciones de que el cliente haya leído o valorado un libro.

## Verificación automatizada

- `node --test test-unit/analitica.test.js`: configuración, datos públicos, precios históricos, deduplicación y bloqueos de la etiqueta.
- `npx playwright test --config playwright.analytics.config.js`: eventos interceptados sin enviar datos reales a Google, compra confirmada, recomendaciones, navegación y recuperación en móvil y escritorio.
- Desde `backend/`: `npm run test:integration -- test-integration/recomendaciones-compras.smoke.test.js`, con PostgreSQL desechable, para comprobar permisos, aislamiento, afinidades, stock, precios y límites.
