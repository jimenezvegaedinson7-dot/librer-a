import Foundation

protocol BiometricPreferenceStoring: AnyObject {
    var isBiometricLockEnabled: Bool { get set }
}

final class UserDefaultsBiometricPreferenceStore: BiometricPreferenceStoring {
    static let preferenceKey = "security.biometricLockEnabled"

    private let defaults: UserDefaults
    private let key: String

    init(
        defaults: UserDefaults = .standard,
        key: String = UserDefaultsBiometricPreferenceStore.preferenceKey
    ) {
        self.defaults = defaults
        self.key = key
    }

    var isBiometricLockEnabled: Bool {
        get { defaults.bool(forKey: key) }
        set { defaults.set(newValue, forKey: key) }
    }
}
