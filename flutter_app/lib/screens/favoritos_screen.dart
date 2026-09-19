import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';
import '../widgets/app_page_header.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/libro_card.dart';
import '../widgets/libros_grid.dart';
import '../widgets/loading_view.dart';

/// Pantalla "Mis favoritos" (lista de deseos).
///
/// Carga los libros marcados como favoritos desde `GET /favoritos` y los
/// muestra en una grilla reutilizable ([LibrosGrid] + [LibroCard]). Cada
/// tarjeta incluye un corazón para quitarla sin abrir el libro.
class FavoritosScreen extends StatefulWidget {
  const FavoritosScreen({super.key});

  @override
  State<FavoritosScreen> createState() => _FavoritosScreenState();
}

class _FavoritosScreenState extends State<FavoritosScreen> {
  bool _loading = true;
  bool _cargando = false;
  String? _error;
  List<Libro> _libros = const [];

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    if (_cargando) return;
    _cargando = true;
    setState(() {
      _loading = _libros.isEmpty;
      _error = null;
    });
    try {
      final libros = await ApiService.instance.obtenerFavoritos();
      if (!mounted) return;
      setState(() => _libros = libros);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'No se pudieron cargar tus favoritos.');
      }
    } finally {
      _cargando = false;
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Quita un libro de la lista local (sin re-cargar todo).
  Future<void> _quitar(Libro libro) async {
    final id = libro.idLibro;
    if (id == null) return;

    setState(() {
      _libros = _libros.where((l) => l.idLibro != id).toList();
    });

    try {
      await ApiService.instance.quitarFavorito(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: const Text('Eliminado de tus favoritos.'),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
    } on ApiException catch (e) {
      if (!mounted) return;
      await _cargar();
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      await _cargar();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo actualizar tus favoritos.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _cargar,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: const Padding(
                  padding: EdgeInsets.fromLTRB(20, 20, 20, 14),
                  child: AppPageHeader(title: 'Mis favoritos'),
                ),
              ),
              _buildBody(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: LoadingView(message: 'Cargando tus favoritos...'),
      );
    }
    if (_error != null && _libros.isEmpty) {
      return SliverFillRemaining(
        hasScrollBody: false,
        child: ErrorView(message: _error!, onRetry: _cargar),
      );
    }
    if (_libros.isEmpty) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: EmptyView(
          icon: Icons.favorite_border_rounded,
          title: 'Sin favoritos todavía',
          message: 'Toca el corazón en la ficha de un libro para guardarlo aquí.',
        ),
      );
    }

    final width = MediaQuery.sizeOf(context).width;
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      sliver: SliverGrid(
        gridDelegate: LibrosGrid.delegate(width),
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final libro = _libros[index];
            return Stack(
              children: [
                Positioned.fill(
                  child: LibroCard(libro: libro),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: _QuitarCorazon(
                    onTap: () => _quitar(libro),
                  ),
                ),
              ],
            );
          },
          childCount: _libros.length,
        ),
      ),
    );
  }
}

/// Botón corazón sobre la tarjeta para quitar el favorito directamente.
class _QuitarCorazon extends StatelessWidget {
  final VoidCallback onTap;

  const _QuitarCorazon({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface.withValues(alpha: 0.92),
      shape: const CircleBorder(),
      elevation: 1,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: const Padding(
          padding: EdgeInsets.all(6),
          child: Icon(
            Icons.favorite_rounded,
            size: 20,
            color: AppColors.error,
          ),
        ),
      ),
    );
  }
}