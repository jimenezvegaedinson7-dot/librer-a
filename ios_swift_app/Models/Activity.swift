import Foundation

struct Activity: Codable, Equatable, Identifiable {
    let idHistorial: Int
    let idUsuario: Int
    let nombreUsuario: String?
    let apellidoUsuario: String?
    let tipoOperacion: String
    let modulo: String
    let descripcion: String
    let fechaRegistro: Date?

    var id: Int { idHistorial }

    enum CodingKeys: String, CodingKey {
        case idHistorial = "id_historial"
        case idUsuario = "id_usuario"
        case nombreUsuario = "nombre_usuario"
        case apellidoUsuario = "apellido_usuario"
        case tipoOperacion = "tipo_operacion"
        case modulo
        case descripcion
        case fechaRegistro = "fecha_registro"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        idHistorial = try container.decodeFlexibleInt(forKey: .idHistorial)
        idUsuario = try container.decodeFlexibleInt(forKey: .idUsuario)
        nombreUsuario = try container.decodeIfPresent(String.self, forKey: .nombreUsuario)
        apellidoUsuario = try container.decodeIfPresent(String.self, forKey: .apellidoUsuario)
        tipoOperacion = try container.decode(String.self, forKey: .tipoOperacion)
        modulo = try container.decode(String.self, forKey: .modulo)
        descripcion = try container.decode(String.self, forKey: .descripcion)
        fechaRegistro = try container.decodeFlexibleDateIfPresent(forKey: .fechaRegistro)
    }
}
