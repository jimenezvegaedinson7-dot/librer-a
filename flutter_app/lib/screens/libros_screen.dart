import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/constants.dart';
import '../utils/formats.dart';
import '../widgets/app_page_header.dart';
import '../widgets/book_cover.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';
import 'carrito_screen.dart';
import 'detalle_libro_screen.dart';

enum _Orden { tituloAZ, tituloZA, precioMenor, precioMayor }

/// Pantalla "Catálogo": buscador, chips de categoría y grilla en dos columnas
/// estilo Stitch (portadas con lomo, badges de stock y botón de carrito).
class LibrosScreen extends StatefulWidget {
  const LibrosScreen({super.key});

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

  @override
  void initState() {
    super.initState();
    _cargarLibros();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: Text(
                  'Estado',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ),

              ListTile(
                title: const Text('Todos'),
                trailing: _disponible == null
                    ? const Icon(Icons.check_rounded)
                    : null,
                onTap: () => Navigator.pop(context, 'todos'),
              ),

              ListTile(
                title: const Text('Disponibles'),
                trailing: _disponible == true
                    ? const Icon(Icons.check_rounded)
                    : null,
                onTap: () => Navigator.pop(context, 'disponibles'),
              ),

              ListTile(
                title: const Text('Agotados'),
                trailing: _disponible == false
                    ? const Icon(Icons.check_rounded)
                    : null,
                onTap: () => Navigator.pop(context, 'agotados'),
              ),
            ],
          ),
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
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: Text(
                  'Ordenar',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ),

              _OrdenTile(
                label: 'Título A-Z',
                value: _Orden.tituloAZ,
                actual: _orden,
              ),

              _OrdenTile(
                label: 'Título Z-A',
                value: _Orden.tituloZA,
                actual: _orden,
              ),

              _OrdenTile(
                label: 'Precio menor',
                value: _Orden.precioMenor,
                actual: _orden,
              ),

              _OrdenTile(
                label: 'Precio mayor',
                value: _Orden.precioMayor,
                actual: _orden,
              ),
            ],
          ),
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
          child: CustomScrollView(
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
              else if (filtrados.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: EmptyView(
                    icon: Icons.search_off_rounded,
                    title: 'No encontramos libros',
                    message: 'Prueba con otra búsqueda o cambia los filtros.',
                  ),
                )
              else ...[
                if (_categorias.length > 1)
                  SliverToBoxAdapter(child: _buildChips()),

                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
                    child: _buildSortBar(filtrados.length),
                  ),
                ),

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
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppPageHeader(title: 'Catálogo'),

          const SizedBox(height: 18),

          TextField(
            controller: _searchController,
            onChanged: (value) {
              setState(() {
                _query = value;
              });
            },
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Título, autor o ISBN...',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      onPressed: () {
                        _searchController.clear();

                        setState(() {
                          _query = '';
                        });
                      },
                      icon: const Icon(Icons.close_rounded),
                    )
                  : Icon(Icons.tune_rounded, color: AppColors.gold),
              filled: true,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border.all(color: AppColors.divider),
          borderRadius: BorderRadius.circular(10),
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _CategorySegment(
              label: 'Todos',
              seleccionado: _categoria == null,
              onTap: () => setState(() => _categoria = null),
            ),
            for (final categoria in _categorias) ...[
              const _SegmentDivider(),
              _CategorySegment(
                label: categoria,
                seleccionado: _categoria == categoria,
                onTap: () => setState(() => _categoria = categoria),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSortBar(int total) {
    return Row(
      children: [
        Expanded(
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: '$total ',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                TextSpan(
                  text: total == 1
                      ? 'título disponible'
                      : 'títulos disponibles',
                ),
              ],
            ),
            style: Theme.of(context).textTheme.bodyMedium
                ?.copyWith(color: AppColors.textSecondary),
          ),
        ),
        const SizedBox(width: 10),

        _SmallFilterButton(
          icon: Icons.swap_vert_rounded,
          label: 'Ordenar',
          onTap: _seleccionarOrden,
        ),
        const SizedBox(width: 8),

        _SmallFilterButton(
          icon: Icons.tune_rounded,
          label: _disponible == null
              ? 'Estado'
              : _disponible!
              ? 'Disponible'
              : 'Agotado',
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

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      sliver: SliverGrid(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          mainAxisSpacing: 20,
          crossAxisSpacing: 12,
          childAspectRatio: width >= 700 ? 0.54 : 0.45,
        ),
        delegate: SliverChildBuilderDelegate(
          childCount: libros.length,
          (context, index) => _LibroGridCard(libro: libros[index]),
        ),
      ),
    );
  }
}

