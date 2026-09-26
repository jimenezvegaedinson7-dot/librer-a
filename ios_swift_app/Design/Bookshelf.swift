import SwiftUI

// MARK: - Logo

/// Logo de la librería (el mismo archivo que usa Flutter: libro y pluma).
struct AppLogo: View {
    var width: CGFloat
    var height: CGFloat

    var body: some View {
        Image("Logo")
            .resizable()
            .interpolation(.high)
            .scaledToFit()
            .frame(width: width, height: height)
            .accessibilityLabel("Librería del Saber")
    }
}

// MARK: - Estantería animada

/// Estanterías con lomos de libros (decorativo), como `EstanteriaAnimada` de
/// Flutter: los libros crecen sobre sus baldas una sola vez, de izquierda a
/// derecha y de arriba abajo, y luego el dibujo queda quieto.
struct AnimatedBookshelf: View {
    var ink: UInt32
    var accent: UInt32
    var opacity: Double = 0.14
    var shelfHeight: CGFloat = 70
    var seed: Int = 7
    var duration: Double = 1.4

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var start = Date()
    @State private var finished = false

    var body: some View {
        TimelineView(.animation(paused: finished || reduceMotion)) { timeline in
            let elapsed = timeline.date.timeIntervalSince(start)
            let progress = reduceMotion ? 1 : min(1, max(0, elapsed / duration))
            Canvas { context, size in
                BookshelfPainter(
                    ink: ink, accent: accent, opacity: opacity,
                    progress: progress, shelfHeight: shelfHeight, seed: seed
                ).draw(in: &context, size: size)
            }
            .onChange(of: progress >= 1) { _, done in
                if done { finished = true }
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .onAppear { start = Date() }
    }
}

/// Dibujo de las baldas (misma lógica que `EstanteriaPainter`).
private struct BookshelfPainter {
    let ink: UInt32
    let accent: UInt32
    let opacity: Double
    let progress: Double
    let shelfHeight: CGFloat
    let seed: Int

    func draw(in context: inout GraphicsContext, size: CGSize) {
        var random = SeededRandom(seed: UInt64(truncatingIfNeeded: seed))
        let rows = Int((size.height / shelfHeight).rounded(.up)) + 1
        let board = Color(rgb: ink, opacity: min(1, opacity * 1.3))
        let shine = Color(rgb: accent, opacity: min(1, opacity * 1.6))

        for row in 0..<rows {
            let base = size.height - CGFloat(row) * shelfHeight - 6
            var x = CGFloat(-random.next() * 12)
            var index = 0
            while x < size.width + 12 {
                let width = CGFloat(7 + random.next() * 11)
                let height = shelfHeight * CGFloat(0.52 + random.next() * 0.36)
                let tilted = random.next() < 0.07
                let tone = random.next()
                let gap = random.next() < 0.06

                // Aparición escalonada según la posición del libro.
                let delay = min(0.8, max(0, (1 - Double(x) / Double(size.width + 1)) * 0.55 + Double(row) * 0.08))
                let t = min(1, max(0, (progress - delay) / 0.35))
                let growth = min(1.08, max(0, Self.easeOutBack(t)))

                if !gap && growth > 0 {
                    let current = height * CGFloat(growth)
                    let color = Color(
                        rgb: Self.lerp(ink, accent, tone * 0.55),
                        opacity: min(1, opacity * (0.55 + tone * 0.6))
                    )
                    let spine = CGRect(x: x, y: base - current, width: width, height: current)
                    var layer = context
                    if tilted {
                        layer.translateBy(x: x + width, y: base)
                        layer.rotate(by: .radians(0.16))
                        layer.translateBy(x: -(x + width), y: -base)
                    }
                    layer.fill(
                        Path(roundedRect: spine, cornerRadii: .init(topLeading: 1.5, topTrailing: 1.5)),
                        with: .color(color)
                    )
                    // Bandas doradas del lomo.
                    if index.isMultiple(of: 2) && current > 20 {
                        layer.fill(Path(CGRect(x: x + 1.5, y: base - current + current * 0.18, width: width - 3, height: 1.4)),
                                   with: .color(shine))
                        layer.fill(Path(CGRect(x: x + 1.5, y: base - current * 0.22, width: width - 3, height: 1.4)),
                                   with: .color(shine))
                    }
                }
                x += width + (gap ? CGFloat(10 + random.next() * 14) : 1.2)
                index += 1
            }
            // Balda.
            context.fill(
                Path(roundedRect: CGRect(x: 0, y: base, width: size.width, height: 5), cornerRadius: 1),
                with: .color(board)
            )
        }
    }

    private static func easeOutBack(_ t: Double) -> Double {
        let c1 = 1.70158
        let c3 = c1 + 1
        return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2)
    }

    private static func lerp(_ a: UInt32, _ b: UInt32, _ amount: Double) -> UInt32 {
        func channel(_ shift: UInt32) -> UInt32 {
            let from = Double((a >> shift) & 0xFF)
            let to = Double((b >> shift) & 0xFF)
            return UInt32((from + (to - from) * amount).rounded()) & 0xFF
        }
        return (channel(16) << 16) | (channel(8) << 8) | channel(0)
    }
}

/// Generador pseudoaleatorio con semilla fija: el dibujo es estable.
private struct SeededRandom {
    private var state: UInt64

