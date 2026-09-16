import Foundation
import XCTest
@testable import LibreriaSecureApp

@MainActor
final class PurchasesViewModelTests: XCTestCase {
    func testLoadsAndSortsPurchasesWithNilDatesLastAndStable() async throws {
        let values = [
            try PurchaseTestFixtures.purchase(id: 1, date: "2026-09-10T10:00:00Z"),
            try PurchaseTestFixtures.purchase(id: 2, date: "2026-09-12T10:00:00Z"),
            try PurchaseTestFixtures.purchase(id: 3, date: nil),
            try PurchaseTestFixtures.purchase(id: 4, date: nil)
        ]
        let service = PurchaseListSequenceMock([.success(values)])
        let viewModel = PurchasesViewModel(service: service)

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .loaded)
        XCTAssertEqual(viewModel.purchases.map(\.idVenta), [2, 1, 3, 4])
    }

    func testEmptyPurchases() async {
        let viewModel = PurchasesViewModel(
            service: PurchaseListSequenceMock([.success([])])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .empty)
        XCTAssertTrue(viewModel.purchases.isEmpty)
    }

    func testRefreshFailureKeepsPreviouslyLoadedPurchases() async throws {
        let purchase = try PurchaseTestFixtures.purchase(id: 8)
        let service = PurchaseListSequenceMock([
            .success([purchase]),
            .failure(APIError.server(statusCode: 503, message: nil))
        ])
        let viewModel = PurchasesViewModel(service: service)

        await viewModel.loadInitial()
        await viewModel.refresh()

        XCTAssertEqual(viewModel.purchases.map(\.idVenta), [8])
        assertError(viewModel.state)
    }

    func testUnauthorizedError() async {
        await assertListError(.unauthorized("Sesión expirada"))
    }

    func testForbiddenError() async {
        await assertListError(.forbidden(nil), containing: "autorización")
    }

    func testNotFoundError() async {
        await assertListError(.notFound(nil), containing: "encontrar")
    }

    func testRateLimitError() async {
        await assertListError(.rateLimited(nil), containing: "demasiadas")
    }

    func testServerError() async {
        await assertListError(.server(statusCode: 500, message: nil), containing: "servidor")
    }

    func testConnectivityError() async {
        await assertListError(
            .connectivity(URLError(.notConnectedToInternet)),
            containing: "conexión"
        )
    }

    private func assertListError(
        _ error: APIError,
        containing text: String? = nil
    ) async {
        let viewModel = PurchasesViewModel(
            service: PurchaseListSequenceMock([.failure(error)])
        )
        await viewModel.loadInitial()
        assertError(viewModel.state, containing: text)
    }

    private func assertError(
        _ state: PurchasesLoadState,
        containing text: String? = nil,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        guard case .error(let message) = state else {
            return XCTFail("Se esperaba estado de error.", file: file, line: line)
        }
        if let text {
            XCTAssertTrue(message.localizedCaseInsensitiveContains(text), file: file, line: line)
        }
    }
}

private actor PurchaseListSequenceMock: PurchaseServicing {
    private var results: [Result<[Purchase], Error>]

    init(_ results: [Result<[Purchase], Error>]) {
        self.results = results
    }

    func myPurchases() async throws -> [Purchase] {
        guard !results.isEmpty else { return [] }
        return try results.removeFirst().get()
    }
}
