import SwiftUI

struct HomeView: View {
    let user: User
    let onShowPurchases: () -> Void
    let onShowReservations: () -> Void

    @StateObject private var viewModel: HomeViewModel
    private let purchaseDetailService: any PurchaseDetailServicing
    private let paymentService: any PaymentStatusServicing

    init(
        user: User,
        activityService: any ActivityServicing,
        purchaseService: any PurchaseServicing,
        purchaseDetailService: any PurchaseDetailServicing,
        paymentService: any PaymentStatusServicing,
        reservationService: any ReservationServicing,
        onShowPurchases: @escaping () -> Void,
        onShowReservations: @escaping () -> Void
    ) {
        self.user = user
        self.onShowPurchases = onShowPurchases
        self.onShowReservations = onShowReservations
        self.purchaseDetailService = purchaseDetailService
        self.paymentService = paymentService
        _viewModel = StateObject(
            wrappedValue: HomeViewModel(
                activityService: activityService,
                purchaseService: purchaseService,
                reservationService: reservationService
            )
        )
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 18) {
                    header
                    summary
                    globalStatus

                    HomeSectionCard(
                        title: "Compras recientes",
                        systemImage: "bag",
                        onSeeAll: onShowPurchases
                    ) {
                        purchaseContent
                    }

                    HomeSectionCard(
                        title: "Reservas recientes",
                        systemImage: "bookmark",
                        onSeeAll: onShowReservations
                    ) {
                        reservationContent
                    }

                    HomeSectionCard(
                        title: "Actividad reciente",
                        systemImage: "clock.arrow.circlepath"
                    ) {
                        activityContent
                    }
                }
                .padding()
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Inicio")
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadInitial()
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(HomeGreeting.text(for: Date())), \(user.nombre)")
                .font(.title2.bold())
                .accessibilityAddTraits(.isHeader)
            Text("Librería Secure")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var summary: some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 105), spacing: 12)],
            spacing: 12
        ) {
            HomeSummaryCard(
                title: "Compras",
                count: viewModel.totalPurchases,
                systemImage: "bag"
            )
            HomeSummaryCard(
                title: "Reservas",
                count: viewModel.totalReservations,
                systemImage: "bookmark"
            )
            HomeSummaryCard(
                title: "Actividad",
                count: viewModel.totalActivities,
                systemImage: "clock.arrow.circlepath"
            )
        }
    }

    @ViewBuilder
    private var globalStatus: some View {
        switch viewModel.loadState {
        case .idle, .loaded:
            EmptyView()
        case .loading:
            HStack {
                Spacer()
                ProgressView("Actualizando inicio…")
                Spacer()
            }
        case .empty:
            HomeSectionFeedbackView(
                message: "Aún no hay compras, reservas ni actividad para mostrar.",
                systemImage: "tray"
            )
        case .partialFailure:
            Label(
                "Parte de la información no pudo actualizarse. Puedes reintentar cada sección.",
                systemImage: "exclamationmark.triangle"
            )
            .font(.subheadline)
            .foregroundStyle(.orange)
        case .error(let message):
            HomeSectionFeedbackView(
                message: message,
                systemImage: "wifi.exclamationmark",
                retryAction: { Task { await viewModel.refresh() } }
            )
        }
    }

    @ViewBuilder
    private var purchaseContent: some View {
        sectionContent(
            state: viewModel.purchaseState,
            values: viewModel.recentPurchases,
            emptyMessage: "No tienes compras registradas.",
            retry: { await viewModel.retry(.purchases) }
        ) { purchase in
            NavigationLink {
                PurchaseDetailView(
                    purchaseID: purchase.idVenta,
                    purchaseService: purchaseDetailService,
                    paymentService: paymentService
                )
            } label: {
                HomePurchaseRow(purchase: purchase)
            }
            .buttonStyle(.plain)
        }

        @ViewBuilder
        private var reservationContent: some View {
            sectionContent(
                state: viewModel.reservationState,
                values: viewModel.recentReservations,
                emptyMessage: "No tienes reservas registradas.",
                retry: { await viewModel.retry(.reservations) }
            ) { reservation in
                NavigationLink {
                    ReservationDetailView(
                        reservationID: reservation.idReserva,
                        service: purchaseDetailService
                    )
                } label: {
                    HomeReservationRow(reservation: reservation)
                }
                .buttonStyle(.plain)
            }
        }

        @ViewBuilder
        private var activityContent: some View {
            sectionContent(
                state: viewModel.activityState,
                values: viewModel.recentActivities,
                emptyMessage: "No hay actividad reciente.",
                retry: { await viewModel.retry(.activity) }
            ) { activity in
                HomeActivityRow(activity: activity)
            }
        }
    }