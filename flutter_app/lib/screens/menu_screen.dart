import 'package:flutter/material.dart';

import '../models/libro.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';
import '../utils/constants.dart';
import '../widgets/book_cover.dart';
import '../widgets/empty_view.dart';
import '../widgets/error_view.dart';
import '../widgets/loading_view.dart';
import '../widgets/precio_texto.dart';
import 'detalle_libro_screen.dart';
import 'fondos_screen.dart';
import 'legal/politica_privacidad_screen.dart';
import 'legal/terminos_condiciones_screen.dart';
import 'perfil_screen.dart';

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

class _MenuScreenState extends State<MenuScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  List<Libro> _libros = [];
  bool _cargando = false;
  bool _iniciado = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.activa) _cargar();
  }

  @override
  void didUpdateWidget(covariant MenuScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.activa && !_iniciado) _cargar();
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

  void _abrir(Widget pantalla) {
    Navigator.of(context).pop();
    Navigator.of(context)
        .push<void>(MaterialPageRoute<void>(builder: (_) => pantalla));
  }

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: const Text('Novedades'),
        actions: [
          IconButton(
            key: const ValueKey('abrir-configuracion'),
            tooltip: 'Configuración y privacidad',
            icon: const Icon(Icons.menu_rounded),
            onPressed: () => _scaffoldKey.currentState?.openEndDrawer(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      endDrawer: Drawer(
        backgroundColor: AppColors.surface,
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 16),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 8, 20),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        'Configuración y privacidad',
                        style: texto.titleLarge,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Cerrar menú',
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              _opcion(
                Icons.person_outline_rounded,
                'Mi perfil',
                'Foto, datos y seguridad de tu cuenta',
                () => _abrir(const PerfilScreen()),
              ),
              _opcion(
                Icons.palette_outlined,
                'Fondo y tarjetas',
                'Colores de la aplicación y ambas vistas previas',
                () => _abrir(const FondosScreen()),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Divider(),
              ),
              _opcion(
                Icons.policy_outlined,
                'Política de privacidad',
                'Cómo protegemos tus datos',
                () => _abrir(const PoliticaPrivacidadScreen()),
              ),
              _opcion(
                Icons.gavel_outlined,
                'Términos y condiciones',
                'Condiciones de uso de MATIDANA',
                () => _abrir(const TerminosCondicionesScreen()),
              ),
            ],
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              children: [
                Text(
                  'Últimas incorporaciones al catálogo',
                  style: texto.titleMedium,
                ),
                const SizedBox(height: 6),
                Text(
                  'Descubre los libros que se han sumado a nuestra colección.',
                  style: texto.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                if (_cargando && _libros.isEmpty)
                  const LoadingView(message: 'Cargando novedades…')
                else if (_error != null)
                  ErrorView(message: _error!, onRetry: _cargar)
                else if (_libros.isEmpty)
                  EmptyView(
                    icon: Icons.auto_stories_outlined,
                    title: 'Pronto habrá novedades',
                    message:
                        'Mientras tanto, puedes explorar nuestro catálogo.',
                    actionLabel: 'Ver catálogo',
                    onAction: widget.onVerCatalogo,
                  )
                else
                  for (final libro in _libros)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Material(
                        color: AppColors.surface,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: AppColors.divider),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: () => Navigator.of(context).push<void>(
                            MaterialPageRoute<void>(
                              builder: (_) => DetalleLibroScreen(libro: libro),
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                SizedBox(
                                  width: 74,
                                  height: 108,
                                  child: BookCover(
                                    url: Constants.buildPortadaUrl(
                                      libro.portada,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        libro.titulo ?? 'Sin título',
                                        style: texto.titleMedium,
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        libro.autor ?? 'Autor no especificado',
                                        style: texto.bodySmall,
                                      ),
                                      if (libro.categoria?.isNotEmpty ==
                                          true) ...[
                                        const SizedBox(height: 6),
                                        Text(
                                          libro.categoria!,
                                          style: texto.labelSmall?.copyWith(
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ],
                                      const SizedBox(height: 12),
                                      PrecioLibro(libro: libro),
                                      const SizedBox(height: 10),
                                      Text(
                                        'Ver libro',
                                        style: texto.labelLarge?.copyWith(
                                          color: AppColors.primary,
                                        ),
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
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _opcion(
    IconData icono,
    String titulo,
    String detalle,
    VoidCallback abrir,
  ) => ListTile(
    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
    leading: Icon(icono, color: AppColors.primary),
    title: Text(titulo, style: const TextStyle(fontWeight: FontWeight.w600)),
    subtitle: Text(detalle),
    trailing: const Icon(Icons.chevron_right_rounded),
    onTap: abrir,
  );
}
