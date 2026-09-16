import SwiftUI

struct ReservationsView: View {
    @StateObject private var viewModel: ReservationsViewModel
    private let detailService: any ReservationDetailServicing

    init(
        reservationService: any ReservationServicing,
        detailService: any ReservationDetailServicing
    ) {
        self.detailService = detailService
        _viewModel = StateObject(
            wrappedValue: ReservationsViewModel(service: reservationService)
        )
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Mis reservas")
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
        if viewModel.reservations.isEmpty {
            switch viewModel.state {
            case .idle, .loading:
                ProgressView("Cargando reservas…")
            case .empty, .loaded:
                ContentUnavailableView(
                    "No tienes reservas actualmente",
                    systemImage: "bookmark",
                    description: Text(
                        "Las reservas realizadas desde la aplicación principal aparecerán aquí."
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
                List(viewModel.reservations) { reservation in
                    NavigationLink {
                        ReservationDetailView(
                            reservationID: reservation.idReserva,
                            service: detailService
                        )
                    } label: {
                        ReservationListRow(reservation: reservation)
                    }
                }
                .listStyle(.plain)
            }
        }
    }
}