import 'dart:async';

import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../utils/app_colors.dart';
import '../widgets/app_bottom_navigation.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/libro_card.dart';
import '../widgets/loading_view.dart';
import 'carrito_screen.dart';
import 'libros_screen.dart';
import 'perfil_screen.dart';
import 'reservas_screen.dart';

/// Pantalla principal con navegación inferior entre las secciones del cliente.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  AppTab _currentTab = AppTab.inicio;
  int _reservasRefreshToken = 0;
  String _nombreCliente = 'Cliente';

  void _onTabSelected(AppTab tab) {
    setState(() {
      _currentTab = tab;
      if (tab == AppTab.reservas) {
        _reservasRefreshToken += 1;
      }
    });
    if (tab == AppTab.inicio) {
      // Refresca el saludo ("Hola, {nombre}") cada vez que se vuelve a la
      // pestaña Inicio: tras editar el perfil o iniciar sesión con otra
      // cuenta, los datos almacenados pueden haber cambiado.
      _cargarNombre();
    }
  }

  @override
  void initState() {
    super.initState();
    _cargarNombre();
  }

  Future<void> _cargarNombre() async {
    final usuario = await StorageService.instance.obtenerUsuario();
    if (usuario != null && mounted) {
      setState(() => _nombreCliente = usuario.nombreCompleto);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: IndexedStack(
          index: _currentTab.index,
          children: [
            _InicioTab(
              nombreCliente: _nombreCliente,
              onVerLibros: () => setState(() => _currentTab = AppTab.libros),
            ),
            const LibrosScreen(),
            const CarritoScreen(embedded: true),
            ReservasScreen(key: ValueKey(_reservasRefreshToken)),
            const PerfilScreen(),
          ],
        ),
      ),
      bottomNavigationBar: AppBottomNavigation(
        currentTab: _currentTab,
        onTabSelected: _onTabSelected,
      ),
    );
  }
}

/// Pestaña de Inicio: saludo editorial, buscador visual y dos carruseles de
/// novedades inspirados en el diseño "Inicio" de Stitch.
class _InicioTab extends StatefulWidget {
  final String nombreCliente;
  final VoidCallback onVerLibros;

  const _InicioTab({required this.nombreCliente, required this.onVerLibros});

  @override
  State<_InicioTab> createState() => _InicioTabState();
}

class _InicioTabState extends State<_InicioTab> {
  bool _loading = true;
  String? _error;
  List<Libro> _libros = const [];

  @override
  void initState() {
    super.initState();
    _cargarLibros();
  }

  Future<void> _cargarLibros() async {
    setState(() {
      _loading = _libros.isEmpty;
      _error = null;
    });
    try {
      final libros = await ApiService.instance.obtenerLibros();
      if (mounted) {
        // Solo se muestran libros activos en las novedades.
        setState(
          () => _libros = libros.where((libro) => libro.esActivo).toList(),
        );
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'No se pudieron cargar los libros.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _cargarLibros,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(child: _buildSaludo(context)),
          SliverToBoxAdapter(child: _buildBuscador(context)),
          _buildLibros(),
        ],
      ),
    );
  }

  /// Cabecera de bienvenida con saludo editorial y acceso al carrito.
  Widget _buildSaludo(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: Image.asset(
              'assets/logo_suerior/logo_superior.png',
              width: 76,
              height: 54,
              fit: BoxFit.contain,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Hola, ${widget.nombreCliente}',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: textTheme.displayMedium?.copyWith(
              color: AppColors.textPrimary,
              height: 1.05,
            ),
          ),
        ],
      ),
    );
  }

  /// Buscador visual estilo Stitch: campo blanco redondeado con iconos.
  Widget _buildBuscador(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 4),
      child: GestureDetector(
        onTap: widget.onVerLibros,
        child: AbsorbPointer(
          child: Container(
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.divider),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primaryDark.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                const SizedBox(width: 16),
                Icon(
                  Icons.search_rounded,
                  size: 22,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Buscar por título o autor...',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                ),
                Icon(Icons.tune_rounded, size: 21, color: AppColors.gold),
                const SizedBox(width: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLibros() {
    if (_loading) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: LoadingView(message: 'Cargando novedades...'),
      );
    }
    if (_error != null && _libros.isEmpty) {
      return SliverFillRemaining(
        hasScrollBody: false,
        child: ErrorView(message: _error!, onRetry: _cargarLibros),
      );
    }
    if (_libros.isEmpty) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: EmptyView(
          icon: Icons.library_books_outlined,
          title: 'Sin novedades',
          message: 'No hay libros disponibles por el momento.',
        ),
      );
    }

    // Reparte los libros en dos filas de carrusel.
    final mitad = (_libros.length / 2).ceil();
    final filaUno = _libros.take(mitad).toList();
    final filaDos = _libros.skip(mitad).toList();

    return SliverToBoxAdapter(
      child: Column(
        children: [
          _LibroCarrusel(
            libros: filaUno,
            nombre: 'Selección de la casa',
            onVerLibros: widget.onVerLibros,
            rolSecundario: false,
          ),
          const SizedBox(height: 8),
          _EditorialBanner(onVerLibros: widget.onVerLibros),
          if (filaDos.isNotEmpty) ...[
            const SizedBox(height: 22),
            _LibroCarrusel(
              libros: filaDos,
              nombre: 'Más para descubrir',
              onVerLibros: widget.onVerLibros,
              rolSecundario: true,
            ),
          ],
          const SizedBox(height: 28),
        ],
      ),
    );
  }
}

