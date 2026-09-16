import Foundation

struct Reservation: Codable, Equatable, Identifiable {
    let idReserva: Int
    let idUsuario: Int
    let idLibro: Int
    let titulo: String
    let cantidad: Int
    let fechaReserva: Date?
    let fechaVencimiento: Date?
    let estado: String

    var id: Int { idReserva }

    enum CodingKeys: String, CodingKey {
        case idReserva = "id_reserva"
        case idUsuario = "id_usuario"
        case idLibro = "id_libro"
        case titulo
        case cantidad
        case fechaReserva = "fecha_reserva"
        case fechaVencimiento = "fecha_vencimiento"
        case estado
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        idReserva = try container.decodeFlexibleInt(forKey: .idReserva)
        idUsuario = try container.decodeFlexibleInt(forKey: .idUsuario)
        idLibro = try container.decodeFlexibleInt(forKey: .idLibro)
        titulo = try container.decode(String.self, forKey: .titulo)
        cantidad = try container.decodeFlexibleInt(forKey: .cantidad)
        fechaReserva = try container.decodeFlexibleDateIfPresent(forKey: .fechaReserva)
        fechaVencimiento = try container.decodeFlexibleDateIfPresent(forKey: .fechaVencimiento)
        estado = try container.decode(String.self, forKey: .estado)
    }
}
