import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/constants.dart';
import '../widgets/book_cover.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';
import '../widgets/precio_texto.dart';
import 'carrito_screen.dart';
import 'detalle_libro_screen.dart';
import 'favoritos_screen.dart';
import 'legal/politica_privacidad_screen.dart';
import 'legal/terminos_condiciones_screen.dart';
import 'libro_reclamaciones_screen.dart';
import 'mis_compras_screen.dart';
import 'perfil_screen.dart';
import 'personalizacion_screen.dart';

/// Pantalla Menú: novedades reales del catálogo y menú lateral con accesos
/// directos a funciones que existen en la app.
class MenuScreen extends StatefulWidget {
  final bool activa;
  final VoidCallback onVerCatalogo;
  const MenuScreen({
    super.key,
    required this.activa,
    required this.onVerCatalogo,
  });

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen>
    with SingleTickerProviderStateMixin {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  late final AnimationController _menuController = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 240),
  );
  List<Libro> _libros = [];
  bool _cargando = false;
  bool _iniciado = false;
  String? _error;
  String _nombre = '';
  bool _menuAbierto = false;

  @override
  void initState() {
    super.initState();
    _cargarNombre();
    if (widget.activa) _cargar();
  }

  @override
  void didUpdateWidget(covariant MenuScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.activa && !_iniciado) _cargar();
  }

  @override
  void dispose() {
    _menuController.dispose();
    super.dispose();
  }

  Future<void> _cargarNombre() async {
    final usuario = await StorageService.instance.obtenerUsuario();
    if (usuario != null && mounted) {
      setState(() => _nombre = usuario.nombreCompleto);
    }
  }

  Future<void> _cargar() async {
    if (_cargando) return;
    setState(() {
      _iniciado = true;
      _cargando = true;
      _error = null;
    });
    try {
      final catalogo = await ApiService.instance.obtenerLibros();
      final libros = catalogo.where((l) => l.esActivo).toList()
        ..sort((a, b) {
          final fecha = (b.creadoEn?.millisecondsSinceEpoch ?? 0).compareTo(
            a.creadoEn?.millisecondsSinceEpoch ?? 0,
          );
          return fecha != 0
              ? fecha
              : (b.idLibro ?? 0).compareTo(a.idLibro ?? 0);
        });
      if (mounted) setState(() => _libros = libros.take(8).toList());
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'No pudimos cargar las novedades.');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  void _alternarMenu() {
    final abierto = _scaffoldKey.currentState?.isDrawerOpen ?? false;
    if (abierto) {
      Navigator.of(context).pop();
    } else {
      _scaffoldKey.currentState?.openDrawer();
    }
  }

  void _cerrarMenu() => _scaffoldKey.currentState?.closeDrawer();

  void _abrir(Widget pantalla) {
    _cerrarMenu();
    Navigator.of(context)
        .push<void>(MaterialPageRoute<void>(builder: (_) => pantalla));
  }

  void _explorarCatalogo() {
    _cerrarMenu();
    widget.onVerCatalogo();
  }

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        leading: IconButton(
          key: const ValueKey('abrir-configuracion'),
          tooltip: _menuAbierto ? 'Cerrar menú' : 'Abrir menú',
          icon: AnimatedIcon(
            icon: AnimatedIcons.menu_close,
            progress: _menuController,
          ),
          onPressed: _alternarMenu,
        ),
        title: const Text('Novedades'),
      ),
      drawer: _MenuLateral(
        nombre: _nombre,
        hayNovedades: _libros.isNotEmpty,
        animacion: _menuController,
        onCerrar: _cerrarMenu,
        onExplorar: _explorarCatalogo,
        onAbrir: _abrir,
      ),
      onDrawerChanged: (abierto) {
        setState(() => _menuAbierto = abierto);
        if (abierto) {
          reducirMovimiento(context)
              ? _menuController.value = 1
              : _menuController.forward();
        } else {
          reducirMovimiento(context)
              ? _menuController.value = 0
              : _menuController.reverse();
        }
      },
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              children: [
                Text(
                  'Recién llegados a la librería',
                  style: texto.headlineSmall,
                ),
                const SizedBox(height: 6),
                Text(
                  'Los últimos títulos que se han sumado a nuestra colección.',
                  style: texto.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 22),
                if (_cargando && _libros.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 40),
                    child: LoadingView(message: 'Cargando novedades…'),
                  )
                else if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 40),
                    child: ErrorView(message: _error!, onRetry: _cargar),
                  )
                else if (_libros.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 40),
                    child: EmptyView(
                      icon: Icons.auto_stories_outlined,
                      title: 'Pronto habrá novedades',
                      message:
                          'Mientras tanto, puedes explorar nuestro catálogo.',
                      actionLabel: 'Ver catálogo',
                      onAction: widget.onVerCatalogo,
                    ),
                  )
                else
                  for (final libro in _libros)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _TarjetaNovedad(
                        libro: libro,
                        onTap: () => Navigator.of(context).push<void>(
                          MaterialPageRoute<void>(
                            builder: (_) => DetalleLibroScreen(libro: libro),
                          ),
                        ),
                      ),
                    ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Menú lateral con secciones reales de la app.