/// Banner editorial en marrón biblioteca con cita de la casa.
class _EditorialBanner extends StatelessWidget {
  final VoidCallback onVerLibros;

  const _EditorialBanner({required this.onVerLibros});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 0),
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.18),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '“Encuentra tu próxima lectura.”',
                  style: textTheme.titleLarge?.copyWith(
                    color: AppColors.surface,
                    fontStyle: FontStyle.italic,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Descubre el catálogo completo de ediciones.',
                  style: textTheme.bodySmall?.copyWith(
                    color: AppColors.surface.withValues(alpha: 0.72),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: onVerLibros,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.gold,
                    foregroundColor: AppColors.primaryDark,
                    minimumSize: const Size(0, 40),
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text('Explorar catálogo'),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Icon(
            Icons.auto_stories_rounded,
            size: 72,
            color: AppColors.surface.withValues(alpha: 0.08),
          ),
        ],
      ),
    );
  }
}

/// Carrusel horizontal de libros que avanza de a un libro hacia la derecha y
/// vuelve al inicio al llegar al final.
///
/// Muestra una fila de [LibroCard] con el nombre de la sección y una acción.
class _LibroCarrusel extends StatefulWidget {
  final List<Libro> libros;
  final String nombre;
  final VoidCallback onVerLibros;
  final bool rolSecundario;

  const _LibroCarrusel({
    required this.libros,
    required this.nombre,
    required this.onVerLibros,
    required this.rolSecundario,
  });

  @override
  State<_LibroCarrusel> createState() => _LibroCarruselState();
}

class _LibroCarruselState extends State<_LibroCarrusel> {
  final ScrollController _controller = ScrollController();
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    if (widget.libros.isNotEmpty) {
      _timer = Timer.periodic(const Duration(seconds: 3), (_) => _avanzar());
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  /// Calcula el ancho de una tarjeta según el tamaño de pantalla.
  double _cardWidthPara(BuildContext context) {
    final ancho = MediaQuery.of(context).size.width;
    if (ancho >= 1000) return 235;
    if (ancho >= 750) return 215;
    return 176;
  }

  void _avanzar() {
    final lista = widget.libros;
    if (lista.length <= 1 || !_controller.hasClients) return;

    final itemW = _cardWidthPara(context) + 16;
    const inicio = 0.0;
    final finalMax =
        itemW * lista.length - _controller.position.viewportDimension;
    final posicionActual = _controller.offset;

    double destino;
    if (posicionActual >= finalMax - 1) {
      destino = inicio;
    } else {
      destino = posicionActual + itemW;
      if (destino > finalMax) destino = finalMax;
    }

    _controller.animateTo(
      destino,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final cardW = _cardWidthPara(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 12, 10),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  widget.nombre,
                  style: textTheme.titleLarge?.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              TextButton(
                onPressed: widget.onVerLibros,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.tertiary,
                  textStyle: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                child: Text(widget.rolSecundario ? 'Catálogo' : 'Ver todos'),
              ),
            ],
          ),
        ),
        SizedBox(
          height: cardW * 1.34 + 150,
          child: ListView.separated(
            controller: _controller,
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: widget.libros.length,
            separatorBuilder: (_, _) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              return SizedBox(
                width: cardW,
                child: LibroCard(libro: widget.libros[index]),
              );
            },
          ),
        ),
      ],
    );
  }
}
