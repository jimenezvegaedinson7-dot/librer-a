import 'package:flutter/material.dart';

import '../models/reserva.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';
import '../utils/formats.dart';
import '../widgets/app_page_header.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';

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
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _cargarReservas,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: const Padding(
                  padding: EdgeInsets.fromLTRB(20, 20, 20, 10),
                  child: AppPageHeader(
                    eyebrow: 'Lecturas apartadas',
                    title: 'Mis reservas',
                    subtitle: 'Controla la vigencia y estado de cada título.',
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
          icon: Icons.event_note_outlined,
          title: 'Aún no tienes reservas',
          message: 'Cuando reserves un libro, aparecerá aquí.',
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      sliver: SliverList.separated(
        itemCount: _reservas.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final reserva = _reservas[index];
          return _ReservaCard(
            reserva: reserva,
            cancelando: _cancelandoId == reserva.idReserva,
            onCancelar: _puedeCancelar(reserva)
                ? () => _cancelarReserva(reserva)
                : null,
          );
        },
      ),
    );
  }
}

/// Tarjeta de una reserva.
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
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
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
          // Cabecera: libro + badge de estado.
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  reserva.titulo ?? 'Libro',
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              _EstadoBadge(estado: reserva.estado),
            ],
          ),
          const SizedBox(height: 14),

          // Número de reserva y fecha en una línea destacada.
          Row(
            children: [
              Icon(
                Icons.event_available_rounded,
                size: 18,
                color: colorScheme.primary,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Reserva N° ${reserva.idReserva?.toString() ?? '—'}',
                  style: textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
              ),
              Text(
                Formats.fecha(reserva.fechaReserva),
                style: textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1),

          // Detalle de la reserva (cantidad + vencimiento).
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Row(
              children: [
                Expanded(
                  child: _row(
                    context,
                    Icons.inventory_2_outlined,
                    'Cantidad',
                    '${reserva.cantidad?.toString() ?? '—'} ${(reserva.cantidad ?? 1) == 1 ? 'unidad' : 'unidades'}',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _row(
                    context,
                    Icons.event_busy_rounded,
                    'Vence',
                    Formats.fecha(reserva.fechaVencimiento),
                  ),
                ),
              ],
            ),
          ),

          // Cancelar la reserva (solo pendiente o confirmada).
          if (onCancelar != null) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: cancelando
                  ? const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : OutlinedButton.icon(
                      onPressed: onCancelar,
                      icon: const Icon(Icons.cancel_outlined, size: 18),
                      label: const Text('Cancelar reserva'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.error,
                        side: const BorderSide(color: AppColors.error),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _row(BuildContext context, IconData icon, String label, String value) {
    final onSurfaceVariant = Theme.of(context).colorScheme.onSurfaceVariant;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: onSurfaceVariant),
            const SizedBox(width: 6),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: onSurfaceVariant),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium
              ?.copyWith(fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}

/// Insignia de estado con color según el estado de la reserva.
/// Estilo premium coherente con "Mis Compras": radio 20, texto en `labelMedium`.
class _EstadoBadge extends StatelessWidget {
  final String? estado;
  const _EstadoBadge({required this.estado});

  @override
  Widget build(BuildContext context) {
    final lower = estado?.toLowerCase().trim();
    Color color;
    switch (lower) {
      case 'confirmada':
        color = AppColors.success;
        break;
      case 'cancelada':
        color = AppColors.error;
        break;
      case 'completada':
        color = AppColors.primary;
        break;
      case 'pendiente':
      default:
        color = AppColors.warning;
        break;
    }

    final label = Reserva(estado: estado).estadoLabel;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium
            ?.copyWith(color: color, fontWeight: FontWeight.w700),
      ),
    );
  }
}
