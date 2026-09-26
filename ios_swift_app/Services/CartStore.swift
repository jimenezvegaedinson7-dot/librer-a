import Foundation
import Combine

/// Carrito de compras (misma lógica que la app Flutter).
///
/// - Nunca supera el stock de cada libro.
/// - Subtotales y total en céntimos: siempre exactos.
/// - Se guarda en el dispositivo junto con el id del usuario dueño y solo se
///   restaura para esa misma cuenta.
@MainActor
final class CartStore: ObservableObject {
    @Published private(set) var items: [CartItem] = []
    @Published private(set) var saved: [CartItem] = []

    private let defaults: UserDefaults
    private var ownerID: Int?
    private static let key = "carrito_v1"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    // MARK: Consultas

    var totalUnits: Int { items.reduce(0) { $0 + $1.quantity } }
    var totalCents: Int { items.reduce(0) { $0 + $1.subtotalCents } }
    var total: Double { Double(totalCents) / 100 }
    var isEmpty: Bool { items.isEmpty }

    func quantity(of bookID: Int) -> Int {
        items.first { $0.book.idLibro == bookID }?.quantity ?? 0
    }

    // MARK: Cambios

    /// Agrega unidades sin superar el stock. Devuelve cuántas se agregaron.
    @discardableResult
    func add(_ book: Book, quantity: Int = 1) -> Int {
        guard quantity > 0 else { return 0 }
        let current = self.quantity(of: book.idLibro)
        let addable = max(0, min(quantity, book.stock - current))
        guard addable > 0 else { return 0 }

        if let index = items.firstIndex(where: { $0.book.idLibro == book.idLibro }) {
            // Se guarda el libro recibido: trae precio y stock recientes.
            items[index] = CartItem(book: book, quantity: current + addable)
        } else {
            items.append(CartItem(book: book, quantity: addable))
        }
        persist()
        return addable
    }

    /// Suma 1 unidad. `false` si ya se alcanzó el stock.
    @discardableResult
    func increment(_ bookID: Int) -> Bool {
        guard let index = items.firstIndex(where: { $0.book.idLibro == bookID }) else { return false }
        guard items[index].quantity < items[index].book.stock else { return false }
        items[index].quantity += 1
        persist()
        return true
    }

    /// Resta 1 unidad; al llegar a 0 quita el libro.
    func decrement(_ bookID: Int) {
        guard let index = items.firstIndex(where: { $0.book.idLibro == bookID }) else { return }
        if items[index].quantity <= 1 {
            items.remove(at: index)
        } else {
            items[index].quantity -= 1
        }
        persist()
    }

    func remove(_ bookID: Int) {
        items.removeAll { $0.book.idLibro == bookID }
        persist()
    }

    func saveForLater(_ bookID: Int) {
        guard let index = items.firstIndex(where: { $0.book.idLibro == bookID }) else { return }
        saved.append(items.remove(at: index))
        persist()
    }

    /// Devuelve un libro guardado al carrito, respetando el stock.
    func moveToCart(_ bookID: Int) {
        guard let index = saved.firstIndex(where: { $0.book.idLibro == bookID }) else { return }
        let item = saved.remove(at: index)
        let stock = item.book.stock
        if let inCart = items.firstIndex(where: { $0.book.idLibro == bookID }) {
            items[inCart].quantity = min(stock, items[inCart].quantity + item.quantity)
        } else {
            items.append(CartItem(book: item.book, quantity: min(stock, item.quantity)))
        }
        items.removeAll { $0.quantity <= 0 }
        persist()
    }

    func removeSaved(_ bookID: Int) {
        saved.removeAll { $0.book.idLibro == bookID }
        persist()
    }

    /// Tras un pago confirmado: vacía el carrito y conserva los guardados.
    func clearAfterPayment() {
        items.removeAll()
        persist()
    }

    // MARK: Sesión

    /// Restaura el carrito guardado si pertenece a [userID].
    func restore(for userID: Int) {
        ownerID = userID
        guard let data = defaults.data(forKey: Self.key),
              let stored = try? JSONDecoder().decode(StoredCart.self, from: data),
              stored.owner == userID else {
            items = []
            saved = []
            return
        }
        items = stored.items.filter { $0.quantity > 0 }
        saved = stored.saved
    }

    /// Al iniciar o cerrar sesión: carrito y guardados vacíos.
    func clearSession() {
        items = []
        saved = []
        ownerID = nil
        defaults.removeObject(forKey: Self.key)
    }

    private func persist() {
        guard let ownerID, !(items.isEmpty && saved.isEmpty) else {
            defaults.removeObject(forKey: Self.key)
            return
        }
        let stored = StoredCart(owner: ownerID, items: items, saved: saved)
        if let data = try? JSONEncoder().encode(stored) {
            defaults.set(data, forKey: Self.key)
        }
    }

    private struct StoredCart: Codable {
        let owner: Int
        let items: [CartItem]
        let saved: [CartItem]
    }
}
