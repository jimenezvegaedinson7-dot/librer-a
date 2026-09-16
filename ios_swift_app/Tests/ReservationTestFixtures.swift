import Foundation
@testable import LibreriaSecureApp

enum ReservationTestFixtures {
    static func reservation(
        id: Int = 1,
        reservationDate: String? = "2026-09-15T10:00:00Z",
        expirationDate: String? = "2026-09-20",
        status: String = "pendiente"
    ) throws -> Reservation {
        let payload: [String: Any] = [
            "id_reserva": String(id),
            "id_usuario": "7",
            "id_libro": "20",
            "titulo": "Libro de prueba",
            "cantidad": "2",
            "fecha_reserva": jsonValue(reservationDate),
            "fecha_vencimiento": jsonValue(expirationDate),
            "estado": status
        ]
        let data = try JSONSerialization.data(withJSONObject: payload)
        return try JSONDecoder().decode(Reservation.self, from: data)
    }

    private static func jsonValue(_ value: String?) -> Any {
        if let value { return value }
        return NSNull()
    }
}
