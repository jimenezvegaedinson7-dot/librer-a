final class PurchaseService {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func myPurchases() async throws -> [Purchase] {
        try await client.send(APIEndpoint<APIResponse<[Purchase]>>.myPurchases).data
    }

    func purchase(id: Int) async throws -> Purchase {
        guard id > 0 else { throw APIError.invalidRequest("El ID de venta no es válido.") }
        return try await client.send(APIEndpoint<APIResponse<Purchase>>.purchase(id: id)).data
    }

    func paymentForSale(id: Int) async throws -> SalePayment {
        guard id > 0 else { throw APIError.invalidRequest("El ID de venta no es válido.") }
        return try await client.send(APIEndpoint<APIResponse<SalePayment>>.salePayment(id: id)).data
    }
}
