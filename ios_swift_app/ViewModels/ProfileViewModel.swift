import Foundation
import Combine

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var state: ProfileState = .idle
    @Published var user: User?
    @Published var isRefreshing = false

    private let profileService: ProfileService
    private var cancellables = Set<AnyCancellable>()

    init(profileService: ProfileService = ProfileService(client: APIClient())) {
        self.profileService = profileService
    }

    func loadInitial() async {
        guard case .idle = state else { return }
        state = .loading
        await loadUser()
    }

    func refresh() async {
        isRefreshing = true
        await loadUser()
        isRefreshing = false
    }

    private func loadUser() async {
        do {
            let user = try await profileService.profile()
            self.user = user
            state = .loaded
        } catch {
            state = .error(error.localizedDescription)
        }
    }
}

enum ProfileState {
    case idle
    case loading
    case loaded
    case error(String)
}