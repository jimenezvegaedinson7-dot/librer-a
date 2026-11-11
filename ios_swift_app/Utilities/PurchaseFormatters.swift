import Foundation

enum PurchaseFormatters {
    private static let lock = NSLock()

    private static let penFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "es_PE")
        formatter.numberStyle = .currency
        formatter.currencyCode = "PEN"
        formatter.currencySymbol = "S/"
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        formatter.positiveFormat = "¤ #,##0.00"
        return formatter
    }()

    private static let dateTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "es_PE")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    static func pen(_ value: Double) -> String {
        lock.lock()
        defer { lock.unlock() }
        return penFormatter.string(from: NSNumber(value: value))
            ?? String(format: "S/ %.2f", value)
    }

    static func dateTime(_ value: Date?) -> String {
        guard let value else { return "Fecha no disponible" }
        lock.lock()
        defer { lock.unlock() }
        return dateTimeFormatter.string(from: value)
    }
}
