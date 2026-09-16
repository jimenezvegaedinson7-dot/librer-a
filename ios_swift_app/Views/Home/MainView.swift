import SwiftUI

private enum MainTab: Hashable {
    case home
    case purchases
    case reservations
    case profile
    case security
}

struct MainView: View {
    @EnvironmentObject private var appState: AppState
    @State private var selectedTab: MainTab = .home
    let user: User

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(
                user: user,
                activityService: appState.activityService,
                purchaseService: appState.purchaseService,
                purchaseDetailService: appState.purchaseService,
                paymentService: appState.paymentService,
                reservationService: appState.reservationService,
                reservationDetailService: appState.reservationService,
                onShowPurchases: { selectedTab = .purchases },
                onShowReservations: { selectedTab = .reservations }
            )
            .tabItem { Label("Inicio", systemImage: "house") }
            .tag(MainTab.home)

            PurchasesView(
                purchaseService: appState.purchaseService,
                purchaseDetailService: appState.purchaseService,
                paymentService: appState.paymentService
            )
                .tabItem { Label("Compras", systemImage: "bag") }
                .tag(MainTab.purchases)

            ReservationsView(
                reservationService: appState.reservationService,
                detailService: appState.reservationService
            )
                .tabItem { Label("Reservas", systemImage: "bookmark") }
                .tag(MainTab.reservations)

            ProfilePlaceholderView(user: user)
                .tabItem { Label("Perfil", systemImage: "person") }
                .tag(MainTab.profile)

            SecurityView()
                .tabItem { Label("Seguridad", systemImage: "lock.shield") }
                .tag(MainTab.security)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Cerrar sesión") {
                    Task { await appState.signOut() }
                }
            }
        }
    }
}
