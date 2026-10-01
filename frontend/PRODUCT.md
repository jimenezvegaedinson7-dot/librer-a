# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Lectores de todo el Perú** (público principal de la web pública, confirmado): personas que buscan libros físicos, llegan a la web desde un enlace o buscador y deciden si descargar la app para comprar o reservar.
- **Administrador de la librería** (público secundario): entra al panel desde un acceso discreto; la web pública no le habla.

## Product Purpose

Librería del Saber vende libros físicos a través de su app móvil. La web pública presenta la librería, muestra una muestra real del catálogo y lleva a descargar la app. Éxito: el visitante entiende qué es, confía en que es una librería real y descarga la app.

## Positioning

Una librería real (tienda física en Pallasca, Áncash) con catálogo propio en una app: compra con pago en línea (PayU), entrega a domicilio en Lima o recojo en la tienda sin costo de envío, y reservas.

## Operating Context

- Compra y reserva ocurren en la app (Android hoy). La web no vende ni tiene carrito.
- Catálogo público real: `GET /api/libros` (título, autor, categoría, precio, portada en Cloudinary, stock, estado).
- Datos de empresa públicos: `GET /api/empresa` (razón social, nombre comercial MATIDANA, RUC 10447545387, dirección en Pallasca). No hay correo ni teléfono registrados.
- Libro de Reclamaciones público en `/libro-de-reclamaciones`.

## Capabilities and Constraints

Funciones reales de la app (verificadas en `flutter_app/lib/screens`): catálogo con búsqueda, detalle de libro, favoritos, carrito, compra con PayU, entrega a domicilio (Lima, tarifa por distrito) o recojo en tienda sin costo, reservas, historial de compras, perfil, verificación en dos pasos, eliminación de cuenta, términos y privacidad dentro de la app.

No existe: notificaciones push, app iOS publicada, Play Store, envío por agencia (retirado), venta en la web.

Distribución:
- Android: APK 1.0.1 en GitHub Releases (tag v1.0.0, 56.8 MB, 2026-09-25).
- iOS: solo un .ipa sin firmar como artefacto de CI; se muestra "En preparación" sin descarga.

Rutas: la web pública ocupa `/`; el login del panel pasa a `/admin/login`; las pantallas del panel conservan sus rutas.

## Brand Commitments

- Nombre visible: **Librería del Saber** (confirmado). MATIDANA, razón social y RUC solo como datos legales.
- Logo oficial: monograma "f" caligráfico (`src/assets/logo-principal.png`), usado en verde o blanco en la web pública.
- Idioma: español de Perú; precios en soles (S/).

## Evidence on Hand

- 25 libros reales con portada, autor, categoría y precio (API pública).
- Logo y fondo del login (`src/assets/`).
- Pantallas reales de la app: se pueden capturar del build Flutter web (`/web`).
- No existen: testimonios, cifras de clientes, años de trayectoria, premios, redes sociales, correo o teléfono de contacto. No inventarlos.

## Product Principles

1. Solo afirmaciones verificables: cada función o dato mostrado existe en la app o en la API.
2. La web lleva a la app; no compite con ella ni duplica la compra.
3. El panel administrativo queda fuera de la vista del visitante: un acceso discreto y nada más.
4. Rápida y accesible antes que espectacular.

## Accessibility & Inclusion

WCAG 2.2 AA; `prefers-reduced-motion` respetado; usable en teléfonos de gama baja y conexiones lentas (público de todo el Perú).
