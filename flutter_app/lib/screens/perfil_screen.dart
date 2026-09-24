import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/usuario.dart';
import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../services/storage_service.dart';
import '../services/tema_controller.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/avatar_generator.dart';
import '../utils/constants.dart';
import '../utils/perfil_temas.dart';
import '../widgets/aparecer.dart';
import '../widgets/app_page_header.dart';
import '../widgets/estado_chip.dart';
import '../widgets/estanteria.dart';
import '../widgets/presionable.dart';
import 'login_screen.dart';
import 'mis_compras_screen.dart';
import 'reservas_screen.dart';
import 'favoritos_screen.dart';
import 'security/cambiar_password_screen.dart';
import 'security/editar_perfil_screen.dart';
import 'security/two_factor_disable_screen.dart';
import 'security/two_factor_setup_screen.dart';
import 'legal/politica_privacidad_screen.dart';
import 'legal/terminos_condiciones_screen.dart';

const _profileInk = Color(0xFF1C1814);
const _profileMuted = Color(0xFF675E54);
const _profileBorder = Color(0xFFE7DFD3);
const _profileSurface = Color(0xFFFFFFFF);
const _profileSoft = Color(0xFFF1E8D8);

/// Pantalla de perfil del cliente.
///
/// Muestra los datos, permite editar perfil/foto/contraseña y gestionar el
/// doble factor (Google Authenticator). El estado 2FA se obtiene de
/// `GET /usuarios/perfil` (`two_factor_enabled`); si una respuesta anterior no
/// lo incluye, se conserva el valor local guardado durante el login.
class PerfilScreen extends StatefulWidget {
  const PerfilScreen({super.key});

  @override
  State<PerfilScreen> createState() => _PerfilScreenState();
}

class _PerfilScreenState extends State<PerfilScreen> {
  Usuario? _usuario;
  bool _twoFactorEnabled = false;
  bool _refreshing = false;
  String _temaId = perfilTemaDefaultId;
  int _paginaColores = 0;
  final PageController _coloresController = PageController();

  PerfilTema get _tema => perfilTemaPorId(_temaId);

  @override
  void initState() {
    super.initState();
    _temaId = TemaController.instance.id;
    TemaController.instance.addListener(_syncTema);
    _cargarLocal();
    _refrescarPerfil();
  }

  @override
  void dispose() {
    TemaController.instance.removeListener(_syncTema);
    _coloresController.dispose();
    super.dispose();
  }

  /// Mantiene el tema local sincronizado con el controlador global.
  void _syncTema() {
    if (mounted && _temaId != TemaController.instance.id) {
      setState(() => _temaId = TemaController.instance.id);
    }
  }

  /// Aplica un tema a toda la app a través del controlador global.
  Future<void> _aplicarTema(String id) async {
    await TemaController.instance.aplicar(id);
    if (mounted) setState(() => _temaId = id);
  }

  /// Abre el selector para combinar dos colores y crear un degradado propio.
  Future<void> _personalizarColores() async {
    final resultado = await showModalBottomSheet<(Color, Color)>(
      context: context,
      showDragHandle: true,
      backgroundColor: _profileSurface,
      isScrollControlled: true,
      builder: (sheetContext) =>
          _CustomThemeSheet(inicioInicial: _tema.inicio, finInicial: _tema.fin),
    );
    if (resultado == null || !mounted) return;
    final id = perfilTemaIdPersonalizado(resultado.$1, fin: resultado.$2);
    await _aplicarTema(id);
  }

