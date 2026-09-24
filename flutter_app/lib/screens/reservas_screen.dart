import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../models/reserva.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/formats.dart';
import '../widgets/aparecer.dart';
import '../widgets/app_page_header.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/estado_chip.dart';
import '../widgets/portadas_libro.dart';
import '../widgets/loading_view.dart';
import 'mis_compras_screen.dart';

/// Pantalla de reservas del cliente.
///
/// Consume `GET /reservas/mis-reservas` con pull-to-refresh y muestra el
/// estado real de cada reserva.
class ReservasScreen extends StatefulWidget {
  const ReservasScreen({super.key});

  @override
  State<ReservasScreen> createState() => _ReservasScreenState();
}

class _ReservasScreenState extends State<ReservasScreen> {
  bool _loading = true;
  String? _error;
  List<Reserva> _reservas = const [];
  int? _cancelandoId;

  @override
  void initState() {
    super.initState();
    _cargarReservas();
  }

  Future<void> _cargarReservas() async {
    if (mounted) {
      setState(() {
        _loading = _reservas.isEmpty;
        _error = null;
      });
    }
    try {
      final reservas = await ApiService.instance.obtenerMisReservas();
      if (mounted) setState(() => _reservas = reservas);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'No se pudieron cargar tus reservas.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Solo se puede cancelar una reserva pendiente o confirmada.
  bool _puedeCancelar(Reserva reserva) {
    final estado = reserva.estado?.toLowerCase().trim();
    return estado == 'pendiente' || estado == 'confirmada';
  }

  void _irACompras() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const MisComprasScreen()));
  }

  /// Confirma la cancelación con un diálogo y llama a
  /// `DELETE /reservas/:id`. Al terminar actualiza la lista.
  Future<void> _cancelarReserva(Reserva reserva) async {
    final id = reserva.idReserva;
    if (id == null) return;

    final confirmado = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar reserva'),
        content: Text(
          '¿Seguro que deseas cancelar la reserva ${reserva.titulo ?? ''}? '
          'Se liberará el stock del libro.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('No'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Sí, cancelar'),
          ),
        ],
      ),
    );
    if (confirmado != true || !mounted) return;

    setState(() => _cancelandoId = id);
    try {
      await ApiService.instance.cancelarReserva(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Reserva cancelada.')));
      await _cargarReservas();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
      // Refresca por si el backend cambió el estado (p. ej. completada).
      await _cargarReservas();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo cancelar la reserva.')),
      );
    } finally {
      if (mounted) setState(() => _cancelandoId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final activas = _reservas.where(_puedeCancelar).length;
    final total = _reservas.length;

    // Abierta encima de otra pantalla (desde Perfil o Reservas): flecha para volver.
    final apilada = Navigator.of(context).canPop();
    return Scaffold(
      appBar: apilada ? AppBar(toolbarHeight: 52) : null,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _cargarReservas,
          color: AppColors.primary,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
                  child: AppPageHeader(
                    eyebrow: 'Apartados',
                    title: 'Mis reservas',
                    subtitle: total == 0
                        ? null
                        : '$total ${total == 1 ? 'reserva' : 'reservas'}'
                              ' · $activas ${activas == 1 ? 'activa' : 'activas'}',
                    trailing: OutlinedButton.icon(
                      onPressed: _irACompras,
                      icon: const Icon(Icons.receipt_long_outlined, size: 18),
                      label: const Text('Mis compras'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 40),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        textStyle: Theme.of(context).textTheme.labelMedium,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
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
        child: LoadingView(message: 'Cargando tus reservas...'),
      );
    }
    if (_error != null && _reservas.isEmpty) {
      return SliverFillRemaining(
        hasScrollBody: false,
        child: ErrorView(message: _error!, onRetry: _cargarReservas),
      );
    }
    if (_reservas.isEmpty) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: EmptyView(
          icon: Icons.bookmark_outline_rounded,
          title: 'Aún no tienes reservas',
          message: 'Cuando reserves un libro, aparecerá aquí.',
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      sliver: SliverList.separated(
        itemCount: _reservas.length,
        separatorBuilder: (_, _) => const Padding(
          padding: EdgeInsets.symmetric(vertical: 18),
          child: Divider(height: 1, color: AppColors.divider),
        ),
        itemBuilder: (context, index) {
          final reserva = _reservas[index];
          return Aparecer(
            key: ValueKey(reserva.idReserva ?? index),
            indice: index,
            child: _ReservaCard(
              reserva: reserva,
              cancelando: _cancelandoId == reserva.idReserva,
              onCancelar: _puedeCancelar(reserva)
                  ? () => _cancelarReserva(reserva)
                  : null,
            ),
          );
        },
      ),
    );
  }
}

/// Tono visual de cada estado de reserva.
TonoEstado _tonoReserva(String? estado) {
  switch (estado?.toLowerCase().trim()) {
    case 'confirmada':
      return TonoEstado.exito;
    case 'cancelada':
      return TonoEstado.peligro;
    case 'completada':
      return TonoEstado.marca;
    case 'pendiente':
    default:
      return TonoEstado.aviso;
  }
}

/// Una reserva sin tarjeta: portada suelta con aspecto de libro y, a su
/// lado, título, estado, número, fecha, cantidad, vencimiento y la opción de
/// cancelar.
class _ReservaCard extends StatelessWidget {
  final Reserva reserva;
  final bool cancelando;
  final VoidCallback? onCancelar;

  const _ReservaCard({
    required this.reserva,
    this.cancelando = false,
    this.onCancelar,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final cantidad = reserva.cantidad ?? 1;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        PortadaLibro(
          libro: Libro(
            idLibro: reserva.idLibro,
            titulo: reserva.titulo,
            portada: reserva.portada,
          ),
          ancho: 84,
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              EstadoChip(
                texto: Reserva(estado: reserva.estado).estadoLabel,
                tono: _tonoReserva(reserva.estado),
              ),
              const SizedBox(height: 8),
              Text(
                reserva.titulo ?? 'Libro',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: textTheme.titleMedium?.copyWith(height: 1.2),
              ),
              const SizedBox(height: 4),
              Text(
                'Reserva N° ${reserva.idReserva?.toString() ?? '—'}'
                ' · ${Formats.fecha(reserva.fechaReserva)}',
                style: textTheme.bodySmall?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _Dato(
                      icon: Icons.inventory_2_outlined,
                      label: 'Cantidad',
                      valor:
                          '${reserva.cantidad?.toString() ?? '—'} '
                          '${cantidad == 1 ? 'unidad' : 'unidades'}',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _Dato(
                      icon: Icons.event_busy_outlined,
                      label: 'Vence',
                      valor: Formats.fecha(reserva.fechaVencimiento),
                    ),
                  ),
                ],
              ),
              // Cancelar la reserva (solo pendiente o confirmada).
              if (onCancelar != null) ...[
                const SizedBox(height: 6),
                SizedBox(
                  height: 40,
                  child: AnimatedSwitcher(
                    duration: Duracion.rapida,
                    child: cancelando
                        ? const Align(
                            key: ValueKey('cancelando'),
                            alignment: Alignment.centerLeft,
                            child: SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          )
                        : Align(
                            key: const ValueKey('cancelar'),
                            alignment: Alignment.centerLeft,
                            child: TextButton.icon(
                              onPressed: onCancelar,
                              icon: const Icon(Icons.close_rounded, size: 17),
                              label: const Text('Cancelar reserva'),
                              style: TextButton.styleFrom(
                                foregroundColor: AppColors.error,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                ),
                                minimumSize: const Size(0, 36),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                          ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// Dato compacto (icono, etiqueta y valor) de la reserva.
class _Dato extends StatelessWidget {
  final IconData icon;
  final String label;
  final String valor;

  const _Dato({required this.icon, required this.label, required this.valor});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.gold),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: textTheme.labelSmall?.copyWith(
                  color: AppColors.textTertiary,
                ),
              ),
              Text(
                valor,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
