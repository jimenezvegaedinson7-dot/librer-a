import SwiftUI
import Combine

enum MainTab: Hashable {
    case home
    case catalog
    case cart
    case purchases
    case profile
}

/// Navegación compartida entre pestañas (p. ej. Inicio → Catálogo con una
/// categoría o con el buscador activo).
@MainActor
final class StoreRouter: ObservableObject {
    @Published var selectedTab: MainTab = .home
    @Published var catalogCategory: String?
    @Published var focusCatalogSearch = false

    func openCatalog(category: String? = nil, search: Bool = false) {
        catalogCategory = category
        focusCatalogSearch = search
        selectedTab = .catalog
    }
}

/// Las mismas 5 pestañas que la app Flutter.
struct MainView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var cart: CartStore
    @EnvironmentObject private var themeStore: ThemeStore
    @StateObject private var router = StoreRouter()
    let user: User

    var body: some View {
        TabView(selection: $router.selectedTab) {
            StoreHomeView(user: user)
                .tabItem { Label("Inicio", systemImage: "house") }
                .tag(MainTab.home)

            CatalogView()
                .tabItem { Label("Catálogo", systemImage: "books.vertical") }
                .tag(MainTab.catalog)

            CartView()
                .tabItem { Label("Carrito", systemImage: "cart") }
                .badge(cart.totalUnits)
                .tag(MainTab.cart)

            PurchasesView(
                purchaseService: appState.purchaseService,
                purchaseDetailService: appState.purchaseService,
                paymentService: appState.paymentService
            )
                .tabItem { Label("Mis compras", systemImage: "bag") }
                .tag(MainTab.purchases)

            AccountView()
                .tabItem { Label("Perfil", systemImage: "person") }
                .tag(MainTab.profile)
        }
        .tint(themeStore.theme.primary)
        .environmentObject(router)
    }
}
