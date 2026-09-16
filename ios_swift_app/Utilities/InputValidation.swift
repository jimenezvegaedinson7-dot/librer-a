import Foundation

enum InputValidation {
    static func isValidEmail(_ value: String) -> Bool {
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        let parts = normalized.split(separator: "@", omittingEmptySubsequences: false)
        return parts.count == 2 && parts.allSatisfy { !$0.isEmpty }
    }

    static func isSixDigitCode(_ value: String) -> Bool {
        value.count == 6 && value.allSatisfy(\.isNumber)
    }
}
