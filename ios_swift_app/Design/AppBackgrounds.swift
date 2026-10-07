import SwiftUI

/// Combinación de fondo de pantallas y color de tarjetas, la misma paleta
/// que Flutter (`utils/perfil_fondos.dart`). Todos son claros: los textos
/// de la app son oscuros y deben leerse bien.
struct AppBackground: Identifiable, Equatable {
    let id: String
    let name: String
    let background: UInt32
    let card: UInt32

    var fondo: Color { Color(rgb: background) }
    var tarjeta: Color { Color(rgb: card) }

    /// Fondo por defecto: el marfil de la librería con tarjetas blancas.
    static let defaultID = "marfil"

    static let all: [AppBackground] = [
        .init(id: "marfil", name: "Marfil", background: 0xF6F1E9, card: 0xFFFFFF),
        .init(id: "blanco", name: "Blanco", background: 0xF7F7F8, card: 0xFFFFFF),
        .init(id: "perla", name: "Gris perla", background: 0xEDEEF0, card: 0xFAFAFB),
        .init(id: "arena", name: "Arena", background: 0xEFE6D6, card: 0xFBF7EF),
        .init(id: "pergamino", name: "Pergamino", background: 0xF1E8D8, card: 0xFFFCF6),
        .init(id: "niebla", name: "Niebla azul", background: 0xE9EEF5, card: 0xFFFFFF),
        .init(id: "cielo", name: "Cielo", background: 0xE3F0FA, card: 0xF8FBFE),
        .init(id: "menta", name: "Menta", background: 0xE6F3EC, card: 0xFAFDFB),
        .init(id: "salvia", name: "Salvia", background: 0xE8ECE2, card: 0xFBFCF8),
        .init(id: "rosa", name: "Rosa empolvado", background: 0xF6E9EA, card: 0xFFFAFA),
        .init(id: "durazno", name: "Durazno", background: 0xF9EAE0, card: 0xFFFBF8),
        .init(id: "lavanda", name: "Lavanda", background: 0xEEEAF6, card: 0xFCFBFE)
    ]

    static func resolve(_ id: String?) -> AppBackground {
        all.first { $0.id == id } ?? all[0]
    }

    /// Fondo activo: lo leen `Brand.fondo` y `Brand.superficie`. Solo lo
    /// cambia `ThemeStore` (en el hilo principal).
    nonisolated(unsafe) static var active = AppBackground.resolve(
        UserDefaults.standard.string(forKey: ThemeStore.backgroundKey)
    )
}

/// "Fondo y tarjetas": elige el color de fondo de las pantallas y el de las
/// tarjetas, con vista previa. Nada cambia hasta pulsar "Aplicar".
struct BackgroundsView: View {
    @EnvironmentObject private var themeStore: ThemeStore
    @Environment(\.dismiss) private var dismiss
    @State private var selection: AppBackground?

    private var current: AppBackground { selection ?? themeStore.background }
    private var changed: Bool { current.id != themeStore.background.id }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                preview(current)
                    .animation(.easeOut(duration: 0.25), value: current.id)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 96), spacing: 12)], spacing: 12) {
                    ForEach(AppBackground.all) { option in
                        swatch(option)
                    }
                }
            }
            .padding(20)
        }
        .background(current.fondo.ignoresSafeArea())
        .navigationTitle("Fondo y tarjetas")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            Button {
                themeStore.applyBackground(current)
                dismiss()
            } label: {
                Text(changed ? "Aplicar «\(current.name)»" : "Este es tu fondo actual")
            }
            .buttonStyle(BrandButtonStyle())
            .disabled(!changed)
            .padding(16)
            .background(.bar)
        }
    }

    /// Vista previa: una pantalla en miniatura con dos tarjetas.
    private func preview(_ option: AppBackground) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Vista previa").font(.caption.weight(.bold)).kerning(1.2).foregroundStyle(Brand.dorado)
            VStack(spacing: 10) {
                ForEach(0..<2, id: \.self) { i in
                    HStack(spacing: 12) {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(themeStore.theme.gradient)
                            .frame(width: 34, height: 48)
                        VStack(alignment: .leading, spacing: 6) {
                            Capsule().fill(Brand.texto.opacity(0.75)).frame(width: i == 0 ? 120 : 90, height: 8)
                            Capsule().fill(Brand.textoSecundario.opacity(0.5)).frame(width: 70, height: 6)
                        }
                        Spacer()
                    }
                    .padding(12)
                    .background(RoundedRectangle(cornerRadius: 14).fill(option.tarjeta))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.divisor))
                }
            }
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 18).fill(option.fondo))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Brand.divisor))
        }
        .accessibilityHidden(true)
    }

    private func swatch(_ option: AppBackground) -> some View {
        let selected = option.id == current.id
        return Button {
            selection = option
        } label: {
            VStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12).fill(option.fondo)
                    RoundedRectangle(cornerRadius: 6).fill(option.tarjeta)
                        .padding(14)
                        .shadow(color: .black.opacity(0.06), radius: 2, y: 1)
                    if selected {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(themeStore.theme.primary)
                            .background(Circle().fill(.white))
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                            .padding(6)
                    }
                }
                .frame(height: 70)
                .overlay(RoundedRectangle(cornerRadius: 12)
                    .stroke(selected ? themeStore.theme.primary : Brand.divisor, lineWidth: selected ? 2.5 : 1))
                Text(option.name)
                    .font(.caption.weight(selected ? .bold : .regular))
                    .foregroundStyle(Brand.texto)
                    .lineLimit(1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Fondo \(option.name)")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
