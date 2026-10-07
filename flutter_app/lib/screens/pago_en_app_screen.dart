import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../utils/app_colors.dart';

/// Cómo terminó la ventana de pago.
enum ResultadoPagoEnApp {
  /// PayU devolvió al cliente a la página de retorno: hay que verificar.
  regreso,

  /// El cliente cerró la ventana antes de terminar.
  cerrado,
}

/// El checkout de PayU dentro de la app, sin salir al navegador.
///
/// La página de retorno de PayU (`/api/pagos/respuesta/...`) no se muestra:
/// al llegar a ella la ventana se cierra sola y la pantalla anterior
/// consulta el estado real del pago a la API. Volver de la ventana NUNCA
/// confirma un pago por sí mismo; lo confirma el servidor.
class PagoEnAppScreen extends StatefulWidget {
  final String url;
  const PagoEnAppScreen({super.key, required this.url});

  static Future<ResultadoPagoEnApp> abrir(
    BuildContext context,
    String url,
  ) async {
    final resultado = await Navigator.of(context).push<ResultadoPagoEnApp>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => PagoEnAppScreen(url: url),
      ),
    );
    return resultado ?? ResultadoPagoEnApp.cerrado;
  }

  /// ¿Es la página a la que PayU devuelve al terminar?
  static bool esRetorno(Uri uri) => uri.path.contains('/api/pagos/respuesta/');

  /// ¿Es una página de la pasarela de PayU (donde se eligen los métodos)?
  static bool esPasarela(Uri uri) =>
      uri.host == 'payulatam.com' || uri.host.endsWith('.payulatam.com');

  @override
  State<PagoEnAppScreen> createState() => _PagoEnAppScreenState();
}

class _PagoEnAppScreenState extends State<PagoEnAppScreen> {
  late final WebViewController _web;
  double _progreso = 0;
  bool _error = false, _terminado = false;

  /// La primera carga de PayU no siempre trae los métodos de pago: se
  /// recarga una vez sola y, mientras tanto, se muestra "Preparando pago".
  bool _recargada = false, _preparando = true;

  /// Deslizar hacia abajo para recargar (como Ctrl + R): distancia que el
  /// dedo lleva arrastrada desde arriba de la página y si ya está recargando.
  double _tiron = 0;
  bool _recargando = false;
  static const _umbralTiron = 90.0;

  /// Detecta el gesto dentro de la página: solo cuenta si la página (y el
  /// panel tocado) ya están arriba del todo, para no robar el scroll normal.
  static const _scriptTiron = r'''
(function () {
  if (window.__libreriaTiron) return;
  window.__libreriaTiron = true;
  var inicio = null, distancia = 0;
  function arriba(el) {
    if ((window.scrollY || document.documentElement.scrollTop || 0) > 0) return false;
    for (var n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.scrollTop > 0) return false;
    }
    return true;
  }
  addEventListener('touchstart', function (e) {
    inicio = e.touches.length === 1 && arriba(e.target) ? e.touches[0].clientY : null;
    distancia = 0;
  }, { passive: true });
  addEventListener('touchmove', function (e) {
    if (inicio === null) return;
    distancia = e.touches[0].clientY - inicio;
    if (distancia < 0) { inicio = null; RecargarPago.postMessage('cancelar'); return; }
    RecargarPago.postMessage('tiron:' + Math.round(distancia));
  }, { passive: true });
  addEventListener('touchend', function () {
    if (inicio !== null) RecargarPago.postMessage(distancia > 90 ? 'soltar' : 'cancelar');
    inicio = null; distancia = 0;
  }, { passive: true });
})();
''';

