import SwiftUI

struct HomeSectionCard<Content: View>: View {
    let title: String
    let systemImage: String
    let onSeeAll: (() -> Void)?
    let content: Content

    init(
        title: String,
        systemImage: String,
        onSeeAll: (() -> Void)? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.systemImage = systemImage
        self.onSeeAll = onSeeAll
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label(title, systemImage: systemImage)
                    .font(.headline)
                Spacer()
                if let onSeeAll {
                    Button("Ver todas", action: onSeeAll)
                        .font(.subheadline)
                        .accessibilityLabel("Ver todas las \(title.lowercased())")
                }
            }

            content
        }
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(.quaternary, lineWidth: 1)
        }
    }
}
