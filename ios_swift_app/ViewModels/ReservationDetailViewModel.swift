import Foundation
import Combine

enum ReservationDetailState: Equatable {
    case idle
    case loading
    case loaded
    case error(String)
}

@MainActor
final class ReservationDetailViewModel: ObservableObject {
    @Published private(set) var state: ReservationDetailState = .idle
    @Published private(set) var reservation: Reservation?

    let reservationID: Int

    private let service: any ReservationDetailServicing
    private var hasLoadedInitially = false
    private var isLoading = false

    init(
        reservationID: Int,
        service: any ReservationDetailServicing
    ) {
        self.reservationID = reservationID
        self.service = service
    }

    func loadInitial() async {
        guard !hasLoadedInitially else { return }
        await reload()
    }

    func reload() async {
        guard !isLoading else { return }
        isLoading = true
        hasLoadedInitially = true
        state = .loading
        defer { isLoading = false }

        do {
            reservation = try await service.reservation(id: reservationID)
            state = .loaded
        } catch {
            state = .error(ReservationErrorMessage.detail(error))
        }
    }
}
