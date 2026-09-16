final class ProfileService {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func profile() async throws -> User {
        try await client.send(APIEndpoint<APIResponse<User>>.profile).data
    }
}
