import AVFoundation
import SwiftUI
import UIKit

// MARK: - Sonido y vibración

/// "¡Listo!" de una confirmación (código verificado, pago aprobado): dos
/// campanas ascendentes como las de una compra exitosa (el mismo
/// `confirmacion.wav` que Flutter) y una vibración de éxito. Se mezcla con
/// la música del usuario y nunca bloquea el flujo si el audio falla.
@MainActor
final class ConfirmationFeedback {
    static let shared = ConfirmationFeedback()
    private var player: AVAudioPlayer?

    func play() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        guard let url = Bundle.main.url(forResource: "confirmacion", withExtension: "wav") else { return }
        do {
            try AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
            if player == nil {
                player = try AVAudioPlayer(contentsOf: url)
                player?.volume = 0.8
                player?.prepareToPlay()
            }
            player?.currentTime = 0
            player?.play()
        } catch {
            // Sin sonido la confirmación visual sigue igual.
        }
    }
}

// MARK: - Celebración

struct CelebrationContent: Identifiable, Equatable {
    let id = UUID()
    let title: String
    let message: String
}

/// Tiempo que la celebración queda visible (igual que Flutter).
private let celebrationDuration: TimeInterval = 1.3

/// El círculo verde entra con rebote, el check se dibuja, una onda y unos
/// destellos salen del centro y suena la confirmación. Se cierra sola.
struct SuccessCelebration: View {
    let content: CelebrationContent
    let onFinish: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var start = Date()

    var body: some View {
        VStack(spacing: 8) {
            TimelineView(.animation(paused: reduceMotion)) { context in
                let t = reduceMotion ? 1 : min(1, context.date.timeIntervalSince(start) / celebrationDuration)
                Canvas { ctx, size in CelebrationPainter.paint(&ctx, size: size, t: t) }
                    .frame(width: 136, height: 136)
            }
            VStack(spacing: 8) {
                Text(content.title)
                    .font(.title3.weight(.bold))
                    .multilineTextAlignment(.center)
                Text(content.message)
                    .font(.subheadline)
                    .foregroundStyle(Brand.textoSecundario)
                    .multilineTextAlignment(.center)
            }
            .modifier(DelayedFade(delay: reduceMotion ? 0 : 0.3))
        }
        .padding(.horizontal, 28)
        .padding(.top, 28)
        .padding(.bottom, 30)
        .frame(maxWidth: 320)
        .background(RoundedRectangle(cornerRadius: 28).fill(Brand.superficie))
        .shadow(color: .black.opacity(0.18), radius: 24, y: 10)
        .padding(32)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.updatesFrequently)
        .task {
            start = Date()
            ConfirmationFeedback.shared.play()
            UIAccessibility.post(notification: .announcement, argument: "\(content.title). \(content.message)")
            try? await Task.sleep(nanoseconds: UInt64(celebrationDuration * 1_000_000_000))
            onFinish()
        }
    }
}

private struct DelayedFade: ViewModifier {
    let delay: Double
    @State private var visible = false
    func body(content: Content) -> some View {
        content
            .opacity(visible ? 1 : 0)
            .onAppear { withAnimation(.easeOut(duration: 0.3).delay(delay)) { visible = true } }
    }
}

/// Curvas equivalentes a las de Flutter.
enum Easing {
    static func easeOutCubic(_ t: Double) -> Double { 1 - pow(1 - t, 3) }

    /// `Curves.elasticOut` (periodo 0.4).
    static func elasticOut(_ t: Double) -> Double {
        guard t > 0 else { return 0 }
        guard t < 1 else { return 1 }
        let p = 0.4
        return pow(2, -10 * t) * sin((t - p / 4) * (2 * .pi) / p) + 1
    }

    static func segment(_ t: Double, _ from: Double, _ to: Double) -> Double {
        min(1, max(0, (t - from) / (to - from)))
    }
}

/// Dibuja toda la celebración a partir de un único avance `t` (0 → 1).
enum CelebrationPainter {
    private static let sparkles: [Color] = [
        Brand.exito, Color(rgb: 0xF2B33D), Color(rgb: 0x3B82F6), Brand.exito,
        Color(rgb: 0xE76F51), Color(rgb: 0xF2B33D), Color(rgb: 0x3B82F6), Color(rgb: 0xE76F51)
    ]

    static func paint(_ ctx: inout GraphicsContext, size: CGSize, t: Double) {
        let c = CGPoint(x: size.width / 2, y: size.height / 2)

        // Onda que se expande y se desvanece.
        let wave = Easing.easeOutCubic(Easing.segment(t, 0.12, 0.6))
        if wave > 0 && wave < 1 {
            let r = 38 + 28 * wave
            ctx.stroke(
                Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)),
                with: .color(Brand.exito.opacity(0.45 * (1 - wave))),
                lineWidth: 3 * (1 - wave)
            )
        }

        // Destellos que salen del centro.
        let out = Easing.easeOutCubic(Easing.segment(t, 0.16, 0.72))
        if out > 0 && out < 1 {
            for (i, color) in sparkles.enumerated() {
                let angle = -Double.pi / 2 + Double(i) * 2 * .pi / Double(sparkles.count)
                let d = 44 + 22 * out
                let radius = (i.isMultiple(of: 2) ? 4.0 : 3.0) * (1 - out * 0.6)
                let p = CGPoint(x: c.x + cos(angle) * d, y: c.y + sin(angle) * d)
                ctx.fill(
                    Path(ellipseIn: CGRect(x: p.x - radius, y: p.y - radius, width: 2 * radius, height: 2 * radius)),
                    with: .color(color.opacity(1 - out))
                )
            }
        }

        // Círculo con rebote.
        let scale = Easing.elasticOut(Easing.segment(t, 0, 0.38))
        let r = 38 * scale
        ctx.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)),
                 with: .color(Brand.exito))

        // Check que se dibuja.
        let stroke = Easing.easeOutCubic(Easing.segment(t, 0.22, 0.5))
        if stroke > 0 {
            var check = Path()
            check.move(to: CGPoint(x: c.x - 15, y: c.y + 1))
            check.addLine(to: CGPoint(x: c.x - 4, y: c.y + 12))
            check.addLine(to: CGPoint(x: c.x + 17, y: c.y - 11))
            ctx.stroke(
                check.trimmedPath(from: 0, to: stroke),
                with: .color(.white),
                style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round)
            )
        }
    }
}

extension View {
    /// Muestra la celebración sobre toda la pantalla mientras `item` no sea
    /// nil; al terminar lo vuelve a nil y llama a `onFinish`.
    func successCelebration(
        _ item: Binding<CelebrationContent?>,
        onFinish: @escaping (CelebrationContent) -> Void = { _ in }
    ) -> some View {
        fullScreenCover(item: item) { content in
            ZStack {
                Color.black.opacity(0.35).ignoresSafeArea()
                SuccessCelebration(content: content) {
                    var sinAnimacion = Transaction()
                    sinAnimacion.disablesAnimations = true
                    withTransaction(sinAnimacion) { item.wrappedValue = nil }
                    onFinish(content)
                }
            }
            .presentationBackground(.clear)
        }
    }
}

/// Activa una celebración sin la animación de hoja que sube desde abajo.
@MainActor
func celebrate(_ binding: Binding<CelebrationContent?>, title: String, message: String) {
    var sinAnimacion = Transaction()
    sinAnimacion.disablesAnimations = true
    withTransaction(sinAnimacion) { binding.wrappedValue = CelebrationContent(title: title, message: message) }
}
