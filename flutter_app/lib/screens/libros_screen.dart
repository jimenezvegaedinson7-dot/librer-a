import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/constants.dart';
import '../widgets/aparecer.dart';
import '../widgets/book_cover.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';
import '../widgets/precio_texto.dart';
import '../widgets/portadas_libro.dart';
import '../widgets/presionable.dart';
import 'carrito_screen.dart';
import 'detalle_libro_screen.dart';

enum _Orden { tituloAZ, tituloZA, precioMenor, precioMayor }

const Map<_Orden, String> _nombreOrden = {
  _Orden.tituloAZ: 'Título A-Z',
  _Orden.tituloZA: 'Título Z-A',
  _Orden.precioMenor: 'Precio menor',
  _Orden.precioMayor: 'Precio mayor',
};

/// Petición desde otra pestaña para abrir el catálogo con una categoría
/// aplicada o con el buscador activo (solo afecta a la vista).
class SolicitudCatalogo extends ChangeNotifier {
  String? categoria;
  bool enfocarBusqueda = false;

  void abrirCategoria(String? valor) {
    categoria = valor;
    enfocarBusqueda = false;
    notifyListeners();
  }

  void abrirBuscador() {
    enfocarBusqueda = true;
    notifyListeners();
  }
}

/// Pantalla "Catálogo": buscador destacado, categorías, orden y estado, y una
/// grilla comercial de libros con acceso rápido al carrito.
class LibrosScreen extends StatefulWidget {
  final SolicitudCatalogo? solicitud;

  const LibrosScreen({super.key, this.solicitud});

  @override
  State<LibrosScreen> createState() => _LibrosScreenState();
}

class _LibrosScreenState extends State<LibrosScreen> {
  bool _loading = true;
  String? _error;

  List<Libro> _libros = <Libro>[];

  String _query = '';
  String? _categoria;
  bool? _disponible;

