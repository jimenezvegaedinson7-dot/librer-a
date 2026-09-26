import SwiftUI

/// Eliminar mi cuenta (derecho de cancelación, Ley 29733), igual que Flutter.
/// El backend anonimiza los datos, cancela las reservas activas y conserva
/// las compras solo por obligación tributaria. Luego se cierra la sesión.
struct DeleteAccountView: View {
    @EnvironmentObject private var appState: AppState
    @State private var password = ""
    @State private var confirmation = ""
    @State private var busy = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                FormHeader(eyebrow: "Tu cuenta", title: "Eliminar mi cuenta",
                           subtitle: "Esta acción no se puede deshacer.") {
                    Image(systemName: "person.crop.circle.badge.xmark")
                        .font(.system(size: 34))
                        .foregroundStyle(.white)
                }
                FormSection(title: "Qué pasará", systemImage: "info.circle") {
                    point("person.slash", "Se borran tu nombre, correo, teléfono y foto. Ya no podrás iniciar sesión.")
                    point("bookmark.slash", "Se cancelan tus reservas activas y se borran tus favoritos.")
                    point("doc.text", "Tus compras y comprobantes se conservan solo porque la ley tributaria lo exige.")
                }
                FormSection(title: "Confirmación", systemImage: "key", index: 2) {
                    BrandField(title: "Contraseña", systemImage: "lock", text: $password,
                               secure: true, contentType: .password)
                    BrandField(title: "Escribe ELIMINAR para confirmar", systemImage: "exclamationmark.triangle",
                               text: $confirmation)
                }
                if let errorMessage { ErrorBanner(message: errorMessage) }
                Button(role: .destructive) {
                    Task { await delete() }
                } label: {
                    if busy {
                        ProgressView().tint(.white)
                    } else {
                        Label("Eliminar mi cuenta", systemImage: "trash")
                            .frame(maxWidth: .infinity, minHeight: 52)
                            .foregroundStyle(.white)
                            .background(RoundedRectangle(cornerRadius: 12).fill(Brand.error))
                    }
                }
                .disabled(busy)
            }
            .padding(20)
        }
        .background(Brand.fondo.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    private func point(_ icon: String, _ text: String) -> some View {
        Label {
            Text(text).font(.subheadline).foregroundStyle(Brand.texto)
        } icon: {
            Image(systemName: icon).foregroundStyle(Brand.textoSecundario)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func delete() async {
        if password.isEmpty {
            errorMessage = "Ingresa tu contraseña"
            return
        }
        if confirmation.trimmingCharacters(in: .whitespaces).uppercased() != "ELIMINAR" {
            errorMessage = "Escribe ELIMINAR para confirmar"
            return
        }
        busy = true
        defer { busy = false }
        do {
            try await appState.accountService.deleteAccount(password: password)
            await appState.signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
