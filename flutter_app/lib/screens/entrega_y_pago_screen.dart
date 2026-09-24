import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/ubicacion.dart';
import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/formats.dart';
import '../widgets/aparecer.dart';
import '../widgets/app_page_header.dart';
import '../widgets/empty_view.dart';
import '../widgets/loading_view.dart';
import '../widgets/precio_texto.dart';
import '../widgets/presionable.dart';

enum _TipoEntrega { domicilio, tienda }

/// Pantalla "Entrega y pago".
///
/// Se abre desde "Mi carrito" al presionar "Realizar pedido". Permite elegir
/// el tipo de entrega (a domicilio en Lima o recoger en tienda), ingresar los
/// datos de envío cuando corresponde y revisar el resumen (subtotal, envío,
/// total). Al confirmar con [COMPRAR Y PAGAR] se crea la orden en PayU
/// (WebCheckout) y se abre el checkout con el navegador, reutilizando
/// la MISMA lógica existente ([ApiService.crearOrdenPago] +
/// [launchUrl]) sin modificar la integración de pagos ni el backend.
class EntregaYPagoScreen extends StatefulWidget {
  const EntregaYPagoScreen({super.key});

  @override
  State<EntregaYPagoScreen> createState() => _EntregaYPagoScreenState();
}

class _EntregaYPagoScreenState extends State<EntregaYPagoScreen> {
  final _direccionController = TextEditingController();
  final _documentoController = TextEditingController();
  _TipoEntrega _tipoEntrega = _TipoEntrega.domicilio;
  String _tipoDocumento = 'DNI';
  bool _procesando = false;
  bool _cargandoUbicaciones = false;
  bool _exito = false;
  String? _orderId;
  String? _checkoutUrl;
  double? _total;

  List<Distrito> _distritos = [];
  int? _idDistrito;

  @override
  void initState() {
    super.initState();
    _cargarUbicaciones();
  }

  @override
  void dispose() {
    _direccionController.dispose();
    _documentoController.dispose();
    super.dispose();
  }

