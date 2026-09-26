import SwiftUI

/// Pestaña Perfil (mismas secciones que Flutter).
struct AccountView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var router: StoreRouter
    @EnvironmentObject private var themeStore: ThemeStore
    @State private var showPurchases = false
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
                    VStack(alignment: .leading, spacing: 4) {
                        Text("TU CUENTA").font(.caption.weight(.bold)).kerning(1.4).foregroundStyle(Brand.dorado)
                        Text("Mi perfil").font(.serif(30))
                    }
                    .padding(.top, 16)

                    cover.appear(0)
                    quickAccess.appear(1)
                    dataSection.appear(2)
                    themeSection.appear(3)
                    securitySection.appear(4)
                    legalSection.appear(5)

                    Button(role: .destructive) {
                        confirmLogout = true
                    } label: {
                        Label("Cerrar sesión", systemImage: "rectangle.portrait.and.arrow.right")
                            .frame(maxWidth: .infinity, minHeight: 50)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Brand.error.opacity(0.5)))
                    }
                    .foregroundStyle(Brand.error)
                }
                .padding(20)
            }
            .background(Brand.fondo.ignoresSafeArea())
            .refreshable { await appState.refreshProfile() }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: AccountRoute.self) { route in
                switch route {
                case .editProfile: EditProfileView()
                case .changePassword: ChangePasswordView()
                case .twoFactor:
                    if user?.twoFactorEnabled == true { TwoFactorDisableView() } else { TwoFactorSetupView() }
                case .favorites: FavoritesView()
                case .terms: LegalDocumentView(document: .terms)
                case .privacy: LegalDocumentView(document: .privacy)
                }
            }
            .sheet(isPresented: $showPurchases) {
                PurchasesView(
                    purchaseService: appState.purchaseService,
                    purchaseDetailService: appState.purchaseService,
                    paymentService: appState.paymentService
                )
            }
            .sheet(isPresented: $showSecurity) { SecurityView() }
            .sheet(isPresented: $showCustomTheme) {
                CustomThemeSheet(initial: themeStore.theme) { theme in
                    showCustomTheme = false
                    withAnimation { themeStore.apply(theme) }
                }
                .presentationDetents([.large])
            }
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
        return HStack(spacing: 18) {
            Button { showPhotoOptions = true } label: {
                Avatar(user: user, size: 84)
                    .overlay {
                        if uploadingPhoto {
                            ProgressView().tint(.white)
                                .frame(width: 84, height: 84)
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
            VStack(alignment: .leading, spacing: 6) {
                Text(fullName).font(.serif(22)).foregroundStyle(theme.textColor).lineLimit(2)
                Text(user?.email ?? "").font(.subheadline).foregroundStyle(theme.textColor.opacity(0.85)).lineLimit(1)
                Text("Toca la foto para actualizarla")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(theme.textColor.opacity(0.85))
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .overlay(Capsule().stroke(theme.textColor.opacity(0.3)))
            }
            Spacer(minLength: 0)
        }
        .padding(20)
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
            quick("Mis compras", "doc.text") { showPurchases = true }
            quick("Mis reservas", "bookmark") { router.selectedTab = .reservations }
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
            Text(title).font(.caption.weight(.semibold)).foregroundStyle(Brand.texto).lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: 16).fill(Brand.superficie))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Brand.divisor))
    }

    private var dataSection: some View {
        card(title: "Tus datos") {
            infoRow("at", "Correo", user?.email ?? "—")
            Divider().padding(.leading, 44)
            infoRow("phone", "Teléfono", (user?.telefono ?? "").isEmpty ? "—" : user!.telefono!)
        }
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
        card(title: "Cuenta y seguridad") {
            linkRow("pencil", "Editar perfil", .editProfile)
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
        card(title: "Legal") {
            linkRow("doc.text", "Términos y Condiciones", .terms)
            Divider().padding(.leading, 60)
            linkRow("hand.raised", "Política de Privacidad", .privacy)
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

    private func infoRow(_ icon: String, _ label: String, _ value: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon).foregroundStyle(Brand.dorado).frame(width: 22)
            VStack(alignment: .leading, spacing: 2) {
                Text(label).font(.caption).foregroundStyle(Brand.textoSecundario)
                Text(value).foregroundStyle(Brand.texto)
            }
            Spacer()
        }
        .padding(16)
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
    case editProfile, changePassword, twoFactor, favorites, terms, privacy
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
