import 'package:flutter/material.dart';

import '../models/carrito_item.dart';
import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/constants.dart';
import '../utils/formats.dart';
import '../widgets/aparecer.dart';
import '../widgets/app_page_header.dart';
import '../widgets/book_cover.dart';
import '../widgets/empty_view.dart';
import '../widgets/estado_chip.dart';
import '../widgets/precio_texto.dart';
import '../widgets/presionable.dart';
import 'entrega_y_pago_screen.dart';

/// Pantalla "Mi carrito".
///
/// Muestra cada libro como una tarjeta con portada, título, autor, estado,
/// precio, cantidad ([−]/[+]) y acciones (guardar para más tarde / eliminar
/// con confirmación). La parte inferior fija muestra el total y el botón
/// "Continuar con la compra", que abre [EntregaYPagoScreen].
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
          final unidades = CarritoService.instance.totalUnidades;

          if (items.isEmpty && guardados.isEmpty) {
            return Column(
              children: [
                if (widget.embedded)
                  const Padding(
                    padding: EdgeInsets.fromLTRB(20, 18, 20, 0),
                    child: AppPageHeader(
                      eyebrow: 'Tu pedido',
                      title: 'Mi carrito',
                    ),
                  ),
                const Expanded(
                  child: EmptyView(
                    icon: Icons.shopping_bag_outlined,
                    title: 'Tu carrito está vacío',
                    message: 'Agrega libros desde el catálogo para empezar.',
                  ),
                ),
              ],
            );
          }

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    widget.embedded ? 18 : 14,
                    16,
                    24,
                  ),
                  children: [
                    if (widget.embedded)
                      Padding(
                        padding: const EdgeInsets.only(left: 4, bottom: 16),
                        child: AppPageHeader(
                          eyebrow: 'Tu pedido',
                          title: 'Mi carrito',
                          subtitle: items.isEmpty
                              ? null
                              : unidades == 1
                              ? '1 unidad lista para comprar'
                              : '$unidades unidades listas para comprar',
                        ),
                      ),
                    if (items.isEmpty && guardados.isNotEmpty) ...[
                      const _CartVacioConGuardados(),
                      const SizedBox(height: 16),
                    ],
                    if (items.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.only(bottom: 18),
                        child: _StepperBanner(pasoActual: 1),
                      ),
                      _SectionTitle(title: 'Mis libros', count: items.length),
                      const SizedBox(height: 12),
                      for (var i = 0; i < items.length; i++) ...[
                        Aparecer(
                          key: ValueKey('item-${items[i].libro.idLibro}'),
                          indice: i,
                          child: _CarritoItemCard(item: items[i]),
                        ),
                        const SizedBox(height: 12),
                      ],
                      const SizedBox(height: 4),
                      const _ResumenCard(),
                      const SizedBox(height: 12),
                    ],
                    if (guardados.isNotEmpty) ...[
                      if (items.isNotEmpty) const SizedBox(height: 8),
                      _SectionTitle(
                        title: 'Guardados para más tarde',
                        count: guardados.length,
                      ),
                      const SizedBox(height: 12),
                      for (final item in guardados) ...[
                        Aparecer(
                          key: ValueKey('guardado-${item.libro.idLibro}'),
                          child: _GuardadoCard(item: item),
                        ),
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

  /// Barra inferior fija con el total y el botón para continuar.
  Widget _buildBarraPagar(BuildContext context) {
    final subtotal = CarritoService.instance.total;
    final unidades = CarritoService.instance.totalUnidades;
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
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Total', style: textTheme.titleMedium),
                      Text(
                        unidades == 1
                            ? '$unidades unidad en tu carrito'
                            : '$unidades unidades en tu carrito',
                        style: textTheme.bodySmall?.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
                AnimatedSwitcher(
                  duration: Duracion.rapida,
                  child: PrecioTexto(
                    key: ValueKey(subtotal),
                    monto: subtotal,
                    tamano: 24,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Presionable(
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _irAPago,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Continuar con la compra'),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_forward_rounded, size: 18),
                    ],
                  ),
                ),
              ),
            ),
            if (!widget.embedded) ...[
              const SizedBox(height: 2),
              TextButton(
                onPressed: () => Navigator.of(context).maybePop(),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.textSecondary,
                  visualDensity: VisualDensity.compact,
                ),
                child: const Text('Seguir explorando'),
              ),
            ],
          ],
        ),
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
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radios.md),
        border: Border.all(color: AppColors.divider),
        boxShadow: Sombra.tarjeta,
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 14, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 82,
                  height: 118,
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.paper,
                    borderRadius: BorderRadius.circular(Radios.sm),
                  ),
                  child: BookCover(
                    url: Constants.buildPortadaUrl(libro.portada),
                    borderRadius: 3,
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
                        style: textTheme.titleMedium?.copyWith(height: 1.2),
                      ),
                      if ((libro.autor ?? '').isNotEmpty) ...[
                        const SizedBox(height: 3),
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
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            'S/ ${Formats.precio(libro.precio)} c/u',
                            style: textTheme.bodySmall?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                          if (libro.estado != null)
                            EstadoChip(
                              texto: libro.esActivo ? 'Activo' : 'Inactivo',
                              tono: libro.esActivo
                                  ? TonoEstado.exito
                                  : TonoEstado.peligro,
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _CantidadControl(item: item, idLibro: id),
                          const Spacer(),
                          AnimatedSwitcher(
                            duration: Duracion.rapida,
                            child: PrecioTexto(
                              key: ValueKey(item.subtotal),
                              monto: item.subtotal,
                              tamano: 18,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            child: Row(
              children: [
                _CardActionButton(
                  icon: Icons.bookmark_add_outlined,
                  label: 'Guardar',
                  color: AppColors.textSecondary,
                  onPressed: id == null
                      ? null
                      : () => CarritoService.instance.guardarParaDespues(id),
                ),
                const Spacer(),
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
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.error,
              minimumSize: const Size(0, 44),
            ),
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
        color: AppColors.paper,
        borderRadius: BorderRadius.circular(Radios.md),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 56,
            height: 82,
            child: BookCover(
              url: Constants.buildPortadaUrl(libro.portada),
              borderRadius: 3,
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
                  style: textTheme.titleMedium?.copyWith(
                    height: 1.2,
                    fontSize: 15,
                  ),
                ),
                if ((libro.autor ?? '').isNotEmpty) ...[
                  const SizedBox(height: 3),
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
                PrecioTexto(monto: libro.precio, tamano: 15),
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
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.secondaryContainer.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(Radios.sm),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.bookmark_outline_rounded, size: 20, color: AppColors.gold),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Tu carrito está vacío, pero tienes libros guardados para más '
              'tarde.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: AppColors.textPrimary, height: 1.4),
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
      height: 38,
      decoration: BoxDecoration(
        color: AppColors.paper,
        border: Border.all(color: AppColors.divider),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StepButton(
            icon: Icons.remove_rounded,
            tooltip: 'Quitar uno',
            onPressed: idLibro == null
                ? null
                : () => CarritoService.instance.decrementar(idLibro!),
          ),
          SizedBox(
            width: 24,
            child: AnimatedSwitcher(
              duration: Duracion.rapida,
              transitionBuilder: (child, anim) => FadeTransition(
                opacity: anim,
                child: ScaleTransition(scale: anim, child: child),
              ),
              child: Text(
                '${item.cantidad}',
                key: ValueKey(item.cantidad),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ),
          _StepButton(
            icon: Icons.add_rounded,
            tooltip: 'Añadir uno',
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
  final String tooltip;
  final VoidCallback? onPressed;

  const _StepButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      icon: Icon(icon, size: 17),
      visualDensity: VisualDensity.compact,
      constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
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
        textStyle: Theme.of(context).textTheme.labelMedium,
      ),
    );
  }
}

/// Indicador de pasos del flujo de compra (Carrito · Entrega · Pago).
class _StepperBanner extends StatelessWidget {
  final int pasoActual;

  const _StepperBanner({required this.pasoActual});

  @override
  Widget build(BuildContext context) {
    const pasos = ['Carrito', 'Entrega', 'Pago'];

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radios.md),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          for (var i = 0; i < pasos.length; i++) ...[
            if (i > 0)
              Expanded(
                child: Container(
                  height: 2,
                  margin: const EdgeInsets.only(bottom: 18, left: 6, right: 6),
                  decoration: BoxDecoration(
                    color: i <= pasoActual - 1
                        ? AppColors.gold
                        : AppColors.divider,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            _StepDot(
              numero: i + 1,
              label: pasos[i],
              completado: i + 1 <= pasoActual,
            ),
          ],
        ],
      ),
    );
  }
}

class _StepDot extends StatelessWidget {
  final int numero;
  final String label;
  final bool completado;

  const _StepDot({
    required this.numero,
    required this.label,
    required this.completado,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedContainer(
          duration: Duracion.base,
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: completado ? AppColors.primary : AppColors.surface,
            shape: BoxShape.circle,
            border: Border.all(
              color: completado ? AppColors.primary : AppColors.dividerStrong,
              width: 1.5,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            '$numero',
            style: textTheme.labelMedium?.copyWith(
              color: completado ? Colors.white : AppColors.textTertiary,
            ),
          ),
        ),
        const SizedBox(height: 5),
        Text(
          label,
          style: textTheme.labelSmall?.copyWith(
            color: completado ? AppColors.textPrimary : AppColors.textTertiary,
            fontWeight: completado ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

/// Tarjeta de resumen del pedido (subtotal y total) sobre pergamino.
class _ResumenCard extends StatelessWidget {
  const _ResumenCard();

  @override
  Widget build(BuildContext context) {
    final subtotal = CarritoService.instance.total;
    final textTheme = Theme.of(context).textTheme;

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
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Subtotal',
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              Text(
                'S/ ${Formats.precio(subtotal)}',
                style: textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          Divider(height: 24, color: AppColors.gold.withValues(alpha: 0.25)),
          Row(
            children: [
              Expanded(child: Text('Total', style: textTheme.titleMedium)),
              PrecioTexto(monto: subtotal, tamano: 20),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(
                Icons.local_shipping_outlined,
                size: 16,
                color: AppColors.gold,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'El envío y la entrega se definen en el siguiente paso.',
                  style: textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ],
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
    final textTheme = Theme.of(context).textTheme;
    return Row(
      children: [
        Expanded(child: Text(title, style: textTheme.titleMedium)),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 2),
          decoration: BoxDecoration(
            color: AppColors.primaryContainer,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            '$count',
            style: textTheme.labelSmall?.copyWith(color: AppColors.primary),
          ),
        ),
      ],
    );
  }
}
