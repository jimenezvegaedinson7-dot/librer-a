import SwiftUI

/// Libro de Reclamaciones dentro de la app (Ley 29571, D.S. 011-2011-PCM),
/// como Flutter: mismo endpoint público que la web, con los datos de la
/// cuenta ya puestos (nombre, correo, teléfono y, de las compras, documento
/// y domicilio). Elegir una compra completa el bien y el monto. Todo se
/// puede corregir antes de enviar.
struct ComplaintsBookView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var documentType = "DNI"
    @State private var document = ""
    @State private var address = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var isMinor = false
    @State private var guardian = ""
    @State private var goodType = "producto"
    @State private var goodDescription = ""
    @State private var amount = ""
    @State private var purchases: [Purchase] = []
    @State private var purchaseID: Int?
    @State private var kind = "reclamo"
    @State private var detail = ""
    @State private var request = ""
    @State private var accepts = false
    @State private var sending = false
    @State private var prefilled = false
    @State private var errorMessage: String?
    @State private var registered: ComplaintResponse?

    var body: some View {
        Group {
            if let registered { done(registered) } else { form }
        }
        .background(Brand.fondo.ignoresSafeArea())
        .navigationTitle("Libro de Reclamaciones")
        .navigationBarTitleDisplayMode(.inline)
        .task { await prefill() }
    }

    // MARK: Formulario

    private var form: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Hoja de reclamación virtual · Librería del Saber")
                    .font(.caption)
                    .foregroundStyle(Brand.textoSecundario)
                if prefilled {
                    Label("Completamos los datos de tu cuenta y tus compras. Puedes corregirlos antes de enviar.",
                          systemImage: "sparkles")
                        .font(.footnote)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 10).fill(Brand.acento.opacity(0.12)))
                }

                section(1, "Identificación del consumidor") {
                    BrandField(title: "Nombre completo", systemImage: "person", text: $name, contentType: .name)
                    HStack(spacing: 8) {
                        Picker("Documento", selection: $documentType) {
                            Text("DNI").tag("DNI")
                            Text("C. ext.").tag("CE")
                            Text("Pasaporte").tag("PASAPORTE")
                            Text("RUC").tag("RUC")
                        }
                        .pickerStyle(.menu)
                        .fixedSize()
                        BrandField(title: "Número", systemImage: "person.text.rectangle", text: $document,
                                   keyboard: documentType == "DNI" || documentType == "RUC" ? .numberPad : .asciiCapable)
                    }
                    BrandField(title: "Domicilio", systemImage: "house", text: $address, contentType: .fullStreetAddress)
                    BrandField(title: "Teléfono", systemImage: "phone", text: $phone, keyboard: .phonePad, contentType: .telephoneNumber)
                    BrandField(title: "Correo electrónico", systemImage: "at", text: $email,
                               keyboard: .emailAddress, contentType: .emailAddress)
                    Toggle("Soy menor de edad", isOn: $isMinor).font(.subheadline)
                    if isMinor {
                        BrandField(title: "Nombre del padre, madre o apoderado", systemImage: "person.2", text: $guardian)
                    }
                }

                section(2, "Identificación del bien contratado") {
                    if !purchases.isEmpty {
                        Picker("Compra relacionada", selection: $purchaseID) {
                            Text("Ninguna / otra").tag(Int?.none)
                            ForEach(purchases) { p in
                                Text("N.° \(p.idVenta) · S/ \(Money.format(p.total))").tag(Int?.some(p.idVenta))
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: purchaseID) { _, id in choosePurchase(id) }
                    }
                    Picker("Tipo", selection: $goodType) {
                        Text("Producto").tag("producto")
                        Text("Servicio").tag("servicio")
                    }
                    .pickerStyle(.segmented)
                    BrandField(title: "Descripción (ej. libro «Rayuela»)", systemImage: "book", text: $goodDescription)
                    BrandField(title: "Monto reclamado (S/)", systemImage: "banknote", text: $amount, keyboard: .decimalPad)
                }

                section(3, "Detalle de la reclamación") {
                    Picker("Tipo de hoja", selection: $kind) {
                        Text("Reclamo").tag("reclamo")
                        Text("Queja").tag("queja")
                    }
                    .pickerStyle(.segmented)
                    Text(kind == "reclamo"
                         ? "Disconformidad con los productos o servicios."
                         : "Malestar o descontento con la atención al público.")
                        .font(.caption)
                        .foregroundStyle(Brand.textoSecundario)
                    editor("Detalle", text: $detail, minHeight: 90)
                    editor("Pedido (¿qué solicitas?)", text: $request, minHeight: 60)
                }

                Text("La formulación del reclamo no impide acudir a otras vías de solución ni es requisito previo para denunciar ante el INDECOPI. Responderemos en un plazo no mayor a 15 días hábiles y recibirás una copia en tu correo.")
                    .font(.caption2)
                    .foregroundStyle(Brand.textoSecundario)
                Toggle(isOn: $accepts) {
                    Text("Declaro que los datos son verdaderos y acepto que se usen para atender esta hoja.")
                        .font(.footnote)
                }
                if let errorMessage { ErrorBanner(message: errorMessage) }
                Button {
                    Task { await send() }
                } label: {
                    if sending { ProgressView().tint(.white) } else { Label("Registrar hoja", systemImage: "paperplane.fill") }
                }
                .buttonStyle(BrandButtonStyle())
                .disabled(sending)
            }
            .padding(16)
        }
    }

    private func section<Content: View>(_ number: Int, _ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Text("\(number)")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(Circle().fill(Brand.burdeos))
                Text(title).font(.subheadline.weight(.bold))
            }
            content()
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 14).fill(Brand.superficie))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Brand.divisor))
    }

    private func editor(_ title: String, text: Binding<String>, minHeight: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption.weight(.semibold)).foregroundStyle(Brand.textoSecundario)
            TextEditor(text: text)
                .frame(minHeight: minHeight)
                .padding(6)
                .scrollContentBackground(.hidden)
                .background(RoundedRectangle(cornerRadius: 10).fill(Brand.papel))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Brand.divisor))
                .accessibilityLabel(title)
        }
    }

    // MARK: Resultado

    private func done(_ r: ComplaintResponse) -> some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "checkmark.seal").font(.system(size: 52)).foregroundStyle(Brand.burdeos)
            Text(r.numero.isEmpty ? "Hoja registrada" : "Hoja N.° \(r.numero)").font(.serif(24))
            Text(r.mensaje).multilineTextAlignment(.center)
            if let limite = r.fechaLimite {
                Text("Te responderemos en un plazo no mayor a 15 días hábiles (a más tardar el \(String(limite.prefix(10)))).")
                    .font(.footnote)
                    .foregroundStyle(Brand.textoSecundario)
                    .multilineTextAlignment(.center)
            }
            Button("Volver al perfil") { dismiss() }
                .buttonStyle(BrandButtonStyle())
            Spacer()
        }
        .padding(24)
    }

    // MARK: Acciones

    /// Rellena lo que la cuenta ya tiene sin pisar lo escrito.
    private func prefill() async {
        func put(_ value: String?, into binding: inout String) {
            if binding.trimmingCharacters(in: .whitespaces).isEmpty,
               let v = value?.trimmingCharacters(in: .whitespaces), !v.isEmpty { binding = v }
        }
        if let user = appState.user {
            put("\(user.nombre) \(user.apellido)", into: &name)
            put(user.email, into: &email)
            put(user.telefono, into: &phone)
            prefilled = true
        }
        if let all = try? await appState.purchaseService.myPurchases() {
            let own = all
                .filter { ["pagada", "entregada"].contains($0.estado.lowercased()) }
                .sorted { $0.idVenta > $1.idVenta }
            purchases = own
            if let last = own.first {
                put(last.clienteDocumento, into: &document)
                if let t = last.clienteTipoDocumento?.uppercased(), ["DNI", "CE", "PASAPORTE", "RUC"].contains(t) {
                    documentType = t
                }
            }
            if let home = own.first(where: { $0.tipoEntrega == "domicilio" && !($0.direccion ?? "").isEmpty }) {
                put(home.direccion, into: &address)
            }
        }
    }

    private func choosePurchase(_ id: Int?) {
        guard let p = purchases.first(where: { $0.idVenta == id }) else { return }
        let titles = p.details.map(\.titulo).filter { !$0.isEmpty }.joined(separator: ", ")
        if !titles.isEmpty { goodDescription = titles.count > 250 ? String(titles.prefix(247)) + "..." : titles }
        amount = Money.format(p.total)
    }

    private func validation() -> String? {
        let doc = document.trimmingCharacters(in: .whitespaces)
        if name.trimmingCharacters(in: .whitespaces).count < 3 { return "Ingresa tu nombre completo." }
        if documentType == "DNI" && doc.range(of: "^\\d{8}$", options: .regularExpression) == nil { return "El DNI tiene 8 dígitos." }
        if documentType == "RUC" && doc.range(of: "^\\d{11}$", options: .regularExpression) == nil { return "El RUC tiene 11 dígitos." }
        if doc.count < 5 { return "Ingresa tu número de documento." }
        if address.trimmingCharacters(in: .whitespaces).count < 5 { return "Ingresa tu domicilio." }
        if !Validation.isEmail(email.trimmingCharacters(in: .whitespaces)) { return "Ingresa un correo válido." }
        if isMinor && guardian.trimmingCharacters(in: .whitespaces).count < 3 { return "Indica el nombre del apoderado." }
        if goodDescription.trimmingCharacters(in: .whitespaces).count < 3 { return "Describe el producto o servicio." }
        if detail.trimmingCharacters(in: .whitespaces).count < 10 { return "Describe el detalle (al menos 10 caracteres)." }
        if request.trimmingCharacters(in: .whitespaces).count < 5 { return "Indica qué solicitas." }
        if !accepts { return "Confirma que los datos son verdaderos para registrar la hoja." }
        return nil
    }

    private func send() async {
        errorMessage = validation()
        guard errorMessage == nil else { return }
        sending = true
        defer { sending = false }
        let trimmed = { (s: String) in s.trimmingCharacters(in: .whitespacesAndNewlines) }
        do {
            let response = try await appState.accountService.registerComplaint(ComplaintRequest(
                tipo: kind,
                consumidorNombre: trimmed(name),
                consumidorTipoDocumento: documentType,
                consumidorDocumento: trimmed(document),
                consumidorDomicilio: trimmed(address),
                consumidorTelefono: trimmed(phone),
                consumidorEmail: trimmed(email),
                esMenor: isMinor,
                apoderadoNombre: isMinor ? trimmed(guardian) : "",
                bienTipo: goodType,
                bienDescripcion: trimmed(goodDescription),
                montoReclamado: trimmed(amount).isEmpty ? nil : trimmed(amount),
                idVenta: purchaseID,
                detalle: trimmed(detail),
                pedido: trimmed(request)
            ))
            withAnimation { registered = response }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
