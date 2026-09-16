import SwiftUI
import PhotosUI

struct ProfileView: View {
    @StateObject private var viewModel: ProfileViewModel
    @EnvironmentObject private var appState: AppState
    let onLogout: () async -> Void
    let onBiometricToggle: (Bool) -> Void

    init(
        profileService: ProfileService = ProfileService(client: APIClient()),
        onLogout: @escaping () async -> Void,
        onBiometricToggle: @escaping (Bool) -> Void = { _ in }
    ) {
        _viewModel = StateObject(
            wrappedValue: ProfileViewModel(profileService: profileService)
        )
        self.onLogout = onLogout
        self.onBiometricToggle = onBiometricToggle
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    if case .error(let message) = viewModel.state {
                        errorView(message: message)
                    } else {
                        contentView
                    }
                }
                .padding()
                .navigationTitle("Perfil")
                .refreshable {
                    await viewModel.refresh()
                }
                .task {
                    await viewModel.loadInitial()
                }
            }
            .alert("Cerrar sesión", isPresented: .constant(false)) {
                Button("Cancelar", role: .cancel) { }
                Button("Cerrar sesión", role: .destructive) {
                    Task { await appState.signOut() }
                }
            } message: {
                Text("Tendrás que iniciar sesión nuevamente para acceder a Librería Secure.")
            }
        }
    }

    @ViewBuilder
    private func errorView(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 50))
                .foregroundStyle(.orange)
            Text("Error al cargar el perfil")
                .font(.headline)
                .multilineTextAlignment(.center)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            PrimaryActionButton(title: "Reintentar") {
                Task { await viewModel.refresh() }
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private var contentView: some View {
        VStack(spacing: 24) {
            profileHeader
            Divider()
            .padding(.horizontal, -16)
            personalInfoSection
            accountSection
            securitySection
        }
    }