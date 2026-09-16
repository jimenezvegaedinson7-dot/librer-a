import Foundation

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
}

struct AnyEncodable: Encodable {
    private let encodeValue: (Encoder) throws -> Void

    init<Value: Encodable>(_ value: Value) {
        encodeValue = value.encode(to:)
    }

    func encode(to encoder: Encoder) throws {
        try encodeValue(encoder)
    }
}

struct APIEndpoint<Response: Decodable> {
    let method: HTTPMethod
    let pathComponents: [String]
    let body: AnyEncodable?
    let requiresAuthorization: Bool

    init(
        method: HTTPMethod,
        pathComponents: [String],
        body: AnyEncodable? = nil,
        requiresAuthorization: Bool = true
    ) {
        self.method = method
        self.pathComponents = pathComponents
        self.body = body
        self.requiresAuthorization = requiresAuthorization
    }
}

extension APIEndpoint where Response == AuthResponse {
    static func login(_ request: LoginRequest) -> Self {
        .init(
            method: .post,
            pathComponents: ["api", "auth", "login"],
            body: AnyEncodable(request),
            requiresAuthorization: false
        )
    }

    static func verifyTwoFactor(_ request: TwoFactorLoginRequest) -> Self {
        .init(
            method: .post,
            pathComponents: ["api", "auth", "2fa", "verify-login"],
            body: AnyEncodable(request),
            requiresAuthorization: false
        )
    }
}

extension APIEndpoint where Response == APIResponse<User> {
    static var profile: Self {
        .init(method: .get, pathComponents: ["api", "usuarios", "perfil"])
    }
}

extension APIEndpoint where Response == APIResponse<[Purchase]> {
    static var myPurchases: Self {
        .init(method: .get, pathComponents: ["api", "ventas", "mis-ventas"])
    }
}

extension APIEndpoint where Response == APIResponse<Purchase> {
    static func purchase(id: Int) -> Self {
        .init(method: .get, pathComponents: ["api", "ventas", String(id)])
    }
}

extension APIEndpoint where Response == APIResponse<SalePayment> {
    static func salePayment(id: Int) -> Self {
        .init(method: .get, pathComponents: ["api", "ventas", String(id), "pago"])
    }
}

extension APIEndpoint where Response == APIResponse<[Reservation]> {
    static var myReservations: Self {
        .init(method: .get, pathComponents: ["api", "reservas", "mis-reservas"])
    }
}

extension APIEndpoint where Response == APIResponse<Reservation> {
    static func reservation(id: Int) -> Self {
        .init(method: .get, pathComponents: ["api", "reservas", String(id)])
    }
}

extension APIEndpoint where Response == APIResponse<PaymentStatus> {
    static func payment(orderID: String) -> Self {
        .init(method: .get, pathComponents: ["api", "pagos", orderID])
    }
}

extension APIEndpoint where Response == APIResponse<[Activity]> {
    static var myActivity: Self {
        .init(method: .get, pathComponents: ["api", "historial", "mi-historial"])
    }
}
