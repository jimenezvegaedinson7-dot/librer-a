import SwiftUI

/// Inicio de sesión (con 2FA) + enlaces a registro y recuperación.
/// La lógica sigue en LoginViewModel, sin cambios.
struct LoginView: View {
    @StateObject private var viewModel: LoginViewModel
    @EnvironmentObject private var themeStore: ThemeStore
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
            ScrollView {
                VStack(spacing: 22) {
                    VStack(spacing: 8) {
                        AppLogo(width: 170, height: 126)
                            .padding(.bottom, 14)
                        Text(viewModel.requiresTwoFactor ? "Verificación" : "Bienvenido")
                            .font(.serif(36))
                            .accessibilityAddTraits(.isHeader)
                        Text(viewModel.requiresTwoFactor
                             ? "Ingresa el código de tu app autenticadora."
                             : "Ingresa a tu cuenta para continuar.")
                            .foregroundStyle(Brand.textoSecundario)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 40)
                    .appear(0)

                    OrnamentDivider()

                    if viewModel.requiresTwoFactor {
                        twoFactorForm.appear(1)
                    } else {
                        credentialsForm.appear(1)
                    }

                    if let sessionMessage {
                        Text(sessionMessage)
                            .font(.subheadline)
                            .foregroundStyle(Brand.aviso)
                            .multilineTextAlignment(.center)
                    }
                    if let message = viewModel.errorMessage {
                        ErrorBanner(message: message)
                    }

                    if !viewModel.requiresTwoFactor {
                        HStack(spacing: 4) {
                            Text("¿Aún no tienes una cuenta?").foregroundStyle(Brand.textoSecundario)
                            NavigationLink("Crear cuenta") { RegisterView() }
                                .fontWeight(.semibold)
                        }
                        .font(.subheadline)
                        .padding(.top, 8)
                    }
                }
                .padding(28)
            }
            .bookshelfBackground(themeStore.theme)
            .background(Brand.fondo.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var credentialsForm: some View {
        VStack(spacing: 14) {
            BrandField(title: "nombre@correo.com", systemImage: "at", text: $viewModel.email,
                       keyboard: .emailAddress, contentType: .emailAddress)
                .accessibilityLabel("Correo electrónico")
            BrandField(title: "Ingresa tu contraseña", systemImage: "lock", text: $viewModel.password,
                       secure: true, contentType: .password)
                .accessibilityLabel("Contraseña")
            NavigationLink("¿Olvidaste tu contraseña?") { ForgotPasswordView() }
                .font(.subheadline.weight(.semibold))
            Button {
                Task { await viewModel.submitCredentials() }
            } label: {
                if viewModel.isLoading { ProgressView().tint(.white) } else { Text("Iniciar sesión") }
            }
            .buttonStyle(BrandButtonStyle())
            .disabled(viewModel.isLoading)
            .padding(.top, 8)
        }
    }

    private var twoFactorForm: some View {
        VStack(spacing: 14) {
            if let message = viewModel.informationMessage {
                Text(message).font(.subheadline).foregroundStyle(Brand.textoSecundario)
            }
            BrandField(title: "Código de 6 dígitos", systemImage: "number", text: $viewModel.code,
                       keyboard: .numberPad, contentType: .oneTimeCode)
                .accessibilityLabel("Código de doble factor")
            Button {
                Task { await viewModel.submitTwoFactorCode() }
            } label: {
                if viewModel.isLoading { ProgressView().tint(.white) } else { Text("Verificar código") }
            }
            .buttonStyle(BrandButtonStyle())
            .disabled(viewModel.isLoading)
            Button("Volver al acceso") { viewModel.resetTwoFactor() }
                .disabled(viewModel.isLoading)
        }
    }
}

// MARK: - Registro

struct RegisterView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var themeStore: ThemeStore
    @State private var name = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirm = ""
    @State private var acceptsTerms = false
    @State private var busy = false
    @State private var errorMessage: String?
    @State private var verifyEmail: String?
    @State private var legal: LegalDocument?
    @State private var accountCreated = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                AuthHeader(logoSize: 92, title: "Crea tu cuenta", subtitle: "Únete a nuestra librería")
                FormSection(title: "Tus datos", systemImage: "person.text.rectangle") {
                    BrandField(title: "Nombre", systemImage: "person", text: $name, contentType: .givenName)
                    BrandField(title: "Apellido", systemImage: "person", text: $lastName, contentType: .familyName)
                    BrandField(title: "Correo electrónico", systemImage: "at", text: $email,
                               keyboard: .emailAddress, contentType: .emailAddress)
                }
                FormSection(title: "Contraseña", systemImage: "lock", index: 2) {
                    BrandField(title: "Contraseña", systemImage: "lock", text: $password,
                               secure: true, contentType: .newPassword)
                    BrandField(title: "Confirmar contraseña", systemImage: "lock", text: $confirm,
                               secure: true, contentType: .newPassword)
                    PasswordRequirements(password: password, confirmation: confirm)
                }
                VStack(alignment: .leading, spacing: 6) {
                    Toggle("Acepto los Términos y la Política de Privacidad", isOn: $acceptsTerms)
                        .font(.footnote)
                    HStack(spacing: 16) {
                        Button("Leer Términos") { legal = .terms }
                        Button("Leer Privacidad") { legal = .privacy }
                    }
                    .font(.footnote.weight(.semibold))
                }
                if let errorMessage { ErrorBanner(message: errorMessage) }
                Button {
                    Task { await register() }
                } label: {
                    if busy { ProgressView().tint(.white) } else { Text("Crear cuenta") }
                }
                .buttonStyle(BrandButtonStyle())
                .disabled(busy)
            }
            .padding(20)
        }
        .bookshelfBackground(themeStore.theme)
        .background(Brand.fondo.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: Binding(get: { verifyEmail != nil }, set: { if !$0 { verifyEmail = nil } })) {
            if let verifyEmail { VerifyEmailView(email: verifyEmail) }
        }
        .alert("Cuenta creada correctamente. Ya puedes iniciar sesión.", isPresented: $accountCreated) {
            Button("Iniciar sesión") { dismiss() }
        }
        .sheet(item: Binding(get: { legal.map(LegalSheetItem.init) }, set: { legal = $0?.document })) { item in
            NavigationStack { LegalDocumentView(document: item.document) }
        }
    }

    private func register() async {
        let n = name.trimmingCharacters(in: .whitespaces)
        let a = lastName.trimmingCharacters(in: .whitespaces)
        let e = email.trimmingCharacters(in: .whitespaces)
        if n.isEmpty || a.isEmpty { errorMessage = "Ingresa tu nombre y apellido."; return }
        if !Validation.isEmail(e) { errorMessage = "Ingresa un correo válido."; return }
        if let problem = Validation.passwordError(password) { errorMessage = problem; return }
        if confirm != password { errorMessage = "Las contraseñas no coinciden."; return }
        if !acceptsTerms { errorMessage = "Debes aceptar los Términos y la Política de Privacidad."; return }
        errorMessage = nil
        busy = true
        defer { busy = false }
        do {
            let needsVerification = try await appState.accountService.register(
                name: n, lastName: a, email: e, password: password
            )
            if needsVerification { verifyEmail = e } else { accountCreated = true }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct LegalSheetItem: Identifiable {
    let document: LegalDocument
    var id: String { document.title }
}

// MARK: - Verificar correo

struct VerifyEmailView: View {
    let email: String
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var themeStore: ThemeStore
    @State private var code = ""
    @State private var busy = false
    @State private var message: String?
    @State private var errorMessage: String?
    @State private var verified = false

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                AuthHeader(logoSize: 88, title: "Verificar cuenta",
                           subtitle: "Enviamos un código de 6 dígitos a \(email).")
                if verified {
                    Label("Tu cuenta quedó activa. Ya puedes iniciar sesión.", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(Brand.exito)
                        .multilineTextAlignment(.center)
                } else {
                    FormSection(title: "Código", systemImage: "number") {
                        BrandField(title: "Código de 6 dígitos", systemImage: "number", text: $code,
                                   keyboard: .numberPad, contentType: .oneTimeCode)
                    }
                    if let message { Text(message).font(.subheadline).foregroundStyle(Brand.exito) }
                    if let errorMessage { ErrorBanner(message: errorMessage) }
                    Button {
                        Task { await verify() }
                    } label: {
                        if busy { ProgressView().tint(.white) } else { Text("Verificar") }
                    }
                    .buttonStyle(BrandButtonStyle())
                    .disabled(busy)
                    ResendCodeButton(disabled: busy) { await resend() }
                }
            }
            .padding(20)
        }
        .bookshelfBackground(themeStore.theme)
        .background(Brand.fondo.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    private func verify() async {
        guard code.range(of: "^\\d{6}$", options: .regularExpression) != nil else {
            errorMessage = "Ingresa el código de 6 dígitos."
            return
        }
        busy = true
        defer { busy = false }
        do {
            try await appState.accountService.verifyEmail(email: email, code: code)
            errorMessage = nil
            withAnimation { verified = true }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func resend() async -> Bool {
        do {
            try await appState.accountService.resendCode(email: email)
            message = "Se envió un nuevo código a tu correo."
            errorMessage = nil
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}

// MARK: - Recuperar contraseña

/// Dos pasos, como en Flutter: pedir el código y restablecer la contraseña.
struct ForgotPasswordView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var themeStore: ThemeStore
    @State private var email = ""
    @State private var codeSent = false
    @State private var code = ""
    @State private var password = ""
    @State private var confirm = ""
    @State private var busy = false
    @State private var errorMessage: String?
    @State private var done = false

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                AuthHeader(
                    logoSize: 88,
                    title: done ? "Contraseña actualizada" : (codeSent ? "Crea una nueva contraseña" : "Recupera tu acceso"),
                    subtitle: done
                        ? "Contraseña actualizada. Ya puedes iniciar sesión."
                        : (codeSent ? "Ingresa el código que enviamos a \(email)." : "Ingresa el correo de tu cuenta y te enviaremos un código.")
                )
                if !done {
                    if codeSent {
                        FormSection(title: "Código y contraseña", systemImage: "lock") {
                            BrandField(title: "Código de 6 dígitos", systemImage: "number", text: $code,
                                       keyboard: .numberPad, contentType: .oneTimeCode)
                            BrandField(title: "Nueva contraseña", systemImage: "lock", text: $password,
                                       secure: true, contentType: .newPassword)
                            BrandField(title: "Confirmar contraseña", systemImage: "lock", text: $confirm,
                                       secure: true, contentType: .newPassword)
                            PasswordRequirements(password: password, confirmation: confirm)
                        }
                        ResendCodeButton(disabled: busy) { await resendCode() }
                    } else {
                        FormSection(title: "Tu correo", systemImage: "envelope") {
                            BrandField(title: "Correo electrónico", systemImage: "at", text: $email,
                                       keyboard: .emailAddress, contentType: .emailAddress)
                        }
                    }
                    if let errorMessage { ErrorBanner(message: errorMessage) }
                    Button {
                        Task { codeSent ? await reset() : await sendCode() }
                    } label: {
                        if busy { ProgressView().tint(.white) } else { Text(codeSent ? "Restablecer contraseña" : "Enviar código") }
                    }
                    .buttonStyle(BrandButtonStyle())
                    .disabled(busy)
                }
            }
            .padding(20)
        }
        .bookshelfBackground(themeStore.theme)
        .background(Brand.fondo.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    private func sendCode() async {
        let e = email.trimmingCharacters(in: .whitespaces)
        guard Validation.isEmail(e) else { errorMessage = "Ingresa un correo válido."; return }
        busy = true
        defer { busy = false }
        do {
            try await appState.accountService.requestPasswordReset(email: e)
            email = e
            errorMessage = nil
            withAnimation { codeSent = true }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func resendCode() async -> Bool {
        do {
            try await appState.accountService.requestPasswordReset(email: email)
            errorMessage = nil
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    private func reset() async {
        guard code.range(of: "^\\d{6}$", options: .regularExpression) != nil else {
            errorMessage = "Ingresa el código de 6 dígitos."
            return
        }
        if let problem = Validation.passwordError(password) { errorMessage = problem; return }
        if confirm != password { errorMessage = "Las contraseñas no coinciden."; return }
        busy = true
        defer { busy = false }
        do {
            try await appState.accountService.resetPassword(email: email, code: code, password: password)
            errorMessage = nil
            withAnimation { done = true }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Reenviar código

/// "¿No recibiste el código? Reenviar" con 60 s de espera, como Flutter.
/// La espera empieza al aparecer, porque el código se acaba de enviar.
struct ResendCodeButton: View {
    var disabled = false
    let action: () async -> Bool
    @State private var secondsLeft = 60
    @State private var sending = false

    var body: some View {
        Button {
            Task {
                sending = true
                if await action() { secondsLeft = 60 }
                sending = false
            }
        } label: {
            if sending {
                ProgressView()
            } else if secondsLeft > 0 {
                Text("Reenviar código en \(secondsLeft) s").foregroundStyle(Brand.textoTerciario)
            } else {
                Text("¿No recibiste el código? Reenviar")
            }
        }
        .font(.subheadline.weight(.semibold))
        .disabled(disabled || sending || secondsLeft > 0)
        .task(id: secondsLeft) {
            guard secondsLeft > 0 else { return }
            try? await Task.sleep(for: .seconds(1))
            if !Task.isCancelled { secondsLeft -= 1 }
        }
    }
}

// MARK: - Cabecera de acceso

/// Logo, título y subtítulo centrados (registro, verificación, recuperación).
struct AuthHeader: View {
    let logoSize: CGFloat
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 6) {
            AppLogo(width: logoSize, height: logoSize)
                .padding(.bottom, 14)
            Text(title)
                .font(.serif(26))
                .multilineTextAlignment(.center)
                .accessibilityAddTraits(.isHeader)
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(Brand.textoSecundario)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .appear(0)
    }
}

/// Línea dorada con un libro en el centro (adorno del login de Flutter).
struct OrnamentDivider: View {
    var body: some View {
        HStack(spacing: 12) {
            Rectangle().fill(Brand.divisor).frame(height: 1)
            Image(systemName: "book").font(.system(size: 17)).foregroundStyle(Brand.dorado)
            Rectangle().fill(Brand.divisor).frame(height: 1)
        }
        .accessibilityHidden(true)
    }
}
