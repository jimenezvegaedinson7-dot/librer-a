import SwiftUI

struct SecurityView: View {
    @EnvironmentObject private var appState: AppState
    @State private var isUpdating = false
    @State private var resultMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Biometría local") {
                    LabeledContent(
                        "Tipo disponible",
                        value: appState.biometricAvailability.kind.displayName
                    )
                    LabeledContent(
                        "Bloqueo",
                        value: appState.isBiometricLockEnabled ? "Activado" : "Desactivado"
                    )

                    Text(
                        "Face ID o Touch ID solo desbloquea localmente una sesión existente. El JWT se valida después con el servidor."
                    )
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                    if let availabilityMessage = appState.biometricAvailability.message,
                       !appState.biometricAvailability.isAvailable {
                        Text(availabilityMessage)
                            .foregroundStyle(.orange)
                    }

                    if appState.isBiometricLockEnabled {
                        Button("Desactivar bloqueo biométrico", role: .destructive) {
                            appState.disableBiometricLock()
                            resultMessage = "Bloqueo biométrico desactivado."
                        }
                        .disabled(isUpdating)
                    } else {
                        Button("Activar bloqueo biométrico") {
                            Task { await enableBiometricLock() }
                        }
                        .disabled(isUpdating || !appState.biometricAvailability.isAvailable)
                    }

                    if isUpdating {
                        ProgressView("Confirmando identidad…")
                    }

                    if let resultMessage {
                        Text(resultMessage)
                            .foregroundStyle(
                                appState.isBiometricLockEnabled
                                    ? Color.green
                                    : Color.secondary
                            )
                            .accessibilityLabel(resultMessage)
                    }
                }

                Section("Autenticación en dos pasos") {
                    HStack {
                        Label("Estado", systemImage: "lock.shield")
                            .foregroundStyle(.secondary)
                        Spacer()
                        if let twoFAEnabled = appState.user?.twoFactorEnabled {
                            Text(twoFAEnabled ? "Activada" : "Desactivada")
                                .font(.body)
                                .foregroundStyle(
                                    twoFAEnabled ? .green : .red
                                )
                        } else {
                            Text("Estado desconocido")
                                .font(.body)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Seguridad")
            .onAppear {
                appState.refreshBiometricAvailability()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar sesión") {
                        Task { await appState.signOut() }
                    }
                }
            }
        }
    }

    @MainActor
    private func enableBiometricLock() async {
        isUpdating = true
        resultMessage = nil
        defer { isUpdating = false }

        do {
            try await appState.enableBiometricLock()
            resultMessage = "Bloqueo biométrico activado correctamente."
        } catch {
            resultMessage = error.localizedDescription
        }
    }
}