import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        switch appState.sessionState {
        case .loading(let message):
            ProgressView(message)
                .accessibilityLabel(message)
        case .unauthenticated(let message):
            LoginView(
                authService: appState.authService,
                sessionMessage: message
            ) { user, token in
                try await appState.completeAuthentication(user: user, token: token)
            }
        case .locked(let message, let isUnlocking):
            BiometricLockView(
                availability: appState.biometricAvailability,
                message: message,
                isUnlocking: isUnlocking,
                onUnlock: { await appState.unlockSession() },
                onSignOut: { await appState.signOut() }
            )
        case .recoverableFailure(let message, _):
            SessionRecoveryView(
                message: message,
                onRetry: { await appState.retrySessionRecovery() },
                onSignOut: { await appState.signOut() }
            )
        case .authenticated(let user):
            MainView(user: user)
        }
    }
}
