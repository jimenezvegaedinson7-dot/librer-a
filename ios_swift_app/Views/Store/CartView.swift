import SwiftUI

/// Pestaña Carrito: cantidades con tope de stock, guardados para más tarde
/// y resumen con cada libro (cantidad × precio = subtotal).
struct CartView: View {
    @EnvironmentObject private var cart: CartStore
    @EnvironmentObject private var router: StoreRouter
    @EnvironmentObject private var themeStore: ThemeStore
    @State private var toast: ToastMessage?
    @State private var goToCheckout = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    if cart.isEmpty && cart.saved.isEmpty {
                        EmptyStateView(
                            systemImage: "cart",
                            title: "Tu carrito está vacío",
                            message: "Agrega libros desde el catálogo para empezar.",
                            actionTitle: "Ver catálogo",
                            action: { router.openCatalog() }
                        )
                        .padding(.top, 40)
                    } else {
                        if !cart.isEmpty {
                            StepsView(current: 1)
                            HStack {
                                Text("Mis libros").font(.serif(20))
                                Spacer()
                                Text("\(cart.items.count)")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(themeStore.theme.primary)
                                    .padding(.horizontal, 8).padding(.vertical, 3)
                                    .background(Capsule().fill(themeStore.theme.primary.opacity(0.12)))
                            }
                            ForEach(Array(cart.items.enumerated()), id: \.element.id) { index, item in
                                CartItemRow(item: item, onLimit: { stock in
                                    toast = ToastMessage(text: "Solo hay \(stock) unidades disponibles de este libro.")
                                })
                                .appear(index)
                            }
                            summary
                        } else {
                            Text("Tu carrito está vacío, pero tienes libros guardados para más tarde.")
                                .font(.subheadline)
                                .foregroundStyle(Brand.textoSecundario)
                        }
                        if !cart.saved.isEmpty { savedSection }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .background(Brand.fondo.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) {
                if !cart.isEmpty { bottomBar }
            }
            .navigationDestination(isPresented: $goToCheckout) { CheckoutView() }
            .navigationDestination(for: Book.self) { BookDetailView(book: $0) }
            .toolbar(.hidden, for: .navigationBar)
            .toast($toast)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("TU PEDIDO").font(.caption.weight(.bold)).kerning(1.4).foregroundStyle(Brand.dorado)
            Text("Mi carrito").font(.serif(30))
            if cart.totalUnits > 0 {
                Text(cart.totalUnits == 1 ? "1 unidad lista para comprar" : "\(cart.totalUnits) unidades listas para comprar")
                    .font(.subheadline)
                    .foregroundStyle(Brand.textoSecundario)
            }
        }
        .padding(.top, 16)
        .padding(.leading, 4)
    }

    private var summary: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Resumen del pedido").font(.serif(18))
            ForEach(cart.items) { item in
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.book.displayTitle).lineLimit(1)
                        Text("\(item.quantity) × S/ \(Money.format(item.book.precio))")
                            .font(.caption)
                            .foregroundStyle(Brand.textoSecundario)
                            .monospacedDigit()
                    }
                    Spacer()
                    Text("S/ \(Money.format(item.subtotal))").monospacedDigit()
                }
                .font(.subheadline)
            }
            Divider().overlay(Brand.dorado.opacity(0.3))
            HStack {
                Text("Subtotal").foregroundStyle(Brand.textoSecundario)
                Spacer()
                Text("S/ \(Money.format(cart.total))").fontWeight(.semibold).monospacedDigit()
            }
            HStack {
                Text("Total").font(.serif(18))
                Spacer()
                PriceText(amount: cart.total, size: 20)
            }
            Label("El envío y la entrega se definen en el siguiente paso.", systemImage: "shippingbox")
                .font(.caption)
                .foregroundStyle(Brand.textoSecundario)
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 16).fill(Brand.pergamino.opacity(0.6)))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.dorado.opacity(0.28)))
    }

    private var savedSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Guardados para más tarde").font(.serif(18)).padding(.top, 8)
            ForEach(cart.saved) { item in
                HStack(spacing: 12) {
                    BookCover(path: item.book.portada, width: 48, strongShadow: false)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.book.displayTitle).font(.serif(15)).lineLimit(2)
                        PriceText(amount: item.book.precio, size: 15)
                    }
                    Spacer()
                    VStack(spacing: 6) {
                        Button("Mover al carrito") { withAnimation { cart.moveToCart(item.id) } }
                            .font(.caption.weight(.semibold))
                        Button("Quitar", role: .destructive) { withAnimation { cart.removeSaved(item.id) } }
                            .font(.caption)
                    }
                }
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 14).fill(Brand.superficie))
            }
        }
    }

    private var bottomBar: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Total").font(.serif(18))
                    Text(cart.totalUnits == 1 ? "1 unidad en tu carrito" : "\(cart.totalUnits) unidades en tu carrito")
                        .font(.caption)
                        .foregroundStyle(Brand.textoTerciario)
                }
                Spacer()
                PriceText(amount: cart.total, size: 24)
                    .contentTransition(.numericText())
                    .animation(.easeOut(duration: 0.2), value: cart.totalCents)
            }
            Button {
                goToCheckout = true
            } label: {
                Label("Continuar con la compra", systemImage: "arrow.right")
                    .labelStyle(TrailingIconLabelStyle())
            }
            .buttonStyle(BrandButtonStyle())
        }
        .padding(16)
        .background(.bar)
    }
}

