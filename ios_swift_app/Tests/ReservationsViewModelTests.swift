import Foundation
import XCTest
@testable import LibreriaSecureApp

@MainActor
final class ReservationsViewModelTests: XCTestCase {
    func testLoadsAndSortsReservationsWithNilDatesLastAndStable() async throws {
        let values = [
            try ReservationTestFixtures.reservation(id: 1, reservationDate: "2026-09-10T10:00:00Z"),
            try ReservationTestFixtures.reservation(id: 2, reservationDate: "2026-09-12T10:00:00Z"),
            try ReservationTestFixtures.reservation(id: 3, reservationDate: nil),
            try ReservationTestFixtures.reservation(id: 4, reservationDate: nil)
        ]
        let viewModel = ReservationsViewModel(
            service: ReservationListSequenceMock([.success(values)])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .loaded)
        XCTAssertEqual(viewModel.reservations.map(\.idReserva), [2, 1, 3, 4])
    }

    func testEmptyReservations() async {
        let viewModel = ReservationsViewModel(
            service: ReservationListSequenceMock([.success([])])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .empty)
        XCTAssertTrue(viewModel.reservations.isEmpty)
    }

    func testRefreshFailureKeepsPreviousReservations() async throws {
        let reservation = try ReservationTestFixtures.reservation(id: 8)
        let viewModel = ReservationsViewModel(
            service: ReservationListSequenceMock([
                .success([reservation]),
                .failure(APIError.server(statusCode: 503, message: nil))
            ])
        )

        await viewModel.loadInitial()
        await viewModel.refresh()

        XCTAssertEqual(viewModel.reservations.map(\.idReserva), [8])
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
        await assertListError(.server(statusCode: 503, message: nil), containing: "servidor")
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
        let viewModel = ReservationsViewModel(
            service: ReservationListSequenceMock([.failure(error)])
        )
        await viewModel.loadInitial()
        assertError(viewModel.state, containing: text)
    }

    private func assertError(
        _ state: ReservationsLoadState,
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

private actor ReservationListSequenceMock: ReservationServicing {
    private var results: [Result<[Reservation], Error>]

    init(_ results: [Result<[Reservation], Error>]) {
        self.results = results
    }

    func myReservations() async throws -> [Reservation] {
        guard !results.isEmpty else { return [] }
        return try results.removeFirst().get()
    }
}