  @override
  void initState() {
    super.initState();
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel('RecargarPago', onMessageReceived: _mensajeTiron)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (p) {
            if (mounted) setState(() => _progreso = p / 100);
          },
          onPageFinished: _paginaLista,
          onPageStarted: (url) {
            final uri = Uri.tryParse(url);
            if (uri != null && PagoEnAppScreen.esRetorno(uri)) {
              _terminar(ResultadoPagoEnApp.regreso);
            } else if (mounted && _error) {
              setState(() => _error = false);
            }
          },
          onWebResourceError: (e) {
            if (e.isForMainFrame != false && mounted) {
              setState(() {
                _error = true;
                _recargando = false;
              });
            }
          },
          onNavigationRequest: _decidir,
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
    _permitirCookiesPasarela();
    // Si PayU nunca llega a cargar, no se deja la pantalla tapada.
    Future<void>.delayed(const Duration(seconds: 15), () {
      if (mounted && _preparando) setState(() => _preparando = false);
    });
  }

  /// PayU guarda la sesión del pago en cookies de sus propios dominios; el
  /// WebView de Android las bloquea por defecto y los métodos no aparecen.
  void _permitirCookiesPasarela() {
    final plataforma = _web.platform;
    if (plataforma is! AndroidWebViewController) return;
    AndroidWebViewCookieManager(
      const PlatformWebViewCookieManagerCreationParams(),
    ).setAcceptThirdPartyCookies(plataforma, true).catchError((_) {});
  }

  void _mensajeTiron(JavaScriptMessage mensaje) {
    if (!mounted || _recargando) return;
    final texto = mensaje.message;
    if (texto.startsWith('tiron:')) {
      final valor = double.tryParse(texto.substring(6)) ?? 0;
      setState(() => _tiron = valor.clamp(0, 160));
    } else if (texto == 'soltar') {
      _recargar();
    } else if (_tiron != 0) {
      setState(() => _tiron = 0);
    }
  }

  /// Recarga la página de pago, como Ctrl + R.
  void _recargar() {
    if (_recargando || !mounted) return;
    setState(() {
      _recargando = true;
      _tiron = 0;
      _error = false;
    });
    _web.reload();
    // Si la página no avisa que terminó, el indicador no queda girando.
    Future<void>.delayed(const Duration(seconds: 12), () {
      if (mounted && _recargando) setState(() => _recargando = false);
    });
  }

  void _paginaLista(String url) {
    // El gesto se vuelve a instalar en cada página que se abre.
    _web.runJavaScript(_scriptTiron).catchError((_) {});
    if (mounted && _recargando) setState(() => _recargando = false);
    final uri = Uri.tryParse(url);
    if (uri == null || !mounted || !PagoEnAppScreen.esPasarela(uri)) return;
    if (!_recargada) {
      // Igual que refrescar a mano: la segunda carga ya muestra los métodos.
      _recargada = true;
      Future<void>.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _web.reload();
      });
      return;
    }
    if (_preparando) setState(() => _preparando = false);
  }

  NavigationDecision _decidir(NavigationRequest pedido) {
    final uri = Uri.tryParse(pedido.url);
    if (uri == null) return NavigationDecision.prevent;
    if (PagoEnAppScreen.esRetorno(uri)) {
      _terminar(ResultadoPagoEnApp.regreso);
      return NavigationDecision.prevent;
    }
    if (const ['https', 'http', 'about', 'data', 'blob'].contains(uri.scheme)) {
      return NavigationDecision.navigate;
    }
    // Apps de bancos o billeteras (intent://, yape://…): se abren en su app
    // y el cliente vuelve aquí para terminar.
    launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    ).catchError((_) => false);
    return NavigationDecision.prevent;
  }

  void _terminar(ResultadoPagoEnApp resultado) {
    if (_terminado || !mounted) return;
    _terminado = true;
    Navigator.of(context).pop(resultado);
  }

  Future<void> _salir() async {
    if (await _web.canGoBack()) {
      await _web.goBack();
      return;
    }
    if (!mounted) return;
    final salir = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Salir del pago?'),
        content: const Text(
          'Si ya pagaste, lo verificaremos al volver. Si no, puedes continuar el pago más tarde desde Mis compras.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Seguir pagando'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
    if (salir == true) _terminar(ResultadoPagoEnApp.cerrado);
  }

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _salir();
      },
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            tooltip: 'Cerrar pago',
            icon: const Icon(Icons.close),
            onPressed: _salir,
          ),
          titleSpacing: 0,
          actions: [
            IconButton(
              tooltip: 'Recargar página de pago',
              icon: const Icon(Icons.refresh),
              onPressed: _recargando ? null : _recargar,
            ),
          ],
          title: Row(
            children: [
              const Icon(
                Icons.lock_outline,
                size: 18,
                color: AppColors.success,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Pago seguro', style: texto.titleMedium),
                    Text(
                      'PayU · conexión cifrada',
                      style: texto.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(3),
            child: AnimatedOpacity(
              opacity: _progreso < 1 && !_error ? 1 : 0,
              duration: const Duration(milliseconds: 250),
              child: LinearProgressIndicator(
                value: _progreso == 0 ? null : _progreso,
                minHeight: 3,
              ),
            ),
          ),
        ),
        body: _error
            ? _ErrorCarga(
                onReintentar: _recargar,
                onNavegador: () => launchUrl(
                  Uri.parse(widget.url),
                  mode: LaunchMode.externalApplication,
                ),
              )
            : Stack(
                children: [
                  WebViewWidget(controller: _web),
                  if (!_preparando && (_tiron > 0 || _recargando))
                    _IndicadorTiron(
                      avance: (_tiron / _umbralTiron).clamp(0.0, 1.0),
                      recargando: _recargando,
                    ),
                  if (_preparando) const _Preparando(),
                ],
              ),
      ),
    );
  }
}