  Future<void> _cargarUbicaciones() async {
    setState(() => _cargandoUbicaciones = true);
    try {
      // El envío a domicilio es solo dentro de Lima (provincia): se busca
      // por nombre y se cargan únicamente sus distritos.
      final provincias = await ApiService.instance.obtenerProvincias();
      final lima = provincias
          .where((p) => p.nombre.trim().toLowerCase() == 'lima')
          .firstOrNull;
      if (!mounted) return;
      setState(() => _cargandoUbicaciones = false);
      if (lima != null) _cargarDistritos(lima.idProvincia);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _cargandoUbicaciones = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _cargandoUbicaciones = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudieron cargar los datos de envío.'),
        ),
      );
    }
  }

  Future<void> _cargarDistritos(int idProvincia) async {
    try {
      final distritos = await ApiService.instance.obtenerDistritos(idProvincia);
      if (!mounted) return;
      setState(() {
        _distritos = distritos;
        _idDistrito = _distritos.isEmpty ? null : _distritos.first.idDistrito;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudieron cargar los distritos.')),
      );
    }
  }

  /// Crea la orden en PayU (WebCheckout) y abre el checkout en el navegador.
  ///
  /// Reutiliza la lógica existente: el carrito SOLO se limpia cuando el pago
  /// se confirma (ver [_verificarPago]). Si el usuario vuelve sin pagar, el
  /// carrito y la orden pendiente se conservan para poder continuar.
  Future<void> _realizarCompra() async {
    final carrito = CarritoService.instance;

    final detalles = <Map<String, dynamic>>[];
    for (final item in carrito.items) {
      detalles.add({'id_libro': item.libro.idLibro, 'cantidad': item.cantidad});
    }

    final error = _validarEntrega();
    if (error != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error)));
      return;
    }

    setState(() => _procesando = true);
    try {
      final esDomicilio = _tipoEntrega == _TipoEntrega.domicilio;

      // Crea la orden de pago en PayU (backend calcula el total con
      // los precios reales de la BD).
      final orden = await ApiService.instance.crearOrdenPago(
        detalles: detalles,
        tipoEntrega: esDomicilio ? 'domicilio' : 'tienda',
        direccion: esDomicilio ? _direccionController.text.trim() : null,
        idDistrito: esDomicilio ? _idDistrito : null,
        clienteTipoDocumento: _tipoDocumento,
        clienteDocumento: _documentoController.text.trim(),
      );

      final url = orden.checkoutUrl;
      if (url != null && url.isNotEmpty) {
        // Abrir el checkout de PayU. La limpieza del carrito solo
        // ocurre cuando el pago se confirma, no al abrir el checkout.
        await _abrirCheckout(url);
        if (!mounted) return;

        setState(() {
          _exito = true;
          _orderId = orden.orderId;
          _checkoutUrl = url;
          _total = orden.total;
          _procesando = false;
        });
      } else {
        // Sin checkout: no se pudo abrir el pago.
        if (!mounted) return;
        setState(() => _procesando = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se pudo iniciar el pago. Inténtalo de nuevo.'),
          ),
        );
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _procesando = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e, s) {
      debugPrint('ERROR compra: $e\n$s');
      if (!mounted) return;
      setState(() => _procesando = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo completar la compra: $e')),
      );
    }
  }

  String? _validarEntrega() {
    // Validar documento
    final doc = _documentoController.text.trim();
    if (doc.isEmpty) {
      return 'Ingresa tu número de documento.';
    }
    if (_tipoDocumento == 'DNI' && !RegExp(r'^\d{8}$').hasMatch(doc)) {
      return 'El DNI debe tener exactamente 8 dígitos.';
    }
    if (_tipoDocumento == 'RUC' && !RegExp(r'^\d{11}$').hasMatch(doc)) {
      return 'El RUC debe tener exactamente 11 dígitos.';
    }
    if (_tipoDocumento == 'CE' && doc.length < 8) {
      return 'El carné de extranjería debe tener al menos 8 caracteres.';
    }

    switch (_tipoEntrega) {
      case _TipoEntrega.domicilio:
        if (_idDistrito == null) {
          return 'Selecciona un distrito de Lima.';
        }
        if (_direccionController.text.trim().length < 5) {
          return 'Indica una dirección de entrega válida.';
        }
        return null;
      case _TipoEntrega.tienda:
        return null;
    }
  }

  Future<void> _verificarPago() async {
    final orderId = _orderId;
    if (orderId == null || orderId.isEmpty) return;

    setState(() => _procesando = true);
    try {
      final estado = await ApiService.instance.obtenerOrdenPago(orderId);
      if (!mounted) return;
      setState(() => _procesando = false);

      if (estado.pagada) {
        // Pago confirmado: la compra terminó. Se limpia el carrito y se
        // libera la clave de idempotencia para que un próximo checkout sea
        // un intento nuevo (no reutilice la orden ya pagada).
        CarritoService.instance.limpiar();
        ApiService.instance.limpiarIdempotencia();
      } else if (estado.cancelada) {
        // El carrito se conserva para reintentar, pero una orden cancelada no
        // debe reutilizar su clave en el siguiente checkout.
        ApiService.instance.limpiarIdempotencia();
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            estado.pagada
                ? 'El pago fue confirmado. ¡Gracias!'
                : estado.cancelada
                ? 'El pago no fue completado.'
                : 'El pago aún no se confirma. Podrás verificarlo en breve.',
          ),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _procesando = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _procesando = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo verificar el pago.')),
      );
    }
  }

  Future<void> _reabrirCheckout() async {
    final url = _checkoutUrl;
    if (url == null || url.isEmpty) return;
    await _abrirCheckout(url);
  }

  Future<bool> _abrirCheckout(String url) async {
    final uri = Uri.parse(url);
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo abrir la ventana de pago.')),
      );
    }
    return ok;
  }

  /// Costo de envío según el tipo de entrega seleccionado.
  double _costoEnvio() {
    switch (_tipoEntrega) {
      case _TipoEntrega.domicilio:
        final distrito = _distritos
            .where((d) => d.idDistrito == _idDistrito)
            .firstOrNull;
        return distrito?.tarifaEnvio ?? 0;
      case _TipoEntrega.tienda:
        return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_exito) {
      return _buildExito(context);
    }

    final carrito = CarritoService.instance;
    if (carrito.items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Finalizar pedido')),
        body: const EmptyView(
          icon: Icons.shopping_cart_outlined,
          title: 'Tu carrito está vacío',
          message: 'Agrega libros al carrito para continuar.',
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Finalizar pedido')),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
                children: [
                  const AppPageHeader(
                    eyebrow: 'Paso 2 de 3',
                    title: 'Entrega y pago',
                    subtitle:
                        'Elige cómo recibir tu pedido y confirma tus datos.',
                  ),
                  const SizedBox(height: 16),
                  const _Pasos(),
                  const SizedBox(height: 18),
                  Aparecer(
                    child: _Seccion(
                      numero: '1',
                      titulo: 'Tipo de entrega',
                      child: _buildSeccionEntrega(context),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Aparecer(
                    indice: 1,
                    child: _Seccion(
                      numero: '2',
                      titulo: 'Documento de identidad',
                      child: _buildSeccionDocumento(context),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Aparecer(indice: 2, child: _buildResumen(context)),
                ],
              ),
            ),
            _buildBarraPagar(context),
          ],
        ),
      ),
    );
  }

  Widget _buildSeccionEntrega(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _OpcionEntrega(
          seleccionado: _tipoEntrega == _TipoEntrega.domicilio,
          icon: Icons.local_shipping_outlined,
          titulo: 'A domicilio',
          detalle: 'Te lo llevamos a una dirección en Lima.',
          etiqueta: 'Según distrito',
          onTap: () => setState(() => _tipoEntrega = _TipoEntrega.domicilio),
        ),
        const SizedBox(height: 8),
        _OpcionEntrega(
          seleccionado: _tipoEntrega == _TipoEntrega.tienda,
          icon: Icons.storefront_outlined,
          titulo: 'Recoger en tienda',
          detalle: 'Pasa por nuestra tienda cuando quieras.',
          etiqueta: 'Sin costo',
          onTap: () => setState(() => _tipoEntrega = _TipoEntrega.tienda),
        ),
        AnimatedSize(
          duration: Duracion.base,
          curve: Curva.salida,
          alignment: Alignment.topCenter,
          child: AnimatedSwitcher(
            duration: Duracion.base,
            child: KeyedSubtree(
              key: ValueKey(_tipoEntrega),
              child: switch (_tipoEntrega) {
                _TipoEntrega.domicilio => Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: _buildEntregaDomicilio(),
                ),
                _TipoEntrega.tienda => const Padding(
                  padding: EdgeInsets.only(top: 12),
                  child: _NotaTienda(),
                ),
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEntregaDomicilio() {
    if (_cargandoUbicaciones) {
      return const LoadingView(message: 'Cargando opciones de envío...');
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _ZonaReparto(),
        const SizedBox(height: 12),
        DropdownButtonFormField<int>(
          style: Theme.of(context).textTheme.bodyLarge,
          initialValue: _idDistrito,
          decoration: const InputDecoration(
            labelText: 'Distrito',
            prefixIcon: Icon(Icons.location_on_outlined),
          ),
          items: [
            for (final d in _distritos)
              DropdownMenuItem(
                value: d.idDistrito,
                child: Text(
                  '${d.nombre} · S/ ${Formats.precio(d.tarifaEnvio)}',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
          ],
          onChanged: _distritos.isEmpty
              ? null
              : (valor) {
                  if (valor != null) {
                    setState(() => _idDistrito = valor);
                  }
                },
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _direccionController,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Dirección',
            hintText: 'Dirección de entrega (calle, número)',
            alignLabelWithHint: true,
          ),
        ),
      ],
    );
  }

  Widget _buildSeccionDocumento(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: double.infinity,
          child: SegmentedButton<String>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: 'DNI', label: Text('DNI')),
              ButtonSegment(value: 'RUC', label: Text('RUC')),
              ButtonSegment(value: 'CE', label: Text('Carné ext.')),
            ],
            selected: {_tipoDocumento},
            onSelectionChanged: (valores) {
              final valor = valores.first;
              setState(() {
                _tipoDocumento = valor;
                _documentoController.clear();
              });
            },
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _documentoController,
          keyboardType: TextInputType.number,
          maxLength: _tipoDocumento == 'RUC'
              ? 11
              : _tipoDocumento == 'DNI'
              ? 8
              : 20,
          decoration: InputDecoration(
            labelText: 'Número de documento',
            prefixIcon: const Icon(Icons.badge_outlined),
            hintText: _tipoDocumento == 'DNI'
                ? 'Ej. 12345678'
                : _tipoDocumento == 'RUC'
                ? 'Ej. 20123456789'
                : 'Ej. 12345678',
            counterText: '',
            helperText: _tipoDocumento == 'DNI'
                ? '8 dígitos'
                : _tipoDocumento == 'RUC'
                ? '11 dígitos'
                : 'Al menos 8 caracteres',
          ),
        ),
      ],
    );
  }

  Widget _buildResumen(BuildContext context) {
    final subtotal = CarritoService.instance.total;
    final costoEnvio = _costoEnvio();
    final total = subtotal + costoEnvio;
    final textTheme = Theme.of(context).textTheme;
    final items = CarritoService.instance.items;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.pergamino.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(Radios.md),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Resumen del pedido', style: textTheme.titleMedium),
          const SizedBox(height: 10),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${item.libro.titulo ?? 'Libro'} × ${item.cantidad}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'S/ ${Formats.precio(item.subtotal)}',
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          Divider(height: 20, color: AppColors.gold.withValues(alpha: 0.25)),
          _FilaResumen(
            label: 'Subtotal',
            value: 'S/ ${Formats.precio(subtotal)}',
          ),
          const SizedBox(height: 6),
          _FilaResumen(
            label: 'Envío',
            value: costoEnvio == 0
                ? 'Gratis'
                : 'S/ ${Formats.precio(costoEnvio)}',
          ),
          Divider(height: 22, color: AppColors.gold.withValues(alpha: 0.25)),
          Row(
            children: [
              Expanded(child: Text('Total', style: textTheme.titleMedium)),
              AnimatedSwitcher(
                duration: Duracion.rapida,
                child: PrecioTexto(
                  key: ValueKey(total),
                  monto: total,
                  tamano: 21,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBarraPagar(BuildContext context) {
    final total = CarritoService.instance.total + _costoEnvio();
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(top: BorderSide(color: AppColors.divider)),
        boxShadow: Sombra.barra,
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Presionable(
              habilitado: !_procesando,
              child: SizedBox(
                width: double.infinity,
                height: 54,
                child: FilledButton(
                  onPressed: _procesando ? null : _realizarCompra,
                  child: AnimatedSwitcher(
                    duration: Duracion.rapida,
                    child: _procesando
                        ? SizedBox(
                            key: const ValueKey('cargando'),
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.4,
                              color: AppColors.primary,
                            ),
                          )
                        : Row(
                            key: const ValueKey('pagar'),
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.lock_outline_rounded, size: 18),
                              const SizedBox(width: 8),
                              const Text('Ir al pago seguro'),
                              const SizedBox(width: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.16),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text('S/ ${Formats.precio(total)}'),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.verified_user_outlined,
                  size: 14,
                  color: AppColors.textTertiary,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    'Serás redirigido a PayU para completar tu pago de forma segura.',
                    textAlign: TextAlign.center,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExito(BuildContext context) {
    final conCheckout = (_checkoutUrl ?? '').isNotEmpty;
    final textTheme = Theme.of(context).textTheme;

    if (conCheckout) {
      return Scaffold(
        appBar: AppBar(title: const Text('Compra en proceso')),
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Aparecer(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const _Medallon(
                    icon: Icons.hourglass_top_rounded,
                    color: AppColors.warning,
                    fondo: AppColors.warningContainer,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    '¡Gracias por tu compra!',
                    textAlign: TextAlign.center,
                    style: textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _total != null
                        ? 'Tu orden por S/ ${Formats.precio(_total!)} quedó creada. '
                              'Ahora solo falta pagarla en PayU para confirmarla.'
                        : 'Tu orden quedó creada. Ahora solo falta pagarla '
                              'en PayU para confirmarla.',
                    textAlign: TextAlign.center,
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Si la ventana de pago se cerró, puedes volver a abrirla.',
                    textAlign: TextAlign.center,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                  const SizedBox(height: 26),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: FilledButton(
                      onPressed: _procesando ? null : _verificarPago,
                      child: _procesando
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                              ),
                            )
                          : const Text('Ya pagué, verificar'),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _reabrirCheckout,
                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                      label: const Text('Reabrir pago en PayU'),
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextButton(
                    onPressed: () =>
                        Navigator.of(context)
                            .popUntil((route) => route.isFirst),
                    child: const Text('Volver al catálogo'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Compra realizada')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Aparecer(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const _Medallon(
                  icon: Icons.check_rounded,
                  color: AppColors.success,
                  fondo: AppColors.successContainer,
                ),
                const SizedBox(height: 20),
                Text(
                  '¡Gracias por tu compra!',
                  textAlign: TextAlign.center,
                  style: textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  _total != null
                      ? 'Tu orden por S/ ${Formats.precio(_total!)} se registró correctamente.'
                      : 'Tu orden se registró correctamente.',
                  textAlign: TextAlign.center,
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 26),
                FilledButton(
                  onPressed: () =>
                      Navigator.of(context).popUntil((route) => route.isFirst),
                  child: const Text('Volver al catálogo'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Medallón circular con filete dorado para estados finales.
class _Medallon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color fondo;

  const _Medallon({
    required this.icon,
    required this.color,
    required this.fondo,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.7, end: 1),
      duration: Duracion.lenta,
      curve: Curves.easeOutBack,
      builder: (context, escala, child) =>
          Transform.scale(scale: escala, child: child),
      child: Container(
        width: 96,
        height: 96,
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.gold.withValues(alpha: 0.45)),
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(color: fondo, shape: BoxShape.circle),
          child: Icon(icon, size: 42, color: color),
        ),
      ),
    );
  }
}

/// Pasos del flujo de compra (Carrito ✓ · Entrega · Pago).
class _Pasos extends StatelessWidget {
  const _Pasos();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    Widget paso(
      String numero,
      String texto, {
      required bool hecho,
      required bool actual,
    }) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 26,
            height: 26,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: hecho || actual ? AppColors.primary : AppColors.surface,
              border: Border.all(
                color: hecho || actual
                    ? AppColors.primary
                    : AppColors.dividerStrong,
                width: 1.5,
              ),
            ),
            child: hecho
                ? const Icon(Icons.check_rounded, size: 15, color: Colors.white)
                : Text(
                    numero,
                    style: textTheme.labelMedium?.copyWith(
                      color: actual ? Colors.white : AppColors.textTertiary,
                    ),
                  ),
          ),
          const SizedBox(height: 5),
          Text(
            texto,
            style: textTheme.labelSmall?.copyWith(
              color: hecho || actual
                  ? AppColors.textPrimary
                  : AppColors.textTertiary,
              fontWeight: actual ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ],
      );
    }

    Widget linea(bool activa) => Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 18, left: 6, right: 6),
        decoration: BoxDecoration(
          color: activa ? AppColors.gold : AppColors.divider,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radios.md),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          paso('1', 'Carrito', hecho: true, actual: false),
          linea(true),
          paso('2', 'Entrega', hecho: false, actual: true),
          linea(false),
          paso('3', 'Pago', hecho: false, actual: false),
        ],
      ),
    );
  }
}

/// Sección numerada del formulario.
class _Seccion extends StatelessWidget {
  final String numero;
  final String titulo;
  final Widget child;

  const _Seccion({
    required this.numero,
    required this.titulo,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radios.md),
        border: Border.all(color: AppColors.divider),
        boxShadow: Sombra.tarjeta,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.secondaryContainer,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  numero,
                  style: textTheme.labelMedium?.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(titulo, style: textTheme.titleMedium)),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

/// Fila del resumen del pedido.
class _FilaResumen extends StatelessWidget {
  final String label;
  final String value;

  const _FilaResumen({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
        Text(
          value,
          style: textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

/// Nota informativa del tipo "Recoger en tienda".
class _NotaTienda extends StatelessWidget {
  const _NotaTienda();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.successContainer,
        borderRadius: BorderRadius.circular(Radios.sm),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.storefront_rounded,
            size: 20,
            color: AppColors.success,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Puedes recoger tu pedido en nuestra tienda sin costo de envío.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: AppColors.textPrimary, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

/// Tarjeta seleccionable de tipo de entrega.
class _OpcionEntrega extends StatelessWidget {
  final bool seleccionado;
  final IconData icon;
  final String titulo;
  final String detalle;
  final String etiqueta;
  final VoidCallback onTap;

  const _OpcionEntrega({
    required this.seleccionado,
    required this.icon,
    required this.titulo,
    required this.detalle,
    required this.etiqueta,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Presionable(
      escala: 0.985,
      child: Semantics(
        selected: seleccionado,
        button: true,
        child: AnimatedContainer(
          duration: Duracion.rapida,
          decoration: BoxDecoration(
            color: seleccionado ? AppColors.primaryContainer : AppColors.paper,
            borderRadius: BorderRadius.circular(Radios.sm),
            border: Border.all(
              color: seleccionado ? AppColors.primary : AppColors.divider,
              width: seleccionado ? 1.4 : 1,
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(Radios.sm),
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: seleccionado
                            ? AppColors.primary
                            : AppColors.surface,
                        borderRadius: BorderRadius.circular(Radios.sm),
                        border: Border.all(color: AppColors.divider),
                      ),
                      child: Icon(
                        icon,
                        size: 20,
                        color: seleccionado
                            ? Colors.white
                            : AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Tarifa junto al título: la descripción usa todo
                          // el ancho y no se aprieta en pantallas angostas.
                          Wrap(
                            spacing: 8,
                            runSpacing: 2,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                titulo,
                                style: textTheme.titleSmall?.copyWith(
                                  color: seleccionado
                                      ? AppColors.primary
                                      : AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                etiqueta,
                                style: textTheme.labelSmall?.copyWith(
                                  color: AppColors.textTertiary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 1),
                          Text(
                            detalle,
                            style: textTheme.bodySmall?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    AnimatedSwitcher(
                      duration: Duracion.rapida,
                      child: Icon(
                        seleccionado
                            ? Icons.radio_button_checked_rounded
                            : Icons.radio_button_off_rounded,
                        key: ValueKey(seleccionado),
                        size: 20,
                        color: seleccionado
                            ? AppColors.primary
                            : AppColors.dividerStrong,
                      ),
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
}

/// Zona de reparto fija: el envío a domicilio es solo dentro de Lima.
class _ZonaReparto extends StatelessWidget {
  const _ZonaReparto();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.paper,
        borderRadius: BorderRadius.circular(Radios.sm),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          Icon(Icons.location_city_outlined, size: 20, color: AppColors.gold),
          const SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: 'Lima',
                    style: textTheme.titleSmall?.copyWith(
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const TextSpan(text: '  ·  Repartimos solo dentro de Lima'),
                ],
              ),
              style: textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
