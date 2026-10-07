import SwiftUI
import UIKit
import WebKit

/// Enlace de pago que abre la ventana de PayU (`.sheet(item:)`).
struct PaymentLink: Identifiable, Equatable {
    let url: URL
    var id: String { url.absoluteString }
}

/// Cómo terminó la ventana de pago.
enum PaymentWindowResult {
    /// PayU devolvió al cliente a la página de retorno: hay que verificar.
    case returned
    /// El cliente cerró la ventana antes de terminar.
    case closed
}

/// El checkout de PayU dentro de la app, sin salir a Safari (como
/// `pago_en_app_screen.dart`). La página de retorno de PayU
/// (`/api/pagos/respuesta/…`) no se muestra: al llegar la ventana se cierra
/// y la pantalla anterior consulta el estado real a la API. Volver de la
/// ventana NUNCA confirma un pago por sí mismo.
///
/// - Desliza hacia abajo para recargar (como Ctrl + R) o usa el botón.
/// - La primera carga de PayU se recarga sola una vez (con "Preparando tu
///   pago seguro…" encima), porque a veces no trae los métodos de pago.
struct PaymentSheet: View {
    let url: URL
    let onFinish: (PaymentWindowResult) -> Void

    @StateObject private var model = PaymentWebModel()
    @State private var confirmExit = false
    @State private var finished = false

    static func isReturn(_ url: URL) -> Bool { url.path.contains("/api/pagos/respuesta/") }

    static func isGateway(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return host == "payulatam.com" || host.hasSuffix(".payulatam.com")
    }

    var body: some View {
        NavigationStack {
            ZStack {
                PaymentWebView(url: url, model: model)
                    .ignoresSafeArea(edges: .bottom)
                if model.failed {
                    failedView
                } else if model.preparing {
                    preparingView
                }
            }
            .safeAreaInset(edge: .top, spacing: 0) {
                ProgressView(value: model.progress)
                    .progressViewStyle(.linear)
                    .tint(Brand.burdeos)
                    .opacity(model.progress < 1 && !model.failed ? 1 : 0)
                    .animation(.easeOut(duration: 0.25), value: model.progress)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        if model.canGoBack { model.goBack() } else { confirmExit = true }
                    } label: {
                        Image(systemName: "xmark")
                    }
                    .accessibilityLabel("Cerrar pago")
                }
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        Image(systemName: "lock.fill").foregroundStyle(Brand.exito).font(.footnote)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Pago seguro").font(.headline)
                            Text("PayU · conexión cifrada").font(.caption2).foregroundStyle(Brand.textoSecundario)
                        }
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button { model.reload() } label: { Image(systemName: "arrow.clockwise") }
                        .accessibilityLabel("Recargar página de pago")
                }
            }
            .alert("¿Salir del pago?", isPresented: $confirmExit) {
                Button("Seguir pagando", role: .cancel) {}
                Button("Salir") { finish(.closed) }
            } message: {
                Text("Si ya pagaste, lo verificaremos al volver. Si no, puedes continuar el pago más tarde desde Mis compras.")
            }
        }
        .interactiveDismissDisabled()
        .onAppear { model.onReturn = { finish(.returned) } }
    }

    private func finish(_ result: PaymentWindowResult) {
        guard !finished else { return }
        finished = true
        onFinish(result)
    }

    private var preparingView: some View {
        VStack(spacing: 14) {
            ProgressView().controlSize(.large).tint(Brand.burdeos)
            Text("Preparando tu pago seguro…").font(.headline)
            Text("Cargando los métodos de pago de PayU")
                .font(.subheadline)
                .foregroundStyle(Brand.textoSecundario)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.white)
    }

    private var failedView: some View {
        ScrollView {
            VStack(spacing: 14) {
                Image(systemName: "wifi.slash").font(.system(size: 44)).foregroundStyle(Brand.textoSecundario)
                Text("No se pudo cargar la página de pago").font(.headline).multilineTextAlignment(.center)
                Text("Revisa tu conexión e inténtalo de nuevo. Si ya pagaste, verifica la compra en Mis compras antes de volver a pagar.")
                    .font(.subheadline)
                    .foregroundStyle(Brand.textoSecundario)
                    .multilineTextAlignment(.center)
                Button { model.reload() } label: { Label("Reintentar", systemImage: "arrow.clockwise") }
                    .buttonStyle(BrandButtonStyle())
                Button("Abrir en Safari") { UIApplication.shared.open(url) }
                    .font(.subheadline.weight(.semibold))
            }
            .padding(28)
            .frame(maxWidth: .infinity)
            .padding(.top, 80)
        }
        // También aquí se puede deslizar hacia abajo para reintentar.
        .refreshable { model.reload() }
        .background(Brand.fondo)
    }
}

