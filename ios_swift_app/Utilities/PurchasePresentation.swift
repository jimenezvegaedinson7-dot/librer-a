import Foundation

enum PurchasePresentation {
    static func saleStatus(_ rawValue: String) -> PresentedStatus {
        present(
            rawValue,
            knownValues: [
                "PENDIENTE": ("Pendiente", .warning),
                "PAGADA": ("Pagada", .positive),
                "ENTREGADA": ("Entregada", .positive),
                "CANCELADA": ("Cancelada", .negative)
            ]
        )
    }

    static func deliveryType(_ rawValue: String) -> PresentedStatus {
        present(
            rawValue,
            knownValues: [
                "DOMICILIO": ("Domicilio", .neutral),
                "AGENCIA": ("Agencia", .neutral),
                "TIENDA": ("Recojo en tienda", .neutral)
            ]
        )
    }

    static func paymentStatus(_ rawValue: String) -> PresentedStatus {
        present(
            rawValue,
            knownValues: [
                "APPROVED": ("Aprobado", .positive),
                "PENDING": ("Pendiente", .warning),
                "PENDING_TRANSACTION_REVIEW": ("Pendiente de revisión", .warning),
                "PENDING_TRANSACTION_CONFIRMATION": ("Pendiente de confirmación", .warning),
                "DECLINED": ("Rechazado", .negative),
                "ERROR": ("Error", .negative),
                "EXPIRED": ("Expirado", .negative),
                "VOIDED": ("Anulado", .negative),
                "REFUNDED": ("Reembolsado", .neutral),
                "CHARGED_BACK": ("Contracargo", .negative),
                "UNKNOWN": ("Desconocido", .neutral)
            ]
        )
    }

    static func paymentMethod(_ rawValue: String) -> String {
        let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.lowercased() == "payu" ? "PayU" : trimmed
    }

    private static func present(
        _ rawValue: String,
        knownValues: [String: (String, PresentationTone)]
    ) -> PresentedStatus {
        let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalized = trimmed.uppercased()
        if let known = knownValues[normalized] {
            return PresentedStatus(text: known.0, rawValue: trimmed, tone: known.1)
        }
        return PresentedStatus(
            text: trimmed.isEmpty ? "No disponible" : trimmed,
            rawValue: trimmed,
            tone: .neutral
        )
    }
}

struct PaymentPresentation: Equatable {
    let status: PresentedStatus?
    let statusDetail: String?
    let method: String?
    let paymentDate: Date?
    let paymentID: String?
    let orderID: String?
    let externalReference: String?

    var hasInformation: Bool {
        status != nil
            || method != nil
            || paymentDate != nil
            || paymentID != nil
            || orderID != nil
            || externalReference != nil
    }

    static func make(
        purchase: Purchase,
        salePayment: SalePayment?,
        remoteStatus: PaymentStatus?
    ) -> PaymentPresentation {
        // Prioridad documentada: estado remoto de /pagos, luego estado consolidado
        // de /ventas/:id/pago y finalmente el estado guardado en la venta.
        let rawStatus = firstNonempty([
            remoteStatus?.paymentStatus,
            remoteStatus?.status,
            remoteStatus?.orderStatus,
            salePayment?.estadoPago,
            salePayment?.payuPaymentStatus,
            purchase.payuPaymentStatus
        ])

        return PaymentPresentation(
            status: rawStatus.map(PurchasePresentation.paymentStatus),
            statusDetail: firstNonempty([
                remoteStatus?.paymentStatusDetail,
                remoteStatus?.statusDetail
            ]),
            method: firstNonempty([salePayment?.metodoPago]).map(
                PurchasePresentation.paymentMethod
            ),
            paymentDate: salePayment?.fechaPago,
            paymentID: firstNonempty([salePayment?.payuPaymentID]),
            orderID: firstNonempty([
                remoteStatus?.id,
                salePayment?.orderID,
                salePayment?.payuOrderID
            ]),
            externalReference: firstNonempty([
                remoteStatus?.externalReference,
                salePayment?.externalReference,
                purchase.externalReference
            ])
        )
    }

    private static func firstNonempty(_ values: [String?]) -> String? {
        values.compactMap { value in
            guard let value else { return nil }
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }.first
    }
}

enum PurchaseErrorMessage {
    static func listing(_ error: Error) -> String {
        message(error, notFound: "No se pudo encontrar la información de tus compras.")
    }

    static func detail(_ error: Error) -> String {
        message(error, notFound: "La compra no está disponible o no fue encontrada.")
    }

    static func payment(_ error: Error) -> String {
        message(error, notFound: "No hay información de pago disponible para esta compra.")
    }

    private static func message(_ error: Error, notFound: String) -> String {
        guard let apiError = error as? APIError else { return error.localizedDescription }
        switch apiError {
        case .forbidden:
            return "No tienes autorización para consultar esta compra."
        case .notFound:
            return notFound
        case .rateLimited(let message):
            return message ?? "Hay demasiadas consultas. Intenta nuevamente más tarde."
        case .server(_, let message):
            return message ?? "El servidor no pudo completar la consulta. Intenta nuevamente."
        case .connectivity:
            return "No se pudo conectar. Revisa tu conexión e intenta nuevamente."
        default:
            return apiError.localizedDescription
        }
    }
}
