import 'package:flutter/material.dart';

import '../../widgets/legal_documento.dart';

/// Términos y Condiciones de uso de la aplicación de la Librería.
class TerminosCondicionesScreen extends StatelessWidget {
  const TerminosCondicionesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return LegalDocumento(
      titulo: 'Términos y Condiciones',
      fechaActualizacion: '19 de septiembre de 2026',
      secciones: const [
        LegalSeccion(
          titulo: '1. Aceptación de los términos',
          texto:
              'Mediante el registro de tu cuenta o el uso de la aplicación '
              'aceptas los presentes Términos y Condiciones y nuestra Política '
              'de Privacidad. Si no estás de acuerdo con alguna de sus '
              'cláusulas, te pedimos que no utilices la aplicación.',
        ),
        LegalSeccion(
          titulo: '2. La cuenta del cliente',
          texto:
              'Para comprar o reservar necesitas crear una cuenta con datos '
              'válidos y reales. Eres responsable de mantener la '
              'confidencialidad de tu contraseña y de toda la actividad que se '
              'realice en tu cuenta. Debes notificarnos de inmediato cualquier '
              'uso no autorizado. Puedes eliminar tu cuenta cuando quieras '
              'desde Perfil → Eliminar mi cuenta.',
        ),
        LegalSeccion(
          titulo: '3. Catálogo, precios y disponibilidad',
          texto:
              'Los precios se muestran en soles peruanos (S/) e incluyen los '
              'impuestos aplicables. La disponibilidad de stock es referencial '
              'y puede variar al momento de procesar tu pedido; si un libro no '
              'estuviera disponible te informaremos antes de completar el '
              'cobro.',
        ),
        LegalSeccion(
          titulo: '4. Pedidos y pagos',
          texto:
              'Los pagos se procesan a través de PayU, un proveedor externo '
              'de pagos. Al confirmar un pedido aceptas pagar el importe total '
              'indicado. La Librería no almacena datos de tarjetas de crédito '
              'o débito.',
        ),
        LegalSeccion(
          titulo: '5. Entregas',
          texto:
              'Los pedidos se entregan en la dirección y dentro del plazo '
              'indicados al momento de la compra. Los plazos son estimados. '
              'Los costos de envío, si aplican, se informan antes de confirmar '
              'el pago.',
        ),
        LegalSeccion(
          titulo: '6. Devoluciones y cambios',
          texto:
              'Aceptamos devoluciones o cambios de libros en buen estado '
              'dentro de los 7 días calendario posteriores a la entrega, '
              'siempre que no presenten señales de uso y conserven su empaque '
              'original. Si el libro llegó dañado, con fallas de impresión o '
              'no corresponde a tu pedido, lo cambiamos o te devolvemos el '
              'importe por el mismo medio de pago, sin costo para ti. Las '
              'condiciones especiales de cada venta se indican al momento de '
              'la compra.',
        ),
        LegalSeccion(
          titulo: '7. Reservas de libros',
          texto:
              'Al reservar un libro comprometes su disponibilidad por un plazo '
              'determinado. Si la reserva no se completa en el plazo indicado, '
              'el libro vuelve a estar disponible para otros clientes.',
        ),
        LegalSeccion(
          titulo: '8. Propiedad intelectual',
          texto:
              'Todo el contenido de la aplicación (textos, imágenes, logos y '
              'marcas) es de titularidad de la Librería o de sus proveedores y '
              'está protegido por las normas de propiedad intelectual. No está '
              'permitido copiarlo, distribuirlo ni usarlo comercialmente sin '
              'autorización.',
        ),
        LegalSeccion(
          titulo: '9. Limitación de responsabilidad',
          texto:
              'La Librería no será responsable por daños indirectos o pérdidas '
              'derivadas del uso de la aplicación, ni por demoras ajenas a su '
              'control, como fallas de los servicios de pago, transporte o '
              'conectividad.',
        ),
        LegalSeccion(
          titulo: '10. Modificaciones',
          texto:
              'La Librería podrá actualizar estos Términos en cualquier '
              'momento. La versión vigente se publicará en la aplicación y el '
              'uso continuado de la misma implica su aceptación.',
        ),
        LegalSeccion(
          titulo: '11. Contacto',
          texto:
              'Por consultas sobre estos términos puedes escribirnos a través '
              'de la información de contacto publicada en la aplicación. Si no '
              'estás conforme con un producto o con nuestra atención, puedes '
              'registrar un reclamo o una queja en nuestro Libro de '
              'Reclamaciones virtual (Perfil → Libro de Reclamaciones). Te '
              'responderemos en un plazo no mayor a 15 días hábiles.',
        ),
      ],
    );
  }
}
