import Foundation

enum ReservationPresentation {
    static func status(_ rawValue: String) -> PresentedStatus {
        let trimmed = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalized = trimmed.uppercased()

        let knownValues: [String: (String, PresentationTone)] = [
            "PENDIENTE": ("Pendiente", .warning),
            "CONFIRMADA": ("Confirmada", .positive),
            "COMPLETADA": ("Completada", .positive),
            "CANCELADA": ("Cancelada", .negative)
        ]

        if let known = knownValues[normalized] {
            return PresentedStatus(text: known.0, rawValue: trimmed, tone: known.1)
        }
        return PresentedStatus(
            text: trimmed.isEmpty ? "No disponible" : trimmed,
            rawValue: trimmed,
            tone: .neutral
        )
    }

    static func isExpired(
        expirationDate: Date?,
        relativeTo date: Date,
        calendar: Calendar
    ) -> Bool {
        guard let expirationDate else { return false }
        return calendar.startOfDay(for: expirationDate) < calendar.startOfDay(for: date)
    }
}

enum ReservationErrorMessage {
    static func listing(_ error: Error) -> String {
        message(error, notFound: "No se pudo encontrar la información de tus reservas.")
    }

    static func detail(_ error: Error) -> String {
        message(error, notFound: "La reserva no fue encontrada.")
    }

    private static func message(_ error: Error, notFound: String) -> String {
        guard let apiError = error as? APIError else { return error.localizedDescription }
        switch apiError {
        case .forbidden:
            return "No tienes autorización para consultar esta reserva."
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