  _Orden _orden = _Orden.tituloAZ;

  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  final ScrollController _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    widget.solicitud?.addListener(_atenderSolicitud);
    _cargarLibros();
  }

  @override
  void dispose() {
    widget.solicitud?.removeListener(_atenderSolicitud);
    _searchController.dispose();
    _searchFocus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _atenderSolicitud() {
    final solicitud = widget.solicitud;
    if (solicitud == null || !mounted) return;
    if (solicitud.enfocarBusqueda) {
      _searchFocus.requestFocus();
    } else {
      setState(() => _categoria = solicitud.categoria);
    }
    if (_scroll.hasClients) {
      _scroll.animateTo(0, duration: Duracion.base, curve: Curva.salida);
    }
  }

  Future<void> _cargarLibros() async {
    if (!mounted) return;

    setState(() {
      if (_libros.isEmpty) {
        _loading = true;
      }

      _error = null;
    });

    try {
      final libros = await ApiService.instance.obtenerLibros();

      if (!mounted) return;

      setState(() {
        // Solo se muestran libros activos (esActivo == true). El stock se
        // filtra aparte con el control de disponibilidad.
        _libros = libros.where((libro) => libro.esActivo).toList();

        if (_categoria != null) {
          final existe = libros.any(
            (libro) =>
                (libro.categoria ?? '').trim().toLowerCase() ==
                _categoria!.trim().toLowerCase(),
          );

          if (!existe) {
            _categoria = null;
          }
        }
      });
    } on ApiException catch (e) {
      if (!mounted) return;

      setState(() {
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        _error = 'No se pudieron cargar los libros.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  List<String> get _categorias {
    final categorias = <String>{};

    for (final libro in _libros) {
      final categoria = libro.categoria?.trim() ?? '';

      if (categoria.isNotEmpty) {
        categorias.add(categoria);
      }
    }

    final lista = categorias.toList();

    lista.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));

    return lista;
  }

  int _cantidadEnCategoria(String categoria) {
    final buscada = categoria.trim().toLowerCase();
    return _libros
        .where((l) => (l.categoria ?? '').trim().toLowerCase() == buscada)
        .length;
  }

  List<Libro> _aplicarFiltros() {
    final List<Libro> lista = List<Libro>.from(_libros);

    Iterable<Libro> resultado = lista;

    final query = _query.trim().toLowerCase();

    if (query.isNotEmpty) {
      resultado = resultado.where((libro) {
        final titulo = (libro.titulo ?? '').toLowerCase();
        final autor = (libro.autor ?? '').toLowerCase();

        return titulo.contains(query) || autor.contains(query);
      });
    }

    if (_categoria != null) {
      final categoriaSeleccionada = _categoria!.trim().toLowerCase();

      resultado = resultado.where(
        (libro) =>
            (libro.categoria ?? '').trim().toLowerCase() ==
            categoriaSeleccionada,
      );
    }

    if (_disponible != null) {
      resultado = resultado.where((libro) {
        final stock = libro.stock ?? 0;

        return _disponible! ? stock > 0 : stock <= 0;
      });
    }

    final filtrados = resultado.toList();

    switch (_orden) {
      case _Orden.tituloAZ:
        filtrados.sort(
          (a, b) => (a.titulo ?? '').toLowerCase().compareTo(
            (b.titulo ?? '').toLowerCase(),
          ),
        );
        break;

      case _Orden.tituloZA:
        filtrados.sort(
          (a, b) => (b.titulo ?? '').toLowerCase().compareTo(
            (a.titulo ?? '').toLowerCase(),
          ),
        );
        break;

      case _Orden.precioMenor:
        filtrados.sort((a, b) => (a.precio ?? 0).compareTo(b.precio ?? 0));
        break;

      case _Orden.precioMayor:
        filtrados.sort((a, b) => (b.precio ?? 0).compareTo(a.precio ?? 0));
        break;
    }

    return filtrados;
  }

  Future<void> _seleccionarDisponibilidad() async {
    final resultado = await showModalBottomSheet<String>(
      context: context,
      builder: (context) {
        return _HojaOpciones(
          titulo: 'Estado',
          subtitulo: 'Muestra los libros según su disponibilidad.',
          opciones: [
            _Opcion('Todos', 'todos', _disponible == null),
            _Opcion('Disponibles', 'disponibles', _disponible == true),
            _Opcion('Agotados', 'agotados', _disponible == false),
          ],
        );
      },
    );

    if (resultado == null || !mounted) {
      return;
    }

    setState(() {
      switch (resultado) {
        case 'disponibles':
          _disponible = true;
          break;

        case 'agotados':
          _disponible = false;
          break;

        default:
          _disponible = null;
      }
    });
  }

  Future<void> _seleccionarOrden() async {
    final resultado = await showModalBottomSheet<_Orden>(
      context: context,
      builder: (context) {
        return _HojaOpciones<_Orden>(
          titulo: 'Ordenar',
          subtitulo: 'Elige cómo se ordenan los resultados.',
          opciones: [
            for (final orden in _Orden.values)
              _Opcion(_nombreOrden[orden]!, orden, orden == _orden),
          ],
        );
      },
    );

    if (resultado == null || !mounted) {
      return;
    }

    setState(() {
      _orden = resultado;
    });
  }

  @override
  Widget build(BuildContext context) {
    final filtrados = _aplicarFiltros();

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _cargarLibros,
          color: AppColors.primary,
          child: CustomScrollView(
            controller: _scroll,
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(child: _buildHeader()),

              if (_loading && _libros.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: LoadingView(message: 'Cargando libros...'),
                )
              else if (_error != null && _libros.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: ErrorView(message: _error!, onRetry: _cargarLibros),
                )
              else ...[
                if (_categorias.length > 1)
                  SliverToBoxAdapter(child: _buildChips()),

                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 14),
                    child: _buildSortBar(filtrados.length),
                  ),
                ),

                if (filtrados.isEmpty)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyView(
                      icon: Icons.search_off_rounded,
                      title: 'No encontramos libros',
                      message: 'Prueba con otra búsqueda o cambia los filtros.',
                    ),
                  )
                else
                  _buildGrid(filtrados),

                const SliverToBoxAdapter(child: SizedBox(height: 32)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Aparecer(
            desplazamiento: 18,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'EXPLORAR',
                  style: textTheme.labelSmall?.copyWith(
                    color: AppColors.gold,
                    letterSpacing: 1.6,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text('Catálogo', style: textTheme.headlineLarge),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Aparecer(
            indice: 1,
            desplazamiento: 18,
            child: _CampoBusqueda(
              controller: _searchController,
              focusNode: _searchFocus,
              onChanged: (value) => setState(() => _query = value),
              onLimpiar: () {
                _searchController.clear();
                setState(() => _query = '');
              },
            ),
          ),
        ],
      ),
    );
  }

  /// Hasta 3 libros de muestra de una categoría (o de todo el catálogo).
  List<Libro> _muestras(String? categoria) {
    final buscada = categoria?.trim().toLowerCase();
    return _libros
        .where(
          (l) =>
              buscada == null ||
              (l.categoria ?? '').trim().toLowerCase() == buscada,
        )
        .take(3)
        .toList();
  }

  /// Categorías como en Inicio: abanico de portadas y nombre, sin tarjeta.
  Widget _buildChips() {
    return SizedBox(
      height: 186,
      child: ListView(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        padding: const EdgeInsets.fromLTRB(14, 18, 14, 0),
        children: [
          _ChipCategoria(
            label: 'Todos',
            cantidad: _libros.length,
            muestras: _muestras(null),
            seleccionado: _categoria == null,
            onTap: () => setState(() => _categoria = null),
          ),
          for (final categoria in _categorias)
            _ChipCategoria(
              label: categoria,
              cantidad: _cantidadEnCategoria(categoria),
              muestras: _muestras(categoria),
              seleccionado: _categoria == categoria,
              onTap: () => setState(() => _categoria = categoria),
            ),
        ],
      ),
    );
  }

  Widget _buildSortBar(int total) {
    final textTheme = Theme.of(context).textTheme;
    return Row(
      children: [
        Expanded(
          child: AnimatedSwitcher(
            duration: Duracion.rapida,
            child: Text.rich(
              key: ValueKey(total),
              TextSpan(
                children: [
                  TextSpan(
                    text: '$total ',
                    style: textTheme.titleSmall?.copyWith(
                      color: AppColors.textPrimary,
                    ),
                  ),
                  TextSpan(
                    text: total == 1
                        ? 'título disponible'
                        : 'títulos disponibles',
                  ),
                ],
              ),
              style: textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        _BotonFiltro(
          icon: Icons.swap_vert_rounded,
          label: 'Ordenar',
          activo: _orden != _Orden.tituloAZ,
          onTap: _seleccionarOrden,
        ),
        const SizedBox(width: 8),
        _BotonFiltro(
          icon: Icons.tune_rounded,
          label: _disponible == null
              ? 'Estado'
              : _disponible!
              ? 'Disponibles'
              : 'Agotados',
          activo: _disponible != null,
          onTap: _seleccionarDisponibilidad,
        ),
      ],
    );
  }

  Widget _buildGrid(List<Libro> libros) {
    final width = MediaQuery.of(context).size.width;
    final columns = width >= 1000
        ? 4
        : width >= 700
        ? 3
        : 2;

    // Cada tarjeta es solo la portada, en proporción de libro (2:3): la
    // imagen llena su espacio y todas las tarjetas quedan niveladas.
    const espacioColumnas = 12.0;
    final anchoTarjeta =
        (width - 40 - espacioColumnas * (columns - 1)) / columns;

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      sliver: SliverGrid(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          mainAxisSpacing: 16,
          crossAxisSpacing: espacioColumnas,
          mainAxisExtent: anchoTarjeta * 1.5,
        ),
        delegate: SliverChildBuilderDelegate(
          childCount: libros.length,
          (context, index) => Aparecer(
            key: ValueKey(libros[index].idLibro ?? index),
            indice: index,
            child: _LibroGridCard(libro: libros[index]),
          ),
        ),
      ),
    );
  }
}

