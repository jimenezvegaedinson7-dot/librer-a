import SwiftUI
import Combine

// MARK: - Colores

extension Color {
    /// Color desde un entero RGB (`0xRRGGBB`).
    init(rgb: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255,
            opacity: opacity
        )
    }
}

/// Identidad de la librería (la misma paleta que la app Flutter).
enum Brand {
    static let burdeos = Color(rgb: 0x7A2530)
    static let burdeosProfundo = Color(rgb: 0x4E1620)
    static let dorado = Color(rgb: 0xB98D3E)
    static let doradoClaro = Color(rgb: 0xE6CB8F)
    static let tinta = Color(rgb: 0x2C2621)
    static let pergamino = Color(rgb: 0xF1E8D8)

    static let fondo = Color(rgb: 0xF6F1E9)
    static let superficie = Color.white
    static let papel = Color(rgb: 0xFBF7F0)
    static let texto = Color(rgb: 0x1C1814)
    static let textoSecundario = Color(rgb: 0x675E54)
    static let textoTerciario = Color(rgb: 0x9A8F82)
    static let divisor = Color(rgb: 0xE7DFD3)

    static let exito = Color(rgb: 0x15803D)
    static let aviso = Color(rgb: 0xB45309)
    static let error = Color(rgb: 0xB91C1C)
}

// MARK: - Temas del perfil

/// Tema de colores elegido en el Perfil (mismas reglas que Flutter).
struct ProfileTheme: Identifiable, Equatable {
    let id: String
    let name: String
    let start: UInt32
    let end: UInt32
    let accent: UInt32?

    var startColor: Color { Color(rgb: start) }
    var endColor: Color { Color(rgb: end) }
    var isGradient: Bool { start != end }