/// Estado de la página de pago y decisiones de navegación.
@MainActor
final class PaymentWebModel: NSObject, ObservableObject, WKNavigationDelegate {
    @Published var progress: Double = 0
    @Published var preparing = true
    @Published var failed = false
    @Published var canGoBack = false

    var onReturn: (() -> Void)?
    weak var webView: WKWebView?
    private var reloadedOnce = false
    private var observers: [NSKeyValueObservation] = []

    func attach(_ webView: WKWebView) {
        self.webView = webView
        observers = [
            webView.observe(\.estimatedProgress, options: .new) { [weak self] web, _ in
                Task { @MainActor in self?.progress = web.estimatedProgress }
            },
            webView.observe(\.canGoBack, options: .new) { [weak self] web, _ in
                Task { @MainActor in self?.canGoBack = web.canGoBack }
            }
        ]
        // Si PayU nunca llega a cargar, no se deja la pantalla tapada.
        Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 15_000_000_000)
            self?.preparing = false
        }
    }

    /// Recarga la página de pago, como Ctrl + R.
    func reload() {
        failed = false
        webView?.reload()
    }

    func goBack() { webView?.goBack() }

    @objc func pulledToRefresh() { reload() }

    private func endRefreshing() { webView?.scrollView.refreshControl?.endRefreshing() }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction
    ) async -> WKNavigationActionPolicy {
        guard let url = navigationAction.request.url else { return .cancel }
        if PaymentSheet.isReturn(url) {
            onReturn?()
            return .cancel
        }
        if ["https", "http", "about", "data", "blob"].contains(url.scheme?.lowercased() ?? "") {
            return .allow
        }
        // Apps de bancos o billeteras: se abren en su app y el cliente
        // vuelve aquí para terminar.
        _ = await UIApplication.shared.open(url)
        return .cancel
    }

    func webView(_ webView: WKWebView, didReceiveServerRedirectForProvisionalNavigation navigation: WKNavigation!) {
        if let url = webView.url, PaymentSheet.isReturn(url) {
            webView.stopLoading()
            onReturn?()
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        endRefreshing()
        guard let url = webView.url, PaymentSheet.isGateway(url) else { return }
        if !reloadedOnce {
            // Igual que refrescar a mano: la segunda carga ya muestra los métodos.
            reloadedOnce = true
            Task { @MainActor [weak webView] in
                try? await Task.sleep(nanoseconds: 500_000_000)
                webView?.reload()
            }
            return
        }
        preparing = false
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handle(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        handle(error)
    }

    private func handle(_ error: Error) {
        endRefreshing()
        let nsError = error as NSError
        // Cancelaciones propias (recarga, retorno interceptado) no son errores.
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled { return }
        if nsError.domain == "WebKitErrorDomain" && nsError.code == 102 { return }
        preparing = false
        failed = true
    }
}

/// `WKWebView` con "deslizar para recargar" nativo.
struct PaymentWebView: UIViewRepresentable {
    let url: URL
    let model: PaymentWebModel

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = model
        web.allowsBackForwardNavigationGestures = true
        let refresh = UIRefreshControl()
        refresh.addTarget(model, action: #selector(PaymentWebModel.pulledToRefresh), for: .valueChanged)
        web.scrollView.refreshControl = refresh
        web.scrollView.bounces = true
        model.attach(web)
        web.load(URLRequest(url: url))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
