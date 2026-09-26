import Foundation

/// Catálogo de libros (solo activos, como en Flutter).
final class CatalogService {
    private let client: APIClient

    init(client: APIClient) { self.client = client }

    func books() async throws -> [Book] {
        try await client.send(APIEndpoint<APIResponse<[Book]>>.books).data.filter(\.estado)
    }

    func book(id: Int) async throws -> Book {
        try await client.send(APIEndpoint<APIResponse<Book>>.book(id: id)).data
    }
}

final class FavoritesService {
    private let client: APIClient

    init(client: APIClient) { self.client = client }

    func favorites() async throws -> [Book] {
        try await client.send(APIEndpoint<APIResponse<[Book]>>.favorites).data
    }

    func isFavorite(bookID: Int) async throws -> Bool {
        try await client.send(APIEndpoint<FavoriteState>.favoriteState(bookID: bookID)).isFavorite
    }

    func setFavorite(_ favorite: Bool, bookID: Int) async throws {
        _ = try await client.send(
            favorite ? APIEndpoint<APIStatusPayload>.addFavorite(bookID: bookID)
                : APIEndpoint<APIStatusPayload>.removeFavorite(bookID: bookID)
        )
    }
}

/// Envío a domicilio (solo Lima) y pago con PayU WebCheckout.
///
/// La clave de idempotencia se genera una vez por intento de checkout y se
/// reutiliza en los reintentos (el backend responde `ya_existia` en lugar de
/// duplicar la orden). Se libera cuando el pago termina o cambia el pedido.
@MainActor
final class CheckoutService {
    private let client: APIClient
    private var idempotencyKey: String?
    private var fingerprint: String?

    init(client: APIClient) { self.client = client }

    /// Distritos de la provincia de Lima (el reparto es solo en Lima).
    func limaDistricts() async throws -> [District] {
        let provinces = try await client.send(APIEndpoint<APIResponse<[Province]>>.provinces).data
        guard let lima = provinces.first(where: {
            $0.nombre.trimmingCharacters(in: .whitespaces).lowercased() == "lima"
        }) else { return [] }
        return try await client.send(
            APIEndpoint<APIResponse<[District]>>.districts(provinceID: lima.idProvincia)
        ).data
    }

    func createOrder(
        items: [CartItem],
        delivery: DeliveryType,
        address: String?,
        districtID: Int?,
        documentType: String,
        document: String
    ) async throws -> PaymentOrder {
        let print = [
            items.map { "\($0.book.idLibro):\($0.quantity)" }.joined(separator: ","),
            delivery.rawValue,
            address?.trimmingCharacters(in: .whitespaces) ?? "",
            districtID.map(String.init) ?? "",
            document
        ].joined(separator: "|")

        if idempotencyKey == nil || fingerprint != print {
            idempotencyKey = UUID().uuidString.lowercased()
            fingerprint = print
        }

        let request = CreateOrderRequest(
            idempotenciaClave: idempotencyKey!,
            items: items.map { CheckoutItemRequest(idLibro: $0.book.idLibro, cantidad: $0.quantity) },
            tipoEntrega: delivery.rawValue,
            direccion: delivery == .home ? address?.trimmingCharacters(in: .whitespaces) : nil,
            idDistrito: delivery == .home ? districtID : nil,
            clienteTipoDocumento: documentType,
            clienteDocumento: document.trimmingCharacters(in: .whitespaces)
        )
        return try await client.send(APIEndpoint<PaymentOrder>.createOrder(request))
    }

    func orderState(orderID: String) async throws -> OrderState {
        try await client.send(APIEndpoint<OrderState>.orderState(orderID: orderID))
    }

    /// Nuevo intento de checkout (tras pagar o si la orden se canceló).
    func resetIdempotency() {
        idempotencyKey = nil
        fingerprint = nil
    }
}

enum DeliveryType: String, CaseIterable, Identifiable {
    case home = "domicilio"
    case store = "tienda"
    var id: String { rawValue }
}

/// Registro, verificación, recuperación, perfil, contraseña y 2FA.
final class AccountService {
    private let client: APIClient

    init(client: APIClient) { self.client = client }

    func register(name: String, lastName: String, email: String, password: String) async throws -> Bool {
        try await client.send(
            APIEndpoint<RegisterResponse>.register(
                .init(nombre: name, apellido: lastName, email: email, password: password)
            )
        ).requiresEmailVerification
    }

    func verifyEmail(email: String, code: String) async throws {
        _ = try await client.send(APIEndpoint<APIStatusPayload>.verifyEmail(.init(email: email, codigo: code)))
    }

    func resendCode(email: String) async throws {
        _ = try await client.send(APIEndpoint<APIStatusPayload>.resendCode(.init(email: email)))
    }

    func requestPasswordReset(email: String) async throws {
        _ = try await client.send(APIEndpoint<APIStatusPayload>.requestPasswordReset(.init(email: email)))
    }

    func resetPassword(email: String, code: String, password: String) async throws {
        _ = try await client.send(
            APIEndpoint<APIStatusPayload>.resetPassword(.init(email: email, codigo: code, password: password))
        )
    }

    func updateProfile(name: String, lastName: String, email: String, phone: String?) async throws -> User {
        try await client.send(
            APIEndpoint<APIResponse<User>>.updateProfile(
                .init(nombre: name, apellido: lastName, email: email, telefono: phone)
            )
        ).data
    }

    /// `PUT /api/usuarios/foto` (multipart, campo `foto`): JPEG o PNG.
    func uploadPhoto(_ data: Data, mimeType: String) async throws -> User {
        try await client.upload(
            APIResponse<User>.self,
            method: .put,
            pathComponents: ["api", "usuarios", "foto"],
            fieldName: "foto",
            fileName: mimeType == "image/png" ? "perfil.png" : "perfil.jpg",
            mimeType: mimeType,
            fileData: data
        ).data
    }

    func changePassword(current: String, new: String, confirm: String) async throws {
        _ = try await client.send(
            APIEndpoint<APIStatusPayload>.changePassword(
                .init(passwordActual: current, passwordNueva: new, confirmarPassword: confirm)
            )
        )
    }

    func setupTwoFactor() async throws -> TwoFactorSetup {
        try await client.send(APIEndpoint<TwoFactorSetup>.setupTwoFactor)
    }

    func confirmTwoFactor(code: String) async throws {
        _ = try await client.send(APIEndpoint<APIStatusPayload>.confirmTwoFactor(.init(codigo: code)))
    }

    func disableTwoFactor(password: String, code: String) async throws {
        _ = try await client.send(
            APIEndpoint<APIStatusPayload>.disableTwoFactor(.init(password: password, codigo: code))
        )
    }
}
