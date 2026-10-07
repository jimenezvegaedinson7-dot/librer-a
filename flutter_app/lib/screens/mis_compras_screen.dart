import 'dart:async';

import 'package:flutter/material.dart';

import '../models/venta.dart';
import '../utils/seguimiento_pedido.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/formats.dart';
import '../widgets/aparecer.dart';
import '../widgets/app_page_header.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/estado_chip.dart';
import '../widgets/loading_view.dart';
import '../widgets/precio_texto.dart';
import '../widgets/presionable.dart';
import '../widgets/confirmacion_otp.dart';
import 'pago_en_app_screen.dart';

/// Pantalla "Mis compras": lista las ventas del cliente desde
/// `GET /ventas/mis-ventas`.
class MisComprasScreen extends StatefulWidget {
  const MisComprasScreen({super.key});

  @override
  State<MisComprasScreen> createState() => MisComprasScreenState();
}

class MisComprasScreenState extends State<MisComprasScreen>
    with WidgetsBindingObserver {
  bool _loading = true;
  bool _cargando = false;
  String? _error;
  List<Venta> _ventas = const [];
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _timer = Timer.periodic(const Duration(seconds: 60), (_) {
      if (mounted &&
          ModalRoute.of(context)?.isCurrent == true &&
          WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed) {
        _cargarVentas();
      }
    });
    _cargarVentas();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        mounted &&
        ModalRoute.of(context)?.isCurrent == true) {
      _cargarVentas();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Recarga las compras desde el backend.
  ///
  /// Se invoca desde [HomeScreen] cada vez que se entra a la pestaña "Mis
  /// compras" (la pantalla vive en un IndexedStack y no se vuelve a construir).
  Future<void> recargar() async {
    await _cargarVentas();
  }

  Future<void> _cargarVentas() async {
    if (_cargando) return;
    _cargando = true;
    setState(() {
      _loading = _ventas.isEmpty;
      _error = null;
    });
    try {
      final ventas = await ApiService.instance.obtenerMisVentas();
      if (mounted) setState(() => _ventas = ventas);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'No se pudieron cargar tus compras.');
      }
    } finally {
      _cargando = false;
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Abierta encima de otra pantalla (desde Perfil o Reservas): flecha para volver.
    final apilada = Navigator.of(context).canPop();
    return Scaffold(
      appBar: apilada ? AppBar(toolbarHeight: 52) : null,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _cargarVentas,
          color: AppColors.primary,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
                  child: AppPageHeader(
                    eyebrow: 'Historial',
                    title: 'Mis compras',
                    subtitle: _ventas.isEmpty
                        ? null
                        : _ventas.length == 1
                        ? '1 compra registrada'
                        : '${_ventas.length} compras registradas',
                  ),
                ),
              ),
              _buildBody(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: LoadingView(message: 'Cargando tus compras...'),
      );
    }
    if (_error != null && _ventas.isEmpty) {
      return SliverFillRemaining(
        hasScrollBody: false,
        child: ErrorView(message: _error!, onRetry: _cargarVentas),
      );
    }
    if (_ventas.isEmpty) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: EmptyView(
          icon: Icons.receipt_long_outlined,
          title: 'Sin compras todavía',
          message: 'Cuando realices una compra, la verás aquí.',
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      sliver: SliverList.separated(
        itemCount: _ventas.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) => Aparecer(
          key: ValueKey(_ventas[index].idVenta ?? index),
          indice: index,
          child: _VentaTile(
            venta: _ventas[index],
            onActualizada: _cargarVentas,
          ),
        ),
      ),
    );
  }
}

/// Tarjeta resumen de una venta. Al tocarla abre el detalle de la compra.
class _VentaTile extends StatelessWidget {
  final Venta venta;
  final Future<void> Function() onActualizada;

  const _VentaTile({required this.venta, required this.onActualizada});

