import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../screens/detalle_libro_screen.dart';
import '../utils/app_colors.dart';
import '../utils/constants.dart';
import 'book_cover.dart';
import 'precio_texto.dart';
import 'presionable.dart';

// Portadas "sueltas" (sin tarjeta) con aspecto de libro, compartidas por
// Inicio, Catálogo, Favoritos y Reservas.

/// Hasta tres portadas de la categoría abiertas en abanico (como el banner).
class AbanicoCategoria extends StatelessWidget {
  final List<Libro> libros;

  /// Ancho de cada portada del abanico.
  final double ancho;

  const AbanicoCategoria({super.key, required this.libros, this.ancho = 66});

  @override
  Widget build(BuildContext context) {
    final visibles = libros.take(3).toList();
    // Posición de cada portada según cuántas hay (la del centro, delante).
    final configuracion = switch (visibles.length) {
      1 => const [(0.0, 0.0)],
      2 => const [(-14.0, -0.10), (14.0, 0.10)],
      _ => const [(-22.0, -0.16), (22.0, 0.16), (0.0, 0.0)],
    };
    final orden = switch (visibles.length) {
      1 => const [0],
      2 => const [0, 1],
      _ => const [1, 2, 0],
    };

    return ExcludeSemantics(
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          for (var k = 0; k < visibles.length; k++)
            Transform.translate(
              offset: Offset(
                configuracion[k].$1,
                k == visibles.length - 1 ? -2 : 4,
              ),
              child: Transform.rotate(
                angle: configuracion[k].$2,
                child: PortadaLibro(
                  libro: visibles[orden[k]],
                  ancho: ancho,
                  sombraFuerte: k == visibles.length - 1,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Portada con aspecto de libro: lomo sombreado, esquinas de libro y sombra
/// cálida. Sin tarjeta alrededor.
class PortadaLibro extends StatelessWidget {
  final Libro libro;
  final double ancho;
  final bool sombraFuerte;
  final Object? heroTag;

  const PortadaLibro({
    super.key,
    required this.libro,
    required this.ancho,
    this.sombraFuerte = true,
    this.heroTag,
  });

  @override
  Widget build(BuildContext context) {
    const forma = BorderRadius.only(
      topLeft: Radius.circular(2),
      bottomLeft: Radius.circular(2),
      topRight: Radius.circular(6),
      bottomRight: Radius.circular(6),
    );
    final portada = ClipRRect(
      borderRadius: forma,
      child: Stack(
        fit: StackFit.expand,
        children: [
          BookCover(
            url: Constants.buildPortadaUrl(libro.portada),
            borderRadius: 0,
            fit: BoxFit.cover,
            sombra: false,
          ),
          // Lomo: sombra y brillo a la izquierda, como un libro real.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                stops: [0, 0.035, 0.07, 0.12, 1],
                colors: [
                  Color(0x55000000),
                  Color(0x33FFFFFF),
                  Color(0x22000000),
                  Color(0x00000000),
                  Color(0x00000000),
                ],
              ),
            ),
          ),
          // Brillo suave de la cubierta.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0x14FFFFFF),
                  Color(0x00FFFFFF),
                  Color(0x12000000),
                ],
              ),
            ),
          ),
        ],
      ),
    );

    return Container(
      width: ancho,
      height: ancho * 1.5,
      decoration: BoxDecoration(
        borderRadius: forma,
        boxShadow: [
          BoxShadow(
            color: AppColors.tinta.withValues(
              alpha: sombraFuerte ? 0.30 : 0.18,
            ),
            blurRadius: sombraFuerte ? 18 : 10,
            offset: Offset(3, sombraFuerte ? 10 : 5),
          ),
          BoxShadow(
            color: AppColors.tinta.withValues(alpha: 0.10),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: heroTag == null ? portada : Hero(tag: heroTag!, child: portada),
    );
  }
}

/// Libro del carrusel: portada suelta y, debajo y sin tarjeta, categoría,
/// título, autor, precio y disponibilidad.
class LibroSuelto extends StatelessWidget {
  final Libro libro;
  final double ancho;

  /// Distingue la transición Hero cuando el mismo libro aparece en varias
  /// listas de una misma pantalla.
  final String heroPrefijo;

  /// Control opcional sobre la esquina superior derecha de la portada.
  final Widget? accesorio;

  const LibroSuelto({
    super.key,
    required this.libro,
    required this.ancho,
    this.heroPrefijo = 'inicio',
    this.accesorio,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final disponible = libro.esActivo && libro.hayStock;
    final heroTag = (heroPrefijo, libro.idLibro);
    final titulo = libro.titulo?.trim().isNotEmpty == true
        ? libro.titulo!
        : 'Sin título';
    final autor = (libro.autor ?? '').trim();

    return Presionable(
      child: Semantics(
        button: true,
        label: autor.isEmpty ? titulo : '$titulo, de $autor',
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) =>
                  DetalleLibroScreen(libro: libro, heroTag: heroTag),
            ),
          ),
          child: ExcludeSemantics(
            child: SizedBox(
              width: ancho,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Opacity(
                        opacity: disponible ? 1 : 0.55,
                        child: PortadaLibro(
                          libro: libro,
                          ancho: ancho,
                          heroTag: heroTag,
                        ),
                      ),
                      if (accesorio != null)
                        Positioned(top: 6, right: 6, child: accesorio!),
                      if (!disponible)
                        Positioned(
                          left: 8,
                          top: 8,
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
                              style: textTheme.labelSmall?.copyWith(
                                color: Colors.white,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    titulo,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.titleMedium?.copyWith(
                      fontSize: 15,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    autor.isEmpty ? 'Autor no registrado' : autor,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 6),
                  PrecioTexto(monto: libro.precio, tamano: 16),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
