import SwiftUI

/// Ficha del libro (mismas acciones que Flutter): cantidad, añadir al
/// carrito, reservar y favorito. Precio y stock se refrescan del backend.
struct BookDetailView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var cart: CartStore
    @EnvironmentObject private var router: StoreRouter
    @EnvironmentObject private var themeStore: ThemeStore

    @State private var book: Book
    @State private var quantity = 1
    @State private var isFavorite = false
    @State private var favoriteBusy = false
    @State private var reserving = false
    @State private var showFullSynopsis = false
    @State private var toast: ToastMessage?
    @State private var reservationError: String?

    init(book: Book) {
        _book = State(initialValue: book)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                coverStage
                VStack(alignment: .leading, spacing: 16) {
                    chips
                    VStack(alignment: .leading, spacing: 6) {
                        Text(book.displayTitle).font(.serif(28)).foregroundStyle(Brand.texto)
                        (Text("de ").foregroundColor(Brand.textoTerciario)
                            + Text(book.displayAuthor).foregroundColor(Brand.textoSecundario))
                            .font(.title3)
                    }
                    priceCard
                    if let text = book.descripcion?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty {
                        synopsis(text)
                    }
                    technicalSheet
                }
                .padding(20)
            }
        }
        .background(Brand.fondo.ignoresSafeArea())
        .navigationTitle("Ficha del libro")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { Task { await toggleFavorite() } } label: {
                    Image(systemName: isFavorite ? "heart.fill" : "heart")
                        .foregroundStyle(isFavorite ? themeStore.theme.primary : Brand.texto)
                        .symbolEffect(.bounce, value: isFavorite)
                }
                .disabled(favoriteBusy)
                .accessibilityLabel(isFavorite ? "Quitar de favoritos" : "Agregar a favoritos")

                Button { router.selectedTab = .cart } label: {
                    Image(systemName: "cart")
                        .symbolEffect(.bounce, value: cart.totalUnits)
                        .overlay(alignment: .topTrailing) {
                            if cart.totalUnits > 0 {
                                Text("\(cart.totalUnits)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(.white)
                                    .padding(4)
                                    .background(Circle().fill(themeStore.theme.primary))
                                    .offset(x: 10, y: -10)
                            }
                        }
                }
                .accessibilityLabel("Ver carrito, \(cart.totalUnits) unidades")
            }
        }
        .safeAreaInset(edge: .bottom) { bottomBar }
        .toast($toast)
        .alert("No se pudo reservar", isPresented: Binding(
            get: { reservationError != nil },
            set: { if !$0 { reservationError = nil } }
        )) {
            Button("Aceptar", role: .cancel) { }
        } message: {
            Text(reservationError ?? "")
        }
        .task { await refresh() }
    }

    // MARK: Secciones

    private var coverStage: some View {
        BookCover(path: book.portada, width: 200)
            .frame(maxWidth: .infinity)
            .padding(.top, 8)
            .padding(.bottom, 28)
            .background(
                AnimatedBookshelf(
                    ink: ProfileTheme.darken(themeStore.theme.primaryRGB, 0.22),
                    accent: 0xB98D3E,
                    opacity: 0.12,
                    shelfHeight: 72,
                    seed: book.idLibro
                )
                .mask(
                    LinearGradient(
                        stops: [.init(color: .white, location: 0.3), .init(color: .clear, location: 1)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            )
            .background(
                LinearGradient(colors: [Brand.pergamino, Brand.fondo], startPoint: .top, endPoint: .bottom)
            )
    }

    private var chips: some View {
        HStack(spacing: 8) {
            if let category = book.categoria, !category.isEmpty {
                chip(category, color: themeStore.theme.primary)
            }
            chip(book.isAvailable ? "● Envío inmediato" : "Sin existencias",
                 color: book.isAvailable ? Brand.exito : Brand.error)
        }
    }

    private func chip(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Capsule().fill(color.opacity(0.1)))
    }

    private var priceCard: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Precio").font(.caption.weight(.semibold)).foregroundStyle(Brand.textoTerciario)
                PriceText(amount: book.precio, size: 30)
                Text(book.isAvailable
                     ? "\(book.stock) \(book.stock == 1 ? "ejemplar disponible" : "ejemplares disponibles")"
                     : "Agotado por ahora")
                    .font(.caption)
                    .foregroundStyle(Brand.textoSecundario)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 6) {
                Text("Cantidad").font(.caption.weight(.semibold)).foregroundStyle(Brand.textoTerciario)
                QuantityStepper(
                    value: quantity,
                    canDecrement: quantity > 1,
                    canIncrement: book.stock > 0 && quantity < book.stock,
                    onDecrement: { quantity -= 1 },
                    onIncrement: { quantity += 1 }
                )
                .disabled(!book.isAvailable)
            }
        }
        .padding(18)
        .background(RoundedRectangle(cornerRadius: 16).fill(Brand.superficie))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.divisor))
    }

    private func synopsis(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Sinopsis", systemImage: "text.alignleft").font(.serif(18))
            Text(text)
                .foregroundStyle(Brand.textoSecundario)
                .lineLimit(showFullSynopsis ? nil : 4)
            if text.count > 180 {
                Button(showFullSynopsis ? "Leer menos" : "Leer más") {
                    withAnimation(.easeOut(duration: 0.25)) { showFullSynopsis.toggle() }
                }
                .font(.subheadline.weight(.semibold))
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16).fill(Brand.superficie))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.divisor))
    }

    private var technicalSheet: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Ficha técnica").font(.serif(18))
            row("Autor", book.displayAuthor)
            if let category = book.categoria, !category.isEmpty { row("Categoría", category) }
            if let isbn = book.isbn, !isbn.isEmpty { row("ISBN", isbn) }
            row("Disponibilidad", book.isAvailable ? "\(book.stock) en stock" : "Agotado")
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16).fill(Brand.superficie))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.divisor))
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).foregroundStyle(Brand.textoSecundario)
            Spacer()
            Text(value).foregroundStyle(Brand.texto).multilineTextAlignment(.trailing)
        }
        .font(.subheadline)
    }

    private var bottomBar: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Total").font(.caption).foregroundStyle(Brand.textoTerciario)
                PriceText(amount: Double(Money.cents(book.precio) * quantity) / 100, size: 20)
            }
            Spacer()
            Button {
                Task { await reserve() }
            } label: {
                if reserving {
                    ProgressView()
                } else {
                    Label("Reservar", systemImage: "calendar.badge.checkmark")
                }
            }
            .buttonStyle(BrandButtonStyle(filled: false))
            .frame(width: 130)
            .disabled(!book.isAvailable || reserving)

            Button {
                let added = cart.add(book, quantity: quantity)
                toast = ToastMessage(
                    text: CartMessages.added(added, requested: quantity, inCart: cart.quantity(of: book.idLibro))
                )
            } label: {
                Label("Añadir", systemImage: "cart.badge.plus")
            }
            .buttonStyle(BrandButtonStyle())
            .frame(width: 130)
            .disabled(!book.isAvailable)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.bar)
    }

    // MARK: Acciones

    private func refresh() async {
        do {
            let fresh = try await appState.catalogService.book(id: book.idLibro)
            book = fresh
            quantity = min(max(1, quantity), max(1, fresh.stock))
        } catch {
            // Se mantiene el libro recibido de la lista.
        }
        do {
            isFavorite = try await appState.favoritesService.isFavorite(bookID: book.idLibro)
        } catch {
            isFavorite = false
        }
    }

    private func toggleFavorite() async {
        favoriteBusy = true
        let target = !isFavorite
        do {
            try await appState.favoritesService.setFavorite(target, bookID: book.idLibro)
            isFavorite = target
            toast = ToastMessage(text: target ? "Agregado a tus favoritos." : "Eliminado de tus favoritos.")
        } catch {
            toast = ToastMessage(text: error.localizedDescription)
        }
        favoriteBusy = false
    }

    private func reserve() async {
        reserving = true
        defer { reserving = false }
        do {
            _ = try await appState.reservationService.createReservation(bookID: book.idLibro, quantity: quantity)
            router.reservationsVersion += 1
            toast = ToastMessage(
                text: "Reserva realizada correctamente."
            )
        } catch {
            reservationError = error.localizedDescription
        }
    }
}

/// Selector − cantidad + en píldora.
struct QuantityStepper: View {
    let value: Int
    let canDecrement: Bool
    let canIncrement: Bool
    let onDecrement: () -> Void
    let onIncrement: () -> Void
    @EnvironmentObject private var themeStore: ThemeStore

    var body: some View {
        HStack(spacing: 0) {
            Button(action: onDecrement) {
                Image(systemName: "minus").frame(width: 38, height: 38)
            }
            .disabled(!canDecrement)
            .accessibilityLabel("Quitar uno")
            Text("\(value)")
                .font(.headline.monospacedDigit())
                .frame(minWidth: 28)
                .contentTransition(.numericText())
                .animation(.easeOut(duration: 0.2), value: value)
            Button(action: onIncrement) {
                Image(systemName: "plus").frame(width: 38, height: 38)
            }
            .disabled(!canIncrement)
            .accessibilityLabel("Añadir uno")
        }
        .foregroundStyle(themeStore.theme.primary)
        .background(Capsule().fill(Brand.papel))
        .overlay(Capsule().stroke(Brand.divisor))
    }
}
