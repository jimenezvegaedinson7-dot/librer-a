import SwiftUI

/// Mis favoritos: libros sueltos con el corazón sobre la portada para quitar.
struct FavoritesView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var themeStore: ThemeStore
    @State private var books: [Book] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var toast: ToastMessage?

    private let columns = [GridItem(.flexible(), spacing: 20), GridItem(.flexible(), spacing: 20)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("LISTA DE DESEOS").font(.caption.weight(.bold)).kerning(1.4).foregroundStyle(Brand.dorado)
                    Text("Mis favoritos").font(.serif(30))
                    if !books.isEmpty {
                        Text(books.count == 1 ? "1 libro guardado" : "\(books.count) libros guardados")
                            .font(.subheadline).foregroundStyle(Brand.textoSecundario)
                    }
                }
                if isLoading && books.isEmpty {
                    ShelfLoadingView(message: "Cargando tus favoritos...").frame(maxWidth: .infinity).padding(.top, 60)
                } else if let errorMessage, books.isEmpty {
                    EmptyStateView(systemImage: "wifi.exclamationmark", title: "No se pudieron cargar",
                                   message: errorMessage, actionTitle: "Reintentar",
                                   action: { Task { await load() } })
                } else if books.isEmpty {
                    EmptyStateView(systemImage: "heart", title: "Sin favoritos todavía",
                                   message: "Toca el corazón en la ficha de un libro para guardarlo aquí.")
                } else {
                    GeometryReader { geo in
                        let width = (geo.size.width - 20) / 2
                        LazyVGrid(columns: columns, spacing: 18) {
                            ForEach(Array(books.enumerated()), id: \.element.id) { index, book in
                                NavigationLink(value: book) {
                                    LooseBookView(book: book, width: width, accessory: AnyView(heart(book)))
                                }
                                .buttonStyle(PressableButtonStyle())
                                .appear(index)
                            }
                        }
                    }
                    .frame(minHeight: CGFloat((books.count + 1) / 2) * 360)
                }
            }
            .padding(20)
        }
        .background(Brand.fondo.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: Book.self) { BookDetailView(book: $0) }
        .refreshable { await load() }
        .task { await load() }
        .toast($toast)
    }

    private func heart(_ book: Book) -> some View {
        Button {
            Task { await remove(book) }
        } label: {
            Image(systemName: "heart.fill")
                .foregroundStyle(themeStore.theme.primary)
                .frame(width: 34, height: 34)
                .background(Circle().fill(.white.opacity(0.95)))
                .overlay(Circle().stroke(Brand.divisor))
        }
        .accessibilityLabel("Quitar de favoritos")
    }

    private func load() async {
        isLoading = books.isEmpty
        errorMessage = nil
        do {
            books = try await appState.favoritesService.favorites()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func remove(_ book: Book) async {
        withAnimation { books.removeAll { $0.id == book.id } }
        do {
            try await appState.favoritesService.setFavorite(false, bookID: book.idLibro)
            toast = ToastMessage(text: "Eliminado de tus favoritos.")
        } catch {
            toast = ToastMessage(text: error.localizedDescription)
            await load()
        }
    }
}
