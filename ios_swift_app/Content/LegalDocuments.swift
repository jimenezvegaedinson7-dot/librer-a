// Generado desde flutter_app/lib/screens/legal (mismo contenido).
import Foundation

struct LegalDocument {
    struct Section: Identifiable {
        let title: String
        let text: String
        var id: String { title }
    }

    let title: String
    let updated: String
    let sections: [Section]
}

extension LegalDocument {
    static let terms = LegalDocument(
        title: "Términos y Condiciones",
        updated: "19 de septiembre de 2026",
        sections: [
            .init(title: "1. Aceptación de los términos", text: "Mediante el registro de tu cuenta o el uso de la aplicación aceptas los presentes Términos y Condiciones y nuestra Política de Privacidad. Si no estás de acuerdo con alguna de sus cláusulas, te pedimos que no utilices la aplicación."),
            .init(title: "2. La cuenta del cliente", text: "Para comprar o reservar necesitas crear una cuenta con datos válidos y reales. Eres responsable de mantener la confidencialidad de tu contraseña y de toda la actividad que se realice en tu cuenta. Debes notificarnos de inmediato cualquier uso no autorizado."),
            .init(title: "3. Catálogo, precios y disponibilidad", text: "Los precios se muestran en soles peruanos (S/) e incluyen los impuestos aplicables. La disponibilidad de stock es referencial y puede variar al momento de procesar tu pedido; si un libro no estuviera disponible te informaremos antes de completar el cobro."),
            .init(title: "4. Pedidos y pagos", text: "Los pagos se procesan a través de PayU, un proveedor externo de pagos. Al confirmar un pedido aceptas pagar el importe total indicado. La Librería no almacena datos de tarjetas de crédito o débito."),
            .init(title: "5. Entregas", text: "Los pedidos se entregan en la dirección y dentro del plazo indicados al momento de la compra. Los plazos son estimados. Los costos de envío, si aplican, se informan antes de confirmar el pago."),
            .init(title: "6. Devoluciones y cambios", text: "Aceptamos devoluciones o cambios de libros en buen estado dentro de los 7 días calendario posteriores a la entrega, siempre que no presenten señales de uso y conserven su empaque original. Las condiciones especiales de cada venta se indican al momento de la compra."),
            .init(title: "7. Reservas de libros", text: "Al reservar un libro comprometes su disponibilidad por un plazo determinado. Si la reserva no se completa en el plazo indicado, el libro vuelve a estar disponible para otros clientes."),
            .init(title: "8. Propiedad intelectual", text: "Todo el contenido de la aplicación (textos, imágenes, logos y marcas) es de titularidad de la Librería o de sus proveedores y está protegido por las normas de propiedad intelectual. No está permitido copiarlo, distribuirlo ni usarlo comercialmente sin autorización."),
            .init(title: "9. Limitación de responsabilidad", text: "La Librería no será responsable por daños indirectos o pérdidas derivadas del uso de la aplicación, ni por demoras ajenas a su control, como fallas de los servicios de pago, transporte o conectividad."),
            .init(title: "10. Modificaciones", text: "La Librería podrá actualizar estos Términos en cualquier momento. La versión vigente se publicará en la aplicación y el uso continuado de la misma implica su aceptación."),
            .init(title: "11. Contacto", text: "Por consultas sobre estos términos puedes escribirnos a través de la información de contacto publicada en la aplicación."),
        ]
    )

    static let privacy = LegalDocument(
        title: "Política de Privacidad",
        updated: "19 de septiembre de 2026",
        sections: [
            .init(title: "1. Responsable del tratamiento", text: "La Librería es responsable del tratamiento de los datos personales que recopila a través de su aplicación, conforme a la Ley N.º 29733, Ley de Protección de Datos Personales, y su reglamento."),
            .init(title: "2. Datos que recopilamos", text: "Nombre, correo electrónico, teléfono, contraseña (cifrada), foto de perfil si la subes, historial de compras y reservas, y los datos necesarios para la entrega, como la dirección."),
            .init(title: "3. Finalidad del uso de los datos", text: "Usamos tus datos para gestionar tu cuenta, procesar pedidos y pagos, coordinar entregas, gestionar reservas, atender reclamos y, con tu consentimiento, enviarte información de la Librería."),
            .init(title: "4. Pagos y PayU", text: "Los pagos se procesan a través de PayU. La Librería no recibe, almacena ni procesa los datos de tu tarjeta; el tratamiento se realiza por el proveedor de pagos bajo sus propias políticas de privacidad."),
            .init(title: "5. Seguridad de la información", text: "Protegemos tus datos con medidas técnicas y organizativas razonables, incluyendo el uso de contraseñas cifradas y la verificación en dos pasos para tu cuenta."),
            .init(title: "6. Conservación de los datos", text: "Conservamos tus datos solo durante el tiempo necesario para cumplir las finalidades descritas y las obligaciones legales, contables o fiscales aplicables."),
            .init(title: "7. Derechos del titular", text: "De acuerdo con la Ley N.º 29733, puedes solicitar el acceso, actualización, inclusión, rectificación, supresión o revocación de tus datos personales ejerciendo tus derechos ARCO a través de los canales de contacto de la aplicación."),
            .init(title: "8. Menores de edad", text: "La aplicación está dirigida a mayores de edad. Si eres menor de 18 años, puedes utilizarla solo con la supervisión de tus padres o tutores."),
            .init(title: "9. Cambios en la política", text: "Podremos actualizar esta Política de Privacidad para reflejar cambios legales o de funcionamiento. La versión vigente se publicará en la aplicación y te avisaremos de los cambios relevantes."),
            .init(title: "10. Contacto", text: "Por consultas sobre el tratamiento de tus datos, para ejercer tus derechos ARCO o cancelar tu cuenta, escríbenos a través de la información de contacto publicada en la aplicación."),
        ]
    )
}
