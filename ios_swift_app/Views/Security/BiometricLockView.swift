import SwiftUI

struct BiometricLockView: View {
    let availability: BiometricAvailability
    let message: String?
    let isUnlocking: Bool
    let onUnlock: () async -> Void
    let onSignOut: () async -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: biometricIcon)
                    .font(.system(size: 56))
                    .foregroundStyle(.tint)
                    .accessibilityHidden(true)

                Text("Sesión bloqueada")
                    .font(.title.bold())
                    .accessibilityAddTraits(.isHeader)

                Text(
                    availability.isAvailable
                        ? "Usa \(availability.kind.displayName) para continuar."
                        : "La biometría configurada no está disponible."
                )
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

                if let message {
                    Text(message)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.red)
                        .accessibilityLabel("Error: \(message)")
                }

                PrimaryActionButton(title: "Desbloquear", isLoading: isUnlocking) {
                    Task { await onUnlock() }
                }
                .disabled(!availability.isAvailable)

                Button("Cerrar sesión y volver al login", role: .destructive) {
                    Task { await onSignOut() }
                }
                .disabled(isUnlocking)
            }
            .padding()
            .navigationTitle("Seguridad")
        }
    }

    private var biometricIcon: String {
        switch availability.kind {
        case .faceID: return "faceid"
        case .touchID: return "touchid"
        case .none: return "lock.slash"
        }
    }
}
