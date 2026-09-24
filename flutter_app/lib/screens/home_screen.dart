import 'dart:async';

import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
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
import '../widgets/precio_texto.dart';
import '../widgets/presionable.dart';
import '../widgets/seccion_titulo.dart';
import 'carrito_screen.dart';
import 'detalle_libro_screen.dart';
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
  String _nombreCliente = '';

  /// Enlace de Inicio con el Catálogo (categoría o buscador).
  final SolicitudCatalogo _solicitudCatalogo = SolicitudCatalogo();

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
    // Aviso de nueva versión del APK (una vez por arranque de la app).
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

/// Pestaña de Inicio: saludo, buscador destacado, portada editorial,
/// categorías y dos carruseles de libros.
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

  /// Categorías reales del catálogo con su número de títulos y una portada.
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

  /// Cabecera de bienvenida sobre el fondo: saludo editorial, nombre,
  /// logo de la casa y, debajo, el buscador destacado.
  Widget _buildCabecera(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Aparecer(
            desplazamiento: 18,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _saludo.toUpperCase(),
                        style: textTheme.labelSmall?.copyWith(
                          color: AppColors.gold,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.6,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.nombreCliente.trim().isEmpty
                            ? 'Te damos la bienvenida'
                            : widget.nombreCliente,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.headlineLarge?.copyWith(height: 1.15),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Image.asset(
                  'assets/logo_suerior/logo_superior.png',
                  width: 64,
                  height: 46,
                  fit: BoxFit.contain,
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

  /// Buscador destacado: al tocarlo abre el Catálogo con el campo activo.
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

    // Reparte los libros en dos filas de carrusel.
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
          const SizedBox(height: 10),
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

/// Portada editorial en burdeos con filete dorado, la cita de la casa y un
/// abanico con las portadas reales del catálogo.
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
          // Estantería de fondo, desvanecida hacia el texto.
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
          // Filete dorado interior, como los ornamentos del logo.
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
                        'LIBRERÍA DEL SABER',
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
                          // Se encoge en pantallas angostas para que la
                          // flecha nunca se salga del botón.
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

/// Tres portadas superpuestas en abanico (decorativo, sin datos inventados).
///
/// Al aparecer, las portadas se abren desde el centro; después flotan con un
/// vaivén lento. Con "reducir animaciones" quedan quietas y abiertas.
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

  /// Onda suave de -1 a 1 para el vaivén.
  static double _onda(double t) =>
      Curves.easeInOut.transform(t < 0.5 ? t * 2 : (1 - t) * 2) * 2 - 1;
}

/// Recorrido por categorías reales: un pequeño abanico con portadas de la
/// categoría y, debajo y sin tarjeta, su nombre y cantidad de títulos.
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
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: SeccionTitulo(
            antetitulo: 'Categorías',
            titulo: 'Explorar por categoría',
            accion: 'Todas',
            onAccion: () => onTap(null),
          ),
        ),
        const SizedBox(height: 6),
        SizedBox(
          height: 206,
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
                            child: _AbanicoCategoria(libros: c.muestras),
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

/// Hasta tres portadas de la categoría abiertas en abanico (como el banner).
class _AbanicoCategoria extends StatelessWidget {
  final List<Libro> libros;

  const _AbanicoCategoria({required this.libros});

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
                child: _PortadaLibro(
                  libro: visibles[orden[k]],
                  ancho: 66,
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
class _PortadaLibro extends StatelessWidget {
  final Libro libro;
  final double ancho;
  final bool sombraFuerte;
  final Object? heroTag;

  const _PortadaLibro({
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
class _LibroSuelto extends StatelessWidget {
  final Libro libro;
  final double ancho;

  const _LibroSuelto({required this.libro, required this.ancho});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final disponible = libro.esActivo && libro.hayStock;
    final heroTag = ('inicio', libro.idLibro);
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
                        child: _PortadaLibro(
                          libro: libro,
                          ancho: ancho,
                          heroTag: heroTag,
                        ),
                      ),
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

/// Carrusel horizontal de libros que avanza de a un libro hacia la derecha y
/// vuelve al inicio al llegar al final.
///
/// Muestra una fila de libros sueltos (portada y datos, sin tarjeta) con el
/// nombre de la sección y una acción.
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

  /// Ancho de cada libro (portada) según el tamaño de pantalla.
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
          // Portada 2:3 + texto (título en 2 líneas, autor y precio).
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
              return _LibroSuelto(libro: widget.libros[index], ancho: cardW);
            },
          ),
        ),
      ],
    );
  }
}
