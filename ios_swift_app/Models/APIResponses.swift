import Foundation

struct APIStatusPayload: Decodable {
    let success: Bool?
    let mensaje: String?

    enum CodingKeys: String, CodingKey {
        case success
        case mensaje
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        success = try container.decodeFlexibleBoolIfPresent(forKey: .success)
        mensaje = try container.decodeIfPresent(String.self, forKey: .mensaje)
    }
}

struct APIResponse<Value: Codable>: Codable {
    let success: Bool
    let mensaje: String?
    let data: Value

    enum CodingKeys: String, CodingKey {
        case success
        case mensaje
        case data
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        success = try container.decodeFlexibleBool(forKey: .success)
        mensaje = try container.decodeIfPresent(String.self, forKey: .mensaje)
        data = try container.decode(Value.self, forKey: .data)
    }
}

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct TwoFactorLoginRequest: Encodable {
    let twoFactorToken: String
    let codigo: String

    enum CodingKeys: String, CodingKey {
        case twoFactorToken = "two_factor_token"
        case codigo
    }
}

struct AuthResponse: Codable {
    let success: Bool
    let mensaje: String?
    let data: User?
    let token: String?
    let requiresTwoFactor: Bool?
    let twoFactorToken: String?

    enum CodingKeys: String, CodingKey {
        case success
        case mensaje
        case data
        case token
        case requiresTwoFactor = "requires_2fa"
        case twoFactorToken = "two_factor_token"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        success = try container.decodeFlexibleBool(forKey: .success)
        mensaje = try container.decodeIfPresent(String.self, forKey: .mensaje)
        data = try container.decodeIfPresent(User.self, forKey: .data)
        token = try container.decodeIfPresent(String.self, forKey: .token)
        requiresTwoFactor = try container.decodeFlexibleBoolIfPresent(forKey: .requiresTwoFactor)
        twoFactorToken = try container.decodeIfPresent(String.self, forKey: .twoFactorToken)
    }
}
