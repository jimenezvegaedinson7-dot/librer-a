import SwiftUI

/// Pestaña Reservas: portada suelta y datos al lado, sin tarjetas, con la
/// opción de cancelar (pendiente o confirmada), como en Flutter.
struct MyReservationsView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var router: StoreRouter
    @State private var reservations: [Reservation] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var cancellingID: Int?
    @State private var toCancel: Reservation?
    @State private var toast: ToastMessage?
    @State private var showPurchases = false

    private var activeCount: Int {
        reservations.filter { ["pendiente", "confirmada"].contains($0.estado.lowercased()) }.count
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header.padding(.bottom, 16)
                    if isLoading && reservations.isEmpty {
                        ShelfLoadingView(message: "Cargando tus reservas...").frame(maxWidth: .infinity).padding(.top, 60)
                    } else if let errorMessage, reservations.isEmpty {
                        EmptyStateView(systemImage: "wifi.exclamationmark", title: "No se pudieron cargar",
                                       message: errorMessage, actionTitle: "Reintentar",
                                       action: { Task { await load() } })
                    } else if reservations.isEmpty {
                        EmptyStateView(systemImage: "bookmark", title: "Aún no tienes reservas",
                                       message: "Cuando reserves un libro, aparecerá aquí.")
                    } else {
                        ForEach(Array(reservations.enumerated()), id: \.element.id) { index, reservation in
                            if index > 0 { Divider().padding(.vertical, 18) }
                            ReservationRow(
                                reservation: reservation,
                                cancelling: cancellingID == reservation.idReserva,
                                canCancel: ["pendiente", "confirmada"].contains(reservation.estado.lowercased()),
                                onCancel: { toCancel = reservation }
                            )
                            .appear(index)
                        }
                    }
                }
                .padding(20)
            }
            .background(Brand.fondo.ignoresSafeArea())
            .refreshable { await load() }
            .task(id: router.reservationsVersion) { await load() }
            // Mis compras tiene su propia navegación: se abre como hoja.
            .sheet(isPresented: $showPurchases) {
                PurchasesView(
                    purchaseService: appState.purchaseService,
                    purchaseDetailService: appState.purchaseService,
                    paymentService: appState.paymentService
                )
            }
            .toolbar(.hidden, for: .navigationBar)
            .toast($toast)
            .confirmationDialog(
                "¿Cancelar esta reserva?",
                isPresented: Binding(get: { toCancel != nil }, set: { if !$0 { toCancel = nil } }),
                titleVisibility: .visible,
                presenting: toCancel
            ) { reservation in
                Button("Sí, cancelar", role: .destructive) {
                    Task { await cancel(reservation) }
                }
                Button("No", role: .cancel) { }
            } message: { reservation in
                Text("¿Seguro que deseas cancelar la reserva \(reservation.titulo)? Se liberará el stock del libro.")
            }
        }
    }

    private var header: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 4) {
                Text("APARTADOS").font(.caption.weight(.bold)).kerning(1.4).foregroundStyle(Brand.dorado)
                Text("Mis reservas").font(.serif(30))
                if !reservations.isEmpty {
                    Text("\(reservations.count) \(reservations.count == 1 ? "reserva" : "reservas") · \(activeCount) \(activeCount == 1 ? "activa" : "activas")")
                        .font(.subheadline).foregroundStyle(Brand.textoSecundario)
                }
            }
            Spacer()
            Button { showPurchases = true } label: {
                Label("Mis compras", systemImage: "doc.text")
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 12)
                    .frame(height: 40)
                    .overlay(Capsule().stroke(Brand.divisor))
            }
        }
        .padding(.top, 16)
    }

    private func load() async {
        isLoading = reservations.isEmpty
        errorMessage = nil
        do {
            reservations = try await appState.reservationService.myReservations()
                .sorted { ($0.fechaReserva ?? .distantPast) > ($1.fechaReserva ?? .distantPast) }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func cancel(_ reservation: Reservation) async {
        cancellingID = reservation.idReserva
        defer { cancellingID = nil }
        do {
            try await appState.reservationService.cancelReservation(id: reservation.idReserva)
            toast = ToastMessage(text: "Reserva cancelada.")
            await load()
        } catch {
            toast = ToastMessage(text: error.localizedDescription)
        }
    }
}

private struct ReservationRow: View {
    let reservation: Reservation
    let cancelling: Bool
    let canCancel: Bool
    let onCancel: () -> Void

    private static let dateFormat: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es_PE")
        f.dateFormat = "dd/MM/yyyy"
        return f
    }()

    private func date(_ d: Date?) -> String { d.map(Self.dateFormat.string(from:)) ?? "—" }

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            BookCover(path: reservation.portada, width: 84)
            VStack(alignment: .leading, spacing: 6) {
                StatusBadge(status: ReservationPresentation.status(reservation.estado))
                Text(reservation.titulo).font(.serif(18)).lineLimit(2)
                Text("Reserva N° \(reservation.idReserva) · \(date(reservation.fechaReserva))")
                    .font(.caption).foregroundStyle(Brand.textoSecundario)
                HStack(spacing: 16) {
                    datum("shippingbox", "Cantidad",
                          "\(reservation.cantidad) \(reservation.cantidad == 1 ? "unidad" : "unidades")")
                    datum("calendar.badge.exclamationmark", "Vence", date(reservation.fechaVencimiento))
                }
                .padding(.top, 6)
                if canCancel {
                    if cancelling {
                        ProgressView().padding(.top, 6)
                    } else {
                        Button(role: .destructive, action: onCancel) {
                            Label("Cancelar reserva", systemImage: "xmark")
                        }
                        .font(.subheadline.weight(.semibold))
                        .padding(.top, 6)
                    }
                }
            }
        }
    }

    private func datum(_ icon: String, _ label: String, _ value: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon).foregroundStyle(Brand.dorado)
            VStack(alignment: .leading, spacing: 0) {
                Text(label).font(.caption2).foregroundStyle(Brand.textoTerciario)
                Text(value).font(.caption.weight(.semibold))
            }
        }
    }
}
