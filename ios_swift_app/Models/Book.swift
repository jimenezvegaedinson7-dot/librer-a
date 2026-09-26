import Foundation

/// Libro del catálogo. La decodificación es tolerante (como en Flutter):
/// números como texto, `estado` como 0/1 y campos ausentes con valores
/// neutros, para que un libro incompleto no rompa todo el catálogo.
struct Book: Codable, Equatable, Hashable, Identifiable {
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

    /// Activo y con stock.
    var isAvailable: Bool { estado && stock > 0 }

    var displayTitle: String { titulo.isEmpty ? "Sin título" : titulo }
    var displayAuthor: String { (autor ?? "").isEmpty ? "Autor no registrado" : autor! }

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

    init(
        idLibro: Int,
        titulo: String,
        isbn: String? = nil,
        descripcion: String? = nil,
        precio: Double,
        stock: Int,
        portada: String? = nil,
        idAutor: Int? = nil,
        autor: String? = nil,
        idCategoria: Int? = nil,
        categoria: String? = nil,
        estado: Bool = true
    ) {
        self.idLibro = idLibro
        self.titulo = titulo
        self.isbn = isbn
        self.descripcion = descripcion
        self.precio = precio
        self.stock = stock
        self.portada = portada
        self.idAutor = idAutor
        self.autor = autor
        self.idCategoria = idCategoria
        self.categoria = categoria
        self.estado = estado
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        idLibro = try container.decodeFlexibleInt(forKey: .idLibro)
        titulo = (try container.decodeFlexibleStringIfPresent(forKey: .titulo) ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        isbn = try container.decodeFlexibleStringIfPresent(forKey: .isbn)
        descripcion = try container.decodeFlexibleStringIfPresent(forKey: .descripcion)
        precio = (try? container.decodeFlexibleDoubleIfPresent(forKey: .precio)) ?? 0
        stock = (try? container.decodeFlexibleIntIfPresent(forKey: .stock)) ?? 0
        portada = try container.decodeFlexibleStringIfPresent(forKey: .portada)
        idAutor = try? container.decodeFlexibleIntIfPresent(forKey: .idAutor)
        autor = try container.decodeFlexibleStringIfPresent(forKey: .autor)
        idCategoria = try? container.decodeFlexibleIntIfPresent(forKey: .idCategoria)
        categoria = try container.decodeFlexibleStringIfPresent(forKey: .categoria)
        estado = (try? container.decodeFlexibleBoolIfPresent(forKey: .estado)) ?? false
    }
}
