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
    @State private var showingLogoutAlert = false

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(
                user: appState.user,
                activityService: appState.activityService,
                purchaseService: appState.purchaseService,
                purchaseDetailService: appState.purchaseService,
                paymentService: appState.paymentService,
                reservationService: appState.reservationService,
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
                detailService: appState.purchaseService
            )
            .tabItem { Label("Reservas", systemImage: "bookmark") }
            .tag(MainTab.reservations)

            ProfileView(
                profileService: ProfileService(client: APIClient()),
                onLogout: { await appState.signOut() },
                onBiometricToggle: { newValue in
                    if newValue {
                        Task { await appState.enableBiometricLock() }
                    } else {
                        appState.disableBiometricLock()
                    }
                }
            )
            .tabItem { Label("Perfil", systemImage: "person") }
            .tag(MainTab.profile)

            SecurityView()
                .tabItem { Label("Seguridad", systemImage: "lock.shield") }
                .tag(MainTab.security)
        }
        .alert("Cerrar sesión", isPresented: $showingLogoutAlert) {
            Button("Cancelar", role: .cancel) { }
            Button("Cerrar sesión", role: .destructive) {
                Task { await appState.signOut() }
            }
        } message: {
            Text("Tendrás que iniciar sesión nuevamente para acceder a Librería Secure.")
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingLogoutAlert = true
                } label: {
                    Text("Cerrar sesión")
                }
            }
        }
    }
}