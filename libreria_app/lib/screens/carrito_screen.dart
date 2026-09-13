import 'package:flutter/material.dart';

import '../models/carrito_item.dart';
import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/constants.dart';
import '../utils/formats.dart';
import '../widgets/app_page_header.dart';
import '../widgets/book_cover.dart';
import '../widgets/empty_view.dart';
import 'entrega_y_pago_screen.dart';

/// Pantalla "Mi carrito".
///
/// Muestra cada libro como una tarjeta única con portada, título, autor,
/// estado, precio, cantidad ([−]/[+]) y acciones (guardar para más tarde /
/// eliminar con confirmación). La parte inferior fija muestra el subtotal y
/// el botón "Realizar pedido", que abre [EntregaYPagoScreen] para continuar
/// con el envío y el pago (fuera de esta pantalla).
///
/// Se puede usar como pantalla completa (con [AppBar]) o embebida como pestaña
/// de la navegación inferior ([embedded] = true). En ambos casos consume el
/// MISMO [CarritoService], por lo que los datos son siempre los mismos.
class CarritoScreen extends StatefulWidget {
  const CarritoScreen({super.key, this.embedded = false});

  /// `true` cuando se muestra como pestaña dentro de HomeScreen y no debe
  /// dibujar su propio Scaffold/AppBar.
  final bool embedded;

  @override
  State<CarritoScreen> createState() => _CarritoScreenState();
}