/// Segmento de la barra horizontal continua de categorías: el activo se
/// rellena de grafito y el resto queda transparente sobre la barra blanca.
class _CategorySegment extends StatelessWidget {
  final String label;
  final bool seleccionado;
  final VoidCallback onTap;

  const _CategorySegment({
    required this.label,
    required this.seleccionado,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        decoration: BoxDecoration(
          color: seleccionado ? AppColors.primary : Colors.transparent,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: seleccionado ? Colors.white : AppColors.textSecondary,
            fontWeight: FontWeight.w700,
            fontSize: 12,
            letterSpacing: 0.2,
          ),
        ),
      ),
    );
  }
}

/// Separador vertical fino entre segmentos de la barra de categorías.
class _SegmentDivider extends StatelessWidget {
  const _SegmentDivider();

  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 22, color: AppColors.divider);
  }
}

/// Botón compacto de la barra de ordenamiento (estilo Stitch).
class _SmallFilterButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _SmallFilterButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.textSecondary,
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        side: const BorderSide(color: AppColors.divider),
        backgroundColor: AppColors.surface,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 17, color: AppColors.gold),
          const SizedBox(width: 5),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

/// Tarjeta vertical de la grilla del catálogo: portada con lomo, badge de
/// stock, título en serif, autor, precio y botón de carrito.
class _LibroGridCard extends StatelessWidget {
  final Libro libro;

  const _LibroGridCard({required this.libro});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final disponible = libro.esActivo && libro.hayStock;
    final stock = libro.stock ?? 0;
    final categoria = (libro.categoria ?? '').trim();

    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
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
              child: Stack(
                fit: StackFit.expand,
                children: [
                  BookCover(
                    url: Constants.buildPortadaUrl(libro.portada),
                    borderRadius: 0,
                    fit: BoxFit.contain,
                  ),

                  // Efecto de lomo / plegado lateral del libro físico.
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: SizedBox(
                      width: 8,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.centerLeft,
                            colors: [
                              Color(0x4D17181C),
                              Color(0x1A17181C),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _StockBadge(disponible: disponible, stock: stock),

                  const SizedBox(height: 7),

                  Text(
                    libro.titulo?.trim().isNotEmpty == true
                        ? libro.titulo!
                        : 'Sin título',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.titleSmall?.copyWith(
                      height: 1.2,
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),

                  const SizedBox(height: 2),

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

                  if (categoria.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      categoria,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.labelSmall?.copyWith(
                        color: AppColors.gold,
                        fontWeight: FontWeight.w700,
                        fontSize: 9,
                      ),
                    ),
                  ],

                  const SizedBox(height: 10),

                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'S/ ${Formats.precio(libro.precio)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: textTheme.labelLarge?.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),

                      _AddButton(libro: libro, disponible: disponible),
                    ],
                  ),
                ],
              ),
            ),
          ],
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
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.labelSmall
            ?.copyWith(color: color, fontWeight: FontWeight.w700, fontSize: 9),
      ),
    );
  }
}

class _AddButton extends StatelessWidget {
  final Libro libro;
  final bool disponible;

  const _AddButton({required this.libro, required this.disponible});

  @override
  Widget build(BuildContext context) {
    final onTap = disponible && libro.idLibro != null
        ? () {
            CarritoService.instance.agregar(libro);

            final messenger = ScaffoldMessenger.of(context);
            messenger.hideCurrentSnackBar();
            messenger.showSnackBar(
              SnackBar(
                content: Text('${libro.titulo} se agregó al carrito'),
                behavior: SnackBarBehavior.floating,
                duration: const Duration(seconds: 2),
                action: SnackBarAction(
                  label: 'Ver carrito',
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => CarritoScreen()),
                    );
                  },
                ),
              ),
            );
          }
        : null;

    return Material(
      color: disponible ? AppColors.primary : AppColors.surfaceElevated,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: InkWell(
        customBorder: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        onTap: onTap,
        child: SizedBox(
          width: 38,
          height: 38,
          child: Icon(
            Icons.add_shopping_cart_rounded,
            size: 19,
            color: disponible ? Colors.white : AppColors.textTertiary,
          ),
        ),
      ),
    );
  }
}

class _OrdenTile extends StatelessWidget {
  final String label;
  final _Orden value;
  final _Orden actual;

  const _OrdenTile({
    required this.label,
    required this.value,
    required this.actual,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(label),
      trailing: value == actual
          ? Icon(
              Icons.check_rounded,
              color: Theme.of(context).colorScheme.primary,
            )
          : null,
      onTap: () {
        Navigator.of(context).pop(value);
      },
    );
  }
}
