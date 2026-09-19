import 'package:flutter/material.dart';

import '../../widgets/legal_documento.dart';

/// Política de Privacidad de la aplicación de la Librería.
class PoliticaPrivacidadScreen extends StatelessWidget {
  const PoliticaPrivacidadScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return LegalDocumento(
      titulo: 'Política de Privacidad',
      fechaActualizacion: '19 de septiembre de 2026',
      secciones: const [
        LegalSeccion(
          titulo: '1. Responsable del tratamiento',
          texto:
              'La Librería es responsable del tratamiento de los datos '
              'personales que recopila a través de su aplicación, conforme a '
              'la Ley N.º 29733, Ley de Protección de Datos Personales, y su '
              'reglamento.',
        ),
        LegalSeccion(
          titulo: '2. Datos que recopilamos',
          texto:
              'Nombre, correo electrónico, teléfono, contraseña (cifrada), '
              'foto de perfil si la subes, historial de compras y reservas, y '
              'los datos necesarios para la entrega, como la dirección.',
        ),
        LegalSeccion(
          titulo: '3. Finalidad del uso de los datos',
          texto:
              'Usamos tus datos para gestionar tu cuenta, procesar pedidos y '
              'pagos, coordinar entregas, gestionar reservas, atender reclamos '
              'y, con tu consentimiento, enviarte información de la Librería.',
        ),
        LegalSeccion(
          titulo: '4. Pagos y PayU',
          texto:
              'Los pagos se procesan a través de PayU. La Librería no recibe, '
              'almacena ni procesa los datos de tu tarjeta; el tratamiento se '
              'realiza por el proveedor de pagos bajo sus propias políticas de '
              'privacidad.',
        ),
        LegalSeccion(
          titulo: '5. Seguridad de la información',
          texto:
              'Protegemos tus datos con medidas técnicas y organizativas '
              'razonables, incluyendo el uso de contraseñas cifradas y la '
              'verificación en dos pasos para tu cuenta.',
        ),
        LegalSeccion(
          titulo: '6. Conservación de los datos',
          texto:
              'Conservamos tus datos solo durante el tiempo necesario para '
              'cumplir las finalidades descritas y las obligaciones legales, '
              'contables o fiscales aplicables.',
        ),
        LegalSeccion(
          titulo: '7. Derechos del titular',
          texto:
              'De acuerdo con la Ley N.º 29733, puedes solicitar el acceso, '
              'actualización, inclusión, rectificación, supresión o revocación '
              'de tus datos personales ejerciendo tus derechos ARCO a través '
              'de los canales de contacto de la aplicación.',
        ),
        LegalSeccion(
          titulo: '8. Menores de edad',
          texto:
              'La aplicación está dirigida a mayores de edad. Si eres menor de '
              '18 años, puedes utilizarla solo con la supervisión de tus '
              'padres o tutores.',
        ),
        LegalSeccion(
          titulo: '9. Cambios en la política',
          texto:
              'Podremos actualizar esta Política de Privacidad para reflejar '
              'cambios legales o de funcionamiento. La versión vigente se '
              'publicará en la aplicación y te avisaremos de los cambios '
              'relevantes.',
        ),
        LegalSeccion(
          titulo: '10. Contacto',
          texto:
              'Por consultas sobre el tratamiento de tus datos, para ejercer '
              'tus derechos ARCO o cancelar tu cuenta, escríbenos a través de '
              'la información de contacto publicada en la aplicación.',
        ),
      ],
    );
  }
}