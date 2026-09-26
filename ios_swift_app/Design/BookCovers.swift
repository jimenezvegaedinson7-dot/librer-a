import SwiftUI

/// URLs de archivos del backend (portadas y fotos de perfil).
enum FileURL {
    /// Mismo criterio que Flutter: URL absoluta, ruta absoluta o nombre de
    /// archivo dentro de `prefix` (p. ej. `/uploads/portadas/`).
    static func build(_ path: String?, prefix: String, base: URL = AppEnvironment().baseURL) -> URL? {
        guard let value = path?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
            return nil
        }
        if value.hasPrefix("http://") || value.hasPrefix("https://") {
            return URL(string: value)
        }
        let root = base.absoluteString.hasSuffix("/") ? String(base.absoluteString.dropLast()) : base.absoluteString
        let ruta = value.hasPrefix("/") ? value : prefix + value
        return URL(string: root + ruta)
    }

    static func cover(_ path: String?) -> URL? { build(path, prefix: "/uploads/portadas/") }
    static func profilePhoto(_ path: String?) -> URL? { build(path, prefix: "/uploads/perfiles/") }
}

/// Imagen de portada con marcador de posición en pergamino.
struct CoverImage: View {
    let path: String?

    var body: some View {
        AsyncImage(url: FileURL.cover(path), transaction: Transaction(animation: .easeOut(duration: 0.25))) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            case .empty where FileURL.cover(path) != nil:
                placeholder.overlay(ProgressView().tint(Brand.dorado))
            default:
                placeholder.overlay(
                    Image(systemName: "book.closed")
                        .font(.title2)
                        .foregroundStyle(Brand.dorado)
                )
            }
        }
    }

    private var placeholder: some View {
        LinearGradient(
            colors: [Brand.pergamino, Color(rgb: 0xEFE7DA)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

/// Portada suelta con aspecto de libro: lomo sombreado a la izquierda,
/// esquinas de libro y sombra cálida. Sin tarjeta alrededor.
struct BookCover: View {
    let path: String?
    let width: CGFloat
    var strongShadow = true

    var body: some View {
        let shape = UnevenRoundedRectangle(
            topLeadingRadius: 2, bottomLeadingRadius: 2,
            bottomTrailingRadius: 6, topTrailingRadius: 6
        )
        CoverImage(path: path)
            .frame(width: width, height: width * 1.5)
            .overlay(
                LinearGradient(
                    stops: [
                        .init(color: .black.opacity(0.33), location: 0),
                        .init(color: .white.opacity(0.2), location: 0.035),
                        .init(color: .black.opacity(0.13), location: 0.07),
                        .init(color: .clear, location: 0.12)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(shape)
            .shadow(
                color: Brand.tinta.opacity(strongShadow ? 0.3 : 0.18),
                radius: strongShadow ? 9 : 5,
                x: 3,
                y: strongShadow ? 10 : 5
            )
            .accessibilityHidden(true)
    }
}

/// Hasta tres portadas en abanico (categorías de Inicio y del Catálogo).
struct CoverFan: View {
    let paths: [String?]
    var width: CGFloat = 66

    var body: some View {
        let visibles = Array(paths.prefix(3))
        let layout = Self.layout(count: visibles.count)
        // La del centro va delante.
        let order: [Int] = visibles.count == 3 ? [1, 2, 0] : Array(visibles.indices)

        ZStack {
            ForEach(Array(visibles.indices), id: \.self) { k in
                BookCover(
                    path: visibles[order[k]],
                    width: width,
                    strongShadow: k == visibles.count - 1
                )
                .rotationEffect(.degrees(layout[k].angle))
                .offset(x: layout[k].x, y: k == visibles.count - 1 ? -2 : 4)
            }
        }
        .accessibilityHidden(true)
    }

    /// Desplazamiento y giro de cada portada según cuántas hay.
    private static func layout(count: Int) -> [(x: CGFloat, angle: Double)] {
        switch count {
        case 1: return [(0, 0)]
        case 2: return [(-14, -6), (14, 6)]
        default: return [(-22, -9), (22, 9), (0, 0)]
        }
    }
}
