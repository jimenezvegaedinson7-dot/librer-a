import SwiftUI

/// Pestaña Inicio: saludo, buscador, portada editorial, categorías y dos
/// carruseles de libros (misma estructura que la app Flutter).
struct StoreHomeView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var router: StoreRouter
    @EnvironmentObject private var themeStore: ThemeStore
    let user: User

    @State private var books: [Book] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header.appear(0)
                    searchButton.padding(.top, 18).appear(1)

                    if isLoading && books.isEmpty {
                        ShelfLoadingView(message: "Cargando novedades...")
                            .frame(maxWidth: .infinity)
                            .padding(.top, 80)
                    } else if let errorMessage, books.isEmpty {
                        EmptyStateView(
                            systemImage: "wifi.exclamationmark",
                            title: "No se pudieron cargar los libros",
                            message: errorMessage,
                            actionTitle: "Reintentar",
                            action: { Task { await load() } }
                        )
                    } else if books.isEmpty {
                        EmptyStateView(
                            systemImage: "books.vertical",
                            title: "Sin novedades",
                            message: "No hay libros disponibles por el momento."
                        )
                    } else {
                        content
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 28)
            }
            .background(Brand.fondo.ignoresSafeArea())
            .refreshable { await load() }
            .task { if books.isEmpty { await load() } }
            .navigationDestination(for: Book.self) { BookDetailView(book: $0) }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    // MARK: Secciones

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if (5..<12).contains(hour) { return "Buenos días" }
        if (12..<19).contains(hour) { return "Buenas tardes" }
        return "Buenas noches"
    }

    private var header: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 4) {
                Text(greeting.uppercased())
                    .font(.caption.weight(.bold))
                    .kerning(1.6)
                    .foregroundStyle(Brand.dorado)
                let name = "\(user.nombre) \(user.apellido)".trimmingCharacters(in: .whitespaces)
                Text(name.isEmpty ? "Te damos la bienvenida" : name)
                    .font(.serif(30))
                    .foregroundStyle(Brand.texto)
                    .lineLimit(1)
            }
            Spacer()
            AppLogo(width: 64, height: 46)
                .accessibilityHidden(true)
        }
        .padding(.top, 16)
    }

    private var searchButton: some View {
        Button {
            router.openCatalog(search: true)
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(themeStore.theme.primary)
                Text("Buscar por título o autor...")
                    .foregroundStyle(Brand.textoTerciario)
                Spacer()
                Text("Buscar")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .frame(maxHeight: .infinity)
                    .background(RoundedRectangle(cornerRadius: 8).fill(themeStore.theme.primary))
                    .padding(6)
            }
            .padding(.leading, 14)
            .frame(height: 52)
            .background(RoundedRectangle(cornerRadius: 14).fill(Brand.superficie))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.divisor))
        }
        .buttonStyle(PressableButtonStyle())
        .accessibilityLabel("Buscar libros por título o autor")
    }

    private var content: some View {
        let half = (books.count + 1) / 2
        let first = Array(books.prefix(half))
        let second = Array(books.dropFirst(half))
        return VStack(alignment: .leading, spacing: 0) {
            EditorialBanner(covers: books.prefix(3).map(\.portada)) {
                router.openCatalog()
            }
            .padding(.top, 22)
            .appear(2)

            let categories = CategorySummary.from(books)
            if categories.count > 1 {
                SectionTitle(
                    eyebrow: "Categorías",
                    title: "Explorar por categoría",
                    action: "Todas",
                    onAction: { router.openCatalog() }
                )
                .padding(.top, 28)
                .appear(3)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(categories) { category in
                            Button {
                                router.openCatalog(category: category.name)
                            } label: {
                                CategoryFanItem(category: category, selected: false, coverWidth: 66)
                            }
                            .buttonStyle(PressableButtonStyle())
                        }
                    }
                    .padding(.vertical, 12)
                }
                .padding(.horizontal, -20)
                .contentMargins(.horizontal, 14, for: .scrollContent)
            }

            BookCarousel(eyebrow: "Recomendados", title: "Selección de la casa", books: first) {
                router.openCatalog()
            }
            .appear(4)
            if !second.isEmpty {
                BookCarousel(eyebrow: "Del catálogo", title: "Más para descubrir", books: second) {
                    router.openCatalog()
                }
                .appear(5)
            }
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

/// Portada editorial "Librería del Saber" con abanico de portadas reales.
struct EditorialBanner: View {
    let covers: [String?]
    let onExplore: () -> Void
    @EnvironmentObject private var themeStore: ThemeStore

