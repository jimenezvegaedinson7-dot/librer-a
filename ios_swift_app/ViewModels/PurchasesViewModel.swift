import Foundation
import Combine

enum PurchasesLoadState: Equatable {
    case idle
    case loading
    case loaded
    case empty
    case error(String)
}

@MainActor
final class PurchasesViewModel: ObservableObject {
    @Published private(set) var state: PurchasesLoadState = .idle
    @Published private(set) var purchases: [Purchase] = []

    private let service: any PurchaseServicing
    private var hasLoadedInitially = false
    private var isLoading = false

    init(service: any PurchaseServicing) {
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
            let values = try await service.myPurchases()
            purchases = StableDateSorting.descending(values, date: \.fechaVenta)
            state = purchases.isEmpty ? .empty : .loaded
        } catch {
            state = .error(PurchaseErrorMessage.listing(error))
        }
    }
}
