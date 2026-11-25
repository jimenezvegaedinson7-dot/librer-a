import 'dart:async';

import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../services/storage_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import '../utils/app_tokens.dart';
import '../utils/constants.dart';
import '../widgets/aparecer.dart';
import '../widgets/app_bottom_navigation.dart';
import '../widgets/book_cover.dart';
import '../widgets/comprobador_actualizacion.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/estanteria.dart';
import '../widgets/loading_view.dart';
import '../widgets/portadas_libro.dart';
import '../widgets/presionable.dart';
import '../widgets/seccion_titulo.dart';
import 'carrito_screen.dart';
import 'libros_screen.dart';
import 'perfil_screen.dart';
import 'mis_compras_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  AppTab _currentTab = AppTab.inicio;
  final _comprasKey = GlobalKey<MisComprasScreenState>();
  String _nombreCliente = '';

  final SolicitudCatalogo _solicitudCatalogo = SolicitudCatalogo();

  void _onTabSelected(AppTab tab) {
    if (tab == AppTab.compras && _currentTab == tab) {
      _comprasKey.currentState?.recargar();
    }
    setState(() {
      _currentTab = tab;
    });
    if (tab == AppTab.inicio) {

      _cargarNombre();
    }
  }

  @override
  void initState() {
    super.initState();
    _cargarNombre();

    WidgetsBinding.instance.addPostFrameCallback(
      (_) => ComprobadorActualizacion.comprobar(context),
    );
  }

  @override
  void dispose() {
    _solicitudCatalogo.dispose();
    super.dispose();
  }

  Future<void> _cargarNombre() async {
    final usuario = await StorageService.instance.obtenerUsuario();
    if (usuario != null && mounted) {
      setState(() => _nombreCliente = usuario.nombreCompleto);
    }
  }

  void _irAlCatalogo({String? categoria, bool buscar = false}) {
    setState(() => _currentTab = AppTab.libros);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (buscar) {
        _solicitudCatalogo.abrirBuscador();
      } else {
        _solicitudCatalogo.abrirCategoria(categoria);
      }
    });
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
              onVerLibros: () => _irAlCatalogo(),
              onBuscar: () => _irAlCatalogo(buscar: true),
              onVerCategoria: (categoria) =>
                  _irAlCatalogo(categoria: categoria),
            ),
            LibrosScreen(solicitud: _solicitudCatalogo),
            const CarritoScreen(embedded: true),
            MisComprasScreen(
              key: _comprasKey,
              embedded: true,
              activa: _currentTab == AppTab.compras,
            ),
            PerfilScreen(embedded: true, activa: _currentTab == AppTab.perfil),
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

class _InicioTab extends StatefulWidget {
  final String nombreCliente;
  final VoidCallback onVerLibros;
  final VoidCallback onBuscar;
  final ValueChanged<String?> onVerCategoria;

  const _InicioTab({
    required this.nombreCliente,
    required this.onVerLibros,
    required this.onBuscar,
    required this.onVerCategoria,
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
      CarritoService.instance.actualizarCatalogo(libros);
      if (mounted) {

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

  List<({String nombre, int cantidad, List<Libro> muestras})> get _categorias {
    final porCategoria = <String, List<Libro>>{};
    for (final libro in _libros) {
      final categoria = (libro.categoria ?? '').trim();
      if (categoria.isEmpty) continue;
      porCategoria.putIfAbsent(categoria, () => []).add(libro);
    }
    final lista =
        porCategoria.entries
            .map(
              (e) => (
                nombre: e.key,
                cantidad: e.value.length,
                muestras: e.value.take(3).toList(),
              ),
            )
            .toList()
          ..sort((a, b) => b.cantidad.compareTo(a.cantidad));
    return lista;
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _cargarLibros,
      color: AppColors.primary,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(child: _buildCabecera(context)),
          _buildLibros(),
        ],
      ),
    );
  }

