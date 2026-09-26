import Foundation

// MARK: - Carrito

/// Libro en el carrito con su cantidad. Montos exactos en céntimos.
struct CartItem: Codable, Equatable, Identifiable {
    var book: Book
    var quantity: Int

    var id: Int { book.idLibro }
    var unitCents: Int { Money.cents(book.precio) }
    var subtotalCents: Int { unitCents * quantity }
    var subtotal: Double { Double(subtotalCents) / 100 }
}

// MARK: - Ubicaciones

struct Province: Codable, Identifiable, Hashable {
    let idProvincia: Int
    let nombre: String
    var id: Int { idProvincia }

    enum CodingKeys: String, CodingKey {
        case idProvincia = "id_provincia"
        case nombre
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        idProvincia = try c.decodeFlexibleInt(forKey: .idProvincia)
        nombre = try c.decodeFlexibleStringIfPresent(forKey: .nombre) ?? ""
    }
}

struct District: Codable, Identifiable, Hashable {
    let idDistrito: Int
    let nombre: String
    let tarifaEnvio: Double
    var id: Int { idDistrito }

    enum CodingKeys: String, CodingKey {
        case idDistrito = "id_distrito"
        case nombre
        case tarifaEnvio = "tarifa_envio"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        idDistrito = try c.decodeFlexibleInt(forKey: .idDistrito)
        nombre = try c.decodeFlexibleStringIfPresent(forKey: .nombre) ?? ""
        tarifaEnvio = (try? c.decodeFlexibleDoubleIfPresent(forKey: .tarifaEnvio)) ?? 0
    }
}

// MARK: - Pago

struct CheckoutItemRequest: Encodable {
    let idLibro: Int
    let cantidad: Int

    enum CodingKeys: String, CodingKey {
        case idLibro = "id_libro"
        case cantidad
    }
}

/// Cuerpo de `POST /api/pagos/crear-orden` (mismo contrato que Flutter).
struct CreateOrderRequest: Encodable {
    let idempotenciaClave: String
    let items: [CheckoutItemRequest]
    let tipoEntrega: String
    let direccion: String?
    let idDistrito: Int?
    let clienteTipoDocumento: String
    let clienteDocumento: String

    enum CodingKeys: String, CodingKey {
        case idempotenciaClave = "idempotencia_clave"
        case items
        case tipoEntrega = "tipo_entrega"
        case direccion
        case idDistrito = "id_distrito"
        case clienteTipoDocumento = "cliente_tipo_documento"
        case clienteDocumento = "cliente_documento"
    }
}

/// Respuesta de crear orden (nueva o `ya_existia`).
struct PaymentOrder: Decodable {
    let idVenta: Int?
    let orderID: String?
    let checkoutURL: String?
    let status: String?
    let total: Double?

    private enum RootKeys: String, CodingKey { case data, preferencia }
    private enum DataKeys: String, CodingKey {
        case idVenta = "id_venta"
        case orderID = "order_id"
        case id
        case checkoutURL = "checkout_url"
        case status
        case paymentStatus = "payment_status"
        case total
    }
    private enum PreferenceKeys: String, CodingKey {
        case checkoutURL = "checkout_url"
        case paymentURL = "payment_url"
    }

    init(from decoder: Decoder) throws {
        let root = try decoder.container(keyedBy: RootKeys.self)
        let data = try root.nestedContainer(keyedBy: DataKeys.self, forKey: .data)
        idVenta = try? data.decodeFlexibleIntIfPresent(forKey: .idVenta)
        orderID = (try? data.decodeFlexibleStringIfPresent(forKey: .orderID))
            ?? (try? data.decodeFlexibleStringIfPresent(forKey: .id))
        status = (try? data.decodeFlexibleStringIfPresent(forKey: .paymentStatus))
            ?? (try? data.decodeFlexibleStringIfPresent(forKey: .status))
        total = try? data.decodeFlexibleDoubleIfPresent(forKey: .total)

        var url = (try? data.decodeFlexibleStringIfPresent(forKey: .checkoutURL)) ?? nil
        if url?.isEmpty ?? true,
           let pref = try? root.nestedContainer(keyedBy: PreferenceKeys.self, forKey: .preferencia) {
            url = (try? pref.decodeFlexibleStringIfPresent(forKey: .checkoutURL))
                ?? (try? pref.decodeFlexibleStringIfPresent(forKey: .paymentURL))
                ?? nil
        }
        checkoutURL = url
    }
}

