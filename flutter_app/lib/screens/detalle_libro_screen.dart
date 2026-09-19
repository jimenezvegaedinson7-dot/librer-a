import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/constants.dart';
import '../utils/formats.dart';
import '../widgets/book_cover.dart';
import '../widgets/carrito_badge.dart';
import 'carrito_screen.dart';

/// Pantalla de detalle de un libro (ficha) rediseñada según Stitch:
/// portada con halo, autor como eyebrow, sinopsis expandible, ficha técnica
/// con campos reales y barra inferior fija con cantidad y total.
class DetalleLibroScreen extends StatefulWidget {
  final Libro libro;

  const DetalleLibroScreen({super.key, required this.libro});

  @override
  State<DetalleLibroScreen> createState() => _DetalleLibroScreenState();
}

class _DetalleLibroScreenState extends State<DetalleLibroScreen> {
  late Libro _libro;
  int _cantidad = 1;
  int _reservando = 0;
  bool _sinopsisCompleta = false;
  bool? _esFavorito;
  bool _favoritoCambiando = false;

  @override
  void initState() {
    super.initState();
    _libro = widget.libro;
    // Actualiza precio/stock con datos frescos del backend. Si falla, se
    // conserva el objeto recibido por la navegación.
    _refrescarLibro();
    // Consulta el estado del libro en la lista de deseos (silencioso: si
    // falla se muestra vacío y el usuario puede volver a tocarlo).
    _cargarFavorito();
  }

  Future<void> _cargarFavorito() async {
    final id = _libro.idLibro;
    if (id == null) return;
    try {
      final esFavorito = await ApiService.instance.esFavorito(id);
      if (!mounted) return;
      setState(() => _esFavorito = esFavorito);
    } catch (_) {
      // Silencioso.
    }
  }

