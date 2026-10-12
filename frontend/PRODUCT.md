# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Lectores y clientes**: exploran libros físicos y pueden comprar desde la tienda web o la app Android. La entrega actual es delivery dentro de Pallasca o recojo gratuito en la tienda.
- **Administrador de la librería**: gestiona catálogo, inventario, pedidos, pagos, comprobantes, usuarios, anuncios y reclamos desde un panel exclusivo.

## Product Purpose

Librería del Saber vende libros físicos mediante una tienda web y una app Android que comparten la misma API. Éxito: el cliente encuentra un libro, revisa precio y disponibilidad, compra con PayU y consulta su entrega; el administrador gestiona esa operación desde el panel.

## Positioning

Una librería física en Pallasca, Áncash, con catálogo comercial web y móvil: compra con PayU, delivery dentro de zonas activas de Pallasca o recojo gratuito. Las reservas se conservan únicamente como historial consultable y cancelable.

## Operating Context

- Compra web en `/cuenta`, `/carrito`, `/checkout` y `/mis-compras`; ficha pública en `/libro/:id`. La app usa el mismo backend de ventas y pagos.
- El panel solo admite `administrador`; tienda web y app usan `cliente`. Las sesiones web y los carritos de clientes se mantienen separados del acceso administrativo.
- Catálogo público real: `GET /api/libros` (título, autor, categoría, precio, portada en Cloudinary, stock, estado).
- Datos legales: `GET /api/empresa`; los enlaces de contacto se configuran en `src/public-site/config/site.js` y los valores `null` no se muestran. Los datos de producción no se fijan en este contexto.
- Libro de Reclamaciones público en `/libro-de-reclamaciones`.

## Capabilities and Constraints

Funciones verificadas en el código: catálogo, ficha de libro, favoritos, carrito, compra PayU, delivery por zona activa de Pallasca, recojo gratuito, historial de compras y seguimiento. Registro con verificación por email, login/2FA, recuperación de contraseña en dos pasos, perfil y foto editable. La app añade eliminación de cuenta y pantallas legales.

PayU se muestra en `PagoEnAppScreen` mediante WebView; el retorno obliga a consultar el estado del servidor. Web y app persisten el intento y su clave de idempotencia antes del POST. Precio, stock, pago y reglas de entrega se validan en el backend.

Reservas nuevas y ventas manuales están retiradas; sus rutas históricas siguen ofreciendo consulta o cancelación según el contrato. Lima y courier permanecen para compatibilidad de registros antiguos, no para checkout nuevo.

No se declaran capacidades comerciales sin evidencia. En este contexto no se afirma publicación en Play Store, notificaciones push o distribución pública iOS. La web sí permite comprar.

Distribución:
- Android: APK distribuido por GitHub Releases. Versión, enlace y política de actualización se consultan en `backend/src/config/app-version.json`; la versión de código está en `flutter_app/pubspec.yaml`.
- iOS: código experimental y workflow propio; no forma parte de la app Android descrita aquí.

Rutas: la web pública ocupa `/`; el login del panel pasa a `/admin/login`; las pantallas del panel conservan sus rutas.

## Brand Commitments

- Nombre visible: **Librería del Saber** (confirmado). MATIDANA, razón social y RUC solo como datos legales.
- Logo oficial: monograma "f" caligráfico (`src/assets/logo-principal.png`), usado en verde o blanco en la web pública.
- Idioma: español de Perú; precios en soles (S/).

## Evidence on Hand

- Catálogo real procedente de la API pública; el tamaño del catálogo no se fija en este documento.
- Logo y fondo del login (`src/assets/`).
- Fuentes verificables: `src/routes/AppRouter.jsx`, `src/public-site/tienda/`, `flutter_app/lib/` y `docs/architecture/05-API-MAP.md`.
- Testimonios, cifras comerciales, premios, trayectoria y contactos requieren datos verificables antes de mostrarse.

## Product Principles

1. Solo afirmaciones verificables: cada función o dato mostrado existe en la app o en la API.
2. Web y app ofrecen canales de compra compatibles sobre la misma API y las mismas reglas comerciales.
3. El panel administrativo queda fuera de la vista del visitante: un acceso discreto y nada más.
4. Rápida y accesible antes que espectacular.

## Accessibility & Inclusion

Objetivo: WCAG 2.2 AA, movimiento reducido y uso en teléfonos de gama baja. Es una meta de diseño; este contexto no sustituye una auditoría ni certifica todas las pantallas.