    var gradient: LinearGradient {
        LinearGradient(
            colors: [startColor, endColor],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    /// Texto legible sobre el degradado.
    var textColor: Color {
        (Self.luminance(start) + Self.luminance(end)) / 2 > 0.5 ? Color(rgb: 0x17181C) : .white
    }

    /// Color principal (botones, selección, iconos activos).
    var primaryRGB: UInt32 {
        if accent != nil { return start }
        let base = Self.luminance(start) <= Self.luminance(end) ? start : end
        return Self.luminance(base) > 0.55 ? 0x202227 : base
    }

    var primary: Color { Color(rgb: primaryRGB) }
    var primaryDark: Color { Color(rgb: Self.darken(primaryRGB, 0.22)) }

    /// Acento decorativo (dorado en el tema de marca y en temas claros).
    var accentRGB: UInt32 {
        if let accent { return accent }
        return (Self.luminance(start) + Self.luminance(end)) / 2 > 0.85 ? 0xB98D3E : start
    }

    var accentColor: Color { Color(rgb: accentRGB) }

    /// Color de los precios.
    var price: Color {
        accent != nil ? primary : Color(rgb: Self.darken(accentRGB, 0.28))
    }

    var isCustom: Bool { id.hasPrefix(Self.customPrefix) }

    private static let customPrefix = "custom_"

    /// Id persistente de un degradado propio: `custom_AABBCC_DDEEFF`
    /// (o `custom_AABBCC` si ambos colores coinciden), igual que Flutter.
    static func customID(start: UInt32, end: UInt32) -> String {
        let hex = { (v: UInt32) in String(format: "%06X", v & 0xFFFFFF) }
        return customPrefix + hex(start) + (end == start ? "" : "_" + hex(end))
    }

    /// Tema por id: predefinidos y personalizados; si no es válido, el de marca.
    static func resolve(_ id: String) -> ProfileTheme {
        if id.hasPrefix(customPrefix) {
            let parts = id.dropFirst(customPrefix.count).split(separator: "_").map(String.init)
            let parse = { (s: String) -> UInt32? in s.count == 6 ? UInt32(s, radix: 16) : nil }
            if (1...2).contains(parts.count), let start = parse(parts[0]) {
                let end = parts.count == 2 ? (parse(parts[1]) ?? start) : start
                return ProfileTheme(id: id, name: "Personalizado", start: start, end: end, accent: nil)
            }
        }
        return all.first { $0.id == id } ?? all[0]
    }

    /// Colores para combinar: neutros + los de todos los temas (sin repetir).
    static var customPalette: [UInt32] {
        var seen = Set<UInt32>()
        return ([0x17181C, 0x6B7280, 0xFFFFFF] + all.flatMap { [$0.start, $0.end] })
            .filter { seen.insert($0).inserted }
    }

    static func luminance(_ rgb: UInt32) -> Double {
        func canal(_ v: UInt32) -> Double {
            let c = Double(v) / 255
            return c <= 0.03928 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * canal((rgb >> 16) & 0xFF)
            + 0.7152 * canal((rgb >> 8) & 0xFF)
            + 0.0722 * canal(rgb & 0xFF)
    }

    static func darken(_ rgb: UInt32, _ amount: Double) -> UInt32 {
        func canal(_ shift: UInt32) -> UInt32 {
            UInt32((Double((rgb >> shift) & 0xFF) * (1 - amount)).rounded())
        }
        return (canal(16) << 16) | (canal(8) << 8) | canal(0)
    }
}

/// Tema activo de la app. Se guarda solo el id (preferencia no sensible).
@MainActor
final class ThemeStore: ObservableObject {
    @Published private(set) var theme: ProfileTheme

    private let defaults: UserDefaults
    private static let key = "perfil_tema"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        theme = ProfileTheme.resolve(defaults.string(forKey: Self.key) ?? ProfileTheme.defaultID)
    }

    func apply(_ theme: ProfileTheme) {
        self.theme = theme
        defaults.set(theme.id, forKey: Self.key)
    }
}

// MARK: - Tipografía

extension Font {
    /// Serif editorial para títulos (equivalente a Source Serif de Flutter).
    static func serif(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .serif)
    }
}

// MARK: - Componentes

/// Precio "S/ 44.00" con el símbolo más pequeño.
struct PriceText: View {
    let amount: Double
    var size: CGFloat = 17
    var color: Color?
    @EnvironmentObject private var themeStore: ThemeStore

    var body: some View {
        (Text("S/ ").font(.system(size: size * 0.66, weight: .semibold))
            + Text(Money.format(amount)).font(.system(size: size, weight: .bold)))
            .foregroundStyle(color ?? themeStore.theme.price)
            .monospacedDigit()
            .accessibilityLabel("\(Money.format(amount)) soles")
    }
}

/// Antetítulo dorado en mayúsculas + título serif.
struct SectionTitle: View {
    let eyebrow: String?
    let title: String
    var action: String?
    var onAction: (() -> Void)?

    var body: some View {
        HStack(alignment: .lastTextBaseline) {
            VStack(alignment: .leading, spacing: 4) {
                if let eyebrow {
                    Text(eyebrow.uppercased())
                        .font(.caption.weight(.bold))
                        .kerning(1.4)
                        .foregroundStyle(Brand.dorado)
                }
                Text(title)
                    .font(.serif(24))
                    .foregroundStyle(Brand.texto)
            }
            Spacer()
            if let action, let onAction {
                Button(action: onAction) {
                    HStack(spacing: 2) {
                        Text(action)
                        Image(systemName: "chevron.right").font(.caption)
                    }
                }
                .font(.subheadline.weight(.semibold))
            }
        }
    }
}

/// Estado vacío con medallón.
struct EmptyStateView: View {
    let systemImage: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle().stroke(Brand.dorado.opacity(0.5), lineWidth: 1.5)
                    .frame(width: 96, height: 96)
                Circle().fill(Brand.pergamino).frame(width: 80, height: 80)
                Image(systemName: systemImage)
                    .font(.system(size: 30))
                    .foregroundStyle(Brand.burdeos)
            }
            Text(title).font(.serif(20)).foregroundStyle(Brand.texto)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Brand.textoSecundario)
                .multilineTextAlignment(.center)
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .buttonStyle(BrandButtonStyle())
                    .padding(.top, 4)
            }
        }
        .padding(32)
        .frame(maxWidth: .infinity)
    }
}

