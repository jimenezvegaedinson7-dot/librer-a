import Foundation

enum SessionRestorationDecision: Equatable {
    case unauthenticated
    case requireBiometricUnlock
    case validateSession
}

enum SessionFailureDisposition: Equatable {
    case expired
    case recoverable
    case rejected
}

enum SessionSecurityPolicy {
    static func restorationDecision(
        hasToken: Bool,
        biometricLockEnabled: Bool
    ) -> SessionRestorationDecision {
        guard hasToken else { return .unauthenticated }
        return biometricLockEnabled ? .requireBiometricUnlock : .validateSession
    }

    static func allowsClientRole(_ role: String) -> Bool {
        role.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == "cliente"
    }

    static func failureDisposition(for error: APIError) -> SessionFailureDisposition {
        switch error {
        case .unauthorized:
            return .expired
        case .forbidden, .notFound, .api:
            return .rejected
        case .connectivity, .server, .rateLimited:
            return .recoverable
        case .invalidURL, .invalidRequest, .requestEncoding, .decoding, .unexpectedStatus:
            return .recoverable
        }
    }
}
