import Foundation

struct Book: Codable, Equatable, Identifiable {
    let idLibro: Int
    let titulo: String
    let isbn: String?
    let descripcion: String?
    let precio: Double
    let stock: Int
    let portada: String?
    let idAutor: Int?
    let autor: String?
    let idCategoria: Int?
    let categoria: String?
    let estado: Bool

    var id: Int { idLibro }

    enum CodingKeys: String, CodingKey {
        case idLibro = "id_libro"
        case titulo
        case isbn
        case descripcion
        case precio
        case stock
        case portada
        case idAutor = "id_autor"
        case autor
        case idCategoria = "id_categoria"
        case categoria
        case estado
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        idLibro = try container.decodeFlexibleInt(forKey: .idLibro)
        titulo = try container.decode(String.self, forKey: .titulo)
        isbn = try container.decodeIfPresent(String.self, forKey: .isbn)
        descripcion = try container.decodeIfPresent(String.self, forKey: .descripcion)
        precio = try container.decodeFlexibleDouble(forKey: .precio)
        stock = try container.decodeFlexibleInt(forKey: .stock)
        portada = try container.decodeIfPresent(String.self, forKey: .portada)
        idAutor = try container.decodeFlexibleIntIfPresent(forKey: .idAutor)
        autor = try container.decodeIfPresent(String.self, forKey: .autor)
        idCategoria = try container.decodeFlexibleIntIfPresent(forKey: .idCategoria)
        categoria = try container.decodeIfPresent(String.self, forKey: .categoria)
        estado = try container.decodeFlexibleBool(forKey: .estado)
    }
}