  void _mostrarDetalle(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _DetalleVentaSheet(venta: venta),
    );
  }

  /// Reabre el checkout de PayU de una venta pendiente en el
  /// navegador. Si no hay una URL registrada en memoria (p. ej. la app se
  /// reinició antes de pagar), se muestra un aviso.
  Future<void> _continuarPago(BuildContext context) async {
    final idVenta = venta.idVenta;
    String? url;
    // Siempre revalidar: una URL local no demuestra que siga pendiente.
    if (idVenta != null) {
      try {
        url = await ApiService.instance.recuperarCheckoutVenta(idVenta);
      } on ApiException catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(SnackBar(content: Text(error.message)));
        }
        return;
      }
    }

    if (!context.mounted) return;

    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text(
              'No encontramos una ventana de pago activa para esta compra. '
              'Actualiza tus compras y verifica su estado antes de continuar.',
            ),
            duration: Duration(seconds: 3),
          ),
        );
      return;
    }

    // El pago se hace dentro de la app; al cerrarse se consulta el estado.
    final resultado = await PagoEnAppScreen.abrir(context, url);
    if (!context.mounted) return;
    await _verificarPago(
      context,
      trasPago: resultado == ResultadoPagoEnApp.regreso,
    );
  }

  Future<void> _verificarPago(
    BuildContext context, {
    bool trasPago = false,
  }) async {
    final orderId = venta.orderId;
    if (orderId == null || orderId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Esta compra no tiene una referencia PayU disponible.'),
        ),
      );
      return;
    }

    try {
      var estado = await ApiService.instance.obtenerOrdenPago(orderId);
      // Tras volver de PayU, la confirmación puede tardar unos segundos.
      for (
        var intento = 0;
        trasPago && intento < 4 && !estado.pagada && !estado.cancelada;
        intento++
      ) {
        await Future<void>.delayed(const Duration(seconds: 2));
        if (!context.mounted) return;
        estado = await ApiService.instance.obtenerOrdenPago(orderId);
      }
      if (!context.mounted) return;
      if (estado.pagada && !estado.requiereRevision && !venta.pagada) {
        await mostrarConfirmacionOtp(
          context,
          titulo: '¡Pago confirmado!',
          mensaje: 'Tu pedido pasa a preparación. Te avisaremos en cada paso.',
        );
        if (!context.mounted) return;
        await onActualizada();
        return;
      }
      await onActualizada();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            estado.requiereRevision
                ? 'El pago necesita revisión de la librería. No vuelvas a pagarlo.'
                : estado.pagada
                ? 'Pago confirmado.'
                : estado.cancelada
                ? 'El pago fue cancelado.'
                : 'El pago aún está pendiente.',
          ),
        ),
      );
    } on ApiException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  /// Etiqueta de la entrega tal como se realizó. `agencia` no se puede elegir
  /// al comprar (el checkout solo ofrece domicilio y tienda); solo aparece
  /// aquí para poder identificar pedidos antiguos de la base.
  String? get _entregaLabel => venta.entregaLabel;

  /// Información de apoyo de la entrega: distrito/provincia (domicilio) o
  /// el nombre de la agencia (agencia).
  String get _infoEntrega {
    final tipo = venta.tipoEntrega?.toLowerCase().trim();
    if (tipo == 'domicilio') {
      return venta.ubicacionEntrega;
    }
    if (tipo == 'agencia') return venta.agencia ?? '';
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final entrega = _entregaLabel;
    final infoEntrega = _infoEntrega;
    final esDomicilio = venta.tipoEntrega?.toLowerCase().trim() == 'domicilio';
    final detalleEntrega = [
      if (infoEntrega.isNotEmpty) infoEntrega,
      if (esDomicilio && (venta.direccion ?? '').isNotEmpty) venta.direccion!,
    ].join(' · ');
    final radio = BorderRadius.circular(Radios.md);

    return Presionable(
      escala: 0.985,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: radio,
          border: Border.all(color: AppColors.divider),
          boxShadow: Sombra.tarjeta,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: radio,
            onTap: () => _mostrarDetalle(context),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: AppColors.pergamino,
                          borderRadius: BorderRadius.circular(Radios.sm),
                          border: Border.all(
                            color: AppColors.gold.withValues(alpha: 0.35),
                          ),
                        ),
                        child: Icon(
                          Icons.receipt_long_outlined,
                          size: 20,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Compra #${venta.idVenta ?? '—'}',
                              style: textTheme.titleMedium,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _fechaLabel(venta.fechaVenta),
                              style: textTheme.bodySmall?.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      _EstadoChip(venta: venta),
                    ],
                  ),
                  if (entrega != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 9,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.paper,
                        borderRadius: BorderRadius.circular(Radios.sm),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            esDomicilio
                                ? Icons.local_shipping_outlined
                                : venta.tipoEntrega?.toLowerCase().trim() ==
                                      'agencia'
                                ? Icons.store_mall_directory_outlined
                                : Icons.storefront_outlined,
                            size: 17,
                            color: AppColors.gold,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Entrega: $entrega',
                                  style: textTheme.bodySmall?.copyWith(
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                if (detalleEntrega.isNotEmpty)
                                  Text(
                                    detalleEntrega,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: textTheme.bodySmall?.copyWith(
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  _EstadoEnPalabras(venta: venta),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text(
                        'Total:',
                        style: textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(width: 6),
                      PrecioTexto(monto: venta.total, tamano: 19),
                      const Spacer(),
                      Text(
                        'Ver detalle',
                        style: textTheme.labelMedium?.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                      Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: AppColors.primary,
                      ),
                    ],
                  ),
                  if (venta.pendiente) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => _verificarPago(context),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(0, 42),
                            ),
                            child: const Text('Verificar'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: FilledButton(
                            onPressed: () => _continuarPago(context),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(0, 42),
                            ),
                            child: const Text('Continuar pago'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _fechaLabel(String? iso) {
    final fecha = Formats.fecha(iso);
    return fecha == '—' ? 'Fecha no disponible' : 'Fecha: $fecha';
  }
}

/// Detalle de una compra en un bottom sheet: ítems, costo de envío y total.
class _DetalleVentaSheet extends StatelessWidget {
  final Venta venta;

  const _DetalleVentaSheet({required this.venta});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final detalle = venta.detalle;
    final tieneDetalle = detalle.isNotEmpty;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Detalle de la compra', style: textTheme.titleLarge),
                      const SizedBox(height: 2),
                      Text(
                        'Compra #${venta.idVenta ?? '—'}',
                        style: textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                _EstadoChip(venta: venta),
              ],
            ),
            const SizedBox(height: 18),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: _SeguimientoPedido(venta: venta),
            ),
            const SizedBox(height: 14),
            if (venta.entregaLabel != null)
              Text(venta.entregaLabel!, style: textTheme.titleSmall),
            if (venta.ubicacionEntrega.isNotEmpty) Text(venta.ubicacionEntrega),
            if ((venta.direccion ?? '').isNotEmpty) Text(venta.direccion!),
            if ((venta.referencia ?? '').isNotEmpty)
              Text('Referencia: ${venta.referencia}'),
            if ((venta.agencia ?? '').isNotEmpty)
              Text('Agencia: ${venta.agencia}'),
            const SizedBox(height: 14),
            if (!tieneDetalle)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'No se pudo cargar el detalle de esta compra.',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              )
            else
              for (final item in detalle) _ItemDetalleRow(item: item),
            const Divider(height: 32),
            _FilaDetalle(
              label: 'Costo de envío',
              value: 'S/ ${Formats.precio(venta.costoEnvio)}',
            ),
            const SizedBox(height: 8),
            _FilaDetalle(
              label: 'Total',
              value: 'S/ ${Formats.precio(venta.total)}',
              destacado: true,
            ),
          ],
        ),
      ),
    );
  }
}

