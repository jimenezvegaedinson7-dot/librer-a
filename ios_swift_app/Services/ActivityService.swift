final class ActivityService {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func myActivity() async throws -> [Activity] {
        try await client.send(APIEndpoint<APIResponse<[Activity]>>.myActivity).data
    }
}
