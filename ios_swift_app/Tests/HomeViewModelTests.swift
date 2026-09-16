import Foundation
import XCTest
@testable import LibreriaSecureApp

@MainActor
final class HomeViewModelTests: XCTestCase {
    func testGreetingUsesLocalCalendarHour() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(secondsFromGMT: 0))

        let morning = try XCTUnwrap(
            calendar.date(from: DateComponents(year: 2026, month: 9, day: 15, hour: 8))
        )
        let afternoon = try XCTUnwrap(
            calendar.date(from: DateComponents(year: 2026, month: 9, day: 15, hour: 15))
        )
        let evening = try XCTUnwrap(
            calendar.date(from: DateComponents(year: 2026, month: 9, day: 15, hour: 21))
        )

        XCTAssertEqual(HomeGreeting.text(for: morning, calendar: calendar), "Buenos días")
        XCTAssertEqual(HomeGreeting.text(for: afternoon, calendar: calendar), "Buenas tardes")
        XCTAssertEqual(HomeGreeting.text(for: evening, calendar: calendar), "Buenas noches")
    }

    func testThreeSourcesLoadSuccessfully() async throws {
        let viewModel = makeViewModel(
            purchases: .success([try purchase(id: 1, date: "2026-09-10T10:00:00Z")]),
            reservations: .success([try reservation(id: 1, date: "2026-09-11T10:00:00Z")]),
            activities: .success([try activity(id: 1, date: "2026-09-12T10:00:00Z")])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.loadState, .loaded)
        XCTAssertEqual(viewModel.totalPurchases, 1)
        XCTAssertEqual(viewModel.totalReservations, 1)
        XCTAssertEqual(viewModel.totalActivities, 1)
    }

    func testPurchasesCanBeEmptyWithoutHidingOtherSections() async throws {
        let viewModel = makeViewModel(
            purchases: .success([]),
            reservations: .success([try reservation(id: 1, date: nil)]),
            activities: .success([try activity(id: 1, date: nil)])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.purchaseState, .empty)
        XCTAssertEqual(viewModel.reservationState, .loaded)
        XCTAssertEqual(viewModel.activityState, .loaded)
        XCTAssertEqual(viewModel.loadState, .loaded)
    }

    func testReservationsCanBeEmptyWithoutHidingOtherSections() async throws {
        let viewModel = makeViewModel(
            purchases: .success([try purchase(id: 1, date: nil)]),
            reservations: .success([]),
            activities: .success([try activity(id: 1, date: nil)])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.purchaseState, .loaded)
        XCTAssertEqual(viewModel.reservationState, .empty)
        XCTAssertEqual(viewModel.activityState, .loaded)
    }

    func testActivityCanBeEmptyWithoutHidingOtherSections() async throws {
        let viewModel = makeViewModel(
            purchases: .success([try purchase(id: 1, date: nil)]),
            reservations: .success([try reservation(id: 1, date: nil)]),
            activities: .success([])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.purchaseState, .loaded)
        XCTAssertEqual(viewModel.reservationState, .loaded)
        XCTAssertEqual(viewModel.activityState, .empty)
    }

    func testAllEmptyProducesGlobalEmptyState() async {
        let viewModel = makeViewModel(
            purchases: .success([]),
            reservations: .success([]),
            activities: .success([])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.loadState, .empty)
        XCTAssertEqual(viewModel.totalPurchases, 0)
        XCTAssertEqual(viewModel.totalReservations, 0)
        XCTAssertEqual(viewModel.totalActivities, 0)
    }

    func testPartialFailureKeepsSuccessfulData() async throws {
        let viewModel = makeViewModel(
            purchases: .failure(APIError.server(statusCode: 503, message: "Temporal")),
            reservations: .success([try reservation(id: 1, date: nil)]),
            activities: .success([try activity(id: 1, date: nil)])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.loadState, .partialFailure)
        XCTAssertEqual(viewModel.totalReservations, 1)
        XCTAssertEqual(viewModel.totalActivities, 1)
        assertError(viewModel.purchaseState)
    }

    func testTotalFailureProducesGlobalError() async {
        let viewModel = makeViewModel(
            purchases: .failure(APIError.server(statusCode: 503, message: nil)),
            reservations: .failure(APIError.server(statusCode: 503, message: nil)),
            activities: .failure(APIError.server(statusCode: 503, message: nil))
        )

        await viewModel.loadInitial()

        guard case .error = viewModel.loadState else {
            return XCTFail("Se esperaba un error global.")
        }
    }

    func testUnauthorizedIsReflectedWithoutManagingSessionLocally() async throws {
        let viewModel = makeViewModel(
            purchases: .failure(APIError.unauthorized("Sesión expirada")),
            reservations: .success([try reservation(id: 1, date: nil)]),
            activities: .success([try activity(id: 1, date: nil)])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.loadState, .partialFailure)
        assertError(viewModel.purchaseState, containing: "Sesión expirada")
    }

    func testRateLimitIsRecoverableAtSectionLevel() async throws {
        let viewModel = makeViewModel(
            purchases: .failure(APIError.rateLimited("Intenta nuevamente más tarde")),
            reservations: .success([try reservation(id: 1, date: nil)]),
            activities: .success([try activity(id: 1, date: nil)])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.loadState, .partialFailure)
        assertError(viewModel.purchaseState, containing: "Intenta nuevamente")
    }

    func testConnectivityFailureDoesNotHideSuccessfulSections() async throws {
        let viewModel = makeViewModel(
            purchases: .failure(APIError.connectivity(URLError(.notConnectedToInternet))),
            reservations: .success([try reservation(id: 1, date: nil)]),
            activities: .success([try activity(id: 1, date: nil)])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.loadState, .partialFailure)
        assertError(viewModel.purchaseState)
        XCTAssertEqual(viewModel.totalReservations, 1)
        XCTAssertEqual(viewModel.totalActivities, 1)
    }

    func testDatesSortDescendingNilDatesStayStableAndRecentListsAreLimited() async throws {
        let purchases = [
            try purchase(id: 1, date: "2026-09-10T10:00:00Z"),
            try purchase(id: 2, date: "2026-09-12T10:00:00Z"),
            try purchase(id: 3, date: nil),
            try purchase(id: 4, date: nil)
        ]
        let reservations = [
            try reservation(id: 1, date: "2026-09-09T10:00:00Z"),
            try reservation(id: 2, date: "2026-09-13T10:00:00Z"),
            try reservation(id: 3, date: nil),
            try reservation(id: 4, date: nil)
        ]
        let activities = [
            try activity(id: 1, date: "2026-09-08T10:00:00Z"),
            try activity(id: 2, date: "2026-09-14T10:00:00Z"),
            try activity(id: 3, date: nil),
            try activity(id: 4, date: nil)
        ]
        let viewModel = makeViewModel(
            purchases: .success(purchases),
            reservations: .success(reservations),
            activities: .success(activities)
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.purchases.map(\.idVenta), [2, 1, 3, 4])
        XCTAssertEqual(viewModel.reservations.map(\.idReserva), [2, 1, 3, 4])
        XCTAssertEqual(viewModel.activities.map(\.idHistorial), [2, 1, 3, 4])
        XCTAssertEqual(viewModel.totalPurchases, 4)
        XCTAssertEqual(viewModel.totalReservations, 4)
        XCTAssertEqual(viewModel.totalActivities, 4)
        XCTAssertEqual(viewModel.recentPurchases.count, 3)
        XCTAssertEqual(viewModel.recentReservations.count, 3)
        XCTAssertEqual(viewModel.recentActivities.count, 3)
    }

    private func makeViewModel(
        purchases: Result<[Purchase], Error>,
        reservations: Result<[Reservation], Error>,
        activities: Result<[Activity], Error>
    ) -> HomeViewModel {
        HomeViewModel(
            activityService: MockActivityService(result: activities),
            purchaseService: MockPurchaseService(result: purchases),
            reservationService: MockReservationService(result: reservations)
        )
    }

    private func assertError(
        _ state: HomeSectionState,
        containing expectedText: String? = nil,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        guard case .error(let message) = state else {
            return XCTFail("Se esperaba error de sección.", file: file, line: line)
        }
        if let expectedText {
            XCTAssertTrue(message.contains(expectedText), file: file, line: line)
        }
    }

    private func purchase(id: Int, date: String?) throws -> Purchase {
        let dateValue = date.map { "\"\($0)\"" } ?? "null"
        let json = """
        {
            "id_venta": \(id),
            "id_usuario": 7,
            "fecha_venta": \(dateValue),
            "total": "65.00",
            "estado": "confirmada",
            "payu_payment_status": "approved"
        }
        """
        return try JSONDecoder().decode(Purchase.self, from: Data(json.utf8))
    }

    private func reservation(id: Int, date: String?) throws -> Reservation {
        let dateValue = date.map { "\"\($0)\"" } ?? "null"
        let json = """
        {
            "id_reserva": \(id),
            "id_usuario": 7,
            "id_libro": \(100 + id),
            "titulo": "Libro \(id)",
            "cantidad": 1,
            "fecha_reserva": \(dateValue),
            "fecha_vencimiento": null,
            "estado": "activa"
        }
        """
        return try JSONDecoder().decode(Reservation.self, from: Data(json.utf8))
    }

    private func activity(id: Int, date: String?) throws -> Activity {
        let dateValue = date.map { "\"\($0)\"" } ?? "null"
        let json = """
        {
            "id_historial": \(id),
            "id_usuario": 7,
            "tipo_operacion": "consulta",
            "modulo": "perfil",
            "descripcion": "Actividad \(id)",
            "fecha_registro": \(dateValue)
        }
        """
        return try JSONDecoder().decode(Activity.self, from: Data(json.utf8))
    }
}

private struct MockPurchaseService: PurchaseServicing {
    let result: Result<[Purchase], Error>

    func myPurchases() async throws -> [Purchase] {
        try result.get()
    }
}

private struct MockReservationService: ReservationServicing {
    let result: Result<[Reservation], Error>

    func myReservations() async throws -> [Reservation] {
        try result.get()
    }
}

private struct MockActivityService: ActivityServicing {
    let result: Result<[Activity], Error>

    func myActivity() async throws -> [Activity] {
        try result.get()
    }
}
