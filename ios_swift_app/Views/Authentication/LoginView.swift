import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel: LoginViewModel
    private let sessionMessage: String?

    init(
        authService: AuthService,
        sessionMessage: String? = nil,
        onAuthenticated: @escaping (User, String) async throws -> Void
    ) {
        self.sessionMessage = sessionMessage
        _viewModel = StateObject(
            wrappedValue: LoginViewModel(
                authService: authService,
                onAuthenticated: onAuthenticated
            )
        )
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Librería Secure")
                        .font(.largeTitle.bold())
                        .accessibilityAddTraits(.isHeader)
                    Text("Acceso complementario para seguridad, confirmación y seguimiento.")
                        .foregroundStyle(.secondary)
                }

                if viewModel.requiresTwoFactor {
                    twoFactorSection
                } else {
                    credentialsSection
                }

                if let sessionMessage {
                    Text(sessionMessage)
                        .foregroundStyle(.orange)
                        .accessibilityLabel("Aviso de sesión: \(sessionMessage)")
                }

                if let message = viewModel.errorMessage {
                    Text(message)
                        .foregroundStyle(.red)
                        .accessibilityLabel("Error: \(message)")
                }
            }
            .navigationTitle("Iniciar sesión")
        }
    }

    private var credentialsSection: some View {
        Section("Credenciales") {
            TextField("Correo", text: $viewModel.email)
                .textContentType(.emailAddress)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .autocorrectionDisabled()
                .accessibilityLabel("Correo electrónico")

            SecureField("Contraseña", text: $viewModel.password)
                .textContentType(.password)
                .accessibilityLabel("Contraseña")

            PrimaryActionButton(title: "Continuar", isLoading: viewModel.isLoading) {
                Task { await viewModel.submitCredentials() }
            }
        }
    }

    private var twoFactorSection: some View {
        Section("Doble factor") {
            if let message = viewModel.informationMessage {
                Text(message)
                    .foregroundStyle(.secondary)
            }

            TextField("Código de 6 dígitos", text: $viewModel.code)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .accessibilityLabel("Código de doble factor")

            PrimaryActionButton(title: "Verificar código", isLoading: viewModel.isLoading) {
                Task { await viewModel.submitTwoFactorCode() }
            }

            Button("Volver al acceso") {
                viewModel.resetTwoFactor()
            }
            .disabled(viewModel.isLoading)
        }
    }
}
