import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../screens/detalle_libro_screen.dart';
import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/constants.dart';
import '../utils/formats.dart';
import 'book_cover.dart';

/// Ficha horizontal formal utilizada en el catálogo.
class LibroListCard extends StatelessWidget {
  final Libro libro;

  const LibroListCard({super.key, required this.libro});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final disponible = libro.esActivo && libro.hayStock;
    final categoria = (libro.categoria ?? '').trim();

    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => DetalleLibroScreen(libro: libro),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 88,
                height: 132,
                child: BookCover(
                  url: Constants.buildPortadaUrl(libro.portada),
                  borderRadius: 4,
                ),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: SizedBox(
                  height: 132,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
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
                        const SizedBox(height: 4),
                      ],
                      Text(
                        libro.titulo?.trim().isNotEmpty == true
                            ? libro.titulo!
                            : 'Sin título',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.titleMedium?.copyWith(
                          height: 1.15,
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
                        ),
                      ),
                      const SizedBox(height: 7),
                      _StockLine(disponible: disponible, stock: libro.stock),
                      const Spacer(),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'S/ ${Formats.precio(libro.precio)}',
                              style: textTheme.labelLarge?.copyWith(
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          _CartButton(libro: libro, disponible: disponible),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StockLine extends StatelessWidget {
  final bool disponible;
  final int? stock;

  const _StockLine({required this.disponible, required this.stock});

  @override
  Widget build(BuildContext context) {
    final color = disponible ? AppColors.success : AppColors.error;
    return Row(
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          disponible ? '$stock en existencia' : 'Sin existencias',
          style: Theme.of(context).textTheme.labelSmall
              ?.copyWith(color: color, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}

class _CartButton extends StatelessWidget {
  final Libro libro;
  final bool disponible;

  const _CartButton({required this.libro, required this.disponible});

  @override
  Widget build(BuildContext context) {
    return IconButton.filled(
      tooltip: 'Agregar al carrito',
      visualDensity: VisualDensity.compact,
      onPressed: disponible && libro.idLibro != null
          ? () {
              CarritoService.instance.agregar(libro);
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  SnackBar(
                    content: Text('“${libro.titulo}” se agregó al carrito'),
                  ),
                );
            }
          : null,
      icon: const Icon(Icons.add_shopping_cart_rounded, size: 18),
    );
  }
}
