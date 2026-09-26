import Foundation
import XCTest
@testable import LibreriaSecureApp

@MainActor
final class CartStoreTests: XCTestCase {
    private var defaults: UserDefaults!
    private var suiteName: String!

    override func setUp() {
        super.setUp()
        suiteName = "CartStoreTests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        defaults = nil
        super.tearDown()
    }

    private func book(id: Int = 1, price: Double = 40, stock: Int = 3) -> Book {
        Book(idLibro: id, titulo: "Libro \(id)", precio: price, stock: stock)
    }

    func testAddIsCappedByStock() {
        let cart = CartStore(defaults: defaults)
        cart.restore(for: 7)

        XCTAssertEqual(cart.add(book(stock: 3), quantity: 2), 2)
        XCTAssertEqual(cart.add(book(stock: 3), quantity: 5), 1)
        XCTAssertEqual(cart.add(book(stock: 3)), 0)
        XCTAssertEqual(cart.quantity(of: 1), 3)
        XCTAssertFalse(cart.increment(1))
    }

    func testTotalsAreInCentsWithoutFloatingError() {
        let cart = CartStore(defaults: defaults)
        cart.restore(for: 7)

        _ = cart.add(book(id: 1, price: 19.9, stock: 10), quantity: 3)
        _ = cart.add(book(id: 2, price: 40, stock: 10))

        XCTAssertEqual(cart.totalUnits, 4)
        XCTAssertEqual(cart.totalCents, 9_970)
        XCTAssertEqual(cart.total, 99.70, accuracy: 0.0001)
    }

    func testDecrementRemovesAtZero() {
        let cart = CartStore(defaults: defaults)
        cart.restore(for: 7)
        _ = cart.add(book(), quantity: 1)

        cart.decrement(1)

        XCTAssertTrue(cart.isEmpty)
    }

    func testSaveForLaterAndMoveBackRespectsStock() {
        let cart = CartStore(defaults: defaults)
        cart.restore(for: 7)
        _ = cart.add(book(stock: 2), quantity: 2)

        cart.saveForLater(1)
        XCTAssertTrue(cart.items.isEmpty)
        XCTAssertEqual(cart.saved.count, 1)

        _ = cart.add(book(stock: 2), quantity: 1)
        cart.moveToCart(1)

        XCTAssertEqual(cart.quantity(of: 1), 2)
        XCTAssertTrue(cart.saved.isEmpty)
    }

    func testCartIsRestoredOnlyForItsOwner() {
        let first = CartStore(defaults: defaults)
        first.restore(for: 7)
        _ = first.add(book(), quantity: 2)

        let sameUser = CartStore(defaults: defaults)
        sameUser.restore(for: 7)
        XCTAssertEqual(sameUser.quantity(of: 1), 2)

        let otherUser = CartStore(defaults: defaults)
        otherUser.restore(for: 8)
        XCTAssertTrue(otherUser.isEmpty)
    }

    func testClearAfterPaymentKeepsSavedItems() {
        let cart = CartStore(defaults: defaults)
        cart.restore(for: 7)
        _ = cart.add(book(id: 1), quantity: 1)
        _ = cart.add(book(id: 2), quantity: 1)
        cart.saveForLater(2)

        cart.clearAfterPayment()

        XCTAssertTrue(cart.items.isEmpty)
        XCTAssertEqual(cart.saved.map(\.id), [2])
    }
}
