import Foundation
import Combine

enum HomeLoadState: Equatable {
    case idle
    case loading
    case loaded
    case empty
    case partialFailure
    case error(String)
}

enum HomeSectionState: Equatable {
    case idle
    case loading
    case loaded
    case empty
    case error(String)
}

enum HomeSection: Hashable {
    case purchases
    case reservations
    case activity
}

@MainActor
final class HomeViewModel: ObservableObject {
    @Published private(set) var loadState: HomeLoadState = .idle
    @Published private(set) var purchaseState: HomeSectionState = .idle
    @Published private(set) var reservationState: HomeSectionState = .idle
    @Published private(set) var activityState: HomeSectionState = .idle
    @Published private(set) var purchases: [Purchase] = []
    @Published private(set) var reservations: [Reservation] = []
    @Published private(set) var activities: [Activity] = []

    private let activityService: any ActivityServicing
    private let purchaseService: any PurchaseServicing
    private let reservationService: any ReservationServicing
    private var hasLoadedInitially = false
    private var isLoadingAll = false
    private var retryingSections: Set<HomeSection> = []

    init(
        activityService: any ActivityServicing,
        purchaseService: any PurchaseServicing,
        reservationService: any ReservationServicing
    ) {
        self.activityService = activityService
        self.purchaseService = purchaseService
        self.reservationService = reservationService
    }

    var totalPurchases: Int { purchases.count }
    var totalReservations: Int { reservations.count }
    var totalActivities: Int { activities.count }

    var recentPurchases: [Purchase] { Array(purchases.prefix(3)) }
    var recentReservations: [Reservation] { Array(reservations.prefix(3)) }
    var recentActivities: [Activity] { Array(activities.prefix(3)) }

    func loadInitial() async {
        guard !hasLoadedInitially else { return }
        await loadAll()
    }

    func refresh() async {
        await loadAll()
    }

    func retry(_ section: HomeSection) async {
        guard !isLoadingAll, !retryingSections.contains(section) else { return }
        retryingSections.insert(section)
        defer { retryingSections.remove(section) }

        switch section {
        case .purchases:
            purchaseState = .loading
            applyPurchases(await loadPurchases())
        case .reservations:
            reservationState = .loading
            applyReservations(await loadReservations())
        case .activity:
            activityState = .loading
            applyActivities(await loadActivities())
        }
        updateOverallState()
    }

    private func loadAll() async {
        guard !isLoadingAll, retryingSections.isEmpty else { return }
        isLoadingAll = true
        hasLoadedInitially = true
        loadState = .loading
        purchaseState = .loading
        reservationState = .loading
        activityState = .loading
        defer { isLoadingAll = false }

        async let purchaseResult = loadPurchases()
        async let reservationResult = loadReservations()
        async let activityResult = loadActivities()

        let results = await (purchaseResult, reservationResult, activityResult)
        applyPurchases(results.0)
        applyReservations(results.1)
        applyActivities(results.2)
        updateOverallState()
    }

    private func loadPurchases() async -> Result<[Purchase], Error> {
        do { return .success(try await purchaseService.myPurchases()) }
        catch { return .failure(error) }
    }

    private func loadReservations() async -> Result<[Reservation], Error> {
        do { return .success(try await reservationService.myReservations()) }
        catch { return .failure(error) }
    }

    private func loadActivities() async -> Result<[Activity], Error> {
        do { return .success(try await activityService.myActivity()) }
        catch { return .failure(error) }
    }

    private func applyPurchases(_ result: Result<[Purchase], Error>) {
        switch result {
        case .success(let values):
            purchases = StableDateSorting.descending(values, date: \.fechaVenta)
            purchaseState = purchases.isEmpty ? .empty : .loaded
        case .failure(let error):
            purchaseState = .error(error.localizedDescription)
        }
    }

    private func applyReservations(_ result: Result<[Reservation], Error>) {
        switch result {
        case .success(let values):
            reservations = StableDateSorting.descending(values, date: \.fechaReserva)
            reservationState = reservations.isEmpty ? .empty : .loaded
        case .failure(let error):
            reservationState = .error(error.localizedDescription)
        }
    }

    private func applyActivities(_ result: Result<[Activity], Error>) {
        switch result {
        case .success(let values):
            activities = StableDateSorting.descending(values, date: \.fechaRegistro)
            activityState = activities.isEmpty ? .empty : .loaded
        case .failure(let error):
            activityState = .error(error.localizedDescription)
        }
    }

    private func updateOverallState() {
        let states = [purchaseState, reservationState, activityState]
        let errorMessages = states.compactMap { state -> String? in
            guard case .error(let message) = state else { return nil }
            return message
        }

        if errorMessages.count == states.count {
            loadState = .error(errorMessages.first ?? "No se pudo cargar el inicio.")
        } else if !errorMessages.isEmpty {
            loadState = .partialFailure
        } else if states.allSatisfy({ $0 == .empty }) {
            loadState = .empty
        } else {
            loadState = .loaded
        }
    }
}
