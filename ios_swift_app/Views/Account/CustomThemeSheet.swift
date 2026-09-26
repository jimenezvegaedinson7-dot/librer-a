import SwiftUI

/// "Combina tus colores": dos colores forman un degradado propio (como Flutter).
struct CustomThemeSheet: View {
    let onApply: (ProfileTheme) -> Void
    @State private var start: UInt32
    @State private var end: UInt32

    init(initial: ProfileTheme, onApply: @escaping (ProfileTheme) -> Void) {
        self.onApply = onApply
        _start = State(initialValue: initial.start)
        _end = State(initialValue: initial.end)
    }

    private var preview: ProfileTheme {
        ProfileTheme.resolve(ProfileTheme.customID(start: start, end: end))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Combina tus colores").font(.serif(24))
                    Text("Elige dos colores y crea tu degradado personalizado.")
                        .font(.subheadline)
                        .foregroundStyle(Brand.textoSecundario)
                }

                Text("Vista previa")
                    .font(.headline)
                    .foregroundStyle(preview.textColor)
                    .frame(maxWidth: .infinity, minHeight: 56)
                    .background(RoundedRectangle(cornerRadius: 12).fill(preview.gradient))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Brand.divisor))
                    .animation(.easeInOut(duration: 0.25), value: preview)

                palette(title: "Color inicial", selection: $start)
                palette(title: "Color final", selection: $end)

                Button("Aplicar") { onApply(preview) }
                    .buttonStyle(BrandButtonStyle())
            }
            .padding(20)
        }
        .background(Brand.fondo.ignoresSafeArea())
    }

    private func palette(title: String, selection: Binding<UInt32>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.subheadline.weight(.bold))
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 36, maximum: 44), spacing: 10)], spacing: 10) {
                ForEach(ProfileTheme.customPalette, id: \.self) { rgb in
                    let selected = rgb == selection.wrappedValue
                    Button { selection.wrappedValue = rgb } label: {
                        Circle()
                            .fill(Color(rgb: rgb))
                            .frame(width: 36, height: 36)
                            .overlay(Circle().stroke(selected ? Brand.tinta : Brand.divisor, lineWidth: selected ? 3 : 1))
                            .overlay {
                                if selected {
                                    Image(systemName: "checkmark")
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(ProfileTheme.luminance(rgb) > 0.5 ? Color(rgb: 0x17181C) : .white)
                                }
                            }
                    }
                    .accessibilityLabel(String(format: "Color %06X", rgb))
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
        }
    }
}
