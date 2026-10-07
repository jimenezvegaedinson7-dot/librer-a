import SwiftUI

/// Entrega y pago (paso 2 de 3), con las mismas reglas que Flutter:
/// delivery por zonas dentro de Pallasca o recojo gratuito en Pallasca;
/// documento DNI/RUC/CE; pago con PayU DENTRO de la app y, al volver, el
/// estado se confirma con la API (con celebración si se aprobó).
struct CheckoutView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var cart: CartStore
    @EnvironmentObject private var themeStore: ThemeStore
    @EnvironmentObject private var router: StoreRouter
    @Environment(\.dismiss) private var dismiss

    @State private var delivery: DeliveryType = .home
    @State private var zones: [DeliveryZone] = []
    @State private var zoneID: Int?
    @State private var address = ""
    @State private var reference = ""
    @State private var documentType = "DNI"
    @State private var document = ""
    @State private var loadingZones = true
    @State private var zonesError: String?
    @State private var paymentLink: PaymentLink?
    @State private var celebration: CelebrationContent?
    @State private var processing = false
    @State private var errorMessage: String?
    @State private var order: PaymentOrder?
    @State private var paymentMessage: String?
    @State private var paid = false

    private var shipping: Double {
        guard delivery == .home else { return 0 }
        return zones.first { $0.idZona == zoneID }?.tarifa ?? 0
    }

    private var totalCents: Int { cart.totalCents + Money.cents(shipping) }

    var body: some View {
        Group {
            if paid {
                successView
            } else if cart.isEmpty && order == nil {
                EmptyStateView(
                    systemImage: "cart",
                    title: "Tu carrito está vacío",
                    message: "Agrega libros al carrito para continuar."
                )
            } else if let order {
                pendingPaymentView(order)
            } else {
                form
            }
        }
        .background(Brand.fondo.ignoresSafeArea())
        .navigationTitle("Finalizar pedido")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadZones() }
        .sheet(item: $paymentLink) { link in
            PaymentSheet(url: link.url) { result in
                paymentLink = nil
                guard let order else { return }
                Task {
                    // Deja terminar el cierre de la ventana antes de celebrar.
                    try? await Task.sleep(nanoseconds: 400_000_000)
                    await verify(order, afterPayment: result == .returned)
                }
            }
        }
        .successCelebration($celebration)
    }

    // MARK: Formulario

    private var form: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("PASO 2 DE 3").font(.caption.weight(.bold)).kerning(1.4).foregroundStyle(Brand.dorado)
                    Text("Entrega y pago").font(.serif(28))
                    Text("Elige cómo recibir tu pedido y confirma tus datos.")
                        .font(.subheadline).foregroundStyle(Brand.textoSecundario)
                }
                StepsView(current: 2)

                section(number: "1", title: "Tipo de entrega") {
                    deliveryOption(.home, icon: "truck.box", title: "Delivery en Pallasca",
                                   detail: "Te lo llevamos a tu dirección dentro de Pallasca.", tag: "Según zona")
                    deliveryOption(.store, icon: "storefront", title: "Recojo en Pallasca",
                                   detail: "Lo separamos y te avisamos cuando esté listo.", tag: "Gratis")
                    if delivery == .home { homeFields } else { storePickupNote }
                }

                section(number: "2", title: "Documento de identidad") {
                    Picker("Tipo de documento", selection: $documentType) {
                        Text("DNI").tag("DNI")
                        Text("RUC").tag("RUC")
                        Text("Carné ext.").tag("CE")
                    }
                    .pickerStyle(.segmented)
                    BrandField(
                        title: "Número de documento",
                        systemImage: "person.text.rectangle",
                        text: $document,
                        keyboard: documentType == "CE" ? .asciiCapable : .numberPad
                    )
                    Text(documentType == "DNI" ? "8 dígitos" : documentType == "RUC" ? "11 dígitos" : "Al menos 8 caracteres")
                        .font(.caption).foregroundStyle(Brand.textoTerciario)
                }

                summaryCard
                if let errorMessage { ErrorBanner(message: errorMessage) }
            }
            .padding(20)
        }
        .safeAreaInset(edge: .bottom) { payBar }
    }

    private var homeFields: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label {
                (Text("Pallasca").fontWeight(.semibold) + Text("  ·  Repartimos por zonas dentro de Pallasca"))
            } icon: {
                Image(systemName: "mappin.circle").foregroundStyle(Brand.dorado)
            }
            .font(.subheadline)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 10).fill(Brand.papel))

            if loadingZones {
                ShelfLoadingView(message: "Cargando zonas de delivery...")
            } else if let zonesError {
                VStack(alignment: .leading, spacing: 8) {
                    ErrorBanner(message: zonesError)
                    Button("Reintentar") { Task { await loadZones(force: true) } }
                        .font(.subheadline.weight(.semibold))
                }
            } else if zones.isEmpty {
                Text("Por ahora no hay zonas de delivery activas. Puedes elegir el recojo en Pallasca.")
                    .font(.footnote)
                    .foregroundStyle(Brand.aviso)
            } else {
                Picker("Zona de delivery", selection: $zoneID) {
                    Text("Selecciona tu zona").tag(Int?.none)
                    ForEach(zones) { z in
                        Text("\(z.nombre) · S/ \(Money.format(z.tarifa))").tag(Int?.some(z.idZona))
                    }
                }
                .pickerStyle(.navigationLink)
            }
            BrandField(title: "Dirección de entrega (calle, número)", systemImage: "mappin.and.ellipse", text: $address)
            BrandField(title: "Referencia (opcional)", systemImage: "signpost.right", text: $reference)
        }
        .padding(.top, 4)
    }

    private func deliveryOption(_ type: DeliveryType, icon: String, title: String, detail: String, tag: String) -> some View {
        let selected = delivery == type
        return Button {
            withAnimation(.easeOut(duration: 0.2)) { delivery = type }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .foregroundStyle(selected ? .white : Brand.textoSecundario)
                    .frame(width: 40, height: 40)
                    .background(RoundedRectangle(cornerRadius: 10).fill(selected ? themeStore.theme.primary : Brand.superficie))
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        Text(title).font(.subheadline.weight(.semibold))
                            .foregroundStyle(selected ? themeStore.theme.primary : Brand.texto)
                        Text(tag).font(.caption.weight(.semibold)).foregroundStyle(Brand.textoTerciario)
                    }
                    Text(detail).font(.caption).foregroundStyle(Brand.textoSecundario)
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                Image(systemName: selected ? "largecircle.fill.circle" : "circle")
                    .foregroundStyle(selected ? themeStore.theme.primary : Brand.divisor)
            }
            .padding(12)
            .background(RoundedRectangle(cornerRadius: 12).fill(selected ? themeStore.theme.primary.opacity(0.08) : Brand.papel))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(selected ? themeStore.theme.primary : Brand.divisor, lineWidth: selected ? 1.4 : 1))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func section<Content: View>(number: String, title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Text(number).font(.caption.weight(.bold))
                    .frame(width: 26, height: 26)
                    .background(Circle().fill(Brand.pergamino))
                Text(title).font(.serif(18))
            }
            content()
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 18).fill(Brand.superficie))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Brand.divisor))
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Resumen del pedido").font(.serif(18))
            ForEach(cart.items) { item in
                HStack {
                    Text("\(item.book.displayTitle) × \(item.quantity)").lineLimit(1)
                    Spacer()
                    Text("S/ \(Money.format(item.subtotal))").monospacedDigit()
                }
                .font(.caption).foregroundStyle(Brand.textoSecundario)
            }
            Divider()
            line("Subtotal", Money.format(cart.total))
            line("Envío", delivery == .store ? "Sin costo" : "S/ \(Money.format(shipping))", plain: true)
            Divider()
            HStack {
                Text("Total").font(.serif(18))
                Spacer()
                PriceText(amount: Double(totalCents) / 100, size: 22)
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 16).fill(Brand.pergamino.opacity(0.6)))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.dorado.opacity(0.28)))
    }

    private func line(_ label: String, _ value: String, plain: Bool = false) -> some View {
        HStack {
            Text(label).foregroundStyle(Brand.textoSecundario)
            Spacer()
            Text(plain ? value : "S/ \(value)").fontWeight(.semibold).monospacedDigit()
        }
        .font(.subheadline)
    }

    private var payBar: some View {
        VStack(spacing: 8) {
            Button {
                Task { await pay() }
            } label: {
                if processing {
                    ProgressView().tint(.white)
                } else {
                    HStack {
                        Image(systemName: "lock.fill")
                        Text("Ir al pago seguro")
                        Text("S/ \(Money.format(Double(totalCents) / 100))")
                            .padding(.horizontal, 10).padding(.vertical, 4)
                            .background(Capsule().fill(.white.opacity(0.18)))
                    }
                }
            }
            .buttonStyle(BrandButtonStyle())
            .disabled(processing)
            Label("Pagarás con PayU sin salir de la app, en una conexión segura.", systemImage: "checkmark.shield")
                .font(.caption2)
                .foregroundStyle(Brand.textoTerciario)
        }
        .padding(16)
        .background(.bar)
    }

    // MARK: Pago pendiente / confirmado

    private func pendingPaymentView(_ order: PaymentOrder) -> some View {
        let total = order.total ?? Double(totalCents) / 100
        return VStack(spacing: 16) {
            Spacer()
            medallion(systemImage: "hourglass", color: Brand.aviso)
            Text("¡Gracias por tu compra!").font(.serif(28)).multilineTextAlignment(.center)
            Text("Tu orden por S/ \(Money.format(total)) quedó creada. Ahora solo falta pagarla en PayU para confirmarla.")
                .multilineTextAlignment(.center)
                .foregroundStyle(Brand.textoSecundario)
            Text("Si cerraste la ventana de pago, puedes volver a abrirla aquí mismo.")
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(Brand.textoTerciario)
            if let paymentMessage {
                Text(paymentMessage).font(.subheadline).foregroundStyle(Brand.aviso).multilineTextAlignment(.center)
            }
            Button {
                Task { await verify(order) }
            } label: {
                if processing { ProgressView().tint(.white) } else { Text("Ya pagué, verificar") }
            }
            .buttonStyle(BrandButtonStyle())
            .disabled(processing)
            if let url = order.checkoutURL.flatMap({ URL(string: $0) }) {
                Button { paymentLink = PaymentLink(url: url) } label: {
                    Label("Continuar el pago", systemImage: "creditcard")
                }
                .buttonStyle(BrandButtonStyle(filled: false))
            }
            Button("Volver al catálogo", action: backToCatalog)
                .font(.subheadline.weight(.semibold))
            Spacer()
        }
        .padding(24)
    }

    private var successView: some View {
        let total = order?.total
        return VStack(spacing: 16) {
            Spacer()
            medallion(systemImage: "checkmark", color: Brand.exito)
            Text("¡Gracias por tu compra!").font(.serif(28)).multilineTextAlignment(.center)
            Text(total.map { "Tu orden por S/ \(Money.format($0)) se registró correctamente." }
                 ?? "Tu orden se registró correctamente.")
                .multilineTextAlignment(.center)
                .foregroundStyle(Brand.textoSecundario)
            Button("Volver al catálogo", action: backToCatalog)
                .buttonStyle(BrandButtonStyle())
            Spacer()
        }
        .padding(24)
    }

    /// Medallón circular con filete dorado para estados finales (como Flutter).
    private func medallion(systemImage: String, color: Color) -> some View {
        Image(systemName: systemImage)
            .font(.system(size: 38, weight: .bold))
            .foregroundStyle(color)
            .frame(width: 96, height: 96)
            .background(Circle().fill(color.opacity(0.12)))
            .overlay(Circle().stroke(Brand.dorado.opacity(0.55), lineWidth: 1.5).padding(-6))
    }

    private var storePickupNote: some View {
        Label {
            Text("Recoges tu pedido en Pallasca sin costo. Te avisaremos cuando esté listo para recoger.")
                .font(.footnote)
                .foregroundStyle(Brand.texto)
        } icon: {
            Image(systemName: "storefront").foregroundStyle(Brand.exito)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 12).fill(Brand.exito.opacity(0.08)))
    }

    private func backToCatalog() {
        dismiss()
        router.openCatalog()
    }

    // MARK: Acciones

    private func validationError() -> String? {
        let doc = document.trimmingCharacters(in: .whitespaces)
        if doc.isEmpty { return "Ingresa tu número de documento." }
        if documentType == "DNI" && doc.range(of: "^\\d{8}$", options: .regularExpression) == nil {
            return "El DNI debe tener exactamente 8 dígitos."
        }
        if documentType == "RUC" && doc.range(of: "^\\d{11}$", options: .regularExpression) == nil {
            return "El RUC debe tener exactamente 11 dígitos."
        }
        if documentType == "CE" && doc.count < 8 {
            return "El carné de extranjería debe tener al menos 8 caracteres."
        }
        if delivery == .home {
            if !zones.contains(where: { $0.idZona == zoneID }) {
                return "Selecciona una zona activa de delivery dentro de Pallasca."
            }
            if address.trimmingCharacters(in: .whitespaces).count < 5 {
                return "Indica una dirección de entrega válida."
            }
        }
        return nil
    }

    private func loadZones(force: Bool = false) async {
        guard zones.isEmpty || force else { return }
        loadingZones = true
        zonesError = nil
        do {
            zones = try await appState.checkoutService.deliveryZones()
            if !zones.contains(where: { $0.idZona == zoneID }) { zoneID = zones.first?.idZona }
        } catch {
            zonesError = "No se pudieron cargar las zonas de delivery. \(error.localizedDescription)"
        }
        loadingZones = false
    }

    private func pay() async {
        errorMessage = validationError()
        guard errorMessage == nil else { return }
        processing = true
        defer { processing = false }
        do {
            let created = try await appState.checkoutService.createOrder(
                items: cart.items,
                delivery: delivery,
                address: address,
                zoneID: zoneID,
                reference: reference,
                documentType: documentType,
                document: document
            )
            order = created
            if let url = created.checkoutURL.flatMap({ URL(string: $0) }) {
                paymentLink = PaymentLink(url: url)
            } else {
                paymentMessage = "La orden se creó, pero no se recibió el enlace de pago. Puedes continuarlo desde Mis compras."
            }
        } catch {
            errorMessage = "No se pudo completar la compra: \(error.localizedDescription)"
        }
    }

    /// Consulta el estado real del pago. Al volver de la ventana de PayU
    /// (`afterPayment`) reintenta unos segundos: la confirmación de PayU
    /// llega al servidor con un pequeño retraso.
    private func verify(_ order: PaymentOrder, afterPayment: Bool = false) async {
        guard let orderID = order.orderID, !orderID.isEmpty else { return }
        processing = true
        defer { processing = false }
        do {
            var state = try await appState.checkoutService.orderState(orderID: orderID)
            var attempt = 0
            while afterPayment && attempt < 4 && !state.isPaid && !state.isCancelled {
                attempt += 1
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                state = try await appState.checkoutService.orderState(orderID: orderID)
            }
            if state.isPaid {
                cart.clearAfterPayment()
                appState.checkoutService.resetIdempotency()
                celebrate($celebration, title: "¡Pago confirmado!",
                          message: "Tu pedido pasa a preparación. Te avisaremos en cada paso.")
                withAnimation { paid = true }
            } else if state.isCancelled {
                appState.checkoutService.resetIdempotency()
                paymentMessage = "El pago no fue completado."
                self.order = nil
            } else {
                paymentMessage = "El pago aún no se confirma. Podrás verificarlo en breve."
            }
        } catch {
            paymentMessage = error.localizedDescription
        }
    }
}
