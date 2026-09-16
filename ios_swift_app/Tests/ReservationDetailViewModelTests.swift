import Foundation
import XCTest
@testable import LibreriaSecureApp

@MainActor
final class ReservationDetailViewModelTests: XCTestCase {
    func testLoadsReservationDetailUsingOwnReservationID() async throws {
        let reservation = try ReservationTestFixtures.reservation(id: 42)
        let service = ReservationDetailSequenceMock([.success(reservation)])
        let viewModel = ReservationDetailViewModel(
            reservationID: reservation.idReserva,
            service: service
        )

        await viewModel.loadInitial()
        let requestedIDs = await service.requestedIDs()

        XCTAssertEqual(viewModel.state, .loaded)
        XCTAssertEqual(viewModel.reservation?.idReserva, 42)
        XCTAssertEqual(requestedIDs, [42])
    }

    func testKnownAndUnknownStatusesArePresentedSafely() {
        let expected: [(String, String, PresentationTone)] = [
            ("pendiente", "Pendiente", .warning),
            ("CONFIRMADA", "Confirmada", .positive),
            ("completada", "Completada", .positive),
            ("Cancelada", "Cancelada", .negative),
            ("NUEVO_ESTADO", "NUEVO_ESTADO", .neutral)
        ]

        for (raw, text, tone) in expected {
            let presentation = ReservationPresentation.status(raw)
            XCTAssertEqual(presentation.text, text)
            XCTAssertEqual(presentation.rawValue, raw)
            XCTAssertEqual(presentation.tone, tone)
        }
    }

    func testPastFutureAndNilExpirationUseCalendarDayWithoutChangingStatus() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(secondsFromGMT: 0))
        let today = try XCTUnwrap(
            calendar.date(from: DateComponents(year: 2026, month: 9, day: 15, hour: 12))
        )
        let past = try XCTUnwrap(
            calendar.date(from: DateComponents(year: 2026, month: 9, day: 14, hour: 23))
        )
        let future = try XCTUnwrap(
            calendar.date(from: DateComponents(year: 2026, month: 9, day: 16))
        )

        XCTAssertTrue(
            ReservationPresentation.isExpired(
                expirationDate: past,
                relativeTo: today,
                calendar: calendar
            )
        )
        XCTAssertFalse(
            ReservationPresentation.isExpired(
                expirationDate: future,
                relativeTo: today,
                calendar: calendar
            )
        )
        XCTAssertFalse(
            ReservationPresentation.isExpired(
                expirationDate: today,
                relativeTo: today,
                calendar: calendar
            )
        )
        XCTAssertFalse(
            ReservationPresentation.isExpired(
                expirationDate: nil,
                relativeTo: today,
                calendar: calendar
            )
        )
        XCTAssertEqual(ReservationPresentation.status("confirmada").text, "Confirmada")
    }

    func testReloadFailureKeepsPreviousDetailVisible() async throws {
        let reservation = try ReservationTestFixtures.reservation(id: 9)
        let service = ReservationDetailSequenceMock([
            .success(reservation),
            .failure(APIError.server(statusCode: 503, message: nil))
        ])
        let viewModel = ReservationDetailViewModel(reservationID: 9, service: service)

        await viewModel.loadInitial()
        await viewModel.reload()

        XCTAssertEqual(viewModel.reservation?.idReserva, 9)
        guard case .error = viewModel.state else {
            return XCTFail("Se esperaba error conservando el detalle anterior.")
        }
    }

    func testDetailErrorsFor401403404429ServerAndConnectivity() async {
        let errors: [APIError] = [
            .unauthorized("Sesión expirada"),
            .forbidden(nil),
            .notFound(nil),
            .rateLimited(nil),
            .server(statusCode: 503, message: nil),
            .connectivity(URLError(.notConnectedToInternet))
        ]

        for error in errors {
            let viewModel = ReservationDetailViewModel(
                reservationID: 1,
                service: ReservationDetailSequenceMock([.failure(error)])
            )
            await viewModel.loadInitial()
            guard case .error = viewModel.state else {
                return XCTFail("Se esperaba error de detalle para \(error).")
            }
            XCTAssertNil(viewModel.reservation)
        }
    }

    func testNotFoundMessageIsSpecific() async {
        let viewModel = ReservationDetailViewModel(
            reservationID: 1,
            service: ReservationDetailSequenceMock([.failure(APIError.notFound(nil))])
        )

        await viewModel.loadInitial()

        XCTAssertEqual(viewModel.state, .error("La reserva no fue encontrada."))
    }
}

private actor ReservationDetailSequenceMock: ReservationDetailServicing {
    private var results: [Result<Reservation, Error>]
    private var receivedIDs: [Int] = []

    init(_ results: [Result<Reservation, Error>]) {
        self.results = results
    }

    func reservation(id: Int) async throws -> Reservation {
        receivedIDs.append(id)
        guard !results.isEmpty else {
            throw APIError.notFound(nil)
        }
        return try results.removeFirst().get()
    }

    func requestedIDs() -> [Int] {
        receivedIDs
    }
}
