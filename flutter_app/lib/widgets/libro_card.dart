import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../screens/detalle_libro_screen.dart';
import '../utils/app_colors.dart';
import '../utils/constants.dart';
import '../utils/formats.dart';
import 'book_cover.dart';

/// Tarjeta editorial para vitrinas y carruseles de libros.
class LibroCard extends StatefulWidget {
  final Libro libro;
  final VoidCallback? onTap;

  const LibroCard({super.key, required this.libro, this.onTap});

  @override
  State<LibroCard> createState() => _LibroCardState();
}

class _LibroCardState extends State<LibroCard> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final libro = widget.libro;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        transform: Matrix4.translationValues(0, _hovered ? -3 : 0, 0),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.divider),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryDark.withValues(
                alpha: _hovered ? 0.12 : 0.05,
              ),
              blurRadius: _hovered ? 18 : 8,
              offset: Offset(0, _hovered ? 8 : 2),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap:
                widget.onTap ??
                () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => DetalleLibroScreen(libro: libro),
                    ),
                  );
                },
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                    decoration: const BoxDecoration(
                      color: AppColors.paper,
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(11),
                      ),
                    ),
                    child: BookCover(
                      url: Constants.buildPortadaUrl(libro.portada),
                      borderRadius: 4,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 11, 12, 12),
                  child: _BookInfo(libro: libro),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BookInfo extends StatelessWidget {
  final Libro libro;

  const _BookInfo({required this.libro});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final categoria = (libro.categoria ?? '').trim();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (categoria.isNotEmpty) ...[
          Text(
            categoria.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textTheme.labelSmall?.copyWith(
              color: AppColors.secondary,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
              fontSize: 9,
            ),
          ),
          const SizedBox(height: 5),
        ],
        Text(
          libro.titulo?.trim().isNotEmpty == true
              ? libro.titulo!
              : 'Sin título',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: textTheme.titleMedium?.copyWith(
            height: 1.15,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          (libro.autor ?? '').trim().isNotEmpty
              ? libro.autor!
              : 'Autor no registrado',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: textTheme.bodySmall?.copyWith(
            color: AppColors.textSecondary,
            fontSize: 11,
          ),
        ),
        const SizedBox(height: 10),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Text(
                'S/ ${Formats.precio(libro.precio)}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: textTheme.labelLarge?.copyWith(
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: 6),
            _Availability(libro: libro),
          ],
        ),
      ],
    );
  }
}

class _Availability extends StatelessWidget {
  final Libro libro;

  const _Availability({required this.libro});

  @override
  Widget build(BuildContext context) {
    final disponible = libro.esActivo && libro.hayStock;
    final color = disponible ? AppColors.tertiary : AppColors.error;

    return Semantics(
      label: disponible ? '${libro.stock} disponibles' : 'Agotado',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 4),
          Text(
            disponible ? '${libro.stock}' : 'Agotado',
            style: Theme.of(context).textTheme.labelSmall
                ?.copyWith(color: color, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