class _MenuLateral extends StatelessWidget {
  final String nombre;
  final bool hayNovedades;
  final Animation<double> animacion;
  final VoidCallback onCerrar;
  final VoidCallback onExplorar;
  final void Function(Widget) onAbrir;

  const _MenuLateral({
    required this.nombre,
    required this.hayNovedades,
    required this.animacion,
    required this.onCerrar,
    required this.onExplorar,
    required this.onAbrir,
  });

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    final ancho = MediaQuery.sizeOf(context).width;
    return Drawer(
      width: ancho < 380 ? ancho * 0.88 : 320,
      backgroundColor: AppColors.surface,
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 20),
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(20, 20, 12, 20),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppColors.divider)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'MATIDANA',
                          style: texto.labelSmall?.copyWith(
                            color: AppColors.primaryDark,
                            letterSpacing: 1.8,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          nombre.trim().isEmpty
                              ? 'Tu librería'
                              : 'Hola, ${nombre.trim().split(RegExp(r'\s+')).first}',
                          style: texto.titleLarge?.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Cerrar menú',
                    color: AppColors.textPrimary,
                    icon: AnimatedIcon(
                      icon: AnimatedIcons.menu_close,
                      progress: animacion,
                    ),
                    onPressed: onCerrar,
                  ),
                ],
              ),
            ),
            _Seccion(texto: texto, titulo: 'Explorar'),
            if (hayNovedades)
              _Opcion(
                icono: Icons.new_releases_outlined,
                titulo: 'Novedades',
                detalle: 'Últimas incorporaciones al catálogo',
                onTap: onCerrar,
              ),
            _Opcion(
              icono: Icons.auto_stories_outlined,
              titulo: 'Explorar catálogo',
              detalle: 'Busca por título, autor o categoría',
              onTap: onExplorar,
            ),
            _Seccion(texto: texto, titulo: 'Preferencias'),
            _Opcion(
              icono: Icons.person_outline_rounded,
              titulo: 'Mi perfil',
              detalle: 'Foto, datos y seguridad',
              onTap: () => onAbrir(const PerfilScreen()),
            ),
            _Opcion(
              icono: Icons.palette_outlined,
              titulo: 'Personalización',
              detalle: 'Colores de botones, tarjetas y fondo',
              onTap: () => onAbrir(const PersonalizacionScreen()),
            ),
            _Seccion(texto: texto, titulo: 'Accesos rápidos'),
            _Opcion(
              icono: Icons.receipt_long_outlined,
              titulo: 'Mis compras',
              detalle: 'Pedidos y seguimiento',
              onTap: () => onAbrir(const MisComprasScreen()),
            ),
            _Opcion(
              icono: Icons.favorite_outline_rounded,
              titulo: 'Mis favoritos',
              detalle: 'Los libros que guardaste',
              onTap: () => onAbrir(const FavoritosScreen()),
            ),
            _Opcion(
              icono: Icons.shopping_bag_outlined,
              titulo: 'Mi carrito',
              detalle: 'Revisa tu pedido antes de pagar',
              onTap: () => onAbrir(const CarritoScreen()),
            ),
            _Seccion(texto: texto, titulo: 'Ayuda y legal'),
            _Opcion(
              icono: Icons.policy_outlined,
              titulo: 'Política de privacidad',
              detalle: 'Cómo protegemos tus datos',
              onTap: () => onAbrir(const PoliticaPrivacidadScreen()),
            ),
            _Opcion(
              icono: Icons.gavel_outlined,
              titulo: 'Términos y condiciones',
              detalle: 'Condiciones de uso de MATIDANA',
              onTap: () => onAbrir(const TerminosCondicionesScreen()),
            ),
            _Opcion(
              icono: Icons.support_agent_rounded,
              titulo: 'Libro de reclamaciones',
              detalle: 'Registra un reclamo o queja',
              onTap: () => onAbrir(const LibroReclamacionesScreen()),
            ),
          ],
        ),
      ),
    );
  }
}

