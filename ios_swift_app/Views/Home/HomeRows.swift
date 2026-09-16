import SwiftUI

struct HomePurchaseRow: View {
    let purchase: Purchase

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text("Compra #\(purchase.idVenta)")
                    .font(.headline)
                Spacer()
                Text(HomeFormatters.pen(purchase.total))
                    .fontWeight(.semibold)
            }
            Text(HomeFormatters.dateTime(purchase.fechaVenta))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            HStack {
                Text("Estado")
                    .font(.subheadline)
                Spacer()
                StatusBadge(status: PurchasePresentation.saleStatus(purchase.estado))
            }
            if let paymentStatus = purchase.payuPaymentStatus, !paymentStatus.isEmpty {
                LabeledContent(
                    "Pago",
                    value: PurchasePresentation.paymentStatus(paymentStatus).text
                )
                    .font(.subheadline)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

struct HomeReservationRow: View {
    let reservation: Reservation

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text("Reserva #\(reservation.idReserva)")
                    .font(.headline)
                Spacer()
                StatusBadge(status: ReservationPresentation.status(reservation.estado))
            }
            Text(reservation.titulo)
                .font(.body.weight(.medium))
            LabeledContent("Cantidad", value: String(reservation.cantidad))
            LabeledContent("Reservada", value: HomeFormatters.dateTime(reservation.fechaReserva))
            LabeledContent("Vence", value: HomeFormatters.date(reservation.fechaVencimiento))
        }
        .font(.subheadline)
        .accessibilityElement(children: .combine)
    }
}

struct HomeActivityRow: View {
    let activity: Activity

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(activity.tipoOperacion)
                    .font(.headline)
                Spacer()
                Text(activity.modulo)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Text(activity.descripcion)
                .font(.subheadline)
            Text(HomeFormatters.dateTime(activity.fechaRegistro))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }
}