/// Círculo que baja con el dedo: la flecha gira según cuánto falta para
/// recargar y, al soltar, se vuelve una ruedita de carga.
class _IndicadorTiron extends StatelessWidget {
  final double avance;
  final bool recargando;
  const _IndicadorTiron({required this.avance, required this.recargando});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final listo = avance >= 1;
    return Positioned(
      top: recargando ? 20 : 8 + 52 * avance,
      left: 0,
      right: 0,
      child: IgnorePointer(
        child: Center(
          child: Material(
            elevation: 3,
            shape: const CircleBorder(),
            color: colors.surface,
            child: SizedBox.square(
              dimension: 40,
              child: Padding(
                padding: const EdgeInsets.all(9),
                child: recargando
                    ? const CircularProgressIndicator(strokeWidth: 2.5)
                    : Transform.rotate(
                        angle: avance * 3.1416 * 1.5,
                        child: Icon(
                          Icons.refresh,
                          size: 22,
                          color: listo ? colors.primary : colors.outline,
                        ),
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Cubre la página mientras PayU termina de cargar los métodos de pago.
class _Preparando extends StatelessWidget {
  const _Preparando();

  @override
  Widget build(BuildContext context) => Positioned.fill(
    child: ColoredBox(
      color: Colors.white,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox.square(
              dimension: 34,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
            const SizedBox(height: 16),
            Text(
              'Preparando tu pago seguro…',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              'Cargando los métodos de pago de PayU',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
    ),
  );
}

class _ErrorCarga extends StatelessWidget {
  final VoidCallback onReintentar, onNavegador;
  const _ErrorCarga({required this.onReintentar, required this.onNavegador});

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    // También aquí se puede deslizar hacia abajo para reintentar.
    onRefresh: () async => onReintentar(),
    child: LayoutBuilder(
      builder: (context, c) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: c.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.wifi_off_rounded,
                    size: 48,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'No se pudo cargar la página de pago',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Revisa tu conexión e inténtalo de nuevo. Si ya pagaste, verifica la compra en Mis compras antes de volver a pagar.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: onReintentar,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Reintentar'),
                  ),
                  TextButton(
                    onPressed: onNavegador,
                    child: const Text('Abrir en el navegador'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
