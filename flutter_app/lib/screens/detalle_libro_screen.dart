import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/constants.dart';
import '../widgets/aparecer.dart';
import '../widgets/book_cover.dart';
import '../widgets/carrito_badge.dart';
import '../widgets/estado_chip.dart';
import '../widgets/estanteria.dart';
import '../widgets/precio_texto.dart';
import '../widgets/presionable.dart';
import 'carrito_screen.dart';

/// Ficha del libro: portada sobre pergamino, datos comerciales (precio,
/// disponibilidad y cantidad), sinopsis expandible, ficha técnica y barra
/// inferior fija con total, reserva y compra.
class DetalleLibroScreen extends StatefulWidget {
  final Libro libro;

  /// Etiqueta de la transición de portada desde la tarjeta de origen.
  final Object? heroTag;

  const DetalleLibroScreen({super.key, required this.libro, this.heroTag});

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

  /// Confirmación visual breve tras añadir al carrito.
  bool _agregado = false;

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

    setState(() => _agregado = true);
    Future<void>.delayed(const Duration(milliseconds: 1400), () {
      if (mounted) setState(() => _agregado = false);
    });
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
    final esFavorito = _esFavorito ?? false;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.pergamino,
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        title: const Text('Ficha del libro'),
        actions: [
          IconButton(
            tooltip: esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos',
            onPressed: _favoritoCambiando ? null : _toggleFavorito,
            icon: _favoritoCambiando
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : _CorazonFavorito(activo: esFavorito),
          ),
          IconButton(
            tooltip: 'Ver carrito',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const CarritoScreen()),
              );
            },
            icon: const CarritoBadge(child: Icon(Icons.shopping_cart_outlined)),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: wide ? _buildWide(context) : _buildPortrait(context),
        ),
      ),
      bottomNavigationBar: _StickyBar(
        libro: _libro,
        cantidad: _cantidad,
        reservando: _reservando > 0,
        agregado: _agregado,
        onAdd: _agregarAlCarrito,
        onReservar: _reservar,
      ),
    );
  }

  Widget _buildPortrait(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _EscenarioPortada(libro: _libro, heroTag: widget.heroTag),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
          child: Aparecer(indice: 1, child: _buildInfo(context)),
        ),
      ],
    );
  }

  Widget _buildWide(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 28),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 300,
            child: _EscenarioPortada(
              libro: _libro,
              redondeado: true,
              heroTag: widget.heroTag,
            ),
          ),
          const SizedBox(width: 32),
          Expanded(child: _buildInfo(context)),
        ],
      ),
    );
  }

  Widget _buildInfo(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final descripcion = (_libro.descripcion ?? '').trim();
    final disponible = _libro.hayStock;
    final autor = (_libro.autor ?? '').trim();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children: [
            EstadoChip(
              texto: _libro.categoria ?? 'General',
              tono: TonoEstado.marca,
              conPunto: false,
            ),
            EstadoChip(
              texto: disponible ? 'Envío inmediato' : 'Sin existencias',
              tono: disponible ? TonoEstado.exito : TonoEstado.peligro,
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          _libro.titulo ?? 'Sin título',
          style: textTheme.displaySmall?.copyWith(height: 1.12),
        ),
        if (autor.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: 'de ',
                  style: textTheme.bodyLarge?.copyWith(
                    color: AppColors.textTertiary,
                  ),
                ),
                TextSpan(
                  text: autor,
                  style: textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 18),

        // Bloque comercial: precio + cantidad.
        Container(
          padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(Radios.md),
            border: Border.all(color: AppColors.divider),
            boxShadow: Sombra.tarjeta,
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Precio',
                      style: textTheme.labelSmall?.copyWith(
                        color: AppColors.textTertiary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    PrecioTexto(
                      monto: _libro.precio,
                      tamano: 28,
                      peso: FontWeight.w700,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      disponible
                          ? '${_libro.stock} ${_libro.stock == 1 ? 'ejemplar disponible' : 'ejemplares disponibles'}'
                          : 'Agotado por ahora',
                      style: textTheme.bodySmall?.copyWith(
                        color: disponible
                            ? AppColors.textSecondary
                            : AppColors.error,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'Cantidad',
                    style: textTheme.labelSmall?.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  _CantidadSelector(
                    cantidad: _cantidad,
                    max: _libro.stock ?? 0,
                    onMenos: _decrementar,
                    onMas: _incrementar,
                  ),
                ],
              ),
            ],
          ),
        ),

        if (descripcion.isNotEmpty) ...[
          const SizedBox(height: 16),
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
          child: Column(
            children: [
              _infoRow(context, 'Autor', _libro.autor ?? '—'),
              _infoRow(context, 'Categoría', _libro.categoria ?? '—'),
              _infoRow(context, 'ISBN', _libro.isbn ?? '—'),
              _infoRow(
                context,
                'Stock',
                _libro.hayStock ? '${_libro.stock} disponibles' : 'Agotado',
                ultimo: true,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _infoRow(
    BuildContext context,
    String label,
    String value, {
    bool ultimo = false,
  }) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 11),
      decoration: BoxDecoration(
        border: ultimo
            ? null
            : const Border(bottom: BorderSide(color: AppColors.divider)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: textTheme.bodyMedium?.copyWith(
                color: AppColors.textTertiary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Corazón de favorito: late al activarse.
class _CorazonFavorito extends StatelessWidget {
  final bool activo;

  const _CorazonFavorito({required this.activo});

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: Duracion.base,
      transitionBuilder: (child, anim) => ScaleTransition(
        scale: TweenSequence<double>([
          TweenSequenceItem(tween: Tween(begin: 0.6, end: 1.18), weight: 60),
          TweenSequenceItem(tween: Tween(begin: 1.18, end: 1.0), weight: 40),
        ]).animate(anim),
        child: child,
      ),
      child: Icon(
        activo ? Icons.favorite_rounded : Icons.favorite_border_rounded,
        key: ValueKey(activo),
        color: activo ? AppColors.primary : AppColors.textPrimary,
      ),
    );
  }
}

/// Portada grande sobre una banda de pergamino.
///
/// Se evita el halo con [RadialGradient]: en el GPU Mali de algunos equipos
/// el degradado radial rompe el rasterizado y deja la pantalla en blanco.
class _EscenarioPortada extends StatelessWidget {
  final Libro libro;
  final bool redondeado;
  final Object? heroTag;

  const _EscenarioPortada({
    required this.libro,
    this.redondeado = false,
    this.heroTag,
  });

  /// Con etiqueta, la portada llega volando desde la tarjeta de origen.
  Widget _conHero(Widget portada) =>
      heroTag == null ? portada : Hero(tag: heroTag!, child: portada);

  @override
  Widget build(BuildContext context) {
    final portada = Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 210),
        child: AspectRatio(
          aspectRatio: 2 / 3,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(6),
              boxShadow: [
                BoxShadow(
                  color: AppColors.tinta.withValues(alpha: 0.28),
                  blurRadius: 30,
                  offset: const Offset(0, 16),
                ),
              ],
            ),
            child: _conHero(
              BookCover(
                url: Constants.buildPortadaUrl(libro.portada),
                borderRadius: 6,
                fit: BoxFit.cover,
              ),
            ),
          ),
        ),
      ),
    );

    return ClipRRect(
      borderRadius: redondeado
          ? BorderRadius.circular(Radios.lg)
          : BorderRadius.zero,
      child: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.pergamino, AppColors.background],
          ),
        ),
        child: Stack(
          children: [
            // Estantería tenue detrás de la portada, como en una vitrina.
            Positioned.fill(
              child: IgnorePointer(
                child: ShaderMask(
                  blendMode: BlendMode.dstIn,
                  shaderCallback: (rect) => const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.white, Colors.transparent],
                    stops: [0.3, 1],
                  ).createShader(rect),
                  child: EstanteriaAnimada(
                    tinta: AppColors.primaryDark,
                    acento: AppColors.dorado,
                    opacidad: 0.12,
                    altoBalda: 72,
                    semilla: libro.idLibro.hashCode,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              child: heroTag == null
                  ? Aparecer(desplazamiento: 20, child: portada)
                  : portada,
            ),
          ],
        ),
      ),
    );
  }
}