  String get _saludo {
    final hora = DateTime.now().hour;
    if (hora >= 5 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  Widget _buildCabecera(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Aparecer(
            desplazamiento: 18,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(

                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: '$_saludo, ',
                          style: TextStyle(
                            color: AppColors.gold,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        TextSpan(
                          text: widget.nombreCliente.trim().isEmpty
                              ? 'te damos la bienvenida'
                              : widget.nombreCliente
                                    .trim()
                                    .split(RegExp(r'\s+'))
                                    .first,
                        ),
                      ],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.headlineMedium?.copyWith(height: 1.2),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.only(right: 4),
            child: Aparecer(
              indice: 1,
              desplazamiento: 18,
              child: _buildBuscador(context),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBuscador(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Presionable(
      escala: 0.985,
      child: Semantics(
        button: true,
        label: 'Buscar libros por título o autor',
        child: Material(
          color: AppColors.surface,
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Radios.md),
            side: const BorderSide(color: AppColors.divider),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(Radios.md),
            onTap: widget.onBuscar,
            child: SizedBox(
              height: 52,
              child: Row(
                children: [
                  const SizedBox(width: 14),
                  Icon(
                    Icons.search_rounded,
                    size: 22,
                    color: AppColors.primary,
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
                  Container(
                    margin: const EdgeInsets.all(6),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(Radios.sm - 2),
                    ),
                    child: Text(
                      'Buscar',
                      style: textTheme.labelMedium?.copyWith(
                        color: Colors.white,
                      ),
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

    final mitad = (_libros.length / 2).ceil();
    final filaUno = _libros.take(mitad).toList();
    final filaDos = _libros.skip(mitad).toList();
    final categorias = _categorias;

    return SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 22),
          Aparecer(
            desplazamiento: 28,
            child: _EditorialBanner(
              onVerLibros: widget.onVerLibros,
              portadas: _libros.take(3).toList(),
            ),
          ),
          if (categorias.length > 1) ...[
            const SizedBox(height: 26),
            Aparecer(
              indice: 1,
              child: _Categorias(
                categorias: categorias,
                onTap: widget.onVerCategoria,
              ),
            ),
          ],
          Aparecer(
            indice: 2,
            child: _LibroCarrusel(
              libros: filaUno,
              nombre: 'Selección de la casa',
              antetitulo: 'Recomendados',
              onVerLibros: widget.onVerLibros,
              rolSecundario: false,
            ),
          ),
          if (filaDos.isNotEmpty) ...[
            const SizedBox(height: 6),
            Aparecer(
              indice: 3,
              child: _LibroCarrusel(
                libros: filaDos,
                nombre: 'Más para descubrir',
                antetitulo: 'Del catálogo',
                onVerLibros: widget.onVerLibros,
                rolSecundario: true,
              ),
            ),
          ],
          const SizedBox(height: 28),
        ],
      ),
    );
  }
}

class _EditorialBanner extends StatelessWidget {
  final VoidCallback onVerLibros;
  final List<Libro> portadas;

  const _EditorialBanner({required this.onVerLibros, required this.portadas});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Radios.lg),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary,
            Color.alphaBlend(
              Colors.black.withValues(alpha: 0.32),
              AppColors.primary,
            ),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.28),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [

          Positioned.fill(
            child: IgnorePointer(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(Radios.lg),
                child: ShaderMask(
                  blendMode: BlendMode.dstIn,
                  shaderCallback: (rect) => const LinearGradient(
                    begin: Alignment.centerRight,
                    end: Alignment.centerLeft,
                    colors: [Colors.white, Colors.transparent],
                    stops: [0.25, 0.95],
                  ).createShader(rect),
                  child: const EstanteriaAnimada(
                    tinta: Colors.white,
                    acento: AppColors.doradoClaro,
                    opacidad: 0.13,
                    altoBalda: 62,
                    semilla: 21,
                  ),
                ),
              ),
            ),
          ),

          Positioned.fill(
            child: Container(
              margin: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(Radios.lg - 5),
                border: Border.all(
                  color: AppColors.doradoClaro.withValues(alpha: 0.3),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 22, 12, 22),
            child: Row(
              children: [
                Expanded(
                  flex: 11,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'MATIDANA',
                        style: textTheme.labelSmall?.copyWith(
                          color: AppColors.doradoClaro,
                          letterSpacing: 1.6,
                          fontSize: 10,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '“Encuentra tu próxima lectura.”',
                        style: AppTheme.serif(
                          fontSize: 22,
                          height: 1.2,
                          color: Colors.white,
                          fontStyle: FontStyle.italic,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Descubre el catálogo completo de ediciones.',
                        style: textTheme.bodySmall?.copyWith(
                          color: Colors.white.withValues(alpha: 0.78),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Presionable(
                        child: FilledButton(
                          onPressed: onVerLibros,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.dorado,
                            foregroundColor: AppColors.tinta,
                            minimumSize: const Size(0, 42),
                            padding: const EdgeInsets.symmetric(horizontal: 18),
                          ),

                          child: const FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text('Explorar catálogo'),
                                SizedBox(width: 6),
                                Icon(Icons.arrow_forward_rounded, size: 18),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                if (portadas.isNotEmpty)
                  Expanded(flex: 8, child: _AbanicoPortadas(libros: portadas)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AbanicoPortadas extends StatefulWidget {
  final List<Libro> libros;

  const _AbanicoPortadas({required this.libros});

  @override
  State<_AbanicoPortadas> createState() => _AbanicoPortadasState();
}

class _AbanicoPortadasState extends State<_AbanicoPortadas>
    with TickerProviderStateMixin {
  late final AnimationController _apertura = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  );
  late final AnimationController _flotar = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 3600),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (reducirMovimiento(context)) {
      _apertura.value = 1;
      _flotar.stop();
    } else if (_apertura.value == 0 && !_apertura.isAnimating) {
      Future<void>.delayed(const Duration(milliseconds: 250), () {
        if (mounted) _apertura.forward();
      });
      _flotar.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _apertura.dispose();
    _flotar.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const angulos = [-0.18, 0.0, 0.18];
    const desplazamientos = [-28.0, 0.0, 28.0];
    const fases = [0.0, 0.33, 0.66];
    final visibles = widget.libros.take(3).toList();
    final solo = visibles.length == 1;

    return ExcludeSemantics(
      child: SizedBox(
        height: 150,
        child: AnimatedBuilder(
          animation: Listenable.merge([_apertura, _flotar]),
          builder: (context, _) {
            final abierto = Curves.easeOutBack.transform(_apertura.value);
            return Stack(
              alignment: Alignment.center,
              clipBehavior: Clip.none,
              children: [
                for (var i = 0; i < visibles.length; i++)
                  Transform.translate(
                    offset: Offset(
                      desplazamientos[solo ? 1 : i] * abierto,
                      (i == 1 ? -6 : 6) +
                          4 * _onda((_flotar.value + fases[i]) % 1),
                    ),
                    child: Transform.rotate(
                      angle: solo ? 0 : angulos[i] * abierto,
                      child: Container(
                        width: 70,
                        height: 105,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(3),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.35),
                              blurRadius: 14,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: BookCover(
                          url: Constants.buildPortadaUrl(visibles[i].portada),
                          borderRadius: 3,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  static double _onda(double t) =>
      Curves.easeInOut.transform(t < 0.5 ? t * 2 : (1 - t) * 2) * 2 - 1;
}

class _Categorias extends StatelessWidget {
  final List<({String nombre, int cantidad, List<Libro> muestras})> categorias;
  final ValueChanged<String?> onTap;

  const _Categorias({required this.categorias, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(

          padding: const EdgeInsets.fromLTRB(20, 0, 12, 0),
          child: SeccionTitulo(
            antetitulo: 'Categorías',
            titulo: 'Explorar por categoría',
            accion: 'Todas',
            onAccion: () => onTap(null),
          ),
        ),
        const SizedBox(height: 6),
        SizedBox(

          height: 196,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            itemCount: categorias.length,
            separatorBuilder: (_, _) => const SizedBox(width: 4),
            itemBuilder: (context, i) {
              final c = categorias[i];
              return Presionable(
                child: Semantics(
                  button: true,
                  label: 'Categoría ${c.nombre}, ${c.cantidad} títulos',
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => onTap(c.nombre),
                    child: SizedBox(
                      width: 118,
                      child: Column(
                        children: [
                          SizedBox(
                            height: 128,
                            child: AbanicoCategoria(libros: c.muestras),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            c.nombre,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: textTheme.titleMedium?.copyWith(
                              fontSize: 15,
                              height: 1.2,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            c.cantidad == 1
                                ? '1 título'
                                : '${c.cantidad} títulos',
                            style: textTheme.labelSmall?.copyWith(
                              color: AppColors.gold,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _LibroCarrusel extends StatefulWidget {
  final List<Libro> libros;
  final String nombre;
  final String antetitulo;
  final VoidCallback onVerLibros;
  final bool rolSecundario;

  const _LibroCarrusel({
    required this.libros,
    required this.nombre,
    required this.antetitulo,
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

  double _cardWidthPara(BuildContext context) {
    final ancho = MediaQuery.of(context).size.width;
    if (ancho >= 1000) return 190;
    if (ancho >= 750) return 170;
    return 140;
  }

  void _avanzar() {
    final lista = widget.libros;
    if (lista.length <= 1 || !_controller.hasClients) return;

    final itemW = _cardWidthPara(context) + 20;
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
    final cardW = _cardWidthPara(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 12, 12),
          child: SeccionTitulo(
            antetitulo: widget.antetitulo,
            titulo: widget.nombre,
            accion: widget.rolSecundario ? 'Catálogo' : 'Ver todos',
            onAccion: widget.onVerLibros,
          ),
        ),
        SizedBox(

          height:
              cardW * 1.5 +
              14 +
              MediaQuery.textScalerOf(context).scale(15) * 1.2 * 2 +
              72,
          child: ListView.separated(
            controller: _controller,
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
            itemCount: widget.libros.length,
            separatorBuilder: (_, _) => const SizedBox(width: 20),
            itemBuilder: (context, index) {
              return LibroSuelto(libro: widget.libros[index], ancho: cardW);
            },
          ),
        ),
      ],
    );
  }
}
