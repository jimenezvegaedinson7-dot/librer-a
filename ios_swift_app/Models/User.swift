import Foundation

struct User: Codable, Equatable, Identifiable {
    let idUsuario: Int
    let nombre: String
    let apellido: String
    let email: String
    let telefono: String?
    let fotoPerfil: String?
    let rol: String
    let estado: Bool
    let fechaRegistro: Date?
    let twoFactorEnabled: Bool
    let emailVerifiedAt: Date?

    var id: Int { idUsuario }

    enum CodingKeys: String, CodingKey {
        case idUsuario = "id_usuario"
        case nombre
        case apellido
        case email
        case telefono
        case fotoPerfil = "foto_perfil"
        case rol
        case estado
        case fechaRegistro = "fecha_registro"
        case twoFactorEnabled = "two_factor_enabled"
        case emailVerifiedAt = "email_verified_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        idUsuario = try container.decodeFlexibleInt(forKey: .idUsuario)
        nombre = try container.decode(String.self, forKey: .nombre)
        apellido = try container.decode(String.self, forKey: .apellido)
        email = try container.decode(String.self, forKey: .email)
        telefono = try container.decodeIfPresent(String.self, forKey: .telefono)
        fotoPerfil = try container.decodeIfPresent(String.self, forKey: .fotoPerfil)
        rol = try container.decode(String.self, forKey: .rol)
        estado = try container.decodeFlexibleBool(forKey: .estado)
        fechaRegistro = try container.decodeFlexibleDateIfPresent(forKey: .fechaRegistro)
        twoFactorEnabled = try container.decodeFlexibleBoolIfPresent(forKey: .twoFactorEnabled) ?? false
        emailVerifiedAt = try container.decodeFlexibleDateIfPresent(forKey: .emailVerifiedAt)
    }
}
