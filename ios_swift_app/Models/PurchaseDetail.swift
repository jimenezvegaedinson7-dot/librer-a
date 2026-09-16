import Foundation

struct PurchaseDetail: Codable, Equatable, Identifiable {
    let idDetalle: Int?
    let idLibro: Int
    let titulo: String
    let cantidad: Int
    let precioUnitario: Double
    let subtotal: Double

    var id: String { idDetalle.map(String.init) ?? "\(idLibro)-\(titulo)" }

    enum CodingKeys: String, CodingKey {
        case idDetalle = "id_detalle"
        case idLibro = "id_libro"
        case titulo
        case cantidad
        case precioUnitario = "precio_unitario"
        case subtotal
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        idDetalle = try container.decodeFlexibleIntIfPresent(forKey: .idDetalle)
        idLibro = try container.decodeFlexibleInt(forKey: .idLibro)
        titulo = try container.decode(String.self, forKey: .titulo)
        cantidad = try container.decodeFlexibleInt(forKey: .cantidad)
        precioUnitario = try container.decodeFlexibleDouble(forKey: .precioUnitario)
        subtotal = try container.decodeFlexibleDouble(forKey: .subtotal)
    }
}
