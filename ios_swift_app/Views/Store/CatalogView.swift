import SwiftUI

/// Pestaña Catálogo: buscador, categorías en abanico, orden y estado, y una
/// cuadrícula de portadas con precio y botón de carrito (como Flutter).
struct CatalogView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var cart: CartStore
    @EnvironmentObject private var router: StoreRouter
    @EnvironmentObject private var themeStore: ThemeStore

    @State private var books: [Book] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var query = ""
    @State private var category: String?
    @State private var availability: Availability = .all
    @State private var sort: SortOrder = .titleAZ
    @State private var toast: ToastMessage?
    @FocusState private var searchFocused: Bool

    enum SortOrder: String, CaseIterable, Identifiable {
        case titleAZ = "Título A-Z"
        case titleZA = "Título Z-A"
        case priceLow = "Precio menor"
        case priceHigh = "Precio mayor"
        var id: String { rawValue }
    }

    enum Availability: String, CaseIterable, Identifiable {
        case all = "Todos"
        case available = "Disponibles"
        case soldOut = "Agotados"
        var id: String { rawValue }
    }

    private var filtered: [Book] {
        let text = query.trimmingCharacters(in: .whitespaces).lowercased()
        let wantedCategory = category?.lowercased()
        var list = books.filter { book in
            matches(book, text: text, category: wantedCategory)
        }
        switch sort {
        case .titleAZ: list.sort { $0.titulo.localizedCaseInsensitiveCompare($1.titulo) == .orderedAscending }
        case .titleZA: list.sort { $0.titulo.localizedCaseInsensitiveCompare($1.titulo) == .orderedDescending }
        case .priceLow: list.sort { $0.precio < $1.precio }
        case .priceHigh: list.sort { $0.precio > $1.precio }
        }
        return list
    }

    /// Búsqueda por título o autor (como Flutter), categoría y disponibilidad.
    private func matches(_ book: Book, text: String, category wanted: String?) -> Bool {
        if !text.isEmpty {
            let inTitle = book.titulo.lowercased().contains(text)
            let inAuthor = (book.autor ?? "").lowercased().contains(text)
            if !inTitle && !inAuthor { return false }
        }
        if let wanted {
            let bookCategory = (book.categoria ?? "").trimmingCharacters(in: .whitespaces).lowercased()
            if bookCategory != wanted { return false }
        }
        switch availability {
        case .all: return true
        case .available: return book.stock > 0
        case .soldOut: return book.stock <= 0
        }
    }

    private var categories: [CategorySummary] {
        CategorySummary.from(books).sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header.appear(0)
                    searchField.padding(.top, 16).appear(1)

                    if isLoading && books.isEmpty {
                        ShelfLoadingView(message: "Cargando libros...")
                            .frame(maxWidth: .infinity).padding(.top, 80)
                    } else if let errorMessage, books.isEmpty {
                        EmptyStateView(
                            systemImage: "wifi.exclamationmark",
                            title: "No se pudieron cargar los libros",
                            message: errorMessage,
                            actionTitle: "Reintentar",
                            action: { Task { await load() } }
                        )
                    } else {
                        if categories.count > 1 { categoryRow }
                        toolbarRow.padding(.top, 16)
                        if filtered.isEmpty {
                            EmptyStateView(
                                systemImage: "magnifyingglass",
                                title: "No encontramos libros",
                                message: "Prueba con otra búsqueda o cambia los filtros."
                            )
                        } else {
                            grid.padding(.top, 14)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            .background(Brand.fondo.ignoresSafeArea())
            .refreshable { await load() }
            .task { if books.isEmpty { await load() } }
            .navigationDestination(for: Book.self) { BookDetailView(book: $0) }
            .toolbar(.hidden, for: .navigationBar)
            .toast($toast)
            .onChange(of: router.selectedTab) { _, tab in applyRouterRequest(tab) }
            .onAppear { applyRouterRequest(router.selectedTab) }
        }
    }

    // MARK: Secciones

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("EXPLORAR")
                .font(.caption.weight(.bold)).kerning(1.6)
                .foregroundStyle(Brand.dorado)
            Text("Catálogo").font(.serif(30)).foregroundStyle(Brand.texto)
        }
        .padding(.top, 16)
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(searchFocused ? themeStore.theme.primary : Brand.textoTerciario)
            TextField("Título, autor o ISBN...", text: $query)
                .focused($searchFocused)
                .submitLabel(.search)
                .autocorrectionDisabled()
            if !query.isEmpty {
                Button { query = "" } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(Brand.textoTerciario)
                }
                .accessibilityLabel("Limpiar búsqueda")
            }
        }
        .padding(.horizontal, 14)
        .frame(height: 52)
        .background(RoundedRectangle(cornerRadius: 14).fill(Brand.superficie))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(searchFocused ? themeStore.theme.primary : Brand.divisor, lineWidth: searchFocused ? 1.4 : 1)
        )
    }

    private var categoryRow: some View {
        let all = CategorySummary(name: "Todos", count: books.count, covers: books.prefix(3).map(\.portada))
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 0) {
                categoryButton(all, selected: category == nil) { category = nil }
                ForEach(categories) { item in
                    categoryButton(item, selected: category?.lowercased() == item.name.lowercased()) {
                        category = item.name
                    }
                }
            }
            .padding(.top, 18)
        }
        .padding(.horizontal, -20)
        .contentMargins(.horizontal, 14, for: .scrollContent)
    }

    private func categoryButton(_ item: CategorySummary, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            CategoryFanItem(category: item, selected: selected, coverWidth: 46)
        }
        .buttonStyle(PressableButtonStyle())
    }

    private var toolbarRow: some View {
        HStack(spacing: 8) {
            (Text("\(filtered.count) ").font(.subheadline.weight(.semibold)).foregroundColor(Brand.texto)
                + Text(filtered.count == 1 ? "título disponible" : "títulos disponibles")
                .font(.subheadline).foregroundColor(Brand.textoSecundario))
                .frame(maxWidth: .infinity, alignment: .leading)
            Menu {
                Picker("Ordenar", selection: $sort) {
                    ForEach(SortOrder.allCases) { Text($0.rawValue).tag($0) }
                }
            } label: {
                filterChip("Ordenar", systemImage: "arrow.up.arrow.down", active: sort != .titleAZ)
            }
            Menu {
                Picker("Estado", selection: $availability) {
                    ForEach(Availability.allCases) { Text($0.rawValue).tag($0) }
                }
            } label: {
                filterChip("Estado", systemImage: "slider.horizontal.3", active: availability != .all)
            }
        }
    }

    private func filterChip(_ title: String, systemImage: String, active: Bool) -> some View {
        Label(title, systemImage: systemImage)
            .font(.subheadline.weight(.medium))
            .foregroundStyle(active ? .white : Brand.texto)
            .padding(.horizontal, 12)
            .frame(height: 38)
            .background(Capsule().fill(active ? themeStore.theme.primary : Brand.superficie))
            .overlay(Capsule().stroke(active ? .clear : Brand.divisor))
    }

    private var grid: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 16) {
            ForEach(Array(filtered.enumerated()), id: \.element.id) { index, book in
                NavigationLink(value: book) {
                    CatalogCard(book: book) { add(book) }
                }
                .buttonStyle(PressableButtonStyle())
                .appear(index)
            }
        }
    }

    // MARK: Acciones

    private func add(_ book: Book) {
        let added = cart.add(book)
        let inCart = cart.quantity(of: book.idLibro)
        toast = ToastMessage(
            text: added == 0
                ? (inCart > 0
                    ? "Ya tienes en tu carrito las \(inCart) unidades disponibles de este libro."
                    : "Este libro no tiene stock disponible.")
                : "\(book.displayTitle) se agregó al carrito · \(inCart) en total"
        )
    }

    private func applyRouterRequest(_ tab: MainTab) {
        guard tab == .catalog else { return }
        if let requested = router.catalogCategory {
            category = requested
            router.catalogCategory = nil
        }
        if router.focusCatalogSearch {
            router.focusCatalogSearch = false
            searchFocused = true
        }
    }

    private func load() async {
        isLoading = books.isEmpty
        errorMessage = nil
        do {
            books = try await appState.catalogService.books()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

/// Tarjeta del catálogo: solo la portada (2:3) con el stock arriba y, sobre
/// un velo inferior, el precio y el botón de añadir al carrito.
private struct CatalogCard: View {
    let book: Book
    let onAdd: () -> Void
    @EnvironmentObject private var themeStore: ThemeStore
    @State private var added = false

    var body: some View {
        CoverImage(path: book.portada)
            .aspectRatio(2 / 3, contentMode: .fit)
            .frame(maxWidth: .infinity)
            .opacity(book.isAvailable ? 1 : 0.55)
            .overlay(alignment: .bottom) {
                LinearGradient(colors: [.clear, Brand.tinta.opacity(0.82)], startPoint: .top, endPoint: .bottom)
                    .frame(height: 92)
                    .allowsHitTesting(false)
            }
            .overlay(alignment: .topLeading) { stockBadge.padding(8) }
            .overlay(alignment: .bottom) {
                HStack(alignment: .bottom) {
                    PriceText(amount: book.precio, size: 18, color: .white)
                        .padding(.bottom, 6)
                    Spacer()
                    Button {
                        onAdd()
                        added = true
                        Task {
                            try? await Task.sleep(nanoseconds: 1_400_000_000)
                            added = false
                        }
                    } label: {
                        Image(systemName: added ? "checkmark" : "cart.badge.plus")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(.white)
                            .frame(width: 38, height: 38)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(!book.isAvailable ? Color.gray : (added ? Brand.exito : themeStore.theme.primary))
                            )
                    }
                    .disabled(!book.isAvailable)
                    .accessibilityLabel("Añadir al carrito")
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
            }
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .shadow(color: Brand.tinta.opacity(0.08), radius: 8, y: 4)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("\(book.displayTitle), de \(book.displayAuthor)")
    }

    private var stockBadge: some View {
        let color = book.isAvailable ? Brand.exito : Brand.error
        return HStack(spacing: 5) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(book.isAvailable ? "\(book.stock) disponibles" : "Agotado")
        }
        .font(.caption2.weight(.semibold))
        .foregroundStyle(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Capsule().fill(Color.white.opacity(0.94)))
    }
}