/// Buscador destacado: borde que se ilumina en burdeos al enfocarlo.
class _CampoBusqueda extends StatefulWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;
  final VoidCallback onLimpiar;

  const _CampoBusqueda({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
    required this.onLimpiar,
  });

  @override
  State<_CampoBusqueda> createState() => _CampoBusquedaState();
}

class _CampoBusquedaState extends State<_CampoBusqueda> {
  @override
  void initState() {
    super.initState();
    widget.focusNode.addListener(_refrescar);
  }

  @override
  void dispose() {
    widget.focusNode.removeListener(_refrescar);
    super.dispose();
  }

  void _refrescar() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final enfocado = widget.focusNode.hasFocus;
    return AnimatedContainer(
      duration: Duracion.rapida,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Radios.md),
        boxShadow: enfocado
            ? [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.14),
                  blurRadius: 0,
                  spreadRadius: 4,
                ),
              ]
            : Sombra.tarjeta,
      ),
      child: TextField(
        controller: widget.controller,
        focusNode: widget.focusNode,
        onChanged: widget.onChanged,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: 'Título, autor o ISBN...',
          prefixIcon: Icon(
            Icons.search_rounded,
            color: enfocado ? AppColors.primary : AppColors.textTertiary,
          ),
          suffixIcon: widget.controller.text.isNotEmpty
              ? IconButton(
                  tooltip: 'Limpiar búsqueda',
                  onPressed: widget.onLimpiar,
                  icon: const Icon(Icons.close_rounded),
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(Radios.md),
            borderSide: const BorderSide(color: AppColors.divider),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(Radios.md),
            borderSide: const BorderSide(color: AppColors.divider),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(Radios.md),
            borderSide: BorderSide(color: AppColors.primary, width: 1.4),
          ),
        ),
      ),
    );
  }
}