private struct CartItemRow: View {
    let item: CartItem
    let onLimit: (Int) -> Void
    @EnvironmentObject private var cart: CartStore

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 14) {
                NavigationLink(value: item.book) {
                    BookCover(path: item.book.portada, width: 72, strongShadow: false)
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text(item.book.displayTitle).font(.serif(17)).lineLimit(2)
                    Text(item.book.displayAuthor).font(.caption).foregroundStyle(Brand.textoSecundario)
                    Text("S/ \(Money.format(item.book.precio)) c/u")
                        .font(.caption)
                        .foregroundStyle(Brand.textoSecundario)
                    HStack {
                        QuantityStepper(
                            value: item.quantity,
                            canDecrement: true,
                            canIncrement: true,
                            onDecrement: { withAnimation { cart.decrement(item.id) } },
                            onIncrement: {
                                if !cart.increment(item.id) { onLimit(item.book.stock) }
                            }
                        )
                        Spacer()
                        PriceText(amount: item.subtotal, size: 18)
                            .contentTransition(.numericText())
                            .animation(.easeOut(duration: 0.2), value: item.subtotalCents)
                    }
                    .padding(.top, 4)
                }
            }
            .padding(14)
            Divider()
            HStack {
                Button { withAnimation { cart.saveForLater(item.id) } } label: {
                    Label("Guardar", systemImage: "bookmark")
                }
                .foregroundStyle(Brand.textoSecundario)
                Spacer()
                Button(role: .destructive) { withAnimation { cart.remove(item.id) } } label: {
                    Label("Eliminar", systemImage: "trash")
                }
            }
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .background(RoundedRectangle(cornerRadius: 16).fill(Brand.superficie))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.divisor))
    }
}

/// Pasos del pedido: Carrito · Entrega · Pago.
struct StepsView: View {
    let current: Int
    @EnvironmentObject private var themeStore: ThemeStore

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(["Carrito", "Entrega", "Pago"].enumerated()), id: \.offset) { index, name in
                let step = index + 1
                VStack(spacing: 6) {
                    ZStack {
                        Circle()
                            .fill(step <= current ? themeStore.theme.primary : Color.clear)
                            .overlay(Circle().stroke(step <= current ? .clear : Brand.divisor, lineWidth: 1.5))
                            .frame(width: 30, height: 30)
                        if step < current {
                            Image(systemName: "checkmark").font(.caption.weight(.bold)).foregroundStyle(.white)
                        } else {
                            Text("\(step)").font(.caption.weight(.bold))
                                .foregroundStyle(step == current ? .white : Brand.textoTerciario)
                        }
                    }
                    Text(name).font(.caption)
                        .foregroundStyle(step <= current ? Brand.texto : Brand.textoTerciario)
                }
                if step < 3 {
                    Rectangle()
                        .fill(step < current ? Brand.dorado : Brand.divisor)
                        .frame(height: 2)
                        .padding(.bottom, 18)
                }
            }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 16).fill(Brand.superficie))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.divisor))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Paso \(current) de 3")
    }
}

/// Etiqueta con el icono a la derecha ("Continuar →").
struct TrailingIconLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) {
            configuration.title
            configuration.icon
        }
    }
}
