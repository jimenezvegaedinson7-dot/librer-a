import SwiftUI

/// Libro "suelto": portada con aspecto de libro y, debajo y sin tarjeta,
/// título, autor y precio (Inicio y Favoritos, como en Flutter).
struct LooseBookView: View {
    let book: Book
    let width: CGFloat
    var accessory: AnyView?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
                BookCover(path: book.portada, width: width)
                    .opacity(book.isAvailable ? 1 : 0.55)
                    .overlay(alignment: .topLeading) {
                        if !book.isAvailable {
                            Text("Agotado")
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Capsule().fill(Brand.tinta.opacity(0.86)))
                                .padding(8)
                        }
                    }
                if let accessory {
                    accessory.padding(6)
                }
            }
            Text(book.displayTitle)
                .font(.serif(15))
                .foregroundStyle(Brand.texto)
                .lineLimit(2, reservesSpace: true)
                .padding(.top, 14)
            Text(book.displayAuthor)
                .font(.caption)
                .foregroundStyle(Brand.textoSecundario)
                .lineLimit(1)
                .padding(.top, 3)
            PriceText(amount: book.precio, size: 16)
                .padding(.top, 6)
        }
        .frame(width: width, alignment: .leading)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(book.displayTitle), de \(book.displayAuthor), \(Money.format(book.precio)) soles")
    }
}

/// Aviso breve en la parte inferior (equivalente al SnackBar de Flutter).
struct ToastMessage: Equatable, Identifiable {
    let id = UUID()
    let text: String
}

struct ToastModifier: ViewModifier {
    @Binding var toast: ToastMessage?

    func body(content: Content) -> some View {
        content.overlay(alignment: .bottom) {
            if let toast {
                Text(toast.text)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: 12).fill(Brand.tinta))
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .task(id: toast.id) {
                        try? await Task.sleep(nanoseconds: 2_200_000_000)
                        withAnimation { self.toast = nil }
                    }
                    .accessibilityAddTraits(.isStaticText)
            }
        }
        .animation(.easeOut(duration: 0.25), value: toast)
    }
}

extension View {
    func toast(_ toast: Binding<ToastMessage?>) -> some View {
        modifier(ToastModifier(toast: toast))
    }
}

/// Mensaje al agregar al carrito (mismo texto que Flutter).
enum CartMessages {
    static func added(_ added: Int, requested: Int, inCart: Int) -> String {
        if added == 0 {
            return "Ya tienes en tu carrito las \(inCart) unidades disponibles de este libro."
        }
        if added < requested {
            return "Solo se agregaron \(added): ya tienes las \(inCart) unidades disponibles."
        }
        return "\(added) \(added == 1 ? "ejemplar agregado" : "ejemplares agregados") · \(inCart) en tu carrito"
    }
}
