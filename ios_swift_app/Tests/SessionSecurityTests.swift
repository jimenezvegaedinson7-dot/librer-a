import Foundation
import XCTest
@testable import LibreriaSecureApp

final class SessionSecurityTests: XCTestCase {
    func testRestorationDecisionRequiresBiometricsOnlyWhenTokenExists() {
        XCTAssertEqual(
            SessionSecurityPolicy.restorationDecision(
                hasToken: false,
                biometricLockEnabled: true
            ),
            .unauthenticated
        )
        XCTAssertEqual(
            SessionSecurityPolicy.restorationDecision(
                hasToken: true,
                biometricLockEnabled: true
            ),
            .requireBiometricUnlock
        )
        XCTAssertEqual(
            SessionSecurityPolicy.restorationDecision(
                hasToken: true,
                biometricLockEnabled: false
            ),
            .validateSession
        )
    }

    func testClientRolePolicyIsNormalizedAndRejectsOtherRoles() {
        XCTAssertTrue(SessionSecurityPolicy.allowsClientRole("cliente"))
        XCTAssertTrue(SessionSecurityPolicy.allowsClientRole(" CLIENTE "))
        XCTAssertFalse(SessionSecurityPolicy.allowsClientRole("administrador"))
        XCTAssertFalse(SessionSecurityPolicy.allowsClientRole("empleado"))
    }

    func testSessionFailureDispositionKeepsTokenForTemporaryFailures() {
        XCTAssertEqual(
            SessionSecurityPolicy.failureDisposition(
                for: .connectivity(URLError(.notConnectedToInternet))
            ),
            .recoverable
        )
        XCTAssertEqual(
            SessionSecurityPolicy.failureDisposition(
                for: .server(statusCode: 503, message: nil)
            ),
            .recoverable
        )
        XCTAssertEqual(
            SessionSecurityPolicy.failureDisposition(for: .unauthorized(nil)),
            .expired
        )
        XCTAssertEqual(
            SessionSecurityPolicy.failureDisposition(for: .forbidden(nil)),
            .rejected
        )
    }

    func testUserDefaultsStorePersistsOnlyBiometricPreference() throws {
        let suiteName = "SessionSecurityTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }

        let store = UserDefaultsBiometricPreferenceStore(defaults: defaults)
        XCTAssertFalse(store.isBiometricLockEnabled)

        store.isBiometricLockEnabled = true

        let reloadedStore = UserDefaultsBiometricPreferenceStore(defaults: defaults)
        XCTAssertTrue(reloadedStore.isBiometricLockEnabled)
        XCTAssertNil(defaults.object(forKey: "definitive-jwt"))
        let persistedKeys = Set(
            defaults.persistentDomain(forName: suiteName).map { Array($0.keys) } ?? []
        )
        XCTAssertEqual(
            persistedKeys,
            Set([UserDefaultsBiometricPreferenceStore.preferenceKey])
        )
    }

    func testPreferenceAbstractionAcceptsInjectedStore() {
        let store: any BiometricPreferenceStoring = InMemoryBiometricPreferenceStore()
        XCTAssertFalse(store.isBiometricLockEnabled)
        store.isBiometricLockEnabled = true
        XCTAssertTrue(store.isBiometricLockEnabled)
    }
}

private final class InMemoryBiometricPreferenceStore: BiometricPreferenceStoring {
    var isBiometricLockEnabled = false
}