/// Fila de un ítem del detalle: título con subtotal y cantidad × precio.
class _ItemDetalleRow extends StatelessWidget {
  final VentaItem item;

  const _ItemDetalleRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  item.titulo ?? 'Libro',
                  style: textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'S/ ${Formats.precio(item.subtotal)}',
                style: textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            '${item.cantidad ?? 0} × S/ ${Formats.precio(item.precioUnitario)}',
            style: textTheme.bodySmall?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Fila del detalle: etiqueta + valor (opcionalmente destacado).
class _FilaDetalle extends StatelessWidget {
  final String label;
  final String value;
  final bool destacado;

  const _FilaDetalle({
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
                : textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
          ),
        ),
        Text(
          value,
          style: destacado
              ? textTheme.titleMedium?.copyWith(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w700,
                  color: AppColors.price,
                )
              : textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

/// Línea de seguimiento del pedido: muestra las etapas
/// "Pedido realizado → Pago confirmado → Entregado" según el estado actual.
/// Solo para pruebas: el seguimiento de una compra, tal como en el detalle.
@visibleForTesting
Widget seguimientoPedidoParaPruebas(Venta venta) =>
    _SeguimientoPedido(venta: venta);

class _SeguimientoPedido extends StatelessWidget {
  final Venta venta;

  const _SeguimientoPedido({required this.venta});

  @override
  Widget build(BuildContext context) {
    final seg = SeguimientoPedido.de(venta);
    final color = _colorTono(seg.tono);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (seg.pasos.isNotEmpty) ...[
          _LineaPasos(pasos: seg.pasos),
          const SizedBox(height: 14),
        ],
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(_iconoTono(seg.tono, venta), color: color, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      seg.titulo,
                      style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w700,
                        fontSize: 13.5,
                      ),
                    ),
                    if (seg.mensaje.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        seg.mensaje,
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12.5,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

Color _colorTono(TonoSeguimiento tono) => switch (tono) {
  TonoSeguimiento.cancelado => AppColors.error,
  TonoSeguimiento.espera => AppColors.gold,
  TonoSeguimiento.listo => AppColors.success,
  TonoSeguimiento.proceso => AppColors.primary,
};

IconData _iconoTono(TonoSeguimiento tono, Venta venta) {
  if (tono == TonoSeguimiento.cancelado) return Icons.cancel_outlined;
  if (tono == TonoSeguimiento.espera) return Icons.schedule_outlined;
  if (tono == TonoSeguimiento.listo) return Icons.check_circle_outline;
  final estado = venta.estadoEntrega?.toLowerCase().trim();
  if (estado == 'en_camino') return Icons.local_shipping_outlined;
  if (estado == 'listo_recojo') return Icons.storefront_outlined;
  return Icons.inventory_2_outlined;
}

/// Pasos del pedido sobre una sola línea. Todos los círculos ocupan el
/// mismo espacio (el actual se distingue por un halo, no por su tamaño),
/// así círculos, línea y textos quedan siempre alineados. Al abrir, la
/// línea se llena de verde y cada check aparece al alcanzarlo.
class _LineaPasos extends StatefulWidget {
  final List<PasoSeguimiento> pasos;
  const _LineaPasos({required this.pasos});

  @override
  State<_LineaPasos> createState() => _LineaPasosState();
}

class _LineaPasosState extends State<_LineaPasos>
    with SingleTickerProviderStateMixin {
  static const _marca = 30.0;
  late final AnimationController _anim = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );
  bool _iniciada = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_iniciada) return;
    _iniciada = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      _anim.value = 1;
    } else {
      _anim.forward();
    }
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  double _tramo(double t, double inicio, double largo, Curve curva) =>
      curva.transform(((t - inicio) / largo).clamp(0.0, 1.0));

  @override
  Widget build(BuildContext context) {
    final pasos = widget.pasos;
    final n = pasos.length;
    final indice = pasos.lastIndexWhere((p) => p.hecho);
    // Fracción de la línea que queda en verde (hasta el paso actual).
    final meta = n > 1 && indice > 0 ? indice / (n - 1) : 0.0;
    return AnimatedBuilder(
      animation: _anim,
      builder: (context, _) {
        final t = _anim.value;
        final avanceLinea = meta * _tramo(t, 0, 0.65, Curves.easeInOutCubic);
        return Column(
          children: [
            SizedBox(
              height: _marca,
              child: LayoutBuilder(
                builder: (context, c) {
                  final margen = c.maxWidth / (2 * n);
                  final largo = c.maxWidth - 2 * margen;
                  return Stack(
                    children: [
                      // Línea base y su parte completada.
                      Positioned(
                        left: margen,
                        width: largo,
                        top: _marca / 2 - 1.5,
                        height: 3,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: AppColors.divider,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      Positioned(
                        left: margen,
                        width: largo * avanceLinea,
                        top: _marca / 2 - 1.5,
                        height: 3,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: AppColors.success,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      Row(
                        children: [
                          for (var i = 0; i < n; i++)
                            Expanded(
                              child: Center(
                                child: _MarcaPaso(
                                  paso: pasos[i],
                                  // El check aparece cuando la línea lo alcanza.
                                  aparicion: !pasos[i].hecho
                                      ? 0
                                      : _tramo(
                                          t,
                                          meta == 0
                                              ? 0
                                              : 0.65 * (i / (n - 1)) / meta,
                                          0.3,
                                          Curves.elasticOut,
                                        ),
                                  halo: pasos[i].actual
                                      ? _tramo(t, 0.7, 0.3, Curves.easeOutCubic)
                                      : 0,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final paso in pasos)
                  Expanded(
                    child: Text(
                      paso.etiqueta,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        height: 1.2,
                        fontWeight: paso.actual
                            ? FontWeight.w700
                            : FontWeight.w500,
                        color: paso.hecho
                            ? AppColors.success
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        );
      },
    );
  }
}

/// Círculo de un paso dentro de un espacio fijo de 30 px.
class _MarcaPaso extends StatelessWidget {
  final PasoSeguimiento paso;

  /// 0 → 1: entrada con rebote del círculo verde y su check.
  final double aparicion;

  /// 0 → 1: halo del paso actual.
  final double halo;

  const _MarcaPaso({
    required this.paso,
    required this.aparicion,
    required this.halo,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: 30,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (halo > 0)
            Container(
              width: 22 + 8 * halo,
              height: 22 + 8 * halo,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.success.withValues(alpha: 0.18 * halo),
              ),
            ),
          // Base: círculo vacío (pasos pendientes y antes de la animación).
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.surface,
              border: Border.all(
                color: paso.hecho ? AppColors.success : AppColors.textTertiary,
                width: 2,
              ),
            ),
          ),
          if (aparicion > 0)
            Transform.scale(
              scale: aparicion,
              child: Container(
                width: 22,
                height: 22,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.success,
                ),
                child: const Icon(
                  Icons.check_rounded,
                  size: 15,
                  color: Colors.white,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Una línea con el estado del pedido ("Listo para recoger", "En camino"…).
class _EstadoEnPalabras extends StatelessWidget {
  final Venta venta;
  const _EstadoEnPalabras({required this.venta});

  @override
  Widget build(BuildContext context) {
    final seg = SeguimientoPedido.de(venta);
    final color = _colorTono(seg.tono);
    return Row(
      children: [
        Icon(_iconoTono(seg.tono, venta), size: 16, color: color),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            seg.titulo,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ),
      ],
    );
  }
}

/// Chip del estado de la venta.
class _EstadoChip extends StatelessWidget {
  final Venta venta;

  const _EstadoChip({required this.venta});

  @override
  Widget build(BuildContext context) {
    final estadoRaw = (venta.estado ?? '').toLowerCase().trim();
    final tono = estadoRaw == 'cancelada'
        ? TonoEstado.peligro
        : estadoRaw == 'reembolsada'
        ? TonoEstado.neutro
        : (estadoRaw == 'entregada' || venta.pagada)
        ? TonoEstado.exito
        : TonoEstado.aviso;
    return EstadoChip(texto: venta.estadoLabel, tono: tono);
  }
}
