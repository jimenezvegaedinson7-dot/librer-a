import SwiftUI

// MARK: - Piezas comunes

/// Cabecera con medallón burdeos y anillo dorado (como en Flutter).
struct FormHeader<Medallion: View>: View {
    let eyebrow: String
    let title: String
    let subtitle: String
    @ViewBuilder let medallion: () -> Medallion
    @EnvironmentObject private var themeStore: ThemeStore

    var body: some View {
        VStack(spacing: 6) {
            Circle()
                .fill(LinearGradient(colors: [themeStore.theme.primary, themeStore.theme.primaryDark],
                                     startPoint: .topLeading, endPoint: .bottomTrailing))
                .frame(width: 92, height: 92)
                .overlay(medallion())
                .padding(5)
                .overlay(Circle().stroke(Brand.dorado.opacity(0.55), lineWidth: 1.5))
                .shadow(color: themeStore.theme.primaryDark.opacity(0.35), radius: 9, y: 8)
            Text(eyebrow.uppercased()).font(.caption.weight(.bold)).kerning(1.6)
                .foregroundStyle(Brand.dorado).padding(.top, 10)
            Text(title).font(.serif(26)).multilineTextAlignment(.center)
            Text(subtitle).font(.subheadline).foregroundStyle(Brand.textoSecundario)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .appear(0)
    }
}

/// Bloque con título pequeño y campos sobre superficie blanca.
struct FormSection<Content: View>: View {
    let title: String
    let systemImage: String
    var index = 1
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(title.uppercased(), systemImage: systemImage)
                .font(.caption.weight(.bold)).kerning(1.2)
                .foregroundStyle(Brand.textoSecundario)
            VStack(spacing: 14) { content() }
                .padding(14)
                .background(RoundedRectangle(cornerRadius: 18).fill(Brand.superficie))
                .overlay(RoundedRectangle(cornerRadius: 18).stroke(Brand.divisor))
        }
        .appear(index)
    }
}

enum Validation {
    static func isEmail(_ value: String) -> Bool {
        value.range(of: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", options: .regularExpression) != nil
    }

    /// Mismas reglas que Flutter y el backend: 8+ caracteres, letra y número.
    static func passwordError(_ value: String) -> String? {
        if value.isEmpty { return "Ingresa la nueva contraseña" }
        if value.count < 8 { return "Debe tener al menos 8 caracteres" }
        if value.range(of: "[A-Za-z]", options: .regularExpression) == nil
            || value.range(of: "[0-9]", options: .regularExpression) == nil {
            return "Debe incluir al menos una letra y un número"
        }
        return nil
    }
}

// MARK: - Editar perfil

struct EditProfileView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var showPhotoOptions = false
    @State private var toast: ToastMessage?
    @State private var saving = false
    @State private var uploading = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                FormHeader(
                    eyebrow: "Tu cuenta",
                    title: "\(name) \(lastName)".trimmingCharacters(in: .whitespaces).isEmpty
                        ? "Editar perfil" : "\(name) \(lastName)",
                    subtitle: "Mantén tus datos al día para tus compras y avisos."
                ) {
                    Text(initials).font(.serif(32)).foregroundStyle(.white)
                }

                Button { showPhotoOptions = true } label: {
                    Label(uploading ? "Subiendo foto…" : "Cambiar foto de perfil", systemImage: "camera")
                        .font(.subheadline.weight(.semibold))
                }
                .disabled(uploading)

                FormSection(title: "Datos personales", systemImage: "person.text.rectangle") {
                    BrandField(title: "Nombre", systemImage: "person", text: $name, contentType: .givenName)
                    BrandField(title: "Apellido", systemImage: "person", text: $lastName, contentType: .familyName)
                }
                FormSection(title: "Contacto", systemImage: "envelope", index: 2) {
                    BrandField(title: "Correo electrónico", systemImage: "at", text: $email,
                               keyboard: .emailAddress, contentType: .emailAddress)
                    BrandField(title: "Teléfono (opcional)", systemImage: "phone", text: $phone,
                               keyboard: .phonePad, contentType: .telephoneNumber)
                }

                if let errorMessage { ErrorBanner(message: errorMessage) }