    init(seed: UInt64) { state = seed &* 6364136223846793005 &+ 1442695040888963407 }

    /// Valor en [0, 1).
    mutating func next() -> Double {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return Double(state >> 11) / 9_007_199_254_740_992 // 2^53
    }
}

extension View {
    /// Fondo de las pantallas de acceso (login, registro, recuperación):
    /// estanterías tenues arriba que se desvanecen hacia el formulario.
    func bookshelfBackground(_ theme: ProfileTheme) -> some View {
        background(
            AnimatedBookshelf(
                ink: ProfileTheme.darken(theme.primaryRGB, 0.22),
                accent: 0xB98D3E,
                opacity: 0.16,
                shelfHeight: 76,
                seed: 3
            )
            .mask(
                LinearGradient(
                    stops: [
                        .init(color: .white, location: 0),
                        .init(color: .clear, location: 0.34),
                        .init(color: .clear, location: 0.9),
                        .init(color: .white.opacity(0.45), location: 1),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .ignoresSafeArea()
        )
    }
}

// MARK: - Pulsación

/// Leve reducción al pulsar (como `Presionable` de Flutter).
struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.14), value: configuration.isPressed)
    }
}

// MARK: - Carga

/// Carga como `LoadingView` de Flutter: una balda cuyos libros se alzan en
/// ola, con el mensaje debajo. Con "reducir movimiento", indicador fijo.
struct ShelfLoadingView: View {
    var message: String?
    @EnvironmentObject private var themeStore: ThemeStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private static let heights: [CGFloat] = [30, 38, 26, 34, 40]
    private static let widths: [CGFloat] = [9, 11, 8, 10, 12]

    var body: some View {
        VStack(spacing: 18) {
            if reduceMotion {
                ProgressView().tint(themeStore.theme.primary)
            } else {
                TimelineView(.animation) { timeline in
                    shelf(phase: timeline.date.timeIntervalSinceReferenceDate
                        .truncatingRemainder(dividingBy: 1.3) / 1.3)
                }
                .frame(width: 76, height: 48)
            }
            if let message {
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(Brand.textoSecundario)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(message ?? "Cargando")
    }

    private func shelf(phase: Double) -> some View {
        let theme = themeStore.theme
        let colors: [Color] = [
            theme.primary, Brand.dorado, theme.primaryDark,
            theme.primary.opacity(0.7), Brand.dorado.opacity(0.8),
        ]
        return VStack(spacing: 0) {
            Spacer(minLength: 0)
            HStack(alignment: .bottom, spacing: 2) {
                ForEach(0..<5, id: \.self) { i in
                    let lift = -7 * max(0, sin((phase - Double(i) * 0.12) * .pi * 2))
                    UnevenRoundedRectangle(topLeadingRadius: 2, topTrailingRadius: 2)
                        .fill(colors[i])
                        .overlay(alignment: .top) {
                            Rectangle().fill(Brand.doradoClaro.opacity(0.8)).frame(height: 1.5).padding(.top, 6)
                        }
                        .frame(width: Self.widths[i], height: Self.heights[i])
                        .offset(y: CGFloat(lift))
                }
            }
            RoundedRectangle(cornerRadius: 2)
                .fill(Brand.tinta.opacity(0.75))
                .frame(width: 76, height: 4)
        }
    }
}
