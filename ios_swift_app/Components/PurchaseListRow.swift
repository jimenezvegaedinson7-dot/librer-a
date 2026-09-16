import SwiftUI

struct PurchaseListRow: View {
    let purchase: Purchase

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
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

            HStack(spacing: 8) {
                StatusBadge(status: PurchasePresentation.saleStatus(purchase.estado))
                if let delivery = purchase.tipoEntrega, !delivery.isEmpty {
                    Label(
                        PurchasePresentation.deliveryType(delivery).text,
                        systemImage: "shippingbox"
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
            }

            if let payment = purchase.payuPaymentStatus, !payment.isEmpty {
                LabeledContent(
                    "Pago",
                    value: PurchasePresentation.paymentStatus(payment).text
                )
                .font(.subheadline)
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
