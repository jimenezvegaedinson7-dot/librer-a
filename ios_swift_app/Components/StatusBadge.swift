import SwiftUI

struct StatusBadge: View {
    let status: PresentedStatus

    var body: some View {
        Text(status.text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .foregroundStyle(foregroundColor)
            .background(backgroundColor, in: Capsule())
            .accessibilityLabel("Estado: \(status.text)")
    }

    private var foregroundColor: Color {
        switch status.tone {
        case .positive: return .green
        case .warning: return .orange
        case .negative: return .red
        case .neutral: return .secondary
        }
    }

    private var backgroundColor: Color {
        foregroundColor.opacity(0.12)
    }
}
