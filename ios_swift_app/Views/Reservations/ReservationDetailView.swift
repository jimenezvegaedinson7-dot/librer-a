import SwiftUI

struct ReservationDetailView: View {
    @StateObject private var viewModel: ReservationDetailViewModel

    init(
        reservationID: Int,
        service: any ReservationDetailServicing
    ) {
        _viewModel = StateObject(
            wrappedValue: ReservationDetailViewModel(
                reservationID: reservationID,
                service: service
            )
        )
    }

    var body: some View {
        Group {
            if let reservation = viewModel.reservation {
                loadedContent(reservation)
            } else {
                unloadedContent
            }
        }
        .navigationTitle("Reserva #\(viewModel.reservationID)")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadInitial()
        }
    }

    @ViewBuilder
    private var unloadedContent: some View {
        switch viewModel.state {
        case .idle, .loading:
            ProgressView("Cargando reserva…")
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

    private func loadedContent(_ reservation: Reservation) -> some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if case .loading = viewModel.state {
                    ProgressView("Actualizando reserva…")
                }
                if case .error(let message) = viewModel.state {
                    HomeSectionFeedbackView(
                        message: message,
                        systemImage: "exclamationmark.circle",
                        retryAction: { Task { await viewModel.reload() } }
                    )
                }

                statusSection(reservation)
                bookSection(reservation)
                datesSection(reservation)
            }
            .padding()
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .refreshable {
            await viewModel.reload()
        }
    }

    private func statusSection(_ reservation: Reservation) -> some View {
        HomeSectionCard(title: "Estado", systemImage: "checkmark.circle") {
            StatusBadge(status: ReservationPresentation.status(reservation.estado))

            if ReservationPresentation.isExpired(
                expirationDate: reservation.fechaVencimiento,
                relativeTo: Date(),
                calendar: .current
            ) {
                Label(
                    "La fecha de vencimiento ya pasó",
                    systemImage: "exclamationmark.triangle"
                )
                .font(.subheadline)
                .foregroundStyle(.orange)
                .accessibilityLabel("Aviso: La fecha de vencimiento ya pasó")
            }
        }
    }

    private func bookSection(_ reservation: Reservation) -> some View {
        HomeSectionCard(title: "Libro", systemImage: "book") {
            LabeledContent("Título", value: reservation.titulo)
            LabeledContent("Cantidad", value: String(reservation.cantidad))
        }
    }

    private func datesSection(_ reservation: Reservation) -> some View {
        HomeSectionCard(title: "Fechas", systemImage: "calendar") {
            LabeledContent(
                "Fecha de reserva",
                value: HomeFormatters.dateTime(reservation.fechaReserva)
            )
            LabeledContent(
                "Fecha de vencimiento",
                value: HomeFormatters.date(reservation.fechaVencimiento)
            )
        }
    }
}