/// Selector numérico de cantidad en píldora.
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
      height: 42,
      decoration: BoxDecoration(
        color: AppColors.paper,
        border: Border.all(color: AppColors.divider),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            tooltip: 'Quitar uno',
            onPressed: cantidad > 1 ? onMenos : null,
            icon: const Icon(Icons.remove_rounded, size: 18),
            color: AppColors.primary,
            visualDensity: VisualDensity.compact,
          ),
          SizedBox(
            width: 26,
            child: AnimatedSwitcher(
              duration: Duracion.rapida,
              transitionBuilder: (child, anim) => FadeTransition(
                opacity: anim,
                child: SlideTransition(
                  position: Tween(
                    begin: const Offset(0, 0.35),
                    end: Offset.zero,
                  ).animate(anim),
                  child: child,
                ),
              ),
              child: Text(
                '$cantidad',
                key: ValueKey(cantidad),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontSize: 16,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Añadir uno',
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AnimatedSize(
            duration: Duracion.base,
            curve: Curva.salida,
            alignment: Alignment.topCenter,
            child: Text(
              descripcion,
              maxLines: completa ? null : 4,
              overflow: completa ? null : TextOverflow.ellipsis,
              style: textTheme.bodyMedium?.copyWith(
                height: 1.6,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          const SizedBox(height: 4),
          TextButton(
            onPressed: onToggle,
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              visualDensity: VisualDensity.compact,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(completa ? 'Leer menos' : 'Leer más'),
                AnimatedRotation(
                  turns: completa ? 0.5 : 0,
                  duration: Duracion.base,
                  child: const Icon(Icons.expand_more_rounded, size: 18),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Contenedor con encabezado serif para Sinopsis y Ficha técnica.
class _Card extends StatelessWidget {
  final String title;
  final Widget child;

  const _Card({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radios.md),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 3,
                height: 16,
                decoration: BoxDecoration(
                  color: AppColors.gold,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              Text(title, style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

/// Barra inferior fija con total, reserva y compra.
class _StickyBar extends StatelessWidget {
  final Libro libro;
  final int cantidad;
  final bool reservando;
  final bool agregado;
  final VoidCallback onAdd;
  final VoidCallback onReservar;

  const _StickyBar({
    required this.libro,
    required this.cantidad,
    required this.reservando,
    required this.agregado,
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
        border: const Border(top: BorderSide(color: AppColors.divider)),
        boxShadow: Sombra.barra,
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 16, 12),
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
                        color: AppColors.textTertiary,
                      ),
                    ),
                    AnimatedSwitcher(
                      duration: Duracion.rapida,
                      transitionBuilder: (child, anim) =>
                          FadeTransition(opacity: anim, child: child),
                      child: PrecioTexto(
                        key: ValueKey(total),
                        monto: total,
                        tamano: 20,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Presionable(
                habilitado: disponible && !reservando,
                child: OutlinedButton(
                  onPressed: disponible && !reservando ? onReservar : null,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 50),
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    side: BorderSide(
                      color: AppColors.primary.withValues(alpha: 0.5),
                    ),
                  ),
                  child: reservando
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (!compact) ...[
                              const Icon(
                                Icons.event_available_outlined,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                            ],
                            const Text('Reservar'),
                          ],
                        ),
                ),
              ),
              const SizedBox(width: 8),
              Presionable(
                habilitado: disponible && !reservando,
                child: AnimatedContainer(
                  duration: Duracion.rapida,
                  child: FilledButton(
                    onPressed: disponible && !reservando ? onAdd : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: agregado
                          ? AppColors.success
                          : AppColors.primary,
                      minimumSize: const Size(0, 50),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    child: AnimatedSwitcher(
                      duration: Duracion.rapida,
                      transitionBuilder: (child, anim) =>
                          ScaleTransition(scale: anim, child: child),
                      child: Row(
                        key: ValueKey(agregado),
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            agregado
                                ? Icons.check_rounded
                                : Icons.add_shopping_cart_rounded,
                            size: 18,
                          ),
                          const SizedBox(width: 6),
                          Text(agregado ? 'Añadido' : 'Añadir'),
                        ],
                      ),
                    ),
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