class _CarritoScreenState extends State<CarritoScreen> {
  void _irAPago() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const EntregaYPagoScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final body = SafeArea(
      top: false,
      child: ListenableBuilder(
        listenable: CarritoService.instance,
        builder: (context, _) {
          final items = CarritoService.instance.items;
          final guardados = CarritoService.instance.guardados;

          if (items.isEmpty && guardados.isEmpty) {
            return const EmptyView(
              icon: Icons.shopping_cart_outlined,
              title: 'Tu carrito está vacío',
              message: 'Agrega libros desde el catálogo para empezar.',
            );
          }

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    widget.embedded ? 18 : 16,
                    16,
                    24,
                  ),
                  children: [
                    if (widget.embedded) ...[
                      const Padding(
                        padding: EdgeInsets.only(left: 4, bottom: 18),
                        child: AppPageHeader(
                          eyebrow: 'Pedido',
                          title: 'Mi carrito',
                          subtitle: 'Revisa tu selección antes de continuar.',
                        ),
                      ),
                    ],
                    if (items.isEmpty && guardados.isNotEmpty) ...[
                      const _CartVacioConGuardados(),
                      const SizedBox(height: 16),
                    ],
                    if (items.isNotEmpty) ...[
                      _SectionTitle(title: 'Mis libros', count: items.length),
                      const SizedBox(height: 12),
                      for (final item in items) ...[
                        _CarritoItemCard(item: item),
                        const SizedBox(height: 12),
                      ],
                    ],
                    if (guardados.isNotEmpty) ...[
                      if (items.isNotEmpty) const SizedBox(height: 8),
                      _SectionTitle(
                        title: 'Guardados para más tarde',
                        count: guardados.length,
                      ),
                      const SizedBox(height: 12),
                      for (final item in guardados) ...[
                        _GuardadoCard(item: item),
                        const SizedBox(height: 12),
                      ],
                    ],
                  ],
                ),
              ),
              if (items.isNotEmpty) _buildBarraPagar(context),
            ],
          );
        },
      ),
    );

    if (widget.embedded) {
      return body;
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Carrito de compra')),
      body: body,
    );
  }

  /// Barra inferior fija con el subtotal y el botón "Realizar pedido".
  Widget _buildBarraPagar(BuildContext context) {
    final subtotal = CarritoService.instance.total;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.divider)),
        boxShadow: [
          BoxShadow(
            color: Color(0x160D2B24),
            blurRadius: 16,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Subtotal',
                  style: Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              Text(
                'S/ ${Formats.precio(subtotal)}',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'El envío y la entrega se definen en el siguiente paso.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall
                ?.copyWith(color: AppColors.textTertiary),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 54,
            child: FilledButton(
              onPressed: _irAPago,
              child: const Text('Continuar con la compra'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Tarjeta de cada libro en el carrito.
class _CarritoItemCard extends StatelessWidget {
  final CarritoItem item;

  const _CarritoItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final libro = item.libro;
    final id = libro.idLibro;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.divider),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Portada grande a la izquierda.
          SizedBox(
            width: 92,
            height: 132,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: BookCover(url: Constants.buildPortadaUrl(libro.portada)),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  libro.titulo ?? 'Sin título',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
                if ((libro.autor ?? '').isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    libro.autor!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
                if (libro.estado != null) ...[
                  const SizedBox(height: 6),
                  _EstadoBadge(estado: libro.esActivo),
                ],
                const SizedBox(height: 8),
                Text(
                  'S/ ${Formats.precio(libro.precio)} c/u',
                  maxLines: 1,
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _CantidadControl(item: item, idLibro: id),
                    const Spacer(),
                    Text(
                      'S/ ${Formats.precio(item.subtotal)}',
                      style: textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: [
                    _CardActionButton(
                      icon: Icons.bookmark_add_outlined,
                      label: 'Guardar',
                      color: AppColors.primary,
                      onPressed: id == null
                          ? null
                          : () =>
                                CarritoService.instance.guardarParaDespues(id),
                    ),
                    _CardActionButton(
                      icon: Icons.delete_outline_rounded,
                      label: 'Eliminar',
                      color: AppColors.error,
                      onPressed: id == null
                          ? null
                          : () => _confirmarEliminar(context, id),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmarEliminar(BuildContext context, int id) async {
    final confirmado = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar del carrito'),
        content: Text(
          '¿Quieres quitar "${item.libro.titulo ?? 'este libro'}" de tu '
          'carrito?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmado == true) {
      CarritoService.instance.eliminar(id);
    }
  }
}

/// Tarjeta de un ítem guardado para más tarde.
class _GuardadoCard extends StatelessWidget {
  final CarritoItem item;

  const _GuardadoCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final libro = item.libro;
    final id = libro.idLibro;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 62,
            height: 90,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: BookCover(url: Constants.buildPortadaUrl(libro.portada)),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  libro.titulo ?? 'Sin título',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                  ),
                ),
                if ((libro.autor ?? '').isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    libro.autor!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Text(
                  'S/ ${Formats.precio(libro.precio)}',
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    _CardActionButton(
                      icon: Icons.add_shopping_cart_rounded,
                      label: 'Mover al carrito',
                      color: AppColors.primary,
                      onPressed: id == null
                          ? null
                          : () => CarritoService.instance.moverAlCarrito(id),
                    ),
                    const Spacer(),
                    IconButton(
                      tooltip: 'Quitar de guardados',
                      onPressed: id == null
                          ? null
                          : () => CarritoService.instance.quitarDeGuardados(id),
                      icon: const Icon(
                        Icons.delete_outline_rounded,
                        color: AppColors.error,
                      ),
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Aviso mostrado cuando el carrito está vacío pero hay guardados.
class _CartVacioConGuardados extends StatelessWidget {
  const _CartVacioConGuardados();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primaryContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline_rounded,
            size: 20,
            color: colorScheme.primary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Tu carrito está vacío, pero tienes libros guardados para más '
              'tarde.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: colorScheme.onSurface, height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}

/// Control de cantidad con botones [−] y [+].
class _CantidadControl extends StatelessWidget {
  final CarritoItem item;
  final int? idLibro;

  const _CantidadControl({required this.item, required this.idLibro});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StepButton(
            icon: Icons.remove_rounded,
            onPressed: idLibro == null
                ? null
                : () => CarritoService.instance.decrementar(idLibro!),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              '${item.cantidad}',
              style: Theme.of(context).textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          _StepButton(
            icon: Icons.add_rounded,
            onPressed: idLibro == null
                ? null
                : () {
                    final ok = CarritoService.instance.incrementar(idLibro!);
                    if (!ok) {
                      final stock = item.libro.stock;
                      ScaffoldMessenger.of(context)
                        ..hideCurrentSnackBar()
                        ..showSnackBar(
                          SnackBar(
                            content: Text(
                              stock != null && stock > 0
                                  ? 'Solo hay $stock unidades disponibles de este libro.'
                                  : 'Este libro no tiene stock disponible.',
                            ),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                    }
                  },
          ),
        ],
      ),
    );
  }
}

/// Botón compacto de paso para el control de cantidad.
class _StepButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;

  const _StepButton({required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      visualDensity: VisualDensity.compact,
      constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
      padding: EdgeInsets.zero,
      color: AppColors.primary,
      disabledColor: AppColors.textTertiary,
    );
  }
}

/// Botón de acción compacto con icono y etiqueta.
class _CardActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  final VoidCallback? onPressed;

  const _CardActionButton({
    required this.icon,
    required this.label,
    this.color,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 17),
      label: Text(label),
      style: TextButton.styleFrom(
        foregroundColor: color ?? AppColors.primary,
        visualDensity: VisualDensity.compact,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
      ),
    );
  }
}

/// Insignia del estado del libro (Activo / Inactivo).
///
/// El backend entrega `estado` como 0/1; el modelo [Libro] lo normaliza a
/// bool y aquí solo se muestra la etiqueta correspondiente.
class _EstadoBadge extends StatelessWidget {
  final bool estado;

  const _EstadoBadge({required this.estado});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: estado
            ? AppColors.success.withValues(alpha: 0.12)
            : AppColors.errorContainer,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        estado ? 'Activo' : 'Inactivo',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: estado ? AppColors.success : AppColors.error,
        ),
      ),
    );
  }
}

/// Título de sección con contador.
class _SectionTitle extends StatelessWidget {
  final String title;
  final int count;

  const _SectionTitle({required this.title, required this.count});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleSmall
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            '$count',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