    var body: some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 8) {
                Text("LIBRERÍA DEL SABER")
                    .font(.system(size: 10, weight: .semibold))
                    .kerning(1.6)
                    .foregroundStyle(Brand.doradoClaro)
                Text("“Encuentra tu próxima lectura.”")
                    .font(.system(size: 22, weight: .medium, design: .serif).italic())
                    .foregroundStyle(.white)
                Text("Descubre el catálogo completo de ediciones.")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.78))
                Button(action: onExplore) {
                    HStack(spacing: 6) {
                        Text("Explorar catálogo")
                        Image(systemName: "arrow.right")
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Brand.tinta)
                    .padding(.horizontal, 16)
                    .frame(height: 42)
                    .background(RoundedRectangle(cornerRadius: 10).fill(Brand.dorado))
                }
                .padding(.top, 8)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if !covers.isEmpty {
                CoverFan(paths: covers, width: 64)
                    .frame(width: 120, height: 150)
            }
        }
        .padding(22)
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(themeStore.theme.gradient)
                .overlay(
                    // Estanterías tenues que se desvanecen hacia el texto.
                    AnimatedBookshelf(ink: 0xFFFFFF, accent: 0xE6CB8F, opacity: 0.13, shelfHeight: 62, seed: 21)
                        .mask(
                            LinearGradient(
                                stops: [.init(color: .white, location: 0.25), .init(color: .clear, location: 0.95)],
                                startPoint: .trailing,
                                endPoint: .leading
                            )
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 13)
                        .stroke(Brand.doradoClaro.opacity(0.3))
                        .padding(6)
                )
                .shadow(color: themeStore.theme.primaryDark.opacity(0.28), radius: 12, y: 10)
        )
    }
}

/// Categoría con su cantidad de libros y portadas de muestra.
struct CategorySummary: Identifiable, Hashable {
    let name: String
    let count: Int
    let covers: [String?]
    var id: String { name }

    static func from(_ books: [Book]) -> [CategorySummary] {
        var groups: [String: [Book]] = [:]
        var order: [String] = []
        for book in books {
            let name = (book.categoria ?? "").trimmingCharacters(in: .whitespaces)
            guard !name.isEmpty else { continue }
            if groups[name] == nil { order.append(name) }
            groups[name, default: []].append(book)
        }
        return order
            .map { CategorySummary(name: $0, count: groups[$0]!.count, covers: groups[$0]!.prefix(3).map(\.portada)) }
            .sorted { $0.count > $1.count }
    }
}

/// Abanico de portadas con nombre y cantidad debajo, sin tarjeta.
struct CategoryFanItem: View {
    let category: CategorySummary
    let selected: Bool
    let coverWidth: CGFloat
    @EnvironmentObject private var themeStore: ThemeStore

    var body: some View {
        VStack(spacing: 2) {
            CoverFan(paths: category.covers, width: coverWidth)
                .frame(height: coverWidth * 1.5 + 30)
                .scaleEffect(selected ? 1.06 : 1)
                .opacity(selected ? 1 : 0.92)
            Text(category.name)
                .font(.serif(15, weight: selected ? .bold : .semibold))
                .foregroundStyle(selected ? themeStore.theme.primary : Brand.texto)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .padding(.top, 8)
            Text(category.count == 1 ? "1 título" : "\(category.count) títulos")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(Brand.dorado)
            Capsule()
                .fill(Brand.dorado)
                .frame(width: selected ? 28 : 0, height: 3)
                .padding(.top, 4)
        }
        .frame(width: coverWidth + 52)
        .animation(.easeOut(duration: 0.25), value: selected)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Categoría \(category.name), \(category.count) títulos")
        .accessibilityAddTraits(selected ? [.isSelected, .isButton] : .isButton)
    }
}

/// Carrusel horizontal de libros sueltos que avanza solo cada 3 segundos.
struct BookCarousel: View {
    let eyebrow: String
    let title: String
    let books: [Book]
    let onSeeAll: () -> Void
    @State private var position: Int?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(eyebrow: eyebrow, title: title, action: "Ver todos", onAction: onSeeAll)
                .padding(.top, 24)
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(alignment: .top, spacing: 20) {
                    ForEach(Array(books.enumerated()), id: \.element.id) { index, book in
                        NavigationLink(value: book) {
                            LooseBookView(book: book, width: 140)
                        }
                        .buttonStyle(PressableButtonStyle())
                        .id(index)
                    }
                }
                .scrollTargetLayout()
                .padding(.vertical, 4)
            }
            .scrollPosition(id: $position)
            .padding(.horizontal, -20)
            .contentMargins(.horizontal, 20, for: .scrollContent)
            .task(id: books.count) {
                guard !reduceMotion, books.count > 1 else { return }
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 3_000_000_000)
                    withAnimation(.easeInOut(duration: 0.5)) {
                        let next = (position ?? 0) + 1
                        position = next >= books.count ? 0 : next
                    }
                }
            }
        }
    }
}