class _Seccion extends StatelessWidget {
  final TextTheme texto;
  final String titulo;
  const _Seccion({required this.texto, required this.titulo});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 18, 20, 6),
    child: Text(
      titulo.toUpperCase(),
      style: texto.labelSmall?.copyWith(
        color: AppColors.textTertiary,
        letterSpacing: 1.1,
        fontWeight: FontWeight.w700,
      ),
    ),
  );
}

class _Opcion extends StatelessWidget {
  final IconData icono;
  final String titulo;
  final String detalle;
  final VoidCallback onTap;
  const _Opcion({
    required this.icono,
    required this.titulo,
    required this.detalle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.primaryContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icono, size: 21, color: AppColors.primary),
      ),
      title: Text(
        titulo,
        style: texto.titleSmall?.copyWith(fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        detalle,
        style: texto.bodySmall?.copyWith(color: AppColors.textSecondary),
      ),
      trailing: const Icon(Icons.chevron_right_rounded, size: 20),
      onTap: onTap,
    );
  }
}

/// Tarjeta de novedad con reacción al puntero en pantallas con ratón.
class _TarjetaNovedad extends StatefulWidget {
  final Libro libro;
  final VoidCallback onTap;
  const _TarjetaNovedad({required this.libro, required this.onTap});

  @override
  State<_TarjetaNovedad> createState() => _TarjetaNovedadState();
}

class _TarjetaNovedadState extends State<_TarjetaNovedad> {
  bool _encima = false;

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    final libro = widget.libro;
    return MouseRegion(
      onEnter: (_) => setState(() => _encima = true),
      onExit: (_) => setState(() => _encima = false),
      child: AnimatedContainer(
        duration: reducirMovimiento(context)
            ? Duration.zero
            : const Duration(milliseconds: 160),
        transform: Matrix4.translationValues(0, _encima ? -2 : 0, 0),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          boxShadow: _encima
              ? [
                  BoxShadow(
                    color: AppColors.primaryDark.withValues(alpha: 0.12),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ]
              : const [],
        ),
        child: Material(
          color: AppColors.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: BorderSide(
              color: _encima ? AppColors.dividerStrong : AppColors.divider,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: widget.onTap,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 78,
                    height: 114,
                    child: BookCover(
                      url: Constants.buildPortadaUrl(libro.portada),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          libro.titulo ?? 'Sin título',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: texto.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          libro.autor ?? 'Autor no especificado',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: texto.bodySmall?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                        if (libro.categoria?.isNotEmpty == true) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.secondaryContainer,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              libro.categoria!,
                              style: texto.labelSmall?.copyWith(
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(child: PrecioLibro(libro: libro)),
                            Icon(
                              Icons.arrow_forward_rounded,
                              size: 18,
                              color: AppColors.primary,
                            ),
                          ],
                        ),
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
