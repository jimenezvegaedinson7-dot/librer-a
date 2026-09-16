import SwiftUI

struct ReservationListRow: View {
    let reservation: Reservation

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text("Reserva #\(reservation.idReserva)")
                    .font(.headline)
                Spacer()
                StatusBadge(status: ReservationPresentation.status(reservation.estado))
            }
            Text(reservation.titulo)
                .font(.body.weight(.medium))
            LabeledContent("Cantidad", value: String(reservation.cantidad))
            LabeledContent(
                "Reservada",
                value: HomeFormatters.dateTime(reservation.fechaReserva)
            )
            LabeledContent(
                "Vence",
                value: HomeFormatters.date(reservation.fechaVencimiento)
            )
        }
        .font(.subheadline)
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
