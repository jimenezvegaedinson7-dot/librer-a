import SwiftUI

struct PurchasesView: View {
    @StateObject private var viewModel: PurchasesViewModel
    private let purchaseDetailService: any PurchaseDetailServicing
    private let paymentService: any PaymentStatusServicing

    init(
        purchaseService: any PurchaseServicing,
        purchaseDetailService: any PurchaseDetailServicing,
        paymentService: any PaymentStatusServicing
    ) {
        self.purchaseDetailService = purchaseDetailService
        self.paymentService = paymentService
        _viewModel = StateObject(
            wrappedValue: PurchasesViewModel(service: purchaseService)
        )
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Mis compras")
                .refreshable {
                    await viewModel.refresh()
                }
                .task {
                    await viewModel.loadInitial()
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.purchases.isEmpty {
            switch viewModel.state {
            case .idle, .loading:
                ProgressView("Cargando compras…")
            case .empty, .loaded:
                ContentUnavailableView(
                    "No tienes compras todavía",
                    systemImage: "bag",
                    description: Text(
                        "Las compras realizadas desde la aplicación principal aparecerán aquí."
                    )
                )
            case .error(let message):
                HomeSectionFeedbackView(
                    message: message,
                    systemImage: "exclamationmark.circle",
                    retryAction: { Task { await viewModel.refresh() } }
                )
                .padding()
            }
        } else {
            VStack(spacing: 0) {
                if case .loading = viewModel.state {
                    ProgressView("Actualizando…")
                        .padding(.vertical, 8)
                }
                if case .error(let message) = viewModel.state {
                    HomeSectionFeedbackView(
                        message: message,
                        systemImage: "exclamationmark.circle",
                        retryAction: { Task { await viewModel.refresh() } }
                    )
                    .padding()
                }
                List(viewModel.purchases) { purchase in
                    NavigationLink {
                        PurchaseDetailView(
                            purchaseID: purchase.idVenta,
                            purchaseService: purchaseDetailService,
                            paymentService: paymentService
                        )
                    } label: {
                        PurchaseListRow(purchase: purchase)
                    }
                }
                .listStyle(.plain)
            }
        }
    }
}
