import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../screens/detalle_libro_screen.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/constants.dart';
import 'book_cover.dart';
import 'precio_texto.dart';
import 'presionable.dart';

/// Tarjeta comercial-editorial para vitrinas y carruseles de libros.
class LibroCard extends StatefulWidget {
  final Libro libro;
  final VoidCallback? onTap;

  const LibroCard({super.key, required this.libro, this.onTap});

  @override
  State<LibroCard> createState() => _LibroCardState();
}

class _LibroCardState extends State<LibroCard> {
  bool _hovered = false;

  /// Etiqueta única por tarjeta para la transición de la portada al detalle.
  final Object _heroTag = Object();

  void _abrir() {
    if (widget.onTap != null) {
      widget.onTap!();
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            DetalleLibroScreen(libro: widget.libro, heroTag: _heroTag),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final libro = widget.libro;
    final disponible = libro.esActivo && libro.hayStock;
    final radio = BorderRadius.circular(Radios.md);

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: Presionable(
        child: AnimatedContainer(
          duration: Duracion.rapida,
          curve: Curva.salida,
          transform: Matrix4.translationValues(0, _hovered ? -3 : 0, 0),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: radio,
            border: Border.all(
              color: _hovered
                  ? AppColors.gold.withValues(alpha: 0.55)
                  : AppColors.divider,
            ),
            boxShadow: _hovered ? Sombra.elevada : Sombra.tarjeta,
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: radio,
              onTap: _abrir,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: Container(
                            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                            decoration: BoxDecoration(
                              color: AppColors.paper,
                              borderRadius: BorderRadius.vertical(
                                top: Radius.circular(Radios.md - 1),
                              ),
                            ),
                            child: Opacity(
                              opacity: disponible ? 1 : 0.55,
                              child: Hero(
                                tag: _heroTag,
                                child: BookCover(
                                  url: Constants.buildPortadaUrl(libro.portada),
                                  borderRadius: 3,
                                ),
                              ),
                            ),
                          ),
                        ),
                        if (!disponible)
                          Positioned(
                            left: 10,
                            top: 10,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.tinta.withValues(alpha: 0.86),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                'Agotado',
                                style: Theme.of(context).textTheme.labelSmall
                                    ?.copyWith(
                                      color: Colors.white,
                                      fontSize: 10,
                                    ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                    child: _BookInfo(libro: libro, disponible: disponible),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BookInfo extends StatelessWidget {
  final Libro libro;
  final bool disponible;

  const _BookInfo({required this.libro, required this.disponible});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final categoria = (libro.categoria ?? '').trim();
    final escala = MediaQuery.textScalerOf(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Espacio fijo para categoría y título (2 líneas): las tarjetas del
        // carrusel mantienen el precio a la misma altura.
        Text(
          categoria.isEmpty ? ' ' : categoria.toUpperCase(),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: textTheme.labelSmall?.copyWith(
            color: AppColors.gold,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.1,
            fontSize: 9.5,
          ),
        ),
        const SizedBox(height: 4),
        SizedBox(
          height: escala.scale(15) * 1.2 * 2 + 3 + escala.scale(12) * 1.5,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                libro.titulo?.trim().isNotEmpty == true
                    ? libro.titulo!
                    : 'Sin título',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: textTheme.titleMedium?.copyWith(
                  height: 1.2,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                (libro.autor ?? '').trim().isNotEmpty
                    ? libro.autor!
                    : 'Autor no registrado',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: textTheme.bodySmall?.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(child: PrecioTexto(monto: libro.precio, tamano: 16)),
            const SizedBox(width: 6),
            _Disponibilidad(libro: libro, disponible: disponible),
          ],
        ),
      ],
    );
  }
}

class _Disponibilidad extends StatelessWidget {
  final Libro libro;
  final bool disponible;

  const _Disponibilidad({required this.libro, required this.disponible});

  @override
  Widget build(BuildContext context) {
    final color = disponible ? AppColors.success : AppColors.error;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          disponible ? '${libro.stock} disp.' : 'Agotado',
          style: Theme.of(context).textTheme.labelSmall
              ?.copyWith(color: color, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}
