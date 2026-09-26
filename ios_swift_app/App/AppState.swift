import Foundation
import Combine

@MainActor
final class AppState: ObservableObject, SessionExpirationHandling {
    enum RecoveryAction: Equatable {
        case validateSession
    }

    enum SessionState: Equatable {
        case loading(message: String)
        case unauthenticated(message: String?)
        case locked(message: String?, isUnlocking: Bool)
        case recoverableFailure(message: String, retryAction: RecoveryAction)
        case authenticated(User)
    }

    @Published private(set) var sessionState: SessionState = .loading(
        message: "Preparando sesión…"
    )
    @Published var user: User?
    @Published private(set) var isBiometricLockEnabled: Bool
    @Published private(set) var biometricAvailability: BiometricAvailability

    let authService: AuthService
    let activityService: ActivityService
    let purchaseService: PurchaseService
    let paymentService: PaymentService
    let reservationService: ReservationService
    let catalogService: CatalogService
    let favoritesService: FavoritesService
    let checkoutService: CheckoutService
    let accountService: AccountService
    let cartStore: CartStore
    let themeStore: ThemeStore

    private let profileService: ProfileService
    private let keychainStore: KeychainStore
    private let biometricService: any BiometricAuthenticating
    private let biometricPreferenceStore: any BiometricPreferenceStoring
    private var didRestoreSession = false
    private var isForegroundActive = true

    private static let incompatibleRoleMessage =
        "Esta aplicación está disponible únicamente para clientes."
    private static let expiredSessionMessage =
        "Tu sesión expiró. Inicia sesión nuevamente."

    init(
        environment: AppEnvironment = AppEnvironment(),
        biometricService: any BiometricAuthenticating = BiometricService(),
        biometricPreferenceStore: any BiometricPreferenceStoring =
            UserDefaultsBiometricPreferenceStore()
    ) {
        let keychainStore = KeychainStore()
        let expirationCoordinator = SessionExpirationCoordinator()
        let client = APIClient(
            environment: environment,
            tokenProvider: keychainStore,
            sessionExpirationCoordinator: expirationCoordinator
        )

        self.keychainStore = keychainStore
        self.biometricService = biometricService
        self.biometricPreferenceStore = biometricPreferenceStore
        isBiometricLockEnabled = biometricPreferenceStore.isBiometricLockEnabled
        biometricAvailability = biometricService.availability()
        authService = AuthService(client: client)
        profileService = ProfileService(client: client)
        activityService = ActivityService(client: client)
        purchaseService = PurchaseService(client: client)
        paymentService = PaymentService(client: client)
        reservationService = ReservationService(client: client)
        catalogService = CatalogService(client: client)
        favoritesService = FavoritesService(client: client)
        checkoutService = CheckoutService(client: client)
        accountService = AccountService(client: client)
        cartStore = CartStore()
        themeStore = ThemeStore()
        expirationCoordinator.handler = self
    }

    func restoreSession() async {
        guard !didRestoreSession else { return }
        didRestoreSession = true

        let hasToken: Bool
        do {
            hasToken = try await keychainStore.read() != nil
        } catch {
            sessionState = .recoverableFailure(
                message: error.localizedDescription,
                retryAction: .validateSession
            )
            return
        }

        switch SessionSecurityPolicy.restorationDecision(
            hasToken: hasToken,
            biometricLockEnabled: isBiometricLockEnabled
        ) {
        case .unauthenticated:
            sessionState = .unauthenticated(message: nil)
        case .requireBiometricUnlock:
            refreshBiometricAvailability()
            sessionState = .locked(
                message: unavailableBiometricMessage,
                isUnlocking: false
            )
        case .validateSession:
            sessionState = .loading(message: "Validando sesión…")
            await validateSession()
        }
    }

    func completeAuthentication(user: User, token: String) async throws {
        guard SessionSecurityPolicy.allowsClientRole(user.rol) else {
            throw APIError.forbidden(Self.incompatibleRoleMessage)
        }

        try await keychainStore.save(token: token)
        // Carrito de la sesión anterior: se empieza vacío (no mezclar cuentas).
        cartStore.clearSession()
        cartStore.restore(for: user.idUsuario)
        checkoutService.resetIdempotency()
        if isBiometricLockEnabled && !isForegroundActive {
            sessionState = .locked(message: nil, isUnlocking: false)
        } else {
            sessionState = .authenticated(user)
            self.user = user
        }
    }

    func unlockSession() async {
        guard case .locked(_, let isUnlocking) = sessionState, !isUnlocking else { return }

        refreshBiometricAvailability()
        guard biometricAvailability.isAvailable else {
            sessionState = .locked(
                message: unavailableBiometricMessage,
                isUnlocking: false
            )
            return
        }

        sessionState = .locked(message: nil, isUnlocking: true)
        do {
            let unlocked = try await biometricService.evaluate(
                reason: "Desbloquea tu sesión de Librería Secure."
            )
            guard unlocked else {
                throw BiometricError.evaluationFailed(nil)
            }
            sessionState = .loading(message: "Validando sesión…")
            await validateSession()
        } catch {
            sessionState = .locked(
                message: error.localizedDescription,
                isUnlocking: false
            )
        }
    }

