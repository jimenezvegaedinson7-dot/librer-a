import 'dart:async';

import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../utils/app_colors.dart';
import '../widgets/app_bottom_navigation.dart';
import '../widgets/app_logo.dart';
import '../widgets/carrito_badge.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/libro_card.dart';
import '../widgets/loading_view.dart';
import 'carrito_screen.dart';
import 'libros_screen.dart';
import 'mis_compras_screen.dart';
import 'perfil_screen.dart';

/// Pantalla principal con navegación inferior entre las secciones del cliente.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  AppTab _currentTab = AppTab.inicio;
  String _nombreCliente = 'Cliente';
  final GlobalKey<MisComprasScreenState> _misComprasKey =
      GlobalKey<MisComprasScreenState>();

  void _onTabSelected(AppTab tab) {
    setState(() {
      _currentTab = tab;
    });
    if (tab == AppTab.inicio) {
      // Refresca el saludo ("Hola, {nombre}") cada vez que se vuelve a la
      // pestaña Inicio: tras editar el perfil o iniciar sesión con otra
      // cuenta, los datos almacenados pueden haber cambiado.
      _cargarNombre();
    }
    if (tab == AppTab.misCompras) {
      // La pestaña vive en un IndexedStack y solo se construye una vez;
      // refrescamos las compras cada vez que el usuario entra a la pestaña.
      _misComprasKey.currentState?.recargar();
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
              onAbrirCarrito: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const CarritoScreen(),
                  ),
                );
              },
            ),
            const LibrosScreen(),
            const CarritoScreen(embedded: true),
            MisComprasScreen(key: _misComprasKey),
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

/// Pestaña de Inicio: saludo, buscador visual y dos carruseles de novedades.
class _InicioTab extends StatefulWidget {
  final String nombreCliente;
  final VoidCallback onVerLibros;
  final VoidCallback onAbrirCarrito;

  const _InicioTab({
    required this.nombreCliente,
    required this.onVerLibros,
    required this.onAbrirCarrito,
  });

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
    final textTheme = Theme.of(context).textTheme;

    return RefreshIndicator(
      onRefresh: _cargarLibros,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            sliver: SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryDark.withValues(alpha: 0.18),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 54,
                          height: 54,
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                            color: AppColors.paper,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppColors.gold.withValues(alpha: 0.7),
                            ),
                          ),
                          child: const AppLogo(width: 44, height: 44),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'BIBLIOTECA PERSONAL',
                                style: textTheme.labelSmall?.copyWith(
                                  color: AppColors.gold,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.4,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Hola, ${widget.nombreCliente}',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: textTheme.headlineSmall?.copyWith(
                                  color: Colors.white,
                                  height: 1.05,
                                ),
                              ),
                              const SizedBox(height: 5),
                              Text(
                                'Encuentra tu próxima lectura.',
                                style: textTheme.bodySmall?.copyWith(
                                  color: Colors.white.withValues(alpha: 0.72),
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: 'Mi carrito',
                          onPressed: widget.onAbrirCarrito,
                          color: Colors.white,
                          style: IconButton.styleFrom(
                            backgroundColor: Colors.white.withValues(
                              alpha: 0.1,
                            ),
                          ),
                          icon: const CarritoBadge(
                            child: Icon(Icons.shopping_bag_outlined),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    GestureDetector(
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => const LibrosScreen(),
                          ),
                        );
                      },
                      child: AbsorbPointer(
                        child: TextField(
                          readOnly: true,
                          decoration: const InputDecoration(
                            hintText: 'Buscar por título o autor',
                            prefixIcon: Icon(Icons.search_rounded),
                            fillColor: AppColors.surface,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 28)),
          _buildLibros(),
        ],
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
          icon: Icons.menu_book_outlined,
          title: 'Sin novedades',
          message: 'No hay libros disponibles por el momento.',
        ),
      );
    }

    // Reparte los libros en dos filas de carrusel.
    final mitad = (_libros.length / 2).ceil();
    final filaUno = _libros.take(mitad).toList();
    final filaDos = _libros.skip(mitad).toList();

    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(0, 4, 0, 24),
      sliver: SliverToBoxAdapter(
        child: Column(
          children: [
            _LibroCarrusel(
              libros: filaUno,
              nombre: 'Selección de la casa',
              onVerLibros: widget.onVerLibros,
              rolSecundario: false,
            ),
            if (filaDos.isNotEmpty) ...[
              const SizedBox(height: 16),
              _LibroCarrusel(
                libros: filaDos,
                nombre: 'Más para descubrir',
                onVerLibros: widget.onVerLibros,
                rolSecundario: true,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Carrusel horizontal de libros que avanza de a un libro hacia la derecha y
/// vuelve al inicio al llegar al final.
///
/// Muestra una fila de [LibroCard]. Opcionalmente dibuja un encabezado con el
/// [nombre] de la sección y un botón "Ver todos" (solo en la primera fila).
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
    if (ancho >= 1000) return 220;
    if (ancho >= 750) return 200;
    if (ancho >= 520) return 180;
    return 164;
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
    final mostrarCabecera = widget.nombre.isNotEmpty;

    final cardW = _cardWidthPara(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (mostrarCabecera)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 12, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    widget.nombre,
                    style: textTheme.titleLarge?.copyWith(
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
                if (!widget.rolSecundario)
                  TextButton(
                    onPressed: widget.onVerLibros,
                    child: const Text('Ver catálogo'),
                  ),
              ],
            ),
          ),
        SizedBox(
          height: cardW * 1.34 + 140,
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
