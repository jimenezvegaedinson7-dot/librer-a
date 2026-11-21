# MATIDANA — Producto

## Alcance

Tienda web y panel administrativo de MATIDANA Libros y Cultura, librería física de Pallasca, Áncash. La web comparte la API y las reglas comerciales con las aplicaciones de clientes.

## Usuarios

- **Cliente:** consulta catálogo, disponibilidad y precios; gestiona favoritos y carrito; compra con PayU y consulta sus pedidos.
- **Administrador:** gestiona catálogo, inventario, pedidos, ventas, comprobantes, usuarios, anuncios, tarifas y reclamaciones.

La sesión administrativa y la sesión del cliente se almacenan por separado. Los carritos e intentos de compra pertenecen a su cliente o al visitante que los creó.

## Recorrido comercial

1. Explorar el catálogo en `/catalogo` y abrir la ficha `/libro/:id`.
2. Añadir ejemplares al carrito o continuar al checkout mediante Comprar ahora.
3. Iniciar sesión con una cuenta de cliente, elegir entrega y crear el pedido.
4. Pagar con PayU y consultar el estado confirmado por la API en `/mis-compras`.

Las rutas de cuenta, carrito y pago son `/cuenta`, `/carrito` y `/checkout`. El panel tiene acceso por `/admin/login` o `/admin`.

## Entrega y pagos

- Delivery dentro de la ciudad de Pallasca con tarifa vigente del servidor, editable por el administrador.
- Recojo gratuito en Plaza de Armas, Jr. Marañón 161, Pallasca 02835.
- La tarifa se aplica por pedido y se revalida antes de crear la compra. Las compras anteriores conservan sus importes históricos.
- Los pedidos usan claves de idempotencia para recuperar intentos sin duplicarlos.
- El backend valida precio, stock y pago. Volver desde PayU no constituye una confirmación de cobro.
- Reservas y ventas manuales son funciones retiradas. Los datos antiguos se conservan según los contratos de compatibilidad del servidor.

## Cuenta y atención

Registro con verificación por correo, login y 2FA, recuperación de contraseña en dos pasos, edición del perfil y fotografía. El Libro de Reclamaciones público está en `/libro-de-reclamaciones`.

La información de empresa procede de `GET /api/empresa`. Los enlaces de contacto se configuran en `src/models/config/web/site.js`; los enlaces no configurados se omiten.

La búsqueda y las recomendaciones usan IA de Gemini en el backend para interpretar preferencias e intención de compra, siempre sobre libros reales del catálogo; la clave de Gemini nunca llega al navegador.

## Identidad y presentación

- Nombre comercial: MATIDANA Libros y Cultura.
- Idioma: español de Perú; importes en soles con dos decimales.
- Marca compartida en `src/assets/compartido/`.
- Diseño y comportamiento responsive documentados en `DESIGN.md`.

## Distribución

Android se distribuye mediante APK en GitHub Releases. La versión y el enlace se consultan en la API; su configuración está en `backend/src/config/app-version.json`. El proyecto iOS tiene su propio proceso de compilación y distribución.

## Documentación técnica

- `README.md`: desarrollo, estructura y comprobaciones.
- `../docs/architecture/05-API-MAP.md`: endpoints y permisos.
