final class ReservationService {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func myReservations() async throws -> [Reservation] {
        try await client.send(APIEndpoint<APIResponse<[Reservation]>>.myReservations).data
    }

    func reservation(id: Int) async throws -> Reservation {
        guard id > 0 else { throw APIError.invalidRequest("El ID de reserva no es válido.") }
        return try await client.send(APIEndpoint<APIResponse<Reservation>>.reservation(id: id)).data
    }
}
