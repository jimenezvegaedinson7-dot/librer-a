import SwiftUI

/// Pestaña Perfil (mismas secciones que Flutter).
struct AccountView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var router: StoreRouter
    @EnvironmentObject private var themeStore: ThemeStore
    @State private var showSecurity = false
    @State private var confirmLogout = false
    @State private var showPhotoOptions = false
    @State private var uploadingPhoto = false
    @State private var showCustomTheme = false
    @State private var toast: ToastMessage?

    private var user: User? { appState.user }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    cover.appear(0)
                    dataSection.appear(1)
                    securitySection.appear(2)
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Tus libros").font(.serif(18))
                        quickAccess
                    }
                    .appear(3)
                    legalSection.appear(4)
                    accountSection.appear(5)
                }
                .frame(maxWidth: 680)
                .padding(20)
                .frame(maxWidth: .infinity)
            }
            .background(Brand.fondo.ignoresSafeArea())
            .refreshable { await appState.refreshProfile() }
            .navigationTitle("Mi perfil")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: AccountRoute.self) { route in
                switch route {
                case .editProfile(let field): EditProfileView(field: field)
                case .changePassword: ChangePasswordView()
                case .twoFactor:
                    if user?.twoFactorEnabled == true { TwoFactorDisableView() } else { TwoFactorSetupView() }
                case .favorites: FavoritesView()
                case .terms: LegalDocumentView(document: .terms)
                case .privacy: LegalDocumentView(document: .privacy)
                case .deleteAccount: DeleteAccountView()
                case .backgrounds: BackgroundsView()
                case .appearance: appearanceView
                case .complaints: ComplaintsBookView()
                }
            }
            .sheet(isPresented: $showSecurity) { SecurityView() }
            .profilePhotoActions(isPresented: $showPhotoOptions, uploading: $uploadingPhoto) { message in
                toast = ToastMessage(text: message)
            }
            .toast($toast)
            .confirmationDialog("Cerrar sesión", isPresented: $confirmLogout, titleVisibility: .visible) {
                Button("Cerrar sesión", role: .destructive) { Task { await appState.signOut() } }
                Button("Cancelar", role: .cancel) { }
            } message: {
                Text("¿Seguro que deseas cerrar sesión?")
            }
        }
    }

    // MARK: Secciones

    private var cover: some View {
        let theme = themeStore.theme
        return VStack(spacing: 14) {
            Button { showPhotoOptions = true } label: {
                Avatar(user: user, size: 112)
                    .overlay {
                        if uploadingPhoto {
                            ProgressView().tint(.white)
                                .frame(width: 112, height: 112)
                                .background(Circle().fill(.black.opacity(0.35)))
                        }
                    }
                    .overlay(alignment: .bottomTrailing) {
                        Image(systemName: "camera.fill")
                            .font(.caption)
                            .foregroundStyle(Brand.tinta)
                            .frame(width: 28, height: 28)
                            .background(Circle().fill(Brand.dorado))
                            .overlay(Circle().stroke(.white, lineWidth: 2))
                    }
            }
            .buttonStyle(.plain)
            .disabled(uploadingPhoto)
            .accessibilityLabel("Cambiar foto de perfil")
            Button {
                showPhotoOptions = true
            } label: {
                Text(uploadingPhoto ? "Actualizando foto…" : "Cambiar foto")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(theme.textColor)
                    .frame(minHeight: 44)
            }
            .buttonStyle(.plain)
            .disabled(uploadingPhoto)
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(theme.gradient)
                .overlay(
                    AnimatedBookshelf(
                        ink: theme.textColor == .white ? 0xFFFFFF : 0x2C2621,
                        accent: 0xE6CB8F,
                        opacity: theme.textColor == .white ? 0.12 : 0.07,
                        shelfHeight: 64,
                        seed: 5
                    )
                    .id("estante-\(theme.id)")
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                )
        )
        .animation(.easeInOut(duration: 0.35), value: theme)
    }

    private var fullName: String {
        let name = "\(user?.nombre ?? "") \(user?.apellido ?? "")".trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? "Tu cuenta" : name
    }

    private var quickAccess: some View {
        HStack(spacing: 12) {
            quick("Mis compras", "doc.text") { router.selectedTab = .purchases }
            NavigationLink(value: AccountRoute.favorites) { quickLabel("Mis favoritos", "heart") }
                .buttonStyle(.plain)
        }
    }

    private func quick(_ title: String, _ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { quickLabel(title, icon) }.buttonStyle(.plain)
    }

    private func quickLabel(_ title: String, _ icon: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(themeStore.theme.primary)
                .frame(width: 48, height: 48)
                .background(Circle().fill(themeStore.theme.primary.opacity(0.12)))
            Text(title).font(.caption.weight(.semibold)).foregroundStyle(Brand.texto)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: 16).fill(Brand.superficie))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.divisor))
    }

    private var dataSection: some View {
        card(title: "Tus datos") {
            infoRow("pencil", "Nombre", fullName, field: .name)
            Divider().padding(.leading, 44)
            infoRow("at", "Correo", user?.email ?? "—", field: .email)
            Divider().padding(.leading, 44)
            infoRow("phone", "Teléfono", (user?.telefono ?? "").isEmpty ? "—" : (user?.telefono ?? "—"), field: .phone)
        }
    }

    private var appearanceView: some View {
        ScrollView {
            themeSection
                .frame(maxWidth: 680)
                .padding(20)
                .frame(maxWidth: .infinity)
        }
        .background(Brand.fondo.ignoresSafeArea())
        .navigationTitle("Personalización")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showCustomTheme) {
            CustomThemeSheet(initial: themeStore.theme) { theme in
                showCustomTheme = false
                withAnimation { themeStore.apply(theme) }
            }
            .presentationDetents([.large])
        }
    }

    private var appearanceLink: some View {
        NavigationLink(value: AccountRoute.appearance) {
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(themeStore.background.fondo)
                    .overlay(RoundedRectangle(cornerRadius: 4).fill(themeStore.background.tarjeta).padding(7))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Brand.divisor))
                    .frame(width: 36, height: 36)
                VStack(alignment: .leading, spacing: 3) {
                    Text("Personalización").foregroundStyle(Brand.texto)
                    Text("\(themeStore.theme.name) · \(themeStore.background.name)")
                        .font(.caption).foregroundStyle(Brand.textoSecundario)
                }
                Spacer(minLength: 8)
                Image(systemName: "chevron.right").font(.caption).foregroundStyle(Brand.textoTerciario)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var themeSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Personaliza tus colores").font(.serif(18))
                Text("Se aplican a toda la aplicación.").font(.caption).foregroundStyle(Brand.textoSecundario)
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(ProfileTheme.all) { theme in
                        let selected = theme.id == themeStore.theme.id
                        Button {
                            withAnimation { themeStore.apply(theme) }
                        } label: {
                            Circle()
                                .fill(theme.gradient)
                                .frame(width: 46, height: 46)
                                .overlay(Circle().stroke(selected ? Brand.tinta : Brand.divisor, lineWidth: selected ? 3 : 1))
                                .overlay {
                                    if selected {
                                        Image(systemName: "checkmark").font(.headline).foregroundStyle(theme.textColor)
                                    }
                                }
                        }
                        .accessibilityLabel("Tema \(theme.name)")
                        .accessibilityAddTraits(selected ? .isSelected : [])
                    }
                    customSwatch
                }
                .padding(14)
            }
            .background(RoundedRectangle(cornerRadius: 16).fill(Brand.superficie))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.divisor))

            // Como Flutter: "Fondo y tarjetas" con vista previa.
            NavigationLink(value: AccountRoute.backgrounds) {
                HStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(themeStore.background.fondo)
                        .overlay(RoundedRectangle(cornerRadius: 4).fill(themeStore.background.tarjeta).padding(7))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Brand.divisor))
                        .frame(width: 36, height: 36)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Fondo y tarjetas").font(.subheadline.weight(.semibold)).foregroundStyle(Brand.texto)
                        Text(themeStore.background.name).font(.caption).foregroundStyle(Brand.textoSecundario)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Brand.textoTerciario)
                }
                .padding(12)
                .background(RoundedRectangle(cornerRadius: 16).fill(Brand.superficie))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.divisor))
            }
            .buttonStyle(.plain)
        }
    }

    /// Último círculo: combina dos colores (muestra el degradado si está activo).
    private var customSwatch: some View {
        let current = themeStore.theme
        return Button { showCustomTheme = true } label: {
            Circle()
                .fill(current.isCustom ? AnyShapeStyle(current.gradient) : AnyShapeStyle(Brand.pergamino))
                .frame(width: 46, height: 46)
                .overlay(Circle().stroke(current.isCustom ? Brand.tinta : Brand.divisor, lineWidth: current.isCustom ? 3 : 1))
                .overlay {
                    Image(systemName: current.isCustom ? "checkmark" : "plus")
                        .font(.headline)
                        .foregroundStyle(current.isCustom ? current.textColor : Brand.textoSecundario)
                }
        }
        .accessibilityLabel("Combinar tus colores")
    }

    private var securitySection: some View {
        card(title: "Ajustes") {
            appearanceLink
            Divider().padding(.leading, 60)
            linkRow("lock.rotation", "Cambiar contraseña", .changePassword)
            Divider().padding(.leading, 60)
            NavigationLink(value: AccountRoute.twoFactor) {
                rowLabel("shield.lefthalf.filled",
                         user?.twoFactorEnabled == true ? "Desactivar doble factor" : "Activar doble factor",
                         badge: user?.twoFactorEnabled == true ? "Activo" : "Inactivo")
            }
            .buttonStyle(.plain)
            Divider().padding(.leading, 60)
            Button { showSecurity = true } label: { rowLabel("faceid", "Bloqueo con Face ID / Touch ID") }
                .buttonStyle(.plain)
        }
    }

    private var legalSection: some View {
        card(title: "Ayuda") {
            linkRow("doc.text", "Términos y Condiciones", .terms)
            Divider().padding(.leading, 60)
            linkRow("hand.raised", "Política de Privacidad", .privacy)
            Divider().padding(.leading, 60)
            // Dentro de la app y con los datos de la cuenta ya completados.
            linkRow("book.closed", "Libro de Reclamaciones", .complaints)
        }
    }

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            card(title: "Cuenta") {
                linkRow("person.crop.circle.badge.xmark", "Eliminar mi cuenta", .deleteAccount)
            }
            Button(role: .destructive) {
                confirmLogout = true
            } label: {
                Label("Cerrar sesión", systemImage: "rectangle.portrait.and.arrow.right")
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Brand.error.opacity(0.5)))
            }
            .foregroundStyle(Brand.error)
        }
    }

    // MARK: Piezas

    private func card<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.serif(18))
            VStack(spacing: 0) { content() }
                .background(RoundedRectangle(cornerRadius: 16).fill(Brand.superficie))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.divisor))
        }
    }

    private func infoRow(_ icon: String, _ label: String, _ value: String, field: ProfileField) -> some View {
        NavigationLink(value: AccountRoute.editProfile(field)) {
            HStack(spacing: 14) {
                Image(systemName: icon).foregroundStyle(Brand.acento).frame(width: 22)
                VStack(alignment: .leading, spacing: 2) {
                    Text(label).font(.caption).foregroundStyle(Brand.textoSecundario)
                    Text(value).foregroundStyle(Brand.texto)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                Image(systemName: "chevron.right").font(.caption).foregroundStyle(Brand.textoTerciario)
            }
            .padding(16)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityHint("Editar \(label.lowercased())")
        .accessibilityIdentifier("profile.\(field.rawValue)")
        .disabled(user == nil)
    }

    private func linkRow(_ icon: String, _ title: String, _ route: AccountRoute) -> some View {
        NavigationLink(value: route) { rowLabel(icon, title) }.buttonStyle(.plain)
    }

    private func rowLabel(_ icon: String, _ title: String, badge: String? = nil) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .foregroundStyle(themeStore.theme.primary)
                .frame(width: 36, height: 36)
                .background(RoundedRectangle(cornerRadius: 10).fill(Brand.pergamino))
            Text(title).foregroundStyle(Brand.texto)
            Spacer()
            if let badge {
                Text(badge)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(badge == "Activo" ? Brand.exito : Brand.textoSecundario)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Capsule().fill((badge == "Activo" ? Brand.exito : Brand.textoSecundario).opacity(0.1)))
            }
            Image(systemName: "chevron.right").font(.caption).foregroundStyle(Brand.textoTerciario)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }
}

enum AccountRoute: Hashable {
    case editProfile(ProfileField)
    case changePassword, twoFactor, favorites, terms, privacy, deleteAccount, backgrounds, complaints, appearance
}

/// Foto de perfil o iniciales.
struct Avatar: View {
    let user: User?
    let size: CGFloat

    var body: some View {
        let initials = [user?.nombre.first, user?.apellido.first].compactMap { $0 }.map(String.init).joined().uppercased()
        AsyncImage(url: FileURL.profilePhoto(user?.fotoPerfil)) { phase in
            if case .success(let image) = phase {
                image.resizable().scaledToFill()
            } else {
                Text(initials.isEmpty ? "?" : initials)
                    .font(.serif(size * 0.38))
                    .foregroundStyle(Brand.tinta)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Brand.pergamino)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(.white.opacity(0.9), lineWidth: 3))
    }
}