  Future<void> _toggleFavorito() async {
    if (_favoritoCambiando) return;
    final id = _libro.idLibro;
    if (id == null) return;

    final eraFavorito = _esFavorito ?? false;
    setState(() {
      _favoritoCambiando = true;
      _esFavorito = !eraFavorito;
    });

    try {
      if (eraFavorito) {
        await ApiService.instance.quitarFavorito(id);
      } else {
        await ApiService.instance.agregarFavorito(id);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              eraFavorito
                  ? 'Eliminado de tus favoritos.'
                  : 'Agregado a tus favoritos.',
            ),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _esFavorito = eraFavorito);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _esFavorito = eraFavorito);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo actualizar tus favoritos.')),
      );
    } finally {
      if (mounted) setState(() => _favoritoCambiando = false);
    }
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

  void _incrementar() {
    final stock = _libro.stock ?? 0;
    if (stock > 0 && _cantidad < stock) {
      setState(() => _cantidad += 1);
    }
  }

  void _decrementar() {
    if (_cantidad > 1) {
      setState(() => _cantidad -= 1);
    }
  }

  void _agregarAlCarrito() {
    if (!_libro.esActivo || !_libro.hayStock || _libro.idLibro == null) return;

    CarritoService.instance.agregar(_libro, cantidad: _cantidad);

    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          '$_cantidad ${_cantidad == 1 ? 'ejemplar agregado' : 'ejemplares agregados'} al carrito',
        ),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  /// Crea la reserva contra `POST /reservas`, con protección contra el doble
  /// toque y validación de que el libro esté activo y tenga stock.
  Future<void> _reservar() async {
    if (_reservando > 0) return;

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

    setState(() => _reservando += 1);

    try {
      await ApiService.instance.crearReserva(idLibro: id, cantidad: _cantidad);
      if (!mounted) return;
      setState(() => _cantidad = 1);
      await _refrescarLibro();
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
      if (mounted) setState(() => _reservando -= 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final wide = width >= 700;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        title: const Text('Ficha del libro'),
        actions: [
          IconButton(
            tooltip: (_esFavorito ?? false)
                ? 'Quitar de favoritos'
                : 'Agregar a favoritos',
            onPressed: _favoritoCambiando ? null : _toggleFavorito,
            icon: _favoritoCambiando
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Icon(
                    (_esFavorito ?? false)
                        ? Icons.favorite_rounded
                        : Icons.favorite_border_rounded,
                    color: (_esFavorito ?? false)
                        ? AppColors.error
                        : null,
                  ),
          ),
          IconButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const CarritoScreen()),
              );
            },
            icon: const CarritoBadge(child: Icon(Icons.shopping_cart_outlined)),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: wide ? _buildWide(context) : _buildPortrait(context),
        ),
      ),
      bottomNavigationBar: _StickyBar(
        libro: _libro,
        cantidad: _cantidad,
        reservando: _reservando > 0,
        onAdd: _agregarAlCarrito,
        onReservar: _reservar,
      ),
    );
  }

  Widget _buildPortrait(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(child: _PortadaGrande(libro: _libro)),
        const SizedBox(height: 26),
        _buildInfo(context),
      ],
    );
  }

  Widget _buildWide(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 260, child: _PortadaGrande(libro: _libro)),
        const SizedBox(width: 32),
        Expanded(child: _buildInfo(context)),
      ],
    );
  }

  Widget _buildInfo(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final descripcion = (_libro.descripcion ?? '').trim();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Autor como eyebrow sobre el título (estilo Stitch).
        Text(
          (_libro.autor ?? '').toUpperCase(),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: textTheme.labelSmall?.copyWith(
            color: AppColors.gold,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.4,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          _libro.titulo ?? 'Sin título',
          style: textTheme.headlineMedium?.copyWith(
            height: 1.1,
            color: AppColors.textPrimary,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 10),
        _chip(textTheme, _libro.categoria ?? 'General'),

        const SizedBox(height: 18),

        // Bloque de precio.
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              'S/ ${Formats.precio(_libro.precio)}',
              style: GoogleFonts.inter(
                fontSize: 26,
                height: 32 / 26,
                color: AppColors.primary,
                fontWeight: FontWeight.w900,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(width: 12),
            Flexible(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Text(
                  _libro.hayStock ? 'Envío inmediato' : 'Sin existencias',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.bodySmall?.copyWith(
                    color: _libro.hayStock
                        ? AppColors.success
                        : AppColors.error,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 22),

        // Selector de cantidad.
        Row(
          children: [
            Text(
              'Cantidad',
              style: textTheme.titleSmall?.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 16),
            _CantidadSelector(
              cantidad: _cantidad,
              max: _libro.stock ?? 0,
              onMenos: _decrementar,
              onMas: _incrementar,
            ),
          ],
        ),

        if (descripcion.isNotEmpty) ...[
          const SizedBox(height: 24),
          _SinopsisCard(
            descripcion: descripcion,
            completa: _sinopsisCompleta,
            onToggle: () =>
                setState(() => _sinopsisCompleta = !_sinopsisCompleta),
          ),
        ],

        const SizedBox(height: 16),

        // Ficha técnica con campos reales del modelo.
        _Card(
          title: 'Ficha técnica',
          icon: Icons.library_books_outlined,
          child: Column(
            children: [
              _infoRow(context, 'Autor', _libro.autor ?? '—'),
              _infoRow(context, 'Categoría', _libro.categoria ?? '—'),
              _infoRow(context, 'ISBN', _libro.isbn ?? '—'),
              _infoRow(
                context,
                'Stock',
                _libro.hayStock ? '${_libro.stock} disponibles' : 'Agotado',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _chip(TextTheme textTheme, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.primaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: textTheme.labelMedium?.copyWith(
          color: AppColors.primaryDark,
          fontWeight: FontWeight.w700,
          fontSize: 11,
        ),
      ),
    );
  }

  Widget _infoRow(BuildContext context, String label, String value) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium
                ?.copyWith(color: muted),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

/// Portada grande del detalle.
///
/// Se evita el halo con [RadialGradient]: en el GPU Mali de algunos equipos
/// el degradado radial rompe el rasterizado y deja la pantalla en blanco.
class _PortadaGrande extends StatelessWidget {
  final Libro libro;
  const _PortadaGrande({required this.libro});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 260),
        child: AspectRatio(
          aspectRatio: 3 / 4,
          child: BookCover(
            url: Constants.buildPortadaUrl(libro.portada),
            borderRadius: 6,
          ),
        ),
      ),
    );
  }
}

/// Selector numérico de cantidad con botones redondeados.
class _CantidadSelector extends StatelessWidget {
  final int cantidad;
  final int max;
  final VoidCallback onMenos;
  final VoidCallback onMas;

  const _CantidadSelector({
    required this.cantidad,
    required this.max,
    required this.onMenos,
    required this.onMas,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.divider),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            onPressed: onMenos,
            icon: const Icon(Icons.remove_rounded, size: 18),
            color: AppColors.primary,
            visualDensity: VisualDensity.compact,
          ),
          Text(
            '$cantidad',
            style: GoogleFonts.inter(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 16,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          IconButton(
            onPressed: max > cantidad ? onMas : null,
            icon: const Icon(Icons.add_rounded, size: 18),
            color: AppColors.primary,
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}

/// Tarjeta de sinopsis con texto plegable ("Leer más" / "Leer menos").
class _SinopsisCard extends StatelessWidget {
  final String descripcion;
  final bool completa;
  final VoidCallback onToggle;

  const _SinopsisCard({
    required this.descripcion,
    required this.completa,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return _Card(
      title: 'Sinopsis',
      icon: Icons.auto_stories_outlined,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            descripcion,
            maxLines: completa ? null : 3,
            overflow: completa ? null : TextOverflow.ellipsis,
            style: textTheme.bodyMedium?.copyWith(
              height: 1.5,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: onToggle,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.gold,
                visualDensity: VisualDensity.compact,
              ),
              child: Text(completa ? 'Leer menos' : 'Leer más'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Contenedor con encabezado para las tarjetas (Sinopsis / Ficha técnica).
class _Card extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _Card({required this.title, required this.icon, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppColors.gold),
              const SizedBox(width: 8),
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

/// Barra inferior fija con subtotal y acción principal.
class _StickyBar extends StatelessWidget {
  final Libro libro;
  final int cantidad;
  final bool reservando;
  final VoidCallback onAdd;
  final VoidCallback onReservar;

  const _StickyBar({
    required this.libro,
    required this.cantidad,
    required this.reservando,
    required this.onAdd,
    required this.onReservar,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final compact = MediaQuery.sizeOf(context).width < 390;
    final disponible =
        libro.esActivo && libro.hayStock && libro.idLibro != null;
    final total = (libro.precio ?? 0) * cantidad;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Total',
                      style: textTheme.labelSmall?.copyWith(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      'S/ ${Formats.precio(total)}',
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w900,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 52,
                child: OutlinedButton(
                  onPressed: disponible && !reservando ? onReservar : null,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    minimumSize: const Size(0, 52),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    side: BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: reservando
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : compact
                      ? const Text(
                          'Reservar',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        )
                      : const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.event_available_outlined, size: 18),
                            SizedBox(width: 6),
                            Text(
                              'Reservar',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 52,
                child: FilledButton(
                  onPressed: disponible && !reservando ? onAdd : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: disponible
                        ? AppColors.primary
                        : AppColors.surfaceElevated,
                    foregroundColor: disponible
                        ? Colors.white
                        : AppColors.textTertiary,
                    minimumSize: const Size(0, 52),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.add_shopping_cart_rounded, size: 18),
                      SizedBox(width: 6),
                      Text(
                        'Añadir',
                        style: TextStyle(fontWeight: FontWeight.w800),
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