    func retrySessionRecovery() async {
        guard case .recoverableFailure(_, let retryAction) = sessionState else { return }
        switch retryAction {
        case .validateSession:
            sessionState = .loading(message: "Validando sesión…")
            await validateSession()
        }
    }

    func signOut() async {
        sessionState = .loading(message: "Cerrando sesión…")
        cartStore.clearSession()
        checkoutService.resetIdempotency()
        do {
            try await keychainStore.delete()
            sessionState = .unauthenticated(message: nil)
        } catch {
            sessionState = .recoverableFailure(
                message: error.localizedDescription,
                retryAction: .validateSession
            )
        }
    }

    /// Actualiza los datos del usuario tras editar el perfil o la foto.
    func updateUser(_ updated: User) {
        user = updated
        if case .authenticated = sessionState {
            sessionState = .authenticated(updated)
        }
    }

    /// Vuelve a leer el perfil (p. ej. tras activar o desactivar 2FA).
    func refreshProfile() async {
        do {
            let fresh = try await profileService.profile()
            updateUser(fresh)
        } catch {
            // Sin conexión: se mantiene el perfil que ya había.
        }
    }

    func appDidBecomeActive() {
        isForegroundActive = true
    }

    func appDidLeaveForeground() {
        isForegroundActive = false
        guard isBiometricLockEnabled else { return }

        let shouldLock: Bool
        switch sessionState {
        case .authenticated, .recoverableFailure:
            shouldLock = true
        case .loading, .unauthenticated, .locked:
            shouldLock = false
        }
        guard shouldLock else { return }

        refreshBiometricAvailability()
        sessionState = .locked(
            message: unavailableBiometricMessage,
            isUnlocking: false
        )
    }

    func refreshBiometricAvailability() {
        biometricAvailability = biometricService.availability()
    }

    func enableBiometricLock() async throws {
        guard !isBiometricLockEnabled else { return }
        refreshBiometricAvailability()
        guard biometricAvailability.isAvailable else {
            throw BiometricError.unavailable(unavailableBiometricMessage)
        }

        let confirmed = try await biometricService.evaluate(
            reason: "Confirma tu identidad para activar el bloqueo biométrico."
        )
        guard confirmed else {
            throw BiometricError.evaluationFailed(nil)
        }

        biometricPreferenceStore.isBiometricLockEnabled = true
        isBiometricLockEnabled = true
    }

    func disableBiometricLock() {
        biometricPreferenceStore.isBiometricLockEnabled = false
        isBiometricLockEnabled = false
    }

    func sessionDidExpire(message: String?) async {
        try? await keychainStore.delete()
        checkoutService.resetIdempotency()
        sessionState = .unauthenticated(
            message: message ?? Self.expiredSessionMessage
        )
    }

    private func validateSession() async {
        do {
            let user = try await profileService.profile()
            guard SessionSecurityPolicy.allowsClientRole(user.rol) else {
                try await keychainStore.delete()
                sessionState = .unauthenticated(
                    message: Self.incompatibleRoleMessage
                )
                return
            }

            cartStore.restore(for: user.idUsuario)
            if isBiometricLockEnabled && !isForegroundActive {
                sessionState = .locked(message: nil, isUnlocking: false)
            } else {
                sessionState = .authenticated(user)
                self.user = user
            }
        } catch let error as APIError {
            await handleSessionValidationError(error)
        } catch {
            presentRecoverableValidationFailure(message: error.localizedDescription)
        }
    }

    private func handleSessionValidationError(_ error: APIError) async {
        switch SessionSecurityPolicy.failureDisposition(for: error) {
        case .expired:
            if case .unauthenticated = sessionState { return }
            await sessionDidExpire(message: error.localizedDescription)
        case .recoverable:
            presentRecoverableValidationFailure(message: error.localizedDescription)
        case .rejected:
            try? await keychainStore.delete()
            sessionState = .unauthenticated(message: error.localizedDescription)
        }
    }

    private var unavailableBiometricMessage: String? {
        guard !biometricAvailability.isAvailable else { return nil }
        return biometricAvailability.message
            ?? "La autenticación biométrica no está disponible. Puedes cerrar sesión y volver al login."
    }

    private func presentRecoverableValidationFailure(message: String) {
        if isBiometricLockEnabled && !isForegroundActive {
            refreshBiometricAvailability()
            sessionState = .locked(
                message: unavailableBiometricMessage,
                isUnlocking: false
            )
        } else {
            sessionState = .recoverableFailure(
                message: message,
                retryAction: .validateSession
            )
        }
    }
}