                Button {
                    Task { await save() }
                } label: {
                    if saving { ProgressView().tint(.white) } else { Label("Guardar cambios", systemImage: "checkmark") }
                }
                .buttonStyle(BrandButtonStyle())
                .disabled(saving)
                .appear(3)
            }
            .padding(20)
        }
        .background(Brand.fondo.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .onAppear(perform: fill)
        .profilePhotoActions(isPresented: $showPhotoOptions, uploading: $uploading) { message in
            toast = ToastMessage(text: message)
        }
        .toast($toast)
    }

    private var initials: String {
        let letters = [name.first, lastName.first].compactMap { $0 }.map(String.init).joined()
        return letters.isEmpty ? "?" : letters.uppercased()
    }

    private func fill() {
        guard let user = appState.user, name.isEmpty, email.isEmpty else { return }
        name = user.nombre
        lastName = user.apellido
        email = user.email
        phone = user.telefono ?? ""
    }

    private func save() async {
        let n = name.trimmingCharacters(in: .whitespaces)
        let a = lastName.trimmingCharacters(in: .whitespaces)
        let e = email.trimmingCharacters(in: .whitespaces)
        if n.isEmpty { errorMessage = "Ingresa tu nombre"; return }
        if a.isEmpty { errorMessage = "Ingresa tu apellido"; return }
        if e.isEmpty { errorMessage = "Ingresa tu correo"; return }
        if !Validation.isEmail(e) { errorMessage = "Ingresa un correo válido"; return }
        errorMessage = nil
        saving = true
        defer { saving = false }
        do {
            let t = phone.trimmingCharacters(in: .whitespaces)
            let updated = try await appState.accountService.updateProfile(
                name: n, lastName: a, email: e, phone: t.isEmpty ? nil : t
            )
            appState.updateUser(updated)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Cambiar contraseña

struct ChangePasswordView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var current = ""
    @State private var new = ""
    @State private var confirm = ""
    @State private var saving = false
    @State private var errorMessage: String?
    @State private var done = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                FormHeader(eyebrow: "Seguridad", title: "Cambiar contraseña",
                           subtitle: "Usa una contraseña que no utilices en otros sitios.") {
                    Image(systemName: "lock.fill").font(.system(size: 34)).foregroundStyle(.white)
                }
                FormSection(title: "Contraseña actual", systemImage: "key") {
                    BrandField(title: "Contraseña actual", systemImage: "lock", text: $current,
                               secure: true, contentType: .password)
                }
                FormSection(title: "Nueva contraseña", systemImage: "shield", index: 2) {
                    BrandField(title: "Nueva contraseña", systemImage: "lock", text: $new,
                               secure: true, contentType: .newPassword)
                    BrandField(title: "Confirmar nueva contraseña", systemImage: "lock", text: $confirm,
                               secure: true, contentType: .newPassword)
                    PasswordRequirements(password: new, confirmation: confirm)
                }
                if let errorMessage { ErrorBanner(message: errorMessage) }
                Button {
                    Task { await save() }
                } label: {
                    if saving { ProgressView().tint(.white) } else { Label("Actualizar contraseña", systemImage: "lock.rotation") }
                }
                .buttonStyle(BrandButtonStyle())
                .disabled(saving)
            }
            .padding(20)
        }
        .background(Brand.fondo.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .alert("Contraseña actualizada correctamente.", isPresented: $done) {
            Button("Aceptar") { dismiss() }
        }
    }

    private func save() async {
        if current.isEmpty { errorMessage = "Ingresa tu contraseña actual"; return }
        if let problem = Validation.passwordError(new) { errorMessage = problem; return }
        if confirm.isEmpty { errorMessage = "Confirma la nueva contraseña"; return }
        if confirm != new { errorMessage = "Las contraseñas no coinciden"; return }
        errorMessage = nil
        saving = true
        defer { saving = false }
        do {
            try await appState.accountService.changePassword(current: current, new: new, confirm: confirm)
            done = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Barra de seguridad y requisitos en vivo (mismas reglas que la validación).
struct PasswordRequirements: View {
    let password: String
    let confirmation: String

    var body: some View {
        let length = password.count >= 8
        let letterAndNumber = password.range(of: "[A-Za-z]", options: .regularExpression) != nil
            && password.range(of: "[0-9]", options: .regularExpression) != nil
        let matches = !password.isEmpty && password == confirmation
        var points = 0
        if length { points += 1 }
        if letterAndNumber { points += 1 }
        if password.count >= 12 { points += 1 }
        if password.range(of: "[^A-Za-z0-9]", options: .regularExpression) != nil
            || (password.range(of: "[A-Z]", options: .regularExpression) != nil
                && password.range(of: "[a-z]", options: .regularExpression) != nil) {
            points += 1
        }
        let (label, color) = Self.strength(points)

        return VStack(alignment: .leading, spacing: 8) {
            if !password.isEmpty {
                HStack {
                    ProgressView(value: Double(points), total: 4).tint(color)
                        .animation(.easeOut(duration: 0.25), value: points)
                    Text(label).font(.caption.weight(.bold)).foregroundStyle(color)
                }
            }
            requirement("Al menos 8 caracteres", length)
            requirement("Una letra y un número", letterAndNumber)
            requirement("Ambas contraseñas coinciden", matches)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private static func strength(_ points: Int) -> (String, Color) {
        switch points {
        case 0, 1: return ("Débil", Brand.error)
        case 2: return ("Aceptable", Brand.aviso)
        case 3: return ("Buena", Brand.exito)
        default: return ("Muy segura", Brand.exito)
        }
    }

    private func requirement(_ text: String, _ ok: Bool) -> some View {
        Label {
            Text(text).foregroundStyle(ok ? Brand.texto : Brand.textoSecundario)
        } icon: {
            Image(systemName: ok ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(ok ? Brand.exito : Brand.textoTerciario)
                .contentTransition(.symbolEffect(.replace))
        }
        .font(.caption)
    }
}

// MARK: - Doble factor (2FA)

struct TwoFactorSetupView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var setup: TwoFactorSetup?
    @State private var code = ""
    @State private var busy = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                FormHeader(eyebrow: "Seguridad", title: "Activar doble factor",
                           subtitle: "Escanea el código con Google Authenticator u otra app compatible.") {
                    Image(systemName: "shield.lefthalf.filled").font(.system(size: 34)).foregroundStyle(.white)
                }
                if let setup {
                    if let image = qrImage(setup.qr) {
                        Image(uiImage: image)
                            .interpolation(.none)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 210, height: 210)
                            .padding(12)
                            .background(RoundedRectangle(cornerRadius: 16).fill(.white))
                            .accessibilityLabel("Código QR para la app autenticadora")
                    }
                    if let secret = setup.secret, !secret.isEmpty {
                        VStack(spacing: 6) {
                            Text("O ingresa esta clave manualmente").font(.caption).foregroundStyle(Brand.textoSecundario)
                            Text(secret).font(.body.monospaced()).textSelection(.enabled)
                            Button("Copiar clave") { UIPasteboard.general.string = secret }
                                .font(.caption.weight(.semibold))
                        }
                    }
                    FormSection(title: "Código de verificación", systemImage: "number") {
                        BrandField(title: "Código de 6 dígitos", systemImage: "number", text: $code,
                                   keyboard: .numberPad, contentType: .oneTimeCode)
                    }
                    if let errorMessage { ErrorBanner(message: errorMessage) }
                    Button {
                        Task { await confirm() }
                    } label: {
                        if busy { ProgressView().tint(.white) } else { Text("Activar doble factor") }
                    }
                    .buttonStyle(BrandButtonStyle())
                    .disabled(busy)
                } else if let errorMessage {
                    ErrorBanner(message: errorMessage)
                    Button("Reintentar") { Task { await load() } }.buttonStyle(BrandButtonStyle(filled: false))
                } else {
                    ShelfLoadingView(message: "Preparando tu configuración...")
                }
            }
            .padding(20)
        }
        .background(Brand.fondo.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .task { if setup == nil { await load() } }
    }

    /// El backend entrega el QR como data URL (`data:image/png;base64,...`).
    private func qrImage(_ dataURL: String?) -> UIImage? {
        guard let dataURL, let comma = dataURL.firstIndex(of: ",") else { return nil }
        let base64 = String(dataURL[dataURL.index(after: comma)...])
        guard let data = Data(base64Encoded: base64) else { return nil }
        return UIImage(data: data)
    }

    private func load() async {
        errorMessage = nil
        do {
            setup = try await appState.accountService.setupTwoFactor()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func confirm() async {
        let value = code.trimmingCharacters(in: .whitespaces)
        guard value.range(of: "^\\d{6}$", options: .regularExpression) != nil else {
            errorMessage = "Ingresa el código de 6 dígitos."
            return
        }
        busy = true
        defer { busy = false }
        do {
            try await appState.accountService.confirmTwoFactor(code: value)
            await appState.refreshProfile()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct TwoFactorDisableView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var password = ""
    @State private var code = ""
    @State private var busy = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                FormHeader(eyebrow: "Seguridad", title: "Desactivar doble factor",
                           subtitle: "Confirma con tu contraseña y un código de tu app autenticadora.") {
                    Image(systemName: "shield.slash").font(.system(size: 34)).foregroundStyle(.white)
                }
                FormSection(title: "Confirmación", systemImage: "key") {
                    BrandField(title: "Contraseña", systemImage: "lock", text: $password,
                               secure: true, contentType: .password)
                    BrandField(title: "Código de 6 dígitos", systemImage: "number", text: $code,
                               keyboard: .numberPad, contentType: .oneTimeCode)
                }
                if let errorMessage { ErrorBanner(message: errorMessage) }
                Button(role: .destructive) {
                    Task { await disable() }
                } label: {
                    if busy { ProgressView().tint(.white) } else { Text("Desactivar doble factor") }
                }
                .buttonStyle(BrandButtonStyle())
                .disabled(busy)
            }
            .padding(20)
        }
        .background(Brand.fondo.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    private func disable() async {
        if password.isEmpty { errorMessage = "Ingresa tu contraseña."; return }
        guard code.range(of: "^\\d{6}$", options: .regularExpression) != nil else {
            errorMessage = "Ingresa el código de 6 dígitos."
            return
        }
        busy = true
        defer { busy = false }
        do {
            try await appState.accountService.disableTwoFactor(password: password, code: code)
            await appState.refreshProfile()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Legal

struct LegalDocumentView: View {
    let document: LegalDocument

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("LEGAL").font(.caption.weight(.bold)).kerning(1.4).foregroundStyle(Brand.dorado)
                    Text(document.title).font(.serif(28))
                    Text("Actualizado el \(document.updated)").font(.caption).foregroundStyle(Brand.textoTerciario)
                }
                ForEach(document.sections) { section in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(section.title).font(.serif(17))
                        Text(section.text).foregroundStyle(Brand.textoSecundario)
                    }
                }
            }
            .padding(20)
        }
        .background(Brand.fondo.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }
}
