import Foundation

@MainActor
protocol SessionExpirationHandling: AnyObject {
    func sessionDidExpire(message: String?) async
}

@MainActor
final class SessionExpirationCoordinator {
    weak var handler: (any SessionExpirationHandling)?

    func notify(message: String?) async {
        await handler?.sessionDidExpire(message: message)
    }
}
