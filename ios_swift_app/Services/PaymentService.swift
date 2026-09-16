import Foundation

final class PaymentService {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func status(orderID: String) async throws -> PaymentStatus {
        let normalized = orderID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalized.isEmpty else {
            throw APIError.invalidRequest("El ID de la orden no es válido.")
        }
        return try await client.send(APIEndpoint<APIResponse<PaymentStatus>>.payment(orderID: normalized)).data
    }
}
