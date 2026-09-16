import Foundation

enum FlexibleDecodingError {
    static func typeMismatch<T>(_ type: T.Type, codingPath: [CodingKey]) -> DecodingError {
        DecodingError.typeMismatch(
            type,
            DecodingError.Context(
                codingPath: codingPath,
                debugDescription: "El valor no tiene un formato compatible con \(type)."
            )
        )
    }
}

enum FlexibleDateParser {
    private static let isoWithFractions: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let isoWithoutFractions: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private static let dateOnly: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static func parse(_ value: String) -> Date? {
        isoWithFractions.date(from: value)
            ?? isoWithoutFractions.date(from: value)
            ?? dateOnly.date(from: value)
    }
}

extension KeyedDecodingContainer {
    func decodeFlexibleInt(forKey key: Key) throws -> Int {
        guard let value = try decodeFlexibleIntIfPresent(forKey: key) else {
            throw DecodingError.valueNotFound(
                Int.self,
                .init(codingPath: codingPath + [key], debugDescription: "Falta un entero requerido.")
            )
        }
        return value
    }

    func decodeFlexibleIntIfPresent(forKey key: Key) throws -> Int? {
        guard contains(key), try !decodeNil(forKey: key) else { return nil }
        if let value = try? decode(Int.self, forKey: key) { return value }
        if let value = try? decode(Double.self, forKey: key), value.rounded() == value {
            return Int(value)
        }
        if let value = try? decode(String.self, forKey: key), let parsed = Int(value) {
            return parsed
        }
        throw FlexibleDecodingError.typeMismatch(Int.self, codingPath: codingPath + [key])
    }

    func decodeFlexibleDouble(forKey key: Key) throws -> Double {
        guard let value = try decodeFlexibleDoubleIfPresent(forKey: key) else {
            throw DecodingError.valueNotFound(
                Double.self,
                .init(codingPath: codingPath + [key], debugDescription: "Falta un número requerido.")
            )
        }
        return value
    }

    func decodeFlexibleDoubleIfPresent(forKey key: Key) throws -> Double? {
        guard contains(key), try !decodeNil(forKey: key) else { return nil }
        if let value = try? decode(Double.self, forKey: key) { return value }
        if let value = try? decode(Int.self, forKey: key) { return Double(value) }
        if let value = try? decode(String.self, forKey: key), let parsed = Double(value) {
            return parsed
        }
        throw FlexibleDecodingError.typeMismatch(Double.self, codingPath: codingPath + [key])
    }

    func decodeFlexibleBool(forKey key: Key) throws -> Bool {
        guard let value = try decodeFlexibleBoolIfPresent(forKey: key) else {
            throw DecodingError.valueNotFound(
                Bool.self,
                .init(codingPath: codingPath + [key], debugDescription: "Falta un booleano requerido.")
            )
        }
        return value
    }

    func decodeFlexibleBoolIfPresent(forKey key: Key) throws -> Bool? {
        guard contains(key), try !decodeNil(forKey: key) else { return nil }
        if let value = try? decode(Bool.self, forKey: key) { return value }
        if let value = try? decode(Int.self, forKey: key), value == 0 || value == 1 {
            return value == 1
        }
        if let value = try? decode(String.self, forKey: key) {
            switch value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
            case "1", "true": return true
            case "0", "false": return false
            default: break
            }
        }
        throw FlexibleDecodingError.typeMismatch(Bool.self, codingPath: codingPath + [key])
    }

    func decodeFlexibleDateIfPresent(forKey key: Key) throws -> Date? {
        guard contains(key), try !decodeNil(forKey: key) else { return nil }
        let value = try decode(String.self, forKey: key)
        guard let date = FlexibleDateParser.parse(value) else {
            throw FlexibleDecodingError.typeMismatch(Date.self, codingPath: codingPath + [key])
        }
        return date
    }

    func decodeFlexibleStringIfPresent(forKey key: Key) throws -> String? {
        guard contains(key), try !decodeNil(forKey: key) else { return nil }
        if let value = try? decode(String.self, forKey: key) { return value }
        if let value = try? decode(Int.self, forKey: key) { return String(value) }
        if let value = try? decode(Double.self, forKey: key) { return String(value) }
        throw FlexibleDecodingError.typeMismatch(String.self, codingPath: codingPath + [key])
    }
}