/// Chip de categoría con su número de títulos; el activo se rellena en burdeos.
class _ChipCategoria extends StatelessWidget {
  final String label;
  final int cantidad;
  final List<Libro> muestras;
  final bool seleccionado;
  final VoidCallback onTap;

  const _ChipCategoria({
    required this.label,
    required this.cantidad,
    required this.muestras,
    required this.seleccionado,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Presionable(
      child: Semantics(
        selected: seleccionado,
        button: true,
        label: 'Categoría $label, $cantidad títulos',
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: ExcludeSemantics(
            child: SizedBox(
              width: 96,
              child: Column(
                children: [
                  AnimatedOpacity(
                    duration: Duracion.rapida,
                    opacity: seleccionado ? 1 : 0.82,
                    child: AnimatedScale(
                      duration: Duracion.base,
                      curve: Curva.salida,
                      scale: seleccionado ? 1.06 : 1,
                      child: SizedBox(
                        height: 78,
                        child: AbanicoCategoria(libros: muestras, ancho: 46),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: textTheme.titleSmall?.copyWith(
                      color: seleccionado
                          ? AppColors.primary
                          : AppColors.textPrimary,
                      fontWeight: seleccionado
                          ? FontWeight.w700
                          : FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    cantidad == 1 ? '1 título' : '$cantidad títulos',
                    style: textTheme.labelSmall?.copyWith(
                      color: AppColors.gold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  AnimatedContainer(
                    duration: Duracion.base,
                    curve: Curva.salida,
                    height: 3,
                    width: seleccionado ? 28 : 0,
                    decoration: BoxDecoration(
                      color: AppColors.dorado,
                      borderRadius: BorderRadius.circular(2),
                    ),
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

/// Botón compacto de orden/estado; se marca en dorado cuando está activo.
class _BotonFiltro extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool activo;
  final VoidCallback onTap;

  const _BotonFiltro({
    required this.icon,
    required this.label,
    required this.activo,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: activo ? AppColors.primary : AppColors.textSecondary,
        backgroundColor: activo
            ? AppColors.primaryContainer
            : AppColors.surface,
        minimumSize: const Size(0, 38),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        side: BorderSide(
          color: activo
              ? AppColors.primary.withValues(alpha: 0.35)
              : AppColors.divider,
        ),
        textStyle: Theme.of(context).textTheme.labelMedium,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: activo ? AppColors.primary : AppColors.gold,
          ),
          const SizedBox(width: 5),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

class _Opcion<T> {
  final String texto;
  final T valor;
  final bool actual;

  const _Opcion(this.texto, this.valor, this.actual);
}

/// Hoja inferior de opciones con título serif y selección marcada.
class _HojaOpciones<T> extends StatelessWidget {
  final String titulo;
  final String subtitulo;
  final List<_Opcion<T>> opciones;

  const _HojaOpciones({
    required this.titulo,
    required this.subtitulo,
    required this.opciones,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(titulo, style: textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              subtitulo,
              style: textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 14),
            for (final opcion in opciones)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Material(
                  color: opcion.actual
                      ? AppColors.primaryContainer
                      : AppColors.paper,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(Radios.sm),
                    side: BorderSide(
                      color: opcion.actual
                          ? AppColors.primary.withValues(alpha: 0.3)
                          : AppColors.divider,
                    ),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(Radios.sm),
                    onTap: () => Navigator.of(context).pop(opcion.valor),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              opcion.texto,
                              style: textTheme.bodyLarge?.copyWith(
                                fontWeight: opcion.actual
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                                color: opcion.actual
                                    ? AppColors.primary
                                    : AppColors.textPrimary,
                              ),
                            ),
                          ),
                          AnimatedOpacity(
                            opacity: opcion.actual ? 1 : 0,
                            duration: Duracion.rapida,
                            child: Icon(
                              Icons.check_circle_rounded,
                              color: AppColors.primary,
                              size: 20,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Tarjeta de la grilla del catálogo: portada sobre papel con estado de stock,
/// título serif, autor, precio destacado y botón para añadir al carrito.
/// Tarjeta de la grilla del catálogo: solo la portada a tarjeta completa,
/// con el estado de stock arriba y, sobre un velo inferior, el precio y el
/// botón para añadir al carrito. Título y autor se leen en la ficha del libro
/// (y los anuncia el lector de pantalla).
class _LibroGridCard extends StatelessWidget {
  final Libro libro;

  const _LibroGridCard({required this.libro});

  @override
  Widget build(BuildContext context) {
    final disponible = libro.esActivo && libro.hayStock;
    final stock = libro.stock ?? 0;
    final radio = BorderRadius.circular(Radios.md);
    final titulo = libro.titulo?.trim().isNotEmpty == true
        ? libro.titulo!
        : 'Sin título';
    final autor = (libro.autor ?? '').trim();

    return Presionable(
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: radio,
          boxShadow: Sombra.tarjeta,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: radio,
          clipBehavior: Clip.antiAlias,
          child: Semantics(
            label: autor.isEmpty ? titulo : '$titulo, de $autor',
            child: InkWell(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => DetalleLibroScreen(
                      libro: libro,
                      heroTag: ('catalogo', libro.idLibro),
                    ),
                  ),
                );
              },
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Opacity(
                    opacity: disponible ? 1 : 0.55,
                    child: Hero(
                      tag: ('catalogo', libro.idLibro),
                      child: BookCover(
                        url: Constants.buildPortadaUrl(libro.portada),
                        borderRadius: 0,
                        fit: BoxFit.cover,
                        sombra: false,
                      ),
                    ),
                  ),
                  // Velo inferior para que el precio se lea sobre cualquier
                  // portada.
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 92,
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              AppColors.tinta.withValues(alpha: 0),
                              AppColors.tinta.withValues(alpha: 0.82),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 8,
                    top: 8,
                    child: _StockBadge(disponible: disponible, stock: stock),
                  ),
                  Positioned(
                    left: 12,
                    right: 8,
                    bottom: 8,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: PrecioTexto(
                              monto: libro.precio,
                              tamano: 18,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        _AddButton(libro: libro, disponible: disponible),
                      ],
                    ),
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

class _StockBadge extends StatelessWidget {
  final bool disponible;
  final int stock;

  const _StockBadge({required this.disponible, required this.stock});

  @override
  Widget build(BuildContext context) {
    final color = disponible ? AppColors.success : AppColors.error;
    final label = disponible
        ? (stock == 1 ? '1 disponible' : '$stock disponibles')
        : 'Sin existencias';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}

/// Botón para añadir al carrito: confirma con un check animado.
class _AddButton extends StatefulWidget {
  final Libro libro;
  final bool disponible;

  const _AddButton({required this.libro, required this.disponible});

  @override
  State<_AddButton> createState() => _AddButtonState();
}

class _AddButtonState extends State<_AddButton> {
  bool _agregado = false;

  void _agregar() {
    final libro = widget.libro;
    final agregadas = CarritoService.instance.agregar(libro);

    if (agregadas == 0) {
      final enCarrito = CarritoService.instance.cantidadDe(libro.idLibro);
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              enCarrito > 0
                  ? 'Ya tienes en tu carrito las $enCarrito unidades disponibles de este libro.'
                  : 'Este libro no tiene stock disponible.',
            ),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
      return;
    }

    setState(() => _agregado = true);
    Future<void>.delayed(const Duration(milliseconds: 1400), () {
      if (mounted) setState(() => _agregado = false);
    });

    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          '${libro.titulo} se agregó al carrito · '
          '${CarritoService.instance.cantidadDe(libro.idLibro)} en total',
        ),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
        // Con acción, Flutter lo deja fijo por defecto; aquí debe cerrarse
        // solo para no tapar el pago ni la barra inferior.
        persist: false,
        action: SnackBarAction(
          label: 'Ver carrito',
          onPressed: () {
            Navigator.of(context)
                .push(MaterialPageRoute<void>(builder: (_) => CarritoScreen()));
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final disponible = widget.disponible;
    final onTap = disponible && widget.libro.idLibro != null ? _agregar : null;
    final fondo = !disponible
        ? AppColors.surfaceElevated
        : _agregado
        ? AppColors.success
        : AppColors.primary;

    return Tooltip(
      message: disponible ? 'Añadir al carrito' : 'Sin existencias',
      child: Presionable(
        escala: 0.9,
        habilitado: onTap != null,
        child: AnimatedContainer(
          duration: Duracion.rapida,
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: fondo,
            borderRadius: BorderRadius.circular(Radios.sm),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(Radios.sm),
              onTap: onTap,
              child: AnimatedSwitcher(
                duration: Duracion.rapida,
                transitionBuilder: (child, anim) =>
                    ScaleTransition(scale: anim, child: child),
                child: Icon(
                  _agregado
                      ? Icons.check_rounded
                      : Icons.add_shopping_cart_rounded,
                  key: ValueKey(_agregado),
                  size: 19,
                  color: disponible ? Colors.white : AppColors.textTertiary,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
