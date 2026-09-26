import Foundation

// Endpoints de la tienda y de la cuenta: los mismos que usa la app Flutter.
// Las respuestas que solo traen { success, mensaje } usan APIStatusPayload.

// MARK: - Catálogo

extension APIEndpoint where Response == APIResponse<[Book]> {
    static var books: Self { .init(method: .get, pathComponents: ["api", "libros"]) }
    static var favorites: Self { .init(method: .get, pathComponents: ["api", "favoritos"]) }
}

extension APIEndpoint where Response == APIResponse<Book> {
    static func book(id: Int) -> Self {
        .init(method: .get, pathComponents: ["api", "libros", String(id)])
    }
}

// MARK: - Favoritos

extension APIEndpoint where Response == FavoriteState {
    static func favoriteState(bookID: Int) -> Self {
        .init(method: .get, pathComponents: ["api", "favoritos", String(bookID)])
    }
}

extension APIEndpoint where Response == APIStatusPayload {
    static func addFavorite(bookID: Int) -> Self {
        .init(method: .post, pathComponents: ["api", "favoritos", String(bookID)])
    }

    static func removeFavorite(bookID: Int) -> Self {
        .init(method: .delete, pathComponents: ["api", "favoritos", String(bookID)])
    }

    // MARK: Reservas

    static func cancelReservation(id: Int) -> Self {
        .init(method: .delete, pathComponents: ["api", "reservas", String(id)])
    }

    // MARK: Cuenta (sin sesión)

    static func verifyEmail(_ body: VerifyEmailRequest) -> Self {
        .init(method: .post, pathComponents: ["api", "auth", "verificar-email"],
              body: AnyEncodable(body), requiresAuthorization: false)
    }

    static func resendCode(_ body: EmailRequest) -> Self {
        .init(method: .post, pathComponents: ["api", "auth", "reenviar-codigo"],
              body: AnyEncodable(body), requiresAuthorization: false)
    }

    static func requestPasswordReset(_ body: EmailRequest) -> Self {
        .init(method: .post, pathComponents: ["api", "auth", "solicitar-reseteo"],
              body: AnyEncodable(body), requiresAuthorization: false)
    }

    static func resetPassword(_ body: ResetPasswordRequest) -> Self {
        .init(method: .post, pathComponents: ["api", "auth", "reestablecer-contrasena"],
              body: AnyEncodable(body), requiresAuthorization: false)
    }

    // MARK: Cuenta (con sesión)

    static func changePassword(_ body: ChangePasswordRequest) -> Self {
        .init(method: .put, pathComponents: ["api", "usuarios", "password"], body: AnyEncodable(body),
              expiresSessionOnUnauthorized: false)
    }

    static func confirmTwoFactor(_ body: CodeRequest) -> Self {
        .init(method: .post, pathComponents: ["api", "auth", "2fa", "confirm"], body: AnyEncodable(body),
              expiresSessionOnUnauthorized: false)
    }

    static func disableTwoFactor(_ body: DisableTwoFactorRequest) -> Self {
        .init(method: .post, pathComponents: ["api", "auth", "2fa", "disable"], body: AnyEncodable(body),
              expiresSessionOnUnauthorized: false)
    }

    // Contraseña incorrecta → 400; no debe cerrar la sesión.
    static func deleteAccount(_ body: DeleteAccountRequest) -> Self {
        .init(method: .delete, pathComponents: ["api", "usuarios", "cuenta"], body: AnyEncodable(body),
              expiresSessionOnUnauthorized: false)
    }
}

extension APIEndpoint where Response == CreatedReservation {
    static func createReservation(_ body: CreateReservationRequest) -> Self {
        .init(method: .post, pathComponents: ["api", "reservas"], body: AnyEncodable(body))
    }
}

// MARK: - Envío y pago

extension APIEndpoint where Response == APIResponse<[Province]> {
    static var provinces: Self {
        .init(method: .get, pathComponents: ["api", "ubicaciones", "provincias"])
    }
}

extension APIEndpoint where Response == APIResponse<[District]> {
    static func districts(provinceID: Int) -> Self {
        .init(method: .get, pathComponents: ["api", "ubicaciones", "provincias", String(provinceID), "distritos"])
    }
}

extension APIEndpoint where Response == PaymentOrder {
    static func createOrder(_ body: CreateOrderRequest) -> Self {
        .init(method: .post, pathComponents: ["api", "pagos", "crear-orden"], body: AnyEncodable(body))
    }
}

extension APIEndpoint where Response == OrderState {
    static func orderState(orderID: String) -> Self {
        .init(method: .get, pathComponents: ["api", "pagos", orderID])
    }
}

// MARK: - Registro, perfil y 2FA

extension APIEndpoint where Response == RegisterResponse {
    static func register(_ body: RegisterRequest) -> Self {
        .init(method: .post, pathComponents: ["api", "auth", "registro"],
              body: AnyEncodable(body), requiresAuthorization: false)
    }
}

extension APIEndpoint where Response == APIResponse<User> {
    static func updateProfile(_ body: UpdateProfileRequest) -> Self {
        .init(method: .put, pathComponents: ["api", "usuarios", "perfil"], body: AnyEncodable(body))
    }
}

extension APIEndpoint where Response == TwoFactorSetup {
    static var setupTwoFactor: Self {
        .init(method: .post, pathComponents: ["api", "auth", "2fa", "setup"])
    }
}
