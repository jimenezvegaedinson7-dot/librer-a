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

    private let authService: AuthService
    private let onAuthenticated: (User, String) async throws -> Void

    // El token temporal 2FA vive únicamente en memoria durante este flujo.
    private var temporaryTwoFactorToken: String?

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
            try await handle(result)
        } catch {
            errorMessage = error.localizedDescription
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
}
