import SwiftUI

/// Seguimiento del pedido: pasos sobre una sola línea + estado en palabras.
/// Todos los círculos ocupan el mismo espacio (el actual se marca con un
/// halo, no con un tamaño mayor), así círculos, línea y textos quedan
/// alineados. Al aparecer, la línea se llena de verde y cada check entra
/// con un rebote al alcanzarlo (igual que Mis compras en Flutter).
struct OrderTrackingView: View {
    let tracking: OrderTracking
    var showsSteps = true

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if showsSteps && !tracking.steps.isEmpty {
                OrderStepsLine(steps: tracking.steps)
            }
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: tracking.symbol)
                    .foregroundStyle(tracking.color)
                    .font(.body.weight(.semibold))
                VStack(alignment: .leading, spacing: 2) {
                    Text(tracking.title)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(tracking.color)
                    if !tracking.message.isEmpty {
                        Text(tracking.message)
                            .font(.footnote)
                            .foregroundStyle(Brand.textoSecundario)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(RoundedRectangle(cornerRadius: 10).fill(tracking.color.opacity(0.08)))
        }
        .accessibilityElement(children: .combine)
    }
}

/// Una línea con el estado ("Listo para recoger", "En camino"…) para la lista.
struct OrderStatusLine: View {
    let tracking: OrderTracking

    var body: some View {
        Label {
            Text(tracking.title).font(.subheadline.weight(.semibold)).lineLimit(1)
        } icon: {
            Image(systemName: tracking.symbol)
        }
        .foregroundStyle(tracking.color)
    }
}

extension OrderTracking {
    var color: Color {
        switch tone {
        case .cancelled: return Brand.error
        case .waiting: return Brand.dorado
        case .done: return Brand.exito
        case .inProgress: return Brand.burdeos
        }
    }

    var symbol: String {
        switch tone {
        case .cancelled: return "xmark.circle"
        case .waiting: return "clock"
        case .done: return "checkmark.circle"
        case .inProgress:
            switch steps.first(where: \.current)?.key {
            case "en_camino": return "truck.box"
            case "listo_recojo": return "storefront"
            default: return "shippingbox"
            }
        }
    }
}

struct OrderStepsLine: View {
    let steps: [OrderTracking.Step]

    @State private var started = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let markerSize: CGFloat = 30
    private let lineTime = 0.78

    private var target: Double {
        let index = steps.lastIndex(where: \.done) ?? -1
        return steps.count > 1 && index > 0 ? Double(index) / Double(steps.count - 1) : 0
    }

    var body: some View {
        let shown = started || reduceMotion
        VStack(spacing: 8) {
            ZStack {
                GeometryReader { geo in
                    let margin = geo.size.width / CGFloat(2 * steps.count)
                    let length = geo.size.width - 2 * margin
                    ZStack(alignment: .leading) {
                        Capsule().fill(Brand.divisor)
                            .frame(width: length, height: 3)
                        Capsule().fill(Brand.exito)
                            .frame(width: length * (shown ? target : 0), height: 3)
                            .animation(reduceMotion ? nil : .easeInOut(duration: lineTime), value: shown)
                    }
                    .offset(x: margin, y: markerSize / 2 - 1.5)
                }
                HStack(spacing: 0) {
                    ForEach(Array(steps.enumerated()), id: \.element.id) { i, step in
                        stepMarker(step, index: i, shown: shown)
                            .frame(maxWidth: .infinity)
                    }
                }
            }
            .frame(height: markerSize)

            HStack(alignment: .top, spacing: 0) {
                ForEach(steps) { step in
                    Text(step.label)
                        .font(.caption2.weight(step.current ? .bold : .medium))
                        .foregroundStyle(step.done ? Brand.exito : Brand.textoSecundario)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .onAppear { started = true }
    }

    /// Momento en que la línea alcanza el paso `i`.
    private func arrival(_ i: Int) -> Double {
        guard target > 0, steps.count > 1 else { return 0 }
        return lineTime * (Double(i) / Double(steps.count - 1)) / target
    }

    private func stepMarker(_ step: OrderTracking.Step, index i: Int, shown: Bool) -> some View {
        ZStack {
            if step.current {
                Circle()
                    .fill(Brand.exito.opacity(0.18))
                    .frame(width: 30, height: 30)
                    .scaleEffect(shown ? 1 : 0.6)
                    .opacity(shown ? 1 : 0)
                    .animation(reduceMotion ? nil : .easeOut(duration: 0.35).delay(lineTime + 0.05), value: shown)
            }
            Circle()
                .fill(Brand.superficie)
                .overlay(Circle().stroke(step.done ? Brand.exito : Brand.textoTerciario, lineWidth: 2))
                .frame(width: 22, height: 22)
            if step.done {
                Circle()
                    .fill(Brand.exito)
                    .frame(width: 22, height: 22)
                    .overlay(Image(systemName: "checkmark").font(.system(size: 11, weight: .heavy)).foregroundStyle(.white))
                    .scaleEffect(shown ? 1 : 0.01)
                    .animation(
                        reduceMotion ? nil : .spring(response: 0.42, dampingFraction: 0.45).delay(arrival(i)),
                        value: shown
                    )
            }
        }
        .frame(width: markerSize, height: markerSize)
    }
}