  /// Carrusel de colores que solo avanza al deslizar (sin auto-reproducción)
  /// o con las flechas e indicadores clicables.
  Widget _buildCarruselColores() {
    const porPagina = 4;
    final opciones = <Widget>[
      for (final opcion in perfilTemas)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 5),
          child: _TemaSwatch(
            tema: opcion,
            seleccionado: _temaId == opcion.id,
            onTap: () => _aplicarTema(opcion.id),
          ),
        ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 5),
        child: _TemaSwatch(
          tema: _temaId.startsWith('custom_') ? _tema : null,
          seleccionado: _temaId.startsWith('custom_'),
          onTap: _personalizarColores,
        ),
      ),
    ];
    final paginas = (opciones.length / porPagina).ceil();

    return _profileCard(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Column(
          children: [
            Row(
              children: [
                SizedBox(
                  width: 40,
                  height: 46,
                  child: Center(
                    child: IconButton(
                      tooltip: 'Colores anteriores',
                      visualDensity: VisualDensity.compact,
                      onPressed: _paginaColores > 0
                          ? () => _irAPagina(_paginaColores - 1)
                          : null,
                      icon: const Icon(Icons.chevron_left_rounded, size: 26),
                      color: AppColors.textSecondary,
                      disabledColor: AppColors.divider,
                    ),
                  ),
                ),
                Expanded(
                  child: SizedBox(
                    height: 46,
                    child: PageView.builder(
                      controller: _coloresController,
                      // Solo avanza si el usuario desliza, usa la rueda del
                      // ratón o pulsa flechas/indicadores.
                      physics: const PageScrollPhysics(),
                      itemCount: paginas,
                      onPageChanged: (pagina) =>
                          setState(() => _paginaColores = pagina),
                      itemBuilder: (context, pagina) {
                        final inicio = pagina * porPagina;
                        final fin = (inicio + porPagina) < opciones.length
                            ? inicio + porPagina
                            : opciones.length;
                        return Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            for (var i = inicio; i < fin; i++) opciones[i],
                          ],
                        );
                      },
                    ),
                  ),
                ),
                SizedBox(
                  width: 40,
                  height: 46,
                  child: Center(
                    child: IconButton(
                      tooltip: 'Más colores',
                      visualDensity: VisualDensity.compact,
                      onPressed: _paginaColores < paginas - 1
                          ? () => _irAPagina(_paginaColores + 1)
                          : null,
                      icon: const Icon(Icons.chevron_right_rounded, size: 26),
                      color: AppColors.textSecondary,
                      disabledColor: AppColors.divider,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            if (paginas > 1)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var p = 0; p < paginas; p++)
                    GestureDetector(
                      onTap: () => _irAPagina(p),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: p == _paginaColores ? 16 : 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: p == _paginaColores
                              ? AppColors.primary
                              : AppColors.divider,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  /// Anima el carrusel hasta la página [pagina].
  void _irAPagina(int pagina) {
    _coloresController.animateToPage(
      pagina,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOutCubic,
    );
  }

  Future<void> _cargarLocal() async {
    final usuario = await StorageService.instance.obtenerUsuario();
    if (usuario != null) {
      // El estado 2FA se precarga desde el usuario guardado y luego la
      // pantalla lo refresca con GET /usuarios/perfil.
      final twoFa = usuario.twoFactorEnabled ?? false;
      if (mounted) {
        setState(() {
          _usuario = usuario;
          _twoFactorEnabled = twoFa;
        });
      }
    }
  }

  /// Consulta el perfil al backend y actualiza los datos locales.
  ///
  /// `GET /usuarios/perfil` ahora incluye `two_factor_enabled`; si el servidor
  /// no lo envía (respuesta anterior), se conserva el valor local.
  Future<void> _refrescarPerfil() async {
    if (mounted) setState(() => _refreshing = true);
    try {
      final perfil = await ApiService.instance.obtenerPerfil();
      final twoFaServidor = perfil.twoFactorEnabled;
      final perfilConTwoFa = perfil.copyWith(
        twoFactorEnabled: twoFaServidor ?? _twoFactorEnabled,
      );
      await StorageService.instance.guardarUsuario(perfilConTwoFa);
      if (mounted) {
        setState(() {
          _usuario = perfilConTwoFa;
          if (twoFaServidor != null) {
            _twoFactorEnabled = twoFaServidor;
          }
        });
      }
    } on ApiException catch (_) {
      // Se conservan los datos locales si falla.
    } catch (_) {
      // Sin acción: se muestran los datos locales.
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _cerrarSesion() async {
    // El carrito pertenece a la sesión: al salir no debe quedar nada de esta
    // cuenta para la siguiente que inicie sesión.
    CarritoService.instance.limpiar();
    ApiService.instance.limpiarEstadoCheckout();
    await StorageService.instance.limpiarSesion();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  Future<void> _confirmarCierre() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Seguro que deseas cerrar sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
    if (result == true) {
      await _cerrarSesion();
    }
  }

  Future<void> _editarPerfil() async {
    final usuario = _usuario;
    if (usuario == null) return;
    final guardado = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => EditarPerfilScreen(usuario: usuario),
      ),
    );
    if (guardado == true) {
      await _refrescarPerfil();
    }
  }

  Future<void> _cambiarPassword() async {
    await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => const CambiarPasswordScreen()),
    );
  }

  Future<void> _misCompras() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const MisComprasScreen()),
    );
  }

  Future<void> _misReservas() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const ReservasScreen()),
    );
  }

  Future<void> _misFavoritos() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const FavoritosScreen()),
    );
  }

  Future<void> _terminos() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => const TerminosCondicionesScreen(),
      ),
    );
  }

  Future<void> _privacidad() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const PoliticaPrivacidadScreen()),
    );
  }

  /// Muestra el selector de foto: avatar predefinido, galería o cámara.
  Future<void> _cambiarFoto() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: _profileSurface,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Cambiar foto',
                style: Theme.of(sheetContext).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'Elige un avatar o usa una foto propia.',
                style: Theme.of(sheetContext).textTheme.bodyMedium
                    ?.copyWith(color: _profileMuted),
              ),
              const SizedBox(height: 16),
              _SheetOption(
                icon: Icons.face_rounded,
                label: 'Elegir avatar',
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _elegirAvatar();
                },
              ),
              _SheetOption(
                icon: Icons.photo_library_outlined,
                label: 'Subir imagen',
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _seleccionarImagen(ImageSource.gallery);
                },
              ),
              _SheetOption(
                icon: Icons.photo_camera_outlined,
                label: 'Tomar foto',
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  _seleccionarImagen(ImageSource.camera);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Abre la galería de avatares predefinidos y sube el seleccionado.
  Future<void> _elegirAvatar() async {
    final seleccionado = await showModalBottomSheet<AvatarPreset>(
      context: context,
      showDragHandle: true,
      backgroundColor: _profileSurface,
      builder: (sheetContext) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Elegir avatar',
                style: Theme.of(sheetContext).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'Se generará una imagen con el avatar elegido.',
                style: Theme.of(sheetContext).textTheme.bodyMedium
                    ?.copyWith(color: _profileMuted),
              ),
              const SizedBox(height: 16),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 4,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                children: [
                  for (final preset in avatarPresets)
                    _AvatarPresetCircle(
                      preset: preset,
                      onTap: () => Navigator.of(sheetContext).pop(preset),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (seleccionado == null || !mounted) return;
    await _subirAvatar(seleccionado);
  }

  /// Genera el PNG del avatar en runtime y lo sube como foto de perfil.
  Future<void> _subirAvatar(AvatarPreset preset) async {
    try {
      final bytes = await generarAvatarPng(preset);
      if (!mounted) return;
      final nombre = 'avatar_${DateTime.now().millisecondsSinceEpoch}.png';
      await _subirBytes(bytes, nombre);
    } catch (_) {
      if (mounted) _toast('No se pudo generar el avatar.');
    }
  }

  /// Selecciona una imagen desde la galería o cámara y la sube.
  Future<void> _seleccionarImagen(ImageSource source) async {
    final picker = ImagePicker();
    try {
      final xfile = await picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (xfile == null) return;

      final bytes = await xfile.readAsBytes();
      if (bytes.length > 5 * 1024 * 1024) {
        _toast('La imagen supera el tamaño máximo de 5 MB.');
        return;
      }
      if (!mounted) return;

      // Se detecta el formato real por magic bytes. No se confía en la
      // extensión original (puede estar vacía o ser incorrecta) ni se asume
      // un `.jpg` arbitrario: el backend filtra por content-type y valida el
      // contenido real de la imagen.
      final formato = _detectarFormatoImagen(bytes);
      if (formato == null) {
        _toast('Solo se permiten imágenes JPG, PNG o WEBP.');
        return;
      }
      final nombre = 'foto_${DateTime.now().millisecondsSinceEpoch}$formato';
      await _subirBytes(bytes, nombre);
    } catch (_) {
      if (mounted) _toast('No se pudo seleccionar la imagen.');
    }
  }

  /// Detecta la extensión de imagen por sus magic bytes (JPEG/PNG/WebP).
  ///
  /// Devuelve `'.jpg'`, `'.png'` o `'.webp'` según el contenido real del
  /// archivo, o `null` si no es una imagen soportada.
  String? _detectarFormatoImagen(Uint8List bytes) {
    // JPEG: FF D8 FF
    if (bytes.length >= 3 &&
        bytes[0] == 0xFF &&
        bytes[1] == 0xD8 &&
        bytes[2] == 0xFF) {
      return '.jpg';
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes.length >= 8 &&
        bytes[0] == 0x89 &&
        bytes[1] == 0x50 &&
        bytes[2] == 0x4E &&
        bytes[3] == 0x47 &&
        bytes[4] == 0x0D &&
        bytes[5] == 0x0A &&
        bytes[6] == 0x1A &&
        bytes[7] == 0x0A) {
      return '.png';
    }
    // WebP: 'RIFF' + tamaño + 'WEBP'
    if (bytes.length >= 12 &&
        bytes[0] == 0x52 &&
        bytes[1] == 0x49 &&
        bytes[2] == 0x46 &&
        bytes[3] == 0x46 &&
        bytes[8] == 0x57 &&
        bytes[9] == 0x45 &&
        bytes[10] == 0x42 &&
        bytes[11] == 0x50) {
      return '.webp';
    }
    return null;
  }

  /// Sube los bytes como foto de perfil (compartido por avatar y foto).
  Future<void> _subirBytes(Uint8List bytes, String fileName) async {
    setState(() => _refreshing = true);
    try {
      final usuario = await ApiService.instance.subirFotoPerfil(
        bytes: bytes,
        fileName: fileName,
      );
      if (mounted) {
        setState(() => _usuario = usuario);
        _toast('Foto de perfil actualizada.');
      }
    } on ApiException catch (e) {
      if (mounted) _toast(e.message);
    } catch (_) {
      if (mounted) _toast('No se pudo actualizar la foto.');
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _activarTwoFactor() async {
    final activado = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => const TwoFactorSetupScreen()),
    );
    if (activado == true && mounted) {
      setState(() => _twoFactorEnabled = true);
      await _refrescarPerfil();
    }
  }

  Future<void> _desactivarTwoFactor() async {
    final resultado = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => const TwoFactorDisableScreen()),
    );
    if (resultado == true && mounted) {
      setState(() => _twoFactorEnabled = false);
    }
  }

  void _toast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final usuario = _usuario;

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: AppColors.primary,
          backgroundColor: _profileSurface,
          onRefresh: _refrescarPerfil,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
            children: [
              AppPageHeader(
                eyebrow: 'Tu cuenta',
                title: 'Mi perfil',
                trailing: AnimatedSwitcher(
                  duration: Duracion.rapida,
                  child: _refreshing
                      ? const SizedBox(
                          key: ValueKey('cargando'),
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.2),
                        )
                      : const SizedBox(key: ValueKey('listo'), width: 22),
                ),
              ),
              const SizedBox(height: 16),

              Aparecer(child: _buildPortada(context, usuario)),

              const SizedBox(height: 16),

              // Accesos rápidos
              Aparecer(
                indice: 1,
                child: Row(
                  children: [
                    Expanded(
                      child: _AccesoRapido(
                        icon: Icons.receipt_long_outlined,
                        label: 'Mis compras',
                        onTap: _misCompras,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _AccesoRapido(
                        icon: Icons.bookmark_outline_rounded,
                        label: 'Mis reservas',
                        onTap: _misReservas,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _AccesoRapido(
                        icon: Icons.favorite_border_rounded,
                        label: 'Mis favoritos',
                        onTap: _misFavoritos,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Datos
              _sectionTitle(textTheme, 'Tus datos'),
              const SizedBox(height: 10),
              _profileCard(
                child: Column(
                  children: [
                    _row(
                      context,
                      Icons.alternate_email_rounded,
                      'Correo',
                      usuario?.email ?? '—',
                    ),
                    _divider(),
                    _row(
                      context,
                      Icons.phone_outlined,
                      'Teléfono',
                      usuario?.telefono ?? '—',
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Personalización de colores
              _sectionTitle(
                textTheme,
                'Personaliza tus colores',
                detalle: 'Se aplican a toda la aplicación.',
              ),
              const SizedBox(height: 10),
              _buildCarruselColores(),

              const SizedBox(height: 24),

              // Seguridad y cuenta
              _sectionTitle(textTheme, 'Cuenta y seguridad'),
              const SizedBox(height: 10),
              _profileCard(
                child: Column(
                  children: [
                    _actionTile(
                      context,
                      icon: Icons.edit_outlined,
                      label: 'Editar perfil',
                      onTap: _editarPerfil,
                    ),
                    _divider(),
                    _actionTile(
                      context,
                      icon: Icons.lock_reset_rounded,
                      label: 'Cambiar contraseña',
                      onTap: _cambiarPassword,
                    ),
                    _divider(),
                    _actionTile(
                      context,
                      icon: _twoFactorEnabled
                          ? Icons.shield_rounded
                          : Icons.shield_outlined,
                      label: _twoFactorEnabled
                          ? 'Desactivar doble factor'
                          : 'Activar doble factor',
                      trailing: EstadoChip(
                        texto: _twoFactorEnabled ? 'Activo' : 'Inactivo',
                        tono: _twoFactorEnabled
                            ? TonoEstado.exito
                            : TonoEstado.neutro,
                      ),
                      onTap: _twoFactorEnabled
                          ? _desactivarTwoFactor
                          : _activarTwoFactor,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Legal
              _sectionTitle(textTheme, 'Legal'),
              const SizedBox(height: 10),
              _profileCard(
                child: Column(
                  children: [
                    _actionTile(
                      context,
                      icon: Icons.description_outlined,
                      label: 'Términos y Condiciones',
                      onTap: _terminos,
                    ),
                    _divider(),
                    _actionTile(
                      context,
                      icon: Icons.privacy_tip_outlined,
                      label: 'Política de Privacidad',
                      onTap: _privacidad,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Cerrar sesión
              OutlinedButton.icon(
                onPressed: _confirmarCierre,
                icon: const Icon(Icons.logout_rounded, size: 20),
                label: const Text('Cerrar sesión'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.error,
                  side: BorderSide(
                    color: AppColors.error.withValues(alpha: 0.35),
                  ),
                  minimumSize: const Size(double.infinity, 52),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Portada del perfil con el degradado del tema elegido por el usuario.
  Widget _buildPortada(BuildContext context, Usuario? usuario) {
    final textTheme = Theme.of(context).textTheme;
    final tema = _tema;
    final tinta = tema.textColor;

    return ClipRRect(
      borderRadius: BorderRadius.circular(Radios.lg),
      child: AnimatedContainer(
        duration: Duracion.lenta,
        curve: Curva.suave,
        decoration: BoxDecoration(gradient: tema.gradiente),
        child: Stack(
          children: [
            Positioned.fill(
              child: IgnorePointer(
                child: EstanteriaAnimada(
                  key: ValueKey('estante-${tema.id}'),
                  tinta: tinta == Colors.white ? Colors.white : AppColors.tinta,
                  acento: AppColors.doradoClaro,
                  opacidad: tinta == Colors.white ? 0.12 : 0.07,
                  altoBalda: 64,
                  semilla: 5,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
              child: Row(
                children: [
                  Semantics(
                    button: true,
                    label: 'Cambiar foto de perfil',
                    child: GestureDetector(
                      onTap: _cambiarFoto,
                      child: SizedBox(
                        width: 92,
                        height: 92,
                        child: Stack(
                          children: [
                            Center(
                              child: _Avatar(
                                usuario: usuario,
                                anillo: Colors.white.withValues(alpha: 0.9),
                              ),
                            ),
                            Positioned(
                              right: 0,
                              bottom: 2,
                              child: Container(
                                width: 30,
                                height: 30,
                                decoration: BoxDecoration(
                                  color: AppColors.dorado,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 2,
                                  ),
                                ),
                                child: const Icon(
                                  Icons.photo_camera_rounded,
                                  size: 15,
                                  color: AppColors.tinta,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          usuario?.nombreCompleto ?? 'Tu cuenta',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: textTheme.headlineSmall?.copyWith(
                            color: tinta,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          usuario?.email ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: textTheme.bodySmall?.copyWith(
                            color: tinta.withValues(alpha: 0.78),
                          ),
                        ),
                        const SizedBox(height: 10),
                        _PildoraPortada(
                          texto: 'Toca la foto para actualizarla',
                          tinta: tinta,
                          suave: true,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(TextTheme textTheme, String title, {String? detalle}) {
    // El detalle va debajo del título para que nunca se corte.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: textTheme.titleMedium?.copyWith(color: _profileInk)),
        if (detalle != null) ...[
          const SizedBox(height: 2),
          Text(
            detalle,
            style: textTheme.bodySmall?.copyWith(color: _profileMuted),
          ),
        ],
      ],
    );
  }

  Widget _actionTile(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Widget? trailing,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 14),
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: _profileSoft,
          borderRadius: BorderRadius.circular(Radios.sm),
        ),
        child: Icon(icon, size: 19, color: AppColors.primary),
      ),
      title: Text(label, style: const TextStyle(color: _profileInk)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ?trailing,
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right_rounded, color: _profileMuted),
        ],
      ),
      onTap: onTap,
    );
  }

  Widget _profileCard({required Widget child}) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: _profileSurface,
        borderRadius: BorderRadius.circular(Radios.md),
        border: Border.all(color: _profileBorder),
        boxShadow: Sombra.tarjeta,
      ),
      child: Material(color: Colors.transparent, child: child),
    );
  }

  Widget _row(BuildContext context, IconData icon, String label, String value) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 14),
      leading: Icon(icon, color: AppColors.gold),
      title: Text(
        label,
        style: Theme.of(context).textTheme.bodySmall
            ?.copyWith(color: _profileMuted),
      ),
      subtitle: Text(
        value,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.bodyMedium
            ?.copyWith(fontWeight: FontWeight.w500, color: _profileInk),
      ),
    );
  }

  Widget _divider() =>
      const Divider(height: 1, indent: 64, color: _profileBorder);
}

/// Píldora translúcida sobre la portada del perfil.
class _PildoraPortada extends StatelessWidget {
  final String texto;
  final Color tinta;
  final bool suave;

  const _PildoraPortada({
    required this.texto,
    required this.tinta,
    this.suave = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: tinta.withValues(alpha: suave ? 0.08 : 0.16),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tinta.withValues(alpha: 0.2)),
      ),
      // En una sola línea: en pantallas angostas el texto se reduce.
      child: FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Text(
          texto,
          maxLines: 1,
          style: Theme.of(context).textTheme.labelSmall
              ?.copyWith(color: tinta.withValues(alpha: suave ? 0.8 : 1)),
        ),
      ),
    );
  }
}

/// Acceso rápido del perfil (compras, reservas, favoritos).
class _AccesoRapido extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _AccesoRapido({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Presionable(
      child: Material(
        color: _profileSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radios.md),
          side: const BorderSide(color: _profileBorder),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(Radios.md),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 20, color: AppColors.primary),
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium
                      ?.copyWith(color: _profileInk),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Opción del selector de foto con icono, etiqueta y altura táctil cómoda.
class _SheetOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _SheetOption({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: _profileSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            height: 54,
            child: Row(
              children: [
                const SizedBox(width: 14),
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: _profileSoft,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 19, color: _profileInk),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  size: 20,
                  color: _profileMuted,
                ),
                const SizedBox(width: 14),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Avatar preset seleccionable en la galería de avatares.
class _AvatarPresetCircle extends StatelessWidget {
  final AvatarPreset preset;
  final VoidCallback onTap;

  const _AvatarPresetCircle({required this.preset, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: preset.color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.10),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: Text(preset.emoji, style: const TextStyle(fontSize: 34)),
        ),
      ),
    );
  }
}

/// Avatar circular con la foto del usuario si existe, o las iniciales.
class _Avatar extends StatelessWidget {
  final Usuario? usuario;
  final Color? anillo;

  const _Avatar({this.usuario, this.anillo});

  @override
  Widget build(BuildContext context) {
    final foto = usuario?.fotoPerfil;
    final url = foto == null || foto.trim().isEmpty
        ? ''
        : Constants.buildPerfilUrl(foto);

    final Widget circulo = url.isEmpty
        ? _Iniciales(usuario: usuario, accent: anillo)
        : ClipOval(
            child: SizedBox(
              width: 82,
              height: 82,
              child: Image.network(
                url,
                key: ValueKey<String>(url),
                fit: BoxFit.cover,
                width: 82,
                height: 82,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return _Iniciales(usuario: usuario, accent: anillo);
                },
                errorBuilder: (context, error, stackTrace) =>
                    _Iniciales(usuario: usuario, accent: anillo),
              ),
            ),
          );

    final ring = anillo;
    if (ring == null) return circulo;

    return Container(
      width: 88,
      height: 88,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: ring,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.14),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: circulo,
    );
  }
}

class _Iniciales extends StatelessWidget {
  final Usuario? usuario;
  final Color? accent;

  const _Iniciales({this.usuario, this.accent});

  String _iniciales() {
    final nombre = usuario?.nombre ?? '';
    final apellido = usuario?.apellido ?? '';
    final n = nombre.isNotEmpty ? nombre[0] : '';
    final a = apellido.isNotEmpty ? apellido[0] : '';
    final iniciales = '$n$a'.toUpperCase();
    return iniciales.isEmpty ? 'C' : iniciales;
  }

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 41,
      backgroundColor: accent == null
          ? _profileSoft
          : Color.alphaBlend(accent!.withValues(alpha: 0.16), _profileSoft),
      child: Text(
        _iniciales(),
        style: Theme.of(context).textTheme.headlineMedium
            ?.copyWith(color: _profileInk, fontWeight: FontWeight.bold),
      ),
    );
  }
}

/// Colores disponibles para combinar en el selector personalizado.
List<Color> _coloresPersonalizables() {
  final colores = <Color>{
    const Color(0xFF17181C),
    const Color(0xFF6B7280),
    const Color(0xFFFFFFFF),
  };
  for (final tema in perfilTemas) {
    colores.add(tema.inicio);
    colores.add(tema.fin);
  }
  return colores.toList();
}

/// Muestra circular del tema de perfil (color sólido o degradado).
class _TemaSwatch extends StatelessWidget {
  final PerfilTema? tema;
  final bool seleccionado;
  final VoidCallback onTap;

  /// Si [tema] es null se muestra la muestra de "personalizado".
  const _TemaSwatch({
    this.tema,
    required this.seleccionado,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final esPersonalizado = tema == null;
    final colorCheck = tema?.textColor ?? const Color(0xFF2C2621);

    return InkWell(
      onTap: onTap,
      customBorder: const CircleBorder(),
      child: Container(
        width: 42,
        height: 42,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: tema?.gradiente,
          color: esPersonalizado ? const Color(0xFFF1E8D8) : null,
          border: Border.all(
            color: seleccionado
                ? const Color(0xFF2C2621)
                : const Color(0xFFD6CAB8),
            width: seleccionado ? 3 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 5,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: seleccionado
            ? Icon(Icons.check_rounded, size: 18, color: colorCheck)
            : esPersonalizado
            ? const Icon(Icons.add_rounded, size: 18, color: Color(0xFF675E54))
            : null,
      ),
    );
  }
}

/// Hoja inferior para combinar dos colores y crear un degradado propio.
class _CustomThemeSheet extends StatefulWidget {
  final Color inicioInicial;
  final Color finInicial;

  const _CustomThemeSheet({
    required this.inicioInicial,
    required this.finInicial,
  });

  @override
  State<_CustomThemeSheet> createState() => _CustomThemeSheetState();
}

class _CustomThemeSheetState extends State<_CustomThemeSheet> {
  late Color _inicio;
  late Color _fin;

  @override
  void initState() {
    super.initState();
    _inicio = widget.inicioInicial;
    _fin = widget.finInicial;
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Combina tus colores',
              style: textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: _profileInk,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Elige dos colores y crea tu degradado personalizado.',
              style: textTheme.bodyMedium?.copyWith(color: _profileMuted),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              height: 56,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [_inicio, _fin],
                ),
                border: Border.all(color: _profileBorder),
              ),
              child: Text(
                'Vista previa',
                style: textTheme.titleMedium?.copyWith(
                  color: _textoLegible(_inicio, _fin),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Color inicial',
              style: textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: _profileInk,
              ),
            ),
            const SizedBox(height: 8),
            _ColorPalette(
              seleccionado: _inicio,
              onSeleccionar: (color) => setState(() => _inicio = color),
            ),
            const SizedBox(height: 18),
            Text(
              'Color final',
              style: textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: _profileInk,
              ),
            ),
            const SizedBox(height: 8),
            _ColorPalette(
              seleccionado: _fin,
              onSeleccionar: (color) => setState(() => _fin = color),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: FilledButton(
                onPressed: () => Navigator.of(context).pop((_inicio, _fin)),
                child: const Text('Aplicar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Paleta de colores para elegir en el combinador personalizado.
class _ColorPalette extends StatelessWidget {
  final Color seleccionado;
  final ValueChanged<Color> onSeleccionar;

  const _ColorPalette({
    required this.seleccionado,
    required this.onSeleccionar,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        for (final color in _coloresPersonalizables())
          InkWell(
            customBorder: const CircleBorder(),
            onTap: () => onSeleccionar(color),
            child: Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color,
                border: Border.all(
                  color: color == seleccionado
                      ? const Color(0xFF2C2621)
                      : const Color(0xFFD6CAB8),
                  width: color == seleccionado ? 3 : 1,
                ),
              ),
              child: color == seleccionado
                  ? Icon(
                      Icons.check_rounded,
                      size: 16,
                      color: _textoLegible(color, color),
                    )
                  : null,
            ),
          ),
      ],
    );
  }
}

/// Texto legible (oscuro o blanco) sobre la mezcla de dos colores.
Color _textoLegible(Color a, Color b) {
  final luminancia = (a.computeLuminance() + b.computeLuminance()) / 2;
  return luminancia > 0.5 ? const Color(0xFF17181C) : Colors.white;
}
