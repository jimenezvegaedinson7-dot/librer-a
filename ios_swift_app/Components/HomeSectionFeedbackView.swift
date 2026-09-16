import SwiftUI

struct HomeSectionFeedbackView: View {
    let message: String
    let systemImage: String
    let retryAction: (() -> Void)?

    init(
        message: String,
        systemImage: String,
        retryAction: (() -> Void)? = nil
    ) {
        self.message = message
        self.systemImage = systemImage
        self.retryAction = retryAction
    }

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.title2)
                .foregroundStyle(.secondary)
                .accessibilityHidden(true)
            Text(message)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            if let retryAction {
                Button("Reintentar", action: retryAction)
                    .buttonStyle(.bordered)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
}
