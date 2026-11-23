import Foundation
import Combine

@MainActor
final class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var code = ""
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?
    @Published private(set) var informationMessage: String?
    @Published private(set) var requiresTwoFactor = false
    @Published private(set) var failedCredentialAttempts = 0
    @Published private(set) var requiresSecurityGame = false
    @Published private(set) var securityGameCompleted = false

    private let authService: AuthService
    private let onAuthenticated: (User, String) async throws -> Void

    // El token temporal 2FA vive únicamente en memoria durante este flujo.
    private var temporaryTwoFactorToken: String?
    private let requiredAttemptsBeforeGame = 3

    init(
        authService: AuthService,
        onAuthenticated: @escaping (User, String) async throws -> Void
    ) {
        self.authService = authService
        self.onAuthenticated = onAuthenticated
    }

    func submitCredentials() async {
        guard InputValidation.isValidEmail(email) else {
            errorMessage = "Ingresa un correo válido."
            return
        }
        guard !password.isEmpty else {
            errorMessage = "Ingresa tu contraseña."
            return
        }
        guard !requiresSecurityGame else {
            errorMessage = "Completa el juego de seguridad para volver a intentar."
            return
        }

        isLoading = true
        errorMessage = nil
        defer {
            password = ""
            isLoading = false
        }

        do {
            let result = try await authService.login(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password
            )
            failedCredentialAttempts = 0
            requiresSecurityGame = false
            securityGameCompleted = false
            try await handle(result)
        } catch {
            registerCredentialFailure(error)
        }
    }

    func submitTwoFactorCode() async {
        guard let temporaryTwoFactorToken else {
            resetTwoFactor()
            errorMessage = "El flujo de doble factor ya no está disponible. Inicia sesión nuevamente."
            return
        }
        guard InputValidation.isSixDigitCode(code) else {
            errorMessage = "El código debe tener 6 dígitos."
            return
        }

        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let result = try await authService.verifyTwoFactor(
                temporaryToken: temporaryTwoFactorToken,
                code: code
            )
            try await handle(result)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func completeSecurityGame() {
        securityGameCompleted = true
        requiresSecurityGame = false
        failedCredentialAttempts = 0
        errorMessage = nil
        informationMessage = "Verificación completada. Ya puedes intentar iniciar sesión de nuevo."
    }

    func resetTwoFactor() {
        temporaryTwoFactorToken = nil
        requiresTwoFactor = false
        informationMessage = nil
        code = ""
    }

    private func handle(_ result: LoginResult) async throws {
        switch result {
        case .authenticated(let user, let token):
            temporaryTwoFactorToken = nil
            code = ""
            try await onAuthenticated(user, token)
        case .requiresTwoFactor(let token, let message):
            temporaryTwoFactorToken = token
            requiresTwoFactor = true
            informationMessage = message
        }
    }

    private func registerCredentialFailure(_ error: Error) {
        let apiError = error as? APIError
        let message = error.localizedDescription
        let shouldCountAttempt: Bool

        switch apiError {
        case .unauthorized, .forbidden, .notFound:
            shouldCountAttempt = true
        case .rateLimited:
            shouldCountAttempt = true
        case .api(let statusCode, _):
            shouldCountAttempt = statusCode == 400 || statusCode == 401 || statusCode == 403 || statusCode == 404
        default:
            shouldCountAttempt = false
        }

        if shouldCountAttempt {
            failedCredentialAttempts += 1
        }

        if failedCredentialAttempts >= requiredAttemptsBeforeGame {
            requiresSecurityGame = true
            securityGameCompleted = false
            errorMessage = "Has superado \(requiredAttemptsBeforeGame) intentos fallidos. Completa el juego de seguridad para continuar."
            return
        }

        errorMessage = message
    }
}