/// Estado de una orden (`GET /api/pagos/:orderId`).
struct OrderState: Decodable {
    let status: String?

    private enum RootKeys: String, CodingKey { case data }
    private enum DataKeys: String, CodingKey {
        case status
        case paymentStatus = "payment_status"
    }

    init(from decoder: Decoder) throws {
        let root = try decoder.container(keyedBy: RootKeys.self)
        let data = try root.nestedContainer(keyedBy: DataKeys.self, forKey: .data)
        status = (try? data.decodeFlexibleStringIfPresent(forKey: .paymentStatus))
            ?? (try? data.decodeFlexibleStringIfPresent(forKey: .status))
    }

    private var normalized: String { (status ?? "").trimmingCharacters(in: .whitespaces).uppercased() }
    var isPaid: Bool { normalized == "APPROVED" }
    var isCancelled: Bool {
        ["DECLINED", "ERROR", "EXPIRED", "VOIDED", "REFUNDED"].contains(normalized)
    }
}

// MARK: - Favoritos y reservas

struct FavoriteState: Decodable {
    let isFavorite: Bool

    private enum RootKeys: String, CodingKey { case data }
    private enum DataKeys: String, CodingKey { case esFavorito = "es_favorito" }

    init(from decoder: Decoder) throws {
        let root = try decoder.container(keyedBy: RootKeys.self)
        let data = try? root.nestedContainer(keyedBy: DataKeys.self, forKey: .data)
        isFavorite = (try? data?.decodeFlexibleBoolIfPresent(forKey: .esFavorito)) ?? false
    }
}

struct CreateReservationRequest: Encodable {
    let idLibro: Int
    let cantidad: Int

    enum CodingKeys: String, CodingKey {
        case idLibro = "id_libro"
        case cantidad
    }
}

struct CreatedReservation: Decodable {
    let idReserva: Int?

    enum CodingKeys: String, CodingKey { case idReserva = "id_reserva" }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        idReserva = try? c.decodeFlexibleIntIfPresent(forKey: .idReserva)
    }
}

// MARK: - Cuenta

struct EmailRequest: Encodable { let email: String }

struct RegisterRequest: Encodable {
    let nombre: String
    let apellido: String
    let email: String
    let password: String
}

struct RegisterResponse: Decodable {
    let requiresEmailVerification: Bool

    enum CodingKeys: String, CodingKey { case requiere = "requiere_verificacion_email" }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        requiresEmailVerification = (try? c.decodeFlexibleBoolIfPresent(forKey: .requiere)) ?? false
    }
}

struct VerifyEmailRequest: Encodable {
    let email: String
    let codigo: String
}

struct ResetPasswordRequest: Encodable {
    let email: String
    let codigo: String
    let password: String
}

struct UpdateProfileRequest: Encodable {
    let nombre: String
    let apellido: String
    let email: String
    let telefono: String?
}

struct ChangePasswordRequest: Encodable {
    let passwordActual: String
    let passwordNueva: String
    let confirmarPassword: String

    enum CodingKeys: String, CodingKey {
        case passwordActual = "password_actual"
        case passwordNueva = "password_nueva"
        case confirmarPassword = "confirmar_password"
    }
}

struct CodeRequest: Encodable { let codigo: String }

struct DisableTwoFactorRequest: Encodable {
    let password: String
    let codigo: String
}

struct TwoFactorSetup: Decodable {
    let qr: String?
    let secret: String?

    private enum RootKeys: String, CodingKey { case data }
    private enum DataKeys: String, CodingKey { case qr, secret }

    init(from decoder: Decoder) throws {
        let root = try decoder.container(keyedBy: RootKeys.self)
        let data = try root.nestedContainer(keyedBy: DataKeys.self, forKey: .data)
        qr = try? data.decodeFlexibleStringIfPresent(forKey: .qr)
        secret = try? data.decodeFlexibleStringIfPresent(forKey: .secret)
    }
}
