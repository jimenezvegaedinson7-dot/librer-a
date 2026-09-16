import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/venta.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';
import '../utils/formats.dart';
import '../widgets/app_page_header.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';

/// Pantalla "Mis compras": lista las ventas del cliente desde
/// `GET /ventas/mis-ventas`.
class MisComprasScreen extends StatefulWidget {
  const MisComprasScreen({super.key});

  @override
  State<MisComprasScreen> createState() => MisComprasScreenState();
}

class MisComprasScreenState extends State<MisComprasScreen> {
  bool _loading = true;
  bool _cargando = false;
  String? _error;
  List<Venta> _ventas = const [];

  @override
  void initState() {
    super.initState();
    _cargarVentas();
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
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _cargarVentas,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: const Padding(
                  padding: EdgeInsets.fromLTRB(20, 20, 20, 14),
                  child: AppPageHeader(
                    eyebrow: 'Historial',
                    title: 'Mis compras',
                    subtitle: 'Consulta pagos, entregas y detalle de pedidos.',
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
        itemBuilder: (context, index) =>
            _VentaTile(venta: _ventas[index], onActualizada: _cargarVentas),
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

  /// Reabre el checkout de Mercado Pago de una venta pendiente en el
  /// navegador. Si no hay una URL registrada en memoria (p. ej. la app se
  /// reinició antes de pagar), se muestra un aviso.
  Future<void> _continuarPago(BuildContext context) async {
    final idVenta = venta.idVenta;
    String? url = idVenta == null
        ? null
        : ApiService.instance.obtenerCheckoutUrl(idVenta);

    if ((url == null || url.isEmpty) && idVenta != null) {
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
              'Inicia el pago nuevamente desde "Mi carrito".',
            ),
            duration: Duration(seconds: 3),
          ),
        );
      return;
    }

    final uri = Uri.parse(url);
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo abrir la ventana de pago.')),
      );
    }
  }

  Future<void> _verificarPago(BuildContext context) async {
    final orderId = venta.orderId;
    if (orderId == null || orderId.isEmpty) return;

    try {
      final estado = await ApiService.instance.obtenerOrdenPago(orderId);
      if (!context.mounted) return;
      if (estado.pagada) {
        ApiService.instance.limpiarIdempotencia(idVenta: venta.idVenta);
        await onActualizada();
      } else if (estado.cancelada) {
        ApiService.instance.limpiarIdempotencia(idVenta: venta.idVenta);
      }
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            estado.pagada
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

  String? get _entregaLabel {
    switch (venta.tipoEntrega?.toLowerCase().trim()) {
      case 'domicilio':
        return 'A domicilio';
      case 'agencia':
        return 'Agencia';
      case 'tienda':
        return 'Recoger en tienda';
      default:
        return null;
    }
  }

  /// Información de apoyo de la entrega: distrito/provincia (domicilio) o
  /// el nombre de la agencia (agencia).
  String get _infoEntrega {
    final tipo = venta.tipoEntrega?.toLowerCase().trim();
    if (tipo == 'domicilio') {
      final zona = [
        venta.distrito,
        venta.provincia,
      ].where((v) => v != null && v.isNotEmpty).map((v) => v!).join(', ');
      return zona;
    }
    if (tipo == 'agencia') return venta.agencia ?? '';
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final entrega = _entregaLabel;
    final infoEntrega = _infoEntrega;
    final esDomicilio = venta.tipoEntrega?.toLowerCase().trim() == 'domicilio';

    return GestureDetector(
      onTap: () => _mostrarDetalle(context),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.divider),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryDark.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Compra #${venta.idVenta ?? '—'}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                ),
                _EstadoChip(venta: venta),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _fechaLabel(venta.fechaVenta),
              style: const TextStyle(color: AppColors.textSecondary),
            ),
            if (entrega != null) ...[
              const SizedBox(height: 4),
              Text(
                'Entrega: $entrega',
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            ],
            if (infoEntrega.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                infoEntrega,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            ],
            if (esDomicilio && (venta.direccion ?? '').isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                venta.direccion!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Text('Total: ', style: TextStyle(fontSize: 15)),
                Text(
                  'S/ ${Formats.precio(venta.total)}',
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            if (venta.pendiente) ...[
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: () => _verificarPago(context),
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Verificar'),
                  ),
                  TextButton.icon(
                    onPressed: () => _continuarPago(context),
                    icon: const Icon(Icons.payment_rounded, size: 18),
                    label: const Text('Continuar pago'),
                  ),
                ],
              ),
            ],
          ],
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
                      Text(
                        'Detalle de la compra',
                        style: textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
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
            const SizedBox(height: 16),
            if (!tieneDetalle)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
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
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                )
              : textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

/// Badge del estado de la venta.
class _EstadoChip extends StatelessWidget {
  final Venta venta;

  const _EstadoChip({required this.venta});

  @override
  Widget build(BuildContext context) {
    final estadoRaw = (venta.estado ?? '').toLowerCase().trim();
    final color = estadoRaw == 'cancelada'
        ? AppColors.error
        : (estadoRaw == 'entregada' || venta.pagada)
        ? AppColors.success
        : AppColors.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        venta.estadoLabel,
        style: Theme.of(context).textTheme.labelMedium
            ?.copyWith(color: color, fontWeight: FontWeight.w700),
      ),
    );
  }
}
