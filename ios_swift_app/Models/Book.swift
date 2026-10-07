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

    // Promociones (las mismas que Flutter, models/libro.dart).
    let precioFinal: Double?
    let descuentoVigente: Bool
    let descuentoPorcentaje: Int?
    /// Último día de la oferta, `AAAA-MM-DD` (hora de Lima).
    let descuentoHasta: String?
    /// Fecha de alta en el catálogo, tal como llega (ISO 8601).
    let creadoEn: String?
    let esNuevo: Bool

    var id: Int { idLibro }

    /// Precio que se cobra hoy. El servidor recalcula el importe; aquí solo
    /// se descarta una oferta vencida mientras el carrito estuvo cerrado.
    func precioCompra(en ahora: Date = Date()) -> Double {
        guard descuentoVigente, let oferta = precioFinal, oferta.isFinite,
              oferta >= 0, oferta < precio else { return precio }
        if let hasta = descuentoHasta, !hasta.isEmpty {
            var lima = Calendar(identifier: .gregorian)
            lima.timeZone = TimeZone(secondsFromGMT: -5 * 3600)!
            let c = lima.dateComponents([.year, .month, .day], from: ahora)
            let hoy = String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
            if String(hasta.prefix(10)) < hoy { return precio }
        }
        return oferta
    }

    var precioCompra: Double { precioCompra() }
    var enOferta: Bool { precioCompra < precio }
    var porcentajeOferta: Int {
        guard enOferta, precio > 0 else { return 0 }
        return Int(((precio - precioCompra) / precio * 100).rounded())
    }

    /// "Nuevo" solo durante los 30 días siguientes a su alta.
    func nuevo(en ahora: Date = Date()) -> Bool {
        guard esNuevo, let texto = creadoEn, let fecha = Book.fecha(texto) else { return false }
        let edad = ahora.timeIntervalSince(fecha)
        return edad >= 0 && edad < 30 * 24 * 3600
    }

    var mostrarNuevo: Bool { nuevo() }

    private static func fecha(_ texto: String) -> Date? { FlexibleDateParser.parse(texto) }

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
        case precioFinal = "precio_final"
        case descuentoVigente = "descuento_vigente"
        case descuentoPorcentaje = "descuento_porcentaje_efectivo"
        case descuentoHasta = "descuento_hasta"
        case creadoEn = "creado_en"
        case esNuevo = "es_nuevo"
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
        estado: Bool = true,
        precioFinal: Double? = nil,
        descuentoVigente: Bool = false,
        descuentoPorcentaje: Int? = nil,
        descuentoHasta: String? = nil,
        creadoEn: String? = nil,
        esNuevo: Bool = false
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
        self.precioFinal = precioFinal
        self.descuentoVigente = descuentoVigente
        self.descuentoPorcentaje = descuentoPorcentaje
        self.descuentoHasta = descuentoHasta
        self.creadoEn = creadoEn
        self.esNuevo = esNuevo
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
        precioFinal = try? container.decodeFlexibleDoubleIfPresent(forKey: .precioFinal)
        descuentoVigente = (try? container.decodeFlexibleBoolIfPresent(forKey: .descuentoVigente)) ?? false
        descuentoPorcentaje = try? container.decodeFlexibleIntIfPresent(forKey: .descuentoPorcentaje)
        descuentoHasta = try? container.decodeFlexibleStringIfPresent(forKey: .descuentoHasta)
        creadoEn = try? container.decodeFlexibleStringIfPresent(forKey: .creadoEn)
        esNuevo = (try? container.decodeFlexibleBoolIfPresent(forKey: .esNuevo)) ?? false
    }
}
