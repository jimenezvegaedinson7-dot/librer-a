import Foundation
import Combine

enum ReservationsLoadState: Equatable {
    case idle
    case loading
    case loaded
    case empty
    case error(String)
}

@MainActor
final class ReservationsViewModel: ObservableObject {
    @Published private(set) var state: ReservationsLoadState = .idle
    @Published private(set) var reservations: [Reservation] = []

    private let service: any ReservationServicing
    private var hasLoadedInitially = false
    private var isLoading = false

    init(service: any ReservationServicing) {
        self.service = service
    }

    func loadInitial() async {
        guard !hasLoadedInitially else { return }
        await load()
    }

    func refresh() async {
        await load()
    }

    private func load() async {
        guard !isLoading else { return }
        isLoading = true
        hasLoadedInitially = true
        state = .loading
        defer { isLoading = false }

        do {
            let values = try await service.myReservations()
            reservations = StableDateSorting.descending(values, date: \.fechaReserva)
            state = reservations.isEmpty ? .empty : .loaded
        } catch {
            state = .error(PurchaseErrorMessage.listing(error))
        }
    }
}