/// Botón principal con el color del tema.
struct BrandButtonStyle: ButtonStyle {
    var filled = true

    func makeBody(configuration: Configuration) -> some View {
        BrandButtonBody(configuration: configuration, filled: filled)
    }
}

/// Cuerpo del botón: como vista, lee el tema y `isEnabled` de forma fiable.
private struct BrandButtonBody: View {
    let configuration: ButtonStyleConfiguration
    let filled: Bool
    @Environment(\.isEnabled) private var isEnabled
    @EnvironmentObject private var themeStore: ThemeStore

    var body: some View {
        let primary = themeStore.theme.primary
        configuration.label
            .font(.body.weight(.semibold))
            .frame(maxWidth: .infinity, minHeight: 52)
            .foregroundStyle(filled ? Color.white : primary)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(filled ? primary : Color.clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(filled ? Color.clear : primary.opacity(0.6), lineWidth: 1.2)
            )
            .opacity(isEnabled ? (configuration.isPressed ? 0.85 : 1) : 0.45)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Campo de formulario con etiqueta, icono y borde suave.
struct BrandField: View {
    let title: String
    let systemImage: String
    @Binding var text: String
    var secure = false
    var keyboard: UIKeyboardType = .default
    var contentType: UITextContentType?
    @State private var reveal = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .foregroundStyle(Brand.textoTerciario)
                .frame(width: 22)
            Group {
                if secure && !reveal {
                    SecureField(title, text: $text)
                } else {
                    TextField(title, text: $text)
                        .keyboardType(keyboard)
                }
            }
            .textContentType(contentType)
            .textInputAutocapitalization(
                keyboard == .emailAddress || secure
                    ? TextInputAutocapitalization.never
                    : TextInputAutocapitalization.sentences
            )
            .autocorrectionDisabled(keyboard == .emailAddress || secure)
            if secure {
                Button {
                    reveal.toggle()
                } label: {
                    Image(systemName: reveal ? "eye" : "eye.slash")
                        .foregroundStyle(Brand.textoTerciario)
                }
                .accessibilityLabel(reveal ? "Ocultar contraseña" : "Mostrar contraseña")
            }
        }
        .padding(.horizontal, 14)
        .frame(minHeight: 52)
        .background(RoundedRectangle(cornerRadius: 12).fill(Brand.superficie))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Brand.divisor))
    }
}

/// Aviso de error en rojo suave.
struct ErrorBanner: View {
    let message: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.circle")
            Text(message).frame(maxWidth: .infinity, alignment: .leading)
        }
        .font(.subheadline)
        .foregroundStyle(Brand.error)
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 10).fill(Brand.error.opacity(0.08)))
    }
}

/// Aparición con fundido y desplazamiento (respeta "reducir movimiento").
struct AppearModifier: ViewModifier {
    let index: Int
    @State private var visible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .opacity(visible || reduceMotion ? 1 : 0)
            .offset(y: visible || reduceMotion ? 0 : 20)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeOut(duration: 0.45).delay(Double(min(index, 8)) * 0.07)) {
                    visible = true
                }
            }
    }
}

extension View {
    func appear(_ index: Int = 0) -> some View {
        modifier(AppearModifier(index: index))
    }
}

// MARK: - Dinero

/// Montos en soles con 2 decimales, calculados en céntimos (sin redondeos).
enum Money {
    static func cents(_ amount: Double) -> Int { Int((amount * 100).rounded()) }

    static func format(_ amount: Double) -> String {
        String(format: "%.2f", Double(cents(amount)) / 100)
    }
}
