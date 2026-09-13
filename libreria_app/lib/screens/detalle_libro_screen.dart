import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';
import '../utils/constants.dart';
import '../utils/formats.dart';
import '../widgets/book_cover.dart';

/// Pantalla de detalle de un libro.
///
/// [Libro] se pasa desde la tarjeta para mostrar los datos inmediatamente sin
/// llamadas adicionales al backend. El botón "Reservar" crea la reserva con
/// `ApiService.crearReserva` (`POST /reservas`); luego el cliente puede ver y
/// cancelar sus reservas desde "Perfil → Mis reservas".
class DetalleLibroScreen extends StatelessWidget {
  final Libro libro;

  const DetalleLibroScreen({super.key, required this.libro});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(title: const Text('Ficha del libro')),
      body: SafeArea(
        top: false,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 700;
            return SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(20),
              child: wide ? _buildWide(context) : _buildPortrait(context),
            );
          },
        ),
      ),
    );
  }

  Widget _buildPortrait(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(
          child: SizedBox(width: 230, child: _PortadaGrande(libro: libro)),
        ),
        const SizedBox(height: 24),
        _Info(libro: libro),
      ],
    );
  }

  Widget _buildWide(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 260, child: _PortadaGrande(libro: libro)),
        const SizedBox(width: 32),
        Expanded(child: _Info(libro: libro)),
      ],
    );
  }
}

/// Portada grande del detalle.
class _PortadaGrande extends StatelessWidget {
  final Libro libro;
  const _PortadaGrande({required this.libro});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 3 / 4,
      child: BookCover(
        url: Constants.buildPortadaUrl(libro.portada),
        borderRadius: 8,
      ),
    );
  }
}

/// Bloque informativo del libro.
class _Info extends StatefulWidget {
  final Libro libro;
  const _Info({required this.libro});

  @override
  State<_Info> createState() => _InfoState();
}

class _InfoState extends State<_Info> {
  bool _reservando = false;
  late Libro _libro;

  @override
  void initState() {
    super.initState();
    _libro = widget.libro;
    // Actualiza precio/stock con datos frescos del backend. Si falla, se
    // conserva el objeto recibido por la navegación.
    _refrescarLibro();
  }

  Future<void> _refrescarLibro() async {
    final id = _libro.idLibro;
    if (id == null) return;
    try {
      final fresco = await ApiService.instance.obtenerDetalleLibro(id);
      if (!mounted) return;
      setState(() => _libro = fresco);
    } catch (_) {
      // Silencioso: se sigue mostrando el libro recibido por la navegación.
    }
  }

  /// Crea la reserva contra `POST /reservas`, con protección contra el doble
  /// toque y validación de que el libro esté activo y tenga stock.
  Future<void> _reservar() async {
    if (_reservando) return;

    if (!_libro.esActivo) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Este libro no está disponible para reservar.'),
        ),
      );
      return;
    }
    if ((_libro.stock ?? 0) <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Este libro no tiene stock disponible.')),
      );
      return;
    }
    final id = _libro.idLibro;
    if (id == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo identificar el libro.')),
      );
      return;
    }

    setState(() => _reservando = true);

    try {
      await ApiService.instance.crearReserva(idLibro: id, cantidad: 1);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Reserva realizada correctamente.')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo realizar la reserva.')),
      );
    } finally {
      if (mounted) setState(() => _reservando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _chip(textTheme, _libro.categoria ?? 'General'),
          const SizedBox(height: 12),
          Text(_libro.titulo ?? 'Sin título', style: textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(
            _libro.autor ?? 'Autor desconocido',
            style: textTheme.titleMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'S/ ${Formats.precio(_libro.precio)}',
            style: textTheme.headlineSmall?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),

          _infoRow(
            context,
            Icons.qr_code_2_rounded,
            'ISBN',
            _libro.isbn ?? '—',
          ),
          _infoRow(
            context,
            Icons.inventory_2_outlined,
            'Stock',
            Formats.stockLabel(_libro.stock),
          ),

          if ((_libro.descripcion ?? '').isNotEmpty) ...[
            const SizedBox(height: 24),
            Text(
              'Descripción',
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _libro.descripcion!,
              style: textTheme.bodyMedium?.copyWith(
                height: 1.5,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],

          const SizedBox(height: 32),

          // Botón de reserva real, estilo premium.
          SizedBox(
            width: double.infinity,
            height: 58,
            child: _reservando
                ? const Center(
                    child: SizedBox(
                      width: 26,
                      height: 26,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    ),
                  )
                : FilledButton.icon(
                    onPressed: _libro.esActivo && _libro.hayStock
                        ? _reservar
                        : null,
                    icon: Icon(
                      _libro.esActivo && _libro.hayStock
                          ? Icons.event_available_rounded
                          : Icons.block_rounded,
                      size: 22,
                    ),
                    label: Text(
                      !_libro.esActivo
                          ? 'No disponible'
                          : _libro.hayStock
                          ? 'Reservar este libro'
                          : 'Agotado',
                      style: textTheme.titleMedium?.copyWith(
                        color: colorScheme.onPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    style: FilledButton.styleFrom(
                      elevation: 2,
                      shadowColor: colorScheme.primary.withValues(alpha: 0.45),
                    ),
                  ),
          ),
          const SizedBox(height: 10),
          Text(
            'La disponibilidad se confirmará al registrar la reserva.',
            textAlign: TextAlign.center,
            style: textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(TextTheme textTheme, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: const BoxDecoration(
        color: AppColors.primaryContainer,
        borderRadius: BorderRadius.all(Radius.circular(6)),
      ),
      child: Text(
        label,
        style: textTheme.labelMedium?.copyWith(
          color: AppColors.primaryDark,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _infoRow(
    BuildContext context,
    IconData icon,
    String label,
    String value,
  ) {
    final onSurfaceVariant = Theme.of(context).colorScheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20, color: onSurfaceVariant),
          const SizedBox(width: 12),
          Text(
            '$label:',
            style: Theme.of(context).textTheme.bodyMedium
                ?.copyWith(color: onSurfaceVariant),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
