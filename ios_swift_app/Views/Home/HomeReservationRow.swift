import SwiftUI

struct HomeReservationRow: View {
    let reservation: Reservation

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(reservation.titulo)
                .font(.headline)
            LabeledContent("Cantidad", value: String(reservation.cantidad))
            LabeledContent("Reservada", value: HomeFormatters.dateTime(reservation.fechaReserva))
            LabeledContent("Vence", value: HomeFormatters.date(reservation.fechaVencimiento))
            LabeledContent("Estado", value: reservation.estado)
        }
        .font(.subheadline)
        .accessibilityElement(children: .combine)
    }
}