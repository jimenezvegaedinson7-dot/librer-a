import SwiftUI

struct SessionRecoveryView: View {
    let message: String
    let onRetry: () async -> Void
    let onSignOut: () async -> Void

    var body: some View {
        NavigationStack {
            ContentUnavailableView {
                Label("No se pudo validar la sesión", systemImage: "wifi.exclamationmark")
            } description: {
                Text(message)
            } actions: {
                Button("Reintentar") {
                    Task { await onRetry() }
                }
                .buttonStyle(.borderedProminent)

                Button("Cerrar sesión", role: .destructive) {
                    Task { await onSignOut() }
                }
            }
            .navigationTitle("Sesión")
        }
    }
}
