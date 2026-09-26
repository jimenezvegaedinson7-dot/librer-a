import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        switch appState.sessionState {
        case .loading(let message):
            SplashView(message: message)
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

/// Pantalla de carga como el splash de Flutter: degradado del tema,
/// estantería animada, logo en círculo dorado y entrada con fundido y escala.
struct SplashView: View {
    let message: String
    @EnvironmentObject private var themeStore: ThemeStore
    @State private var shown = false

    var body: some View {
        let theme = themeStore.theme
        ZStack {
            LinearGradient(
                colors: [theme.primary, Color(rgb: ProfileTheme.darken(theme.primaryRGB, 0.35))],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            AnimatedBookshelf(ink: 0xFFFFFF, accent: 0xE6CB8F, opacity: 0.1, shelfHeight: 84, seed: 11, duration: 1.1)
            // Velo radial: el centro queda limpio para el logo.
            RadialGradient(
                colors: [theme.primaryDark.opacity(0.9), theme.primaryDark.opacity(0)],
                center: .center,
                startRadius: 0,
                endRadius: 300
            )
            VStack(spacing: 0) {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .overlay(AppLogo(width: 104, height: 104))
                    .padding(8)
                    .overlay(Circle().stroke(Brand.doradoClaro.opacity(0.55)))
                    .frame(width: 156, height: 156)
                Text("Librería")
                    .font(.serif(30))
                    .foregroundStyle(.white)
                    .padding(.top, 24)
                Capsule().fill(Brand.doradoClaro).frame(width: 36, height: 2).padding(.top, 10)
                ProgressView()
                    .tint(Brand.doradoClaro)
                    .controlSize(.regular)
                    .padding(.top, 40)
            }
            .opacity(shown ? 1 : 0)
            .scaleEffect(shown ? 1 : 0.92)
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(message)
        .onAppear {
            withAnimation(.easeOut(duration: 0.75)) { shown = true }
        }
    }
}
