import Foundation

/// Lo que el cliente ve de su pedido: un título, una frase y los pasos de
/// su tipo de entrega. Mismos textos que Flutter
/// (`lib/utils/seguimiento_pedido.dart`), la web
/// (`frontend/src/lib/utils/seguimientoPedido.js`) y los correos; el panel
/// avanza estos mismos pasos.
///
///   Recojo:   Recibido → Preparando → Listo → Recogido
///   Delivery: Recibido → Preparando → En camino → Entregado
struct OrderTracking: Equatable {
    enum Tone: Equatable { case waiting, inProgress, done, cancelled }

    struct Step: Equatable, Identifiable {
        let key: String
        let label: String
        let done: Bool
        let current: Bool
        var id: String { key }
    }

    let title: String
    let message: String
    let steps: [Step]
    let tone: Tone

    private static let flows: [String: [(String, String)]] = [
        "tienda": [("pendiente", "Recibido"), ("preparando", "Preparando"),
                   ("listo_recojo", "Listo"), ("entregado", "Recogido")],
        "domicilio": [("pendiente", "Recibido"), ("preparando", "Preparando"),
                      ("en_camino", "En camino"), ("entregado", "Entregado")]
    ]

    private static func text(type: String, state: String, id: Int) -> (String, String)? {
        switch (type, state) {
        case (_, "pendiente"):
            return ("Pedido recibido", "Confirmamos tu pago. Pronto empezaremos a preparar tus libros.")
        case ("tienda", "preparando"):
            return ("Preparando tu pedido", "Estamos separando tus libros en la tienda.")
        case ("tienda", "listo_recojo"):
            return ("Listo para recoger", "Acércate a la tienda con tu número de pedido #\(id) y tu DNI.")
        case ("tienda", "entregado"):
            return ("Pedido recogido", "Recogiste tu pedido. ¡Gracias por tu compra!")
        case ("domicilio", "preparando"):
            return ("Preparando tu pedido", "Estamos empaquetando tus libros para enviarlos.")
        case ("domicilio", "en_camino"):
            return ("Tu pedido va en camino",
                    "Salió hacia tu dirección. Mantén tu teléfono a mano para coordinar la entrega.")
        case ("domicilio", "entregado"):
            return ("Pedido entregado", "Tu pedido llegó a tu dirección. ¡Gracias por tu compra!")
        default:
            return nil
        }
    }

    init(title: String, message: String, steps: [Step] = [], tone: Tone = .inProgress) {
        self.title = title
        self.message = message
        self.steps = steps
        self.tone = tone
    }

    init(purchase: Purchase) {
        self.init(
            id: purchase.idVenta,
            sale: purchase.estado,
            delivery: purchase.estadoEntrega,
            type: purchase.tipoEntrega
        )
    }

    init(id: Int, sale: String?, delivery: String?, type: String?) {
        let comercial = (sale ?? "").trimmingCharacters(in: .whitespaces).lowercased()
        let tipo = (type ?? "").trimmingCharacters(in: .whitespaces).lowercased()
        // Ventas antiguas sin estado de entrega: "entregada" implica entregado.
        let estado = (delivery ?? (comercial == "entregada" ? "entregado" : "pendiente"))
            .trimmingCharacters(in: .whitespaces).lowercased()
        let flow = OrderTracking.flows[tipo]
        func steps(_ index: Int) -> [Step] {
            (flow ?? []).enumerated().map { i, paso in
                Step(key: paso.0, label: paso.1, done: i <= index, current: i == index)
            }
        }

        if comercial == "reembolsada" {
            self.init(title: "Compra reembolsada", message: "Devolvimos el dinero de esta compra.", tone: .cancelled)
            return
        }
        if estado == "cancelado" || comercial == "cancelada" {
            self.init(
                title: "Pedido cancelado",
                message: "Este pedido no continuará. Si ya pagaste, te contactaremos para la devolución.",
                tone: .cancelled
            )
            return
        }
        if comercial == "pendiente" {
            self.init(
                title: "Esperando pago",
                message: "La preparación empieza cuando se confirme tu pago.",
                steps: steps(-1),
                tone: .waiting
            )
            return
        }
        guard let flow, let texto = OrderTracking.text(type: tipo, state: estado, id: id) else {
            self.init(title: "En proceso", message: "")
            return
        }
        self.init(
            title: texto.0,
            message: texto.1,
            steps: steps(flow.firstIndex { $0.0 == estado } ?? 0),
            tone: estado == "entregado" ? .done : .inProgress
        )
    }
}
