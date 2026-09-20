import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/agencia.dart';
import '../models/ubicacion.dart';
import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/formats.dart';
import '../widgets/app_page_header.dart';
import '../widgets/empty_view.dart';
import '../widgets/loading_view.dart';

enum _TipoEntrega { domicilio, agencia, tienda }

/// Pantalla "Entrega y pago".
///
/// Se abre desde "Mi carrito" al presionar "Realizar pedido". Permite elegir
/// el tipo de entrega (a domicilio, agencia o recoger en tienda), ingresar los
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
  _TipoEntrega _tipoEntrega = _TipoEntrega.domicilio;
  bool _procesando = false;
  bool _cargandoUbicaciones = false;
  bool _exito = false;
  String? _orderId;
  String? _checkoutUrl;
  double? _total;

  List<Provincia> _provincias = [];
  List<Distrito> _distritos = [];
  List<Agencia> _agencias = [];
  int? _idProvincia;
  int? _idDistrito;
  int? _idAgencia;

  @override
  void initState() {
    super.initState();
    _cargarUbicaciones();
  }

  @override
  void dispose() {
    _direccionController.dispose();
    super.dispose();
  }

  Future<void> _cargarUbicaciones() async {
    setState(() => _cargandoUbicaciones = true);
    try {
      final agencias = await ApiService.instance.obtenerAgencias();
      final provincias = await ApiService.instance.obtenerProvincias();
      if (!mounted) return;
      setState(() {
        _agencias = agencias;
        _provincias = provincias;
        if (_provincias.isNotEmpty && _idProvincia == null) {
          _idProvincia = _provincias.first.idProvincia;
          _cargarDistritos(_idProvincia!);
        }
        _cargandoUbicaciones = false;
      });
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
        tipoEntrega: esDomicilio
            ? 'domicilio'
            : _tipoEntrega == _TipoEntrega.agencia
            ? 'agencia'
            : 'tienda',
        direccion: esDomicilio ? _direccionController.text.trim() : null,
        idDistrito: esDomicilio ? _idDistrito : null,
        idAgencia: _tipoEntrega == _TipoEntrega.agencia ? _idAgencia : null,
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
    switch (_tipoEntrega) {
      case _TipoEntrega.domicilio:
        if (_idDistrito == null) {
          return 'Selecciona un distrito de Lima.';
        }
        if (_direccionController.text.trim().length < 5) {
          return 'Indica una dirección de entrega válida.';
        }
        return null;
      case _TipoEntrega.agencia:
        if (_idAgencia == null) {
          return 'Selecciona una agencia de envío.';
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
      case _TipoEntrega.agencia:
        final agencia = _agencias
            .where((a) => a.idAgencia == _idAgencia)
            .firstOrNull;
        return agencia?.tarifaBase ?? 0;
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
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                children: [
                  const AppPageHeader(title: 'Entrega y pago'),
                  const SizedBox(height: 22),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: _buildSeccionEntrega(context),
                  ),
                  const SizedBox(height: 20),
                  _buildResumen(context),
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
        _SectionHeader(
          icon: Icons.local_shipping_outlined,
          title: 'Tipo de entrega',
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _EntregaChip(
              seleccionado: _tipoEntrega == _TipoEntrega.domicilio,
              icon: Icons.local_shipping_outlined,
              label: 'A domicilio',
              onTap: () =>
                  setState(() => _tipoEntrega = _TipoEntrega.domicilio),
            ),
            _EntregaChip(
              seleccionado: _tipoEntrega == _TipoEntrega.agencia,
              icon: Icons.store_mall_directory_outlined,
              label: 'Agencia',
              onTap: () => setState(() => _tipoEntrega = _TipoEntrega.agencia),
            ),
            _EntregaChip(
              seleccionado: _tipoEntrega == _TipoEntrega.tienda,
              icon: Icons.storefront_outlined,
              label: 'Recoger en tienda',
              onTap: () => setState(() => _tipoEntrega = _TipoEntrega.tienda),
            ),
          ],
        ),
        if (_tipoEntrega == _TipoEntrega.domicilio) ...[
          const SizedBox(height: 16),
          _buildEntregaDomicilio(),
        ],
        if (_tipoEntrega == _TipoEntrega.agencia) ...[
          const SizedBox(height: 16),
          _buildEntregaAgencia(),
        ],
        if (_tipoEntrega == _TipoEntrega.tienda) ...[
          const SizedBox(height: 12),
          const _NotaTienda(),
        ],
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
        DropdownButtonFormField<int>(
          initialValue: _idProvincia,
          decoration: const InputDecoration(labelText: 'Provincia'),
          items: [
            for (final p in _provincias)
              DropdownMenuItem(
                value: p.idProvincia,
                child: Text(p.nombre, overflow: TextOverflow.ellipsis),
              ),
          ],
          onChanged: (valor) {
            if (valor == null) return;
            setState(() {
              _idProvincia = valor;
              _idDistrito = null;
              _distritos = [];
            });
            _cargarDistritos(valor);
          },
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<int>(
          initialValue: _idDistrito,
          decoration: const InputDecoration(labelText: 'Distrito'),
          items: [
            for (final d in _distritos)
              DropdownMenuItem(
                value: d.idDistrito,
                child: Text(d.nombre, overflow: TextOverflow.ellipsis),
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
            hintText: 'Dirección de entrega (calle, número)',
          ),
        ),
      ],
    );
  }

  Widget _buildEntregaAgencia() {
    if (_cargandoUbicaciones) {
      return const LoadingView(message: 'Cargando opciones de envío...');
    }

    return DropdownButtonFormField<int>(
      initialValue: _idAgencia,
      decoration: const InputDecoration(labelText: 'Agencia de envío'),
      items: [
        for (final a in _agencias)
          DropdownMenuItem(
            value: a.idAgencia,
            child: Text(a.nombre, overflow: TextOverflow.ellipsis),
          ),
      ],
      onChanged: _agencias.isEmpty
          ? null
          : (valor) {
              if (valor != null) {
                setState(() => _idAgencia = valor);
              }
            },
    );
  }

  Widget _buildResumen(BuildContext context) {
    final subtotal = CarritoService.instance.total;
    final costoEnvio = _costoEnvio();
    final total = subtotal + costoEnvio;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(
            icon: Icons.receipt_long_outlined,
            title: 'Resumen del pedido',
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),
          _FilaResumen(
            label: 'Subtotal',
            value: 'S/ ${Formats.precio(subtotal)}',
          ),
          const SizedBox(height: 6),
          _FilaResumen(
            label: 'Envío',
            value: 'S/ ${Formats.precio(costoEnvio)}',
          ),
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 12),
          _FilaResumen(
            label: 'Total',
            value: 'S/ ${Formats.precio(total)}',
            destacado: true,
          ),
        ],
      ),
    );
  }

  Widget _buildBarraPagar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: Color(0x1617181C),
            blurRadius: 16,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            height: 54,
            child: _procesando
                ? Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: AppColors.primary,
                      ),
                    ),
                  )
                : FilledButton(
                    onPressed: _realizarCompra,
                    child: const Text('Ir al pago seguro'),
                  ),
          ),
          const SizedBox(height: 8),
          Text(
            'Serás redirigido a PayU para completar tu pago de forma segura.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall
                ?.copyWith(color: AppColors.textTertiary),
          ),
        ],
      ),
    );
  }

  Widget _buildExito(BuildContext context) {
    final conCheckout = (_checkoutUrl ?? '').isNotEmpty;

    if (conCheckout) {
      return Scaffold(
        appBar: AppBar(title: const Text('Compra en proceso')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.hourglass_top_rounded,
                  size: 80,
                  color: AppColors.warning,
                ),
                const SizedBox(height: 16),
                Text(
                  '¡Gracias por tu compra!',
                  style: Theme.of(context).textTheme.headlineSmall
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Text(
                  _total != null
                      ? 'Tu orden por S/ ${Formats.precio(_total!)} quedó creada. '
                            'Ahora solo falta pagarla en PayU para confirmarla.'
                      : 'Tu orden quedó creada. Ahora solo falta pagarla '
                            'en PayU para confirmarla.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium
                      ?.copyWith(color: AppColors.textSecondary, height: 1.4),
                ),
                const SizedBox(height: 8),
                Text(
                  'Si la ventana de pago se cerró, puedes volver a abrirla.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall
                      ?.copyWith(color: AppColors.textTertiary),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: _procesando
                      ? Center(
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: AppColors.primary,
                            ),
                          ),
                        )
                      : FilledButton(
                          onPressed: _verificarPago,
                          child: const Text('Ya pagué, verificar'),
                        ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: _reabrirCheckout,
                  child: const Text('Reabrir pago en PayU'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () =>
                      Navigator.of(context).popUntil((route) => route.isFirst),
                  child: const Text('Volver al catálogo'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Compra realizada')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.check_circle_rounded,
                size: 80,
                color: AppColors.success,
              ),
              const SizedBox(height: 16),
              Text(
                '¡Gracias por tu compra!',
                style: Theme.of(context).textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                _total != null
                    ? 'Tu orden por S/ ${Formats.precio(_total!)} se registró correctamente.'
                    : 'Tu orden se registró correctamente.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium
                    ?.copyWith(color: AppColors.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () =>
                    Navigator.of(context).popUntil((route) => route.isFirst),
                child: const Text('Volver al catálogo'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Cabecera de sección con icono.
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;

  const _SectionHeader({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Icon(icon, size: 20, color: colorScheme.primary),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}

/// Fila del resumen del pedido.
class _FilaResumen extends StatelessWidget {
  final String label;
  final String value;
  final bool destacado;

  const _FilaResumen({
    required this.label,
    required this.value,
    this.destacado = false,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: destacado
                ? textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)
                : textTheme.bodyMedium,
          ),
        ),
        Text(
          value,
          style: destacado
              ? textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                )
              : textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
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
        color: AppColors.primaryContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.storefront_rounded, size: 20, color: AppColors.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Puedes recoger tu pedido en nuestra tienda sin costo de envío.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}

/// Chip de selección de tipo de entrega (estilo consistente con el existente).
class _EntregaChip extends StatelessWidget {
  final bool seleccionado;
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _EntregaChip({
    required this.seleccionado,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      selected: seleccionado,
      onSelected: (_) => onTap(),
      avatar: Icon(icon, size: 18),
      label: Text(label),
    );
  }
}
