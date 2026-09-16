import Foundation
import LocalAuthentication

enum BiometricKind: Equatable {
    case faceID
    case touchID
    case none

    var displayName: String {
        switch self {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .none: return "Ninguno"
        }
    }
}

struct BiometricAvailability: Equatable {
    let kind: BiometricKind
    let isAvailable: Bool
    let message: String?
}

enum BiometricError: Error, LocalizedError {
    case unavailable(String?)
    case evaluationFailed(String?)

    var errorDescription: String? {
        switch self {
        case .unavailable(let message):
            return message ?? "La autenticación biométrica no está disponible en este dispositivo."
        case .evaluationFailed(let message):
            return message ?? "No fue posible validar la identidad local."
        }
    }
}

protocol BiometricAuthenticating {
    func availability() -> BiometricAvailability
    func evaluate(reason: String) async throws -> Bool
}

final class BiometricService: BiometricAuthenticating {
    func availability() -> BiometricAvailability {
        let context = LAContext()
        var error: NSError?
        let isAvailable = context.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            error: &error
        )

        let kind: BiometricKind
        switch context.biometryType {
        case .faceID: kind = .faceID
        case .touchID: kind = .touchID
        case .none: kind = .none
        @unknown default: kind = .none
        }

        return BiometricAvailability(
            kind: kind,
            isAvailable: isAvailable,
            message: isAvailable ? nil : error?.localizedDescription
        )
    }

    func evaluate(reason: String) async throws -> Bool {
        let context = LAContext()
        context.localizedCancelTitle = "Cancelar"

        var policyError: NSError?
        guard context.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            error: &policyError
        ) else {
            throw BiometricError.unavailable(policyError?.localizedDescription)
        }

        return try await withCheckedThrowingContinuation { continuation in
            context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            ) { success, error in
                if success {
                    continuation.resume(returning: true)
                } else {
                    continuation.resume(
                        throwing: BiometricError.evaluationFailed(error?.localizedDescription)
                    )
                }
            }
        }
    }
}
