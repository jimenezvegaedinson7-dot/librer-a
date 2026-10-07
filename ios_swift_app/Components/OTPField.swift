import SwiftUI

/// Código de 6 dígitos con casillas, como `widgets/campo_otp.dart`:
/// una sola entrada invisible (permite pegar y el autocompletado de iOS
/// "De Mensajes/Mail"), cada dígito entra con un pequeño "pop", la casilla
/// activa muestra una barra, un código rechazado hace temblar las casillas
/// y uno aceptado las pone en verde.
struct OTPField: View {
    @Binding var code: String
    var enabled: Bool = true
    /// El código fue aceptado: las casillas pasan a verde.
    var success: Bool = false
    /// Cuenta de intentos rechazados: cada aumento hace temblar las casillas.
    var failures: Int = 0
    var onSubmit: (() -> Void)?

    @FocusState private var focused: Bool
    @State private var shake: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @ScaledMetric(relativeTo: .title2) private var boxHeight: CGFloat = 56

    private var digits: [Character] { Array(code) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Código de 6 dígitos")
                .font(.subheadline)
                .foregroundStyle(Brand.textoSecundario)
            ZStack {
                HStack(spacing: 8) {
                    ForEach(0..<6, id: \.self) { box($0) }
                }
                .modifier(ShakeEffect(animatableData: shake))
                .accessibilityHidden(true)

                TextField("Código de 6 dígitos", text: $code)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .focused($focused)
                    .disabled(!enabled)
                    .foregroundStyle(.clear)
                    .tint(.clear)
                    .opacity(0.02)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .accessibilityLabel("Código de 6 dígitos")
                    .onChange(of: code) { _, nuevo in
                        let limpio = String(nuevo.filter(\.isNumber).prefix(6))
                        if limpio != nuevo { code = limpio }
                        if limpio.count == 6 && nuevo.count == 6 { onSubmit?() }
                    }
                    .onSubmit { onSubmit?() }
            }
            .frame(height: boxHeight)
            .contentShape(Rectangle())
            .onTapGesture { if enabled { focused = true } }
        }
        .onAppear { if enabled { focused = true } }
        .onChange(of: failures) { _, _ in
            guard !reduceMotion else { return }
            withAnimation(.linear(duration: 0.42)) { shake += 1 }
        }
    }

    private func box(_ i: Int) -> some View {
        let filled = i < digits.count
        let active = focused && i == min(digits.count, 5) && !success
        let border: Color = success ? Brand.exito
            : failures > 0 && !filled ? Brand.error
            : active ? Brand.burdeos
            : filled ? Brand.burdeos.opacity(0.45)
            : Brand.divisor
        return ZStack {
            RoundedRectangle(cornerRadius: 14)
                .fill(success ? Brand.exito.opacity(0.12)
                      : filled ? Brand.pergamino.opacity(0.7)
                      : Brand.papel)
            RoundedRectangle(cornerRadius: 14)
                .stroke(border, lineWidth: active || success ? 2 : 1.2)
            if filled {
                Text(String(digits[i]))
                    .font(.title2.weight(.bold))
                    .foregroundStyle(success ? Brand.exito : Brand.texto)
                    .id("\(i)-\(digits[i])")
                    .transition(reduceMotion ? .identity : .scale(scale: 0.4).combined(with: .opacity))
            } else if active {
                Capsule()
                    .fill(Brand.burdeos)
                    .frame(width: 18, height: 2.5)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .padding(.bottom, 12)
            }
        }
        .animation(reduceMotion ? nil : .spring(response: 0.25, dampingFraction: 0.6), value: digits.count)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.18 + (success ? Double(i) * 0.04 : 0)), value: success)
    }
}

/// Temblor horizontal que se apaga solo (cada aumento de 1 es un temblor).
struct ShakeEffect: GeometryEffect {
    var animatableData: CGFloat

    func effectValue(size: CGSize) -> ProjectionTransform {
        let avance = animatableData - floor(animatableData)
        let x = sin(avance * .pi * 6) * 9 * (1 - avance)
        return ProjectionTransform(CGAffineTransform(translationX: x, y: 0))
    }
}
