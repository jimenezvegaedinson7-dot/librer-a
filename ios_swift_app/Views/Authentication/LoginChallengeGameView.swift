import SwiftUI
import Foundation

/// Minijuego de memoria que se muestra tras varios intentos fallidos de inicio de sesión.
/// El usuario debe completarlo al menos una vez para volver a intentar.
struct LoginChallengeGameView: View {
    let onCompleted: () -> Void

    @State private var cards: [MemoryCard] = MemoryCard.deck()
    @State private var firstSelection: Int?
    @State private var secondSelection: Int?
    @State private var isEvaluating = false
    @State private var moves = 0
    @State private var matchedPairs = 0
    @State private var completed = false
    @State private var startedAt = Date()

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 4)

    var body: some View {
        VStack(spacing: 18) {
            VStack(spacing: 6) {
                Text("Pausa de seguridad")
                    .font(.caption.weight(.bold))
                    .kerning(1.2)
                    .foregroundStyle(Brand.acento)
                Text("Ordena la estantería")
                    .font(.serif(28))
                    .foregroundStyle(Brand.texto)
                Text("Detectamos varios intentos fallidos. Encuentra los pares de libros para continuar.")
                    .font(.subheadline)
                    .foregroundStyle(Brand.textoSecundario)
                    .multilineTextAlignment(.center)
            }

            HStack(spacing: 12) {
                statChip(title: "Pares", value: "\(matchedPairs)/\(MemoryCard.pairCount)")
                statChip(title: "Movimientos", value: "\(moves)")
                statChip(title: "Tiempo", value: elapsedText)
            }

            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(cards.indices, id: \.self) { index in
                    MemoryCardView(card: cards[index]) {
                        select(index)
                    }
                    .disabled(completed || isEvaluating || cards[index].isMatched || cards[index].isFaceUp)
                }
            }
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 18).fill(Brand.superficie))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Brand.divisor))

            if completed {
                VStack(spacing: 10) {
                    Label("Estantería ordenada", systemImage: "checkmark.seal.fill")
                        .font(.headline)
                        .foregroundStyle(Brand.exito)
                    Text("Completaste el juego en \(moves) movimientos. Ya puedes volver a intentar iniciar sesión.")
                        .font(.footnote)
                        .foregroundStyle(Brand.textoSecundario)
                        .multilineTextAlignment(.center)
                    Button("Continuar", action: onCompleted)
                        .buttonStyle(BrandButtonStyle())
                }
                .padding(.top, 4)
            } else {
                Button("Reiniciar juego") {
                    resetGame()
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Brand.burdeos)
            }
        }
        .padding(20)
        .background(Brand.fondo.ignoresSafeArea())
    }

    private var elapsedText: String {
        let seconds = max(0, Int(Date().timeIntervalSince(startedAt)))
        return String(format: "%d:%02d", seconds / 60, seconds % 60)
    }

    private func statChip(title: String, value: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(Brand.texto)
            Text(title)
                .font(.caption2)
                .foregroundStyle(Brand.textoSecundario)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(RoundedRectangle(cornerRadius: 12).fill(Brand.superficie))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Brand.divisor))
    }

    private func select(_ index: Int) {
        guard !completed, !isEvaluating else { return }
        guard cards.indices.contains(index) else { return }
        guard !cards[index].isMatched, !cards[index].isFaceUp else { return }

        cards[index].isFaceUp = true

        guard let first = firstSelection else {
            firstSelection = index
            return
        }

        guard first != index else { return }
        secondSelection = index
        moves += 1
        isEvaluating = true

        if cards[first].symbol == cards[index].symbol {
            cards[first].isMatched = true
            cards[index].isMatched = true
            matchedPairs += 1
            clearSelection()
            if matchedPairs == MemoryCard.pairCount {
                completed = true
            }
        } else {
            let firstIndex = first
            let secondIndex = index
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.75) {
                if cards.indices.contains(firstIndex) { cards[firstIndex].isFaceUp = false }
                if cards.indices.contains(secondIndex) { cards[secondIndex].isFaceUp = false }
                clearSelection()
            }
        }
    }

    private func clearSelection() {
        firstSelection = nil
        secondSelection = nil
        isEvaluating = false
    }

    private func resetGame() {
        cards = MemoryCard.deck()
        firstSelection = nil
        secondSelection = nil
        isEvaluating = false
        moves = 0
        matchedPairs = 0
        completed = false
        startedAt = Date()
    }
}

private struct MemoryCard: Identifiable {
    let id = UUID()
    let symbol: String
    var isFaceUp = false
    var isMatched = false

    static let symbols = [
        "book.closed.fill",
        "books.vertical.fill",
        "bookmark.fill",
        "text.book.closed.fill",
        "graduationcap.fill",
        "magazine.fill"
    ]

    static let pairCount = symbols.count

    static func deck() -> [MemoryCard] {
        let pairs = symbols.flatMap { [MemoryCard(symbol: $0), MemoryCard(symbol: $0)] }
        return pairs.shuffled()
    }
}

private struct MemoryCardView: View {
    let card: MemoryCard
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(background)
                RoundedRectangle(cornerRadius: 14)
                    .stroke(border, lineWidth: 1)

                if card.isFaceUp || card.isMatched {
                    Image(systemName: card.symbol)
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(card.isMatched ? Brand.exito : Brand.burdeos)
                } else {
                    Image(systemName: "questionmark")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(Brand.dorado)
                }
            }
            .frame(height: 74)
            .opacity(card.isMatched ? 0.85 : 1)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(card.isFaceUp || card.isMatched ? "Carta revelada" : "Carta oculta")
    }

    private var background: Color {
        if card.isMatched { return Brand.exito.opacity(0.10) }
        if card.isFaceUp { return Brand.pergamino }
        return Brand.superficie
    }

    private var border: Color {
        if card.isMatched { return Brand.exito.opacity(0.35) }
        if card.isFaceUp { return Brand.dorado.opacity(0.55) }
        return Brand.divisor
    }
}
