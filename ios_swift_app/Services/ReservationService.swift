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

    /// `POST /api/reservas`. Devuelve el id de la reserva creada.
    func createReservation(bookID: Int, quantity: Int) async throws -> Int? {
        try await client.send(
            APIEndpoint<CreatedReservation>.createReservation(.init(idLibro: bookID, cantidad: quantity))
        ).idReserva
    }

    /// `DELETE /api/reservas/:id` (solo pendiente o confirmada).
    func cancelReservation(id: Int) async throws {
        _ = try await client.send(APIEndpoint<APIStatusPayload>.cancelReservation(id: id))
    }
}
