import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';
import '../widgets/app_page_header.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/libro_list_card.dart';
import '../widgets/loading_view.dart';

enum _Orden { tituloAZ, tituloZA, precioMenor, precioMayor }

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

  Future<void> _seleccionarCategoria() async {
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
                  'Categorías',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ),

              ListTile(
                title: const Text('Todas'),
                trailing: _categoria == null
                    ? const Icon(Icons.check_rounded)
                    : null,
                onTap: () => Navigator.pop(context, ''),
              ),

              for (final categoria in _categorias)
                ListTile(
                  title: Text(categoria),
                  trailing: _categoria == categoria
                      ? const Icon(Icons.check_rounded)
                      : null,
                  onTap: () => Navigator.pop(context, categoria),
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
      _categoria = resultado.isEmpty ? null : resultado;
    });
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
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 22, 20, 14),
                    child: Text.rich(
                      TextSpan(
                        children: [
                          const TextSpan(text: 'Encontramos '),
                          TextSpan(
                            text: '${filtrados.length}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          TextSpan(
                            text: filtrados.length == 1 ? ' libro' : ' libros',
                          ),
                        ],
                      ),
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: AppColors.textSecondary),
                    ),
                  ),
                ),

                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverList.separated(
                    itemCount: filtrados.length,
                    itemBuilder: (context, index) {
                      return LibroListCard(libro: filtrados[index]);
                    },
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                  ),
                ),

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
          const AppPageHeader(
            eyebrow: 'Colección',
            title: 'Catálogo',
            subtitle: 'Explora títulos, autores y categorías disponibles.',
          ),

          const SizedBox(height: 22),

          TextField(
            controller: _searchController,
            onChanged: (value) {
              setState(() {
                _query = value;
              });
            },
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Buscar por título o autor...',
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
                  : null,
              filled: true,
            ),
          ),

          const SizedBox(height: 18),

          Row(
            children: [
              Expanded(
                child: _SmallFilterButton(
                  label: _categoria == null ? 'Categoría' : _categoria!,
                  onTap: _seleccionarCategoria,
                ),
              ),

              const SizedBox(width: 10),

              Expanded(
                child: _SmallFilterButton(
                  label: _disponible == null
                      ? 'Estado'
                      : _disponible!
                      ? 'Disponible'
                      : 'Agotado',
                  onTap: _seleccionarDisponibilidad,
                ),
              ),

              const SizedBox(width: 10),

              Expanded(
                child: _SmallFilterButton(
                  label: 'Ordenar',
                  onTap: _seleccionarOrden,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SmallFilterButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _SmallFilterButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: colorScheme.onSurface,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        side: BorderSide(color: colorScheme.outlineVariant),
        backgroundColor: colorScheme.surface,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Flexible(
            child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
          ),

          const SizedBox(width: 5),

          Icon(
            Icons.keyboard_arrow_down_rounded,
            size: 19,
            color: colorScheme.onSurfaceVariant,
          ),
        ],
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
