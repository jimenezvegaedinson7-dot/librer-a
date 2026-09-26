import SwiftUI

struct PurchaseDetailView: View {
    @StateObject private var viewModel: PurchaseDetailViewModel
    @EnvironmentObject private var appState: AppState
    @Environment(\.openURL) private var openURL
    @State private var toast: ToastMessage?
    @State private var verifying = false

    init(
        purchaseID: Int,
        purchaseService: any PurchaseDetailServicing,
        paymentService: any PaymentStatusServicing
    ) {
        _viewModel = StateObject(
            wrappedValue: PurchaseDetailViewModel(
                purchaseID: purchaseID,
                purchaseService: purchaseService,
                paymentService: paymentService
            )
        )
    }

    var body: some View {
        Group {
            if let purchase = viewModel.purchase {
                loadedContent(purchase)
            } else {
                unloadedContent
            }
        }
        .navigationTitle("Compra #\(viewModel.purchaseID)")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadInitial()
        }
        .toast($toast)
    }

    @ViewBuilder
    private var unloadedContent: some View {
        switch viewModel.purchaseState {
        case .idle, .loading:
            ProgressView("Cargando detalle…")
        case .error(let message):
            HomeSectionFeedbackView(
                message: message,
                systemImage: "exclamationmark.circle",
                retryAction: { Task { await viewModel.reload() } }
            )
            .padding()
        case .loaded:
            EmptyView()
        }
    }

    private func loadedContent(_ purchase: Purchase) -> some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if case .loading = viewModel.purchaseState {
                    ProgressView("Actualizando compra…")
                }
                if case .error(let message) = viewModel.purchaseState {
                    HomeSectionFeedbackView(
                        message: message,
                        systemImage: "exclamationmark.circle",
                        retryAction: { Task { await viewModel.reload() } }
                    )
                }

                summarySection(purchase)
                if viewModel.isPending {
                    pendingPaymentActions
                }
                productsSection(purchase)
                paymentSection
                deliverySection(purchase)
                receiptSection(purchase)
            }
            .padding()
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .refreshable {
            await viewModel.reload()
        }
    }

    private func summarySection(_ purchase: Purchase) -> some View {
        PurchaseDetailSection(title: "Resumen", systemImage: "doc.text") {
            LabeledContent("Fecha", value: HomeFormatters.dateTime(purchase.fechaVenta))
            HStack {
                Text("Estado")
                Spacer()
                StatusBadge(status: PurchasePresentation.saleStatus(purchase.estado))
            }
            if !purchase.details.isEmpty {
                LabeledContent(
                    "Subtotal",
                    value: HomeFormatters.pen(
                        purchase.details.reduce(0) { $0 + $1.subtotal }
                    )
                )
            }
            if let shippingCost = purchase.costoEnvio {
                LabeledContent("Costo de envío", value: HomeFormatters.pen(shippingCost))
            }
            LabeledContent("Total", value: HomeFormatters.pen(purchase.total))
                .fontWeight(.semibold)
        }
    }

    /// Igual que Flutter (Mis compras): reabrir PayU o consultar la orden.
    private var pendingPaymentActions: some View {
        HStack(spacing: 10) {
            Button {
                Task { await verifyPayment() }
            } label: {
                if verifying { ProgressView() } else { Text("Verificar pago") }
            }
            .buttonStyle(BrandButtonStyle(filled: false))
            .disabled(verifying)

            Button("Continuar pago") { continuePayment() }
                .buttonStyle(BrandButtonStyle())
        }
    }

    private func continuePayment() {
        guard let url = viewModel.checkoutURL else {
            toast = ToastMessage(
                text: "No encontramos una ventana de pago activa para esta compra. Inicia el pago nuevamente desde \"Mi carrito\"."
            )
            return
        }
        openURL(url) { accepted in
            if !accepted { toast = ToastMessage(text: "No se pudo abrir la ventana de pago.") }
        }
    }

    private func verifyPayment() async {
        guard let orderID = viewModel.orderID else {
            toast = ToastMessage(text: "El pago aún está pendiente.")
            return
        }
        verifying = true
        defer { verifying = false }
        do {
            let state = try await appState.checkoutService.orderState(orderID: orderID)
            if state.isPaid || state.isCancelled {
                appState.checkoutService.resetIdempotency()
            }
            toast = ToastMessage(
                text: state.isPaid ? "Pago confirmado."
                    : state.isCancelled ? "El pago fue cancelado."
                    : "El pago aún está pendiente."
            )
            if state.isPaid || state.isCancelled {
                await viewModel.reload()
            }
        } catch {
            toast = ToastMessage(text: error.localizedDescription)
        }
    }

    private func productsSection(_ purchase: Purchase) -> some View {
        PurchaseDetailSection(title: "Productos", systemImage: "books.vertical") {
            if purchase.details.isEmpty {
                Text("No hay productos disponibles en el detalle de esta compra.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(purchase.details) { detail in
                    VStack(alignment: .leading, spacing: 5) {
                        Text(detail.titulo)
                            .font(.headline)
                        LabeledContent("Cantidad", value: String(detail.cantidad))
                        LabeledContent(
                            "Precio unitario",
                            value: HomeFormatters.pen(detail.precioUnitario)
                        )
                        LabeledContent(
                            "Subtotal",
                            value: HomeFormatters.pen(detail.subtotal)
                        )
                    }
                    .accessibilityElement(children: .combine)
                    if let lastID = purchase.details.last?.id, detail.id != lastID {
                        Divider()
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var paymentSection: some View {
        PurchaseDetailSection(title: "Estado del pago", systemImage: "creditcard") {
            switch viewModel.paymentState {
            case .idle:
                ProgressView("Consultando pago…")
            case .loading:
                if let presentation = viewModel.paymentPresentation {
                    paymentDetails(presentation)
                    ProgressView("Actualizando estado…")
                } else {
                    ProgressView("Consultando pago…")
                }
            case .loaded:
                if let presentation = viewModel.paymentPresentation {
                    paymentDetails(presentation)
                } else {
                    Text("No hay información de pago disponible para esta compra.")
                        .foregroundStyle(.secondary)
                }
            case .unavailable(let message):
                Text(message)
                    .foregroundStyle(.secondary)
            case .error(let message):
                if let presentation = viewModel.paymentPresentation {
                    paymentDetails(presentation)
                }
                paymentError(message)
            }

            if let notice = viewModel.paymentNotice {
                Text(notice)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func paymentDetails(_ payment: PaymentPresentation) -> some View {
        if let status = payment.status {
            HStack {
                Text("Estado")
                Spacer()
                StatusBadge(status: status)
            }
        }
        if let detail = payment.statusDetail {
            LabeledContent("Detalle", value: detail)
        }
        if let method = payment.method {
            LabeledContent("Método", value: method)
        }
        if let date = payment.paymentDate {
            LabeledContent("Fecha", value: HomeFormatters.dateTime(date))
        }
        if let paymentID = payment.paymentID {
            LabeledContent("ID de pago", value: paymentID)
        }
        if let orderID = payment.orderID {
            LabeledContent("ID de orden", value: orderID)
        }
        if let reference = payment.externalReference {
            LabeledContent("Referencia", value: reference)
        }
    }

    private func paymentError(_ message: String) -> some View {
        HomeSectionFeedbackView(
            message: message,
            systemImage: "exclamationmark.circle",
            retryAction: { Task { await viewModel.retryPayment() } }
        )
    }

    private func deliverySection(_ purchase: Purchase) -> some View {
        PurchaseDetailSection(title: "Entrega", systemImage: "shippingbox") {
            if let delivery = purchase.tipoEntrega, !delivery.isEmpty {
                LabeledContent(
                    "Tipo",
                    value: PurchasePresentation.deliveryType(delivery).text
                )
            }
            if let province = purchase.provincia, !province.isEmpty {
                LabeledContent("Provincia", value: province)
            }
            if let district = purchase.distrito, !district.isEmpty {
                LabeledContent("Distrito", value: district)
            }
            if let address = purchase.direccion, !address.isEmpty {
                LabeledContent("Dirección", value: address)
            }
            if let reference = purchase.referencia, !reference.isEmpty {
                LabeledContent("Referencia", value: reference)
            }
            if let agency = purchase.agencia, !agency.isEmpty {
                LabeledContent("Agencia", value: agency)
            }
            if let shippingCost = purchase.costoEnvio {
                LabeledContent("Costo de envío", value: HomeFormatters.pen(shippingCost))
            }
            if !hasDeliveryInformation(purchase) {
                Text("No hay información adicional de entrega.")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func receiptSection(_ purchase: Purchase) -> some View {
        PurchaseDetailSection(title: "Comprobante", systemImage: "doc.plaintext") {
            switch purchase.tieneComprobante {
            case .some(true):
                Label("Comprobante emitido", systemImage: "checkmark.circle")
            case .some(false):
                Text("Comprobante no emitido.")
                    .foregroundStyle(.secondary)
            case .none:
                Text("Información de comprobante no disponible")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func hasDeliveryInformation(_ purchase: Purchase) -> Bool {
        purchase.tipoEntrega?.isEmpty == false
            || purchase.provincia?.isEmpty == false
            || purchase.distrito?.isEmpty == false
            || purchase.direccion?.isEmpty == false
            || purchase.referencia?.isEmpty == false
            || purchase.agencia?.isEmpty == false
            || purchase.costoEnvio != nil
    }
}
