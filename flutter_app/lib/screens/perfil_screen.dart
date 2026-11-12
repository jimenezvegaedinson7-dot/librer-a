import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'libro_reclamaciones_screen.dart';
import '../models/usuario.dart';
import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../services/storage_service.dart';
import '../services/tema_controller.dart';
import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import '../utils/avatar_generator.dart';
import '../utils/constants.dart';
import '../utils/perfil_fondos.dart';
import 'personalizacion_screen.dart';
import 'carrito_screen.dart';
import 'login_screen.dart';
import 'mis_compras_screen.dart';
import 'favoritos_screen.dart';
import 'security/cambiar_password_screen.dart';
import 'security/editar_perfil_screen.dart';
import 'security/eliminar_cuenta_screen.dart';
import 'security/two_factor_disable_screen.dart';
import 'security/two_factor_setup_screen.dart';
import 'legal/politica_privacidad_screen.dart';
import 'legal/terminos_condiciones_screen.dart';

// Siguen al tema de colores elegido (ver AppColors).
Color get _profileInk => AppColors.textPrimary;
Color get _profileMuted => AppColors.textSecondary;
const _profileBorder = Color(0xFFE9EDEF);
Color get _profileSurface => AppColors.surface;
const _profileSoft = Color(0xFFF0F2F5);
Color get _profileAccent => AppColors.primaryDark;

/// Pantalla de perfil del cliente.
///
/// Muestra los datos, permite editar perfil/foto/contraseña y gestionar el
/// doble factor (Google Authenticator). El estado 2FA se obtiene de
/// `GET /usuarios/perfil` (`two_factor_enabled`); si una respuesta anterior no
/// lo incluye, se conserva el valor local guardado durante el login.
class PerfilScreen extends StatefulWidget {
  final bool embedded;
  final bool activa;
  const PerfilScreen({super.key, this.embedded = false, this.activa = true});

  @override
  State<PerfilScreen> createState() => _PerfilScreenState();
}

class _PerfilScreenState extends State<PerfilScreen> {
  Usuario? _usuario;
  bool _twoFactorEnabled = false;
  bool _refreshing = false;
  bool _subiendoFoto = false;
  bool _perfilServidorRecibido = false;
  int _revisionPerfil = 0;
  int _refrescoActivoRevision = 0;

  @override
  void initState() {
    super.initState();
    TemaController.instance.addListener(_syncTema);
    _cargarLocal();
    if (widget.activa) _refrescarPerfil();
  }

  @override
  void didUpdateWidget(covariant PerfilScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.activa && !oldWidget.activa) _refrescarPerfil();
  }

  @override
  void dispose() {
    TemaController.instance.removeListener(_syncTema);
    super.dispose();
  }

  /// Mantiene el tema local sincronizado con el controlador global.
  void _syncTema() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _cargarLocal() async {
    final generacion = StorageService.instance.generacion;
    final usuario = await StorageService.instance.obtenerUsuario();
    if (usuario != null &&
        mounted &&
        generacion == StorageService.instance.generacion &&
        !_perfilServidorRecibido) {
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
  Future<void> _refrescarPerfil({bool forzar = false}) async {
    if ((_refreshing && !forzar) || _subiendoFoto) return;
    final revision = ++_revisionPerfil;
    _refrescoActivoRevision = revision;
    final generacion = StorageService.instance.generacion;
    if (mounted) setState(() => _refreshing = true);
    try {
      final perfil = await ApiService.instance.obtenerPerfil();
      if (!mounted ||
          generacion != StorageService.instance.generacion ||
          revision != _revisionPerfil) {
        return;
      }
      _perfilServidorRecibido = true;
      final twoFaServidor = perfil.twoFactorEnabled;
      final perfilConTwoFa = perfil.copyWith(
        twoFactorEnabled: twoFaServidor ?? _twoFactorEnabled,
      );
      await StorageService.instance.guardarUsuario(
        perfilConTwoFa,
        generacionEsperada: generacion,
      );
      if (mounted &&
          generacion == StorageService.instance.generacion &&
          revision == _revisionPerfil) {
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
      if (mounted && _refrescoActivoRevision == revision) {
        setState(() => _refreshing = false);
      }
    }
  }

  Future<void> _cerrarSesion() async {
    // El carrito pertenece a la sesión: al salir no debe quedar nada de esta
    // cuenta para la siguiente que inicie sesión.
    CarritoService.instance.vaciarSesion();
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

  Future<void> _editarPerfil(CampoPerfil campo) async {
    final usuario = _usuario;
    if (usuario == null) return;
    // Una lectura iniciada antes de editar no debe restaurar los datos viejos.
    _revisionPerfil++;
    final guardado = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => EditarPerfilScreen(usuario: usuario, campo: campo),
      ),
    );
    if (guardado == true && mounted) {
      final generacion = StorageService.instance.generacion;
      final actualizado = await StorageService.instance.obtenerUsuario();
      if (!mounted || generacion != StorageService.instance.generacion) return;
      if (actualizado != null) {
        _perfilServidorRecibido = true;
        setState(() => _usuario = actualizado);
      }
      await _refrescarPerfil(forzar: true);
    }
  }

  Future<void> _cambiarPassword() async {
    await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => const CambiarPasswordScreen()),
    );
  }

  Future<void> _eliminarCuenta() async {
    final eliminada = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => const EliminarCuentaScreen()),
    );
    if (eliminada != true || !mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Tu cuenta fue eliminada.')));
    await _cerrarSesion();
  }

  /// Dentro de la app y con los datos de la cuenta ya completados.
  Future<void> _libroReclamaciones() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const LibroReclamacionesScreen()),
    );
  }

  Future<void> _misCompras() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const MisComprasScreen()),
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
    if (_subiendoFoto) return;
    final foto = _usuario?.fotoPerfil;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: _profileSurface,
      builder: (sheetContext) => SafeArea(
        child: SingleChildScrollView(
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
              if (foto != null && foto.trim().isNotEmpty)
                _SheetOption(
                  icon: Icons.visibility_outlined,
                  label: 'Ver imagen',
                  onTap: () {
                    Navigator.of(sheetContext).pop();
                    Navigator.of(context).push<void>(
                      MaterialPageRoute<void>(
                        builder: (_) => _FotoPerfilScreen(
                          url: Constants.buildPerfilUrl(foto),
                        ),
                      ),
                    );
                  },
                ),
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
    final generacion = StorageService.instance.generacion;
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

    if (seleccionado == null ||
        !mounted ||
        generacion != StorageService.instance.generacion) {
      return;
    }
    await _subirAvatar(seleccionado);
  }

  /// Genera el PNG del avatar en runtime y lo sube como foto de perfil.
  Future<void> _subirAvatar(AvatarPreset preset) async {
    final generacion = StorageService.instance.generacion;
    try {
      final bytes = await generarAvatarPng(preset);
      if (!mounted || generacion != StorageService.instance.generacion) return;
      final nombre = 'avatar_${DateTime.now().millisecondsSinceEpoch}.png';
      await _subirBytes(bytes, nombre);
    } catch (_) {
      if (mounted) _toast('No se pudo generar el avatar.');
    }
  }

  /// Selecciona una imagen desde la galería o cámara y la sube.
  Future<void> _seleccionarImagen(ImageSource source) async {
    final generacion = StorageService.instance.generacion;
    final picker = ImagePicker();
    try {
      final xfile = await picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (xfile == null ||
          !mounted ||
          generacion != StorageService.instance.generacion) {
        return;
      }

      final bytes = await xfile.readAsBytes();
      if (bytes.length > 5 * 1024 * 1024) {
        _toast('La imagen supera el tamaño máximo de 5 MB.');
        return;
      }
      if (!mounted || generacion != StorageService.instance.generacion) return;

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
    if (_subiendoFoto || !mounted) return;
    final generacion = StorageService.instance.generacion;
    _revisionPerfil++;
    setState(() => _subiendoFoto = true);
    try {
      final usuario = await ApiService.instance.subirFotoPerfil(
        bytes: bytes,
        fileName: fileName,
      );
      if (mounted && generacion == StorageService.instance.generacion) {
        _perfilServidorRecibido = true;
        setState(() => _usuario = usuario);
        _toast('Foto de perfil actualizada.');
      }
    } on ApiException catch (e) {
      if (mounted && generacion == StorageService.instance.generacion) {
        _toast(e.message);
      }
    } catch (_) {
      if (mounted && generacion == StorageService.instance.generacion) {
        _toast('No se pudo actualizar la foto.');
      }
    } finally {
      if (mounted) setState(() => _subiendoFoto = false);
    }
  }

  Future<void> _activarTwoFactor() async {
    _revisionPerfil++;
    final activado = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => const TwoFactorSetupScreen()),
    );
    if (activado == true && mounted) {
      await _actualizarTwoFactor(true);
    }
  }

  Future<void> _desactivarTwoFactor() async {
    _revisionPerfil++;
    final resultado = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(builder: (_) => const TwoFactorDisableScreen()),
    );
    if (resultado == true && mounted) {
      await _actualizarTwoFactor(false);
    }
  }

  Future<void> _actualizarTwoFactor(bool activo) async {
    final generacion = StorageService.instance.generacion;
    final actualizado = _usuario?.copyWith(twoFactorEnabled: activo);
    setState(() {
      _twoFactorEnabled = activo;
      _usuario = actualizado;
    });
    if (actualizado != null) {
      await StorageService.instance.guardarUsuario(
        actualizado,
        generacionEsperada: generacion,
      );
    }
    if (mounted && generacion == StorageService.instance.generacion) {
      await _refrescarPerfil(forzar: true);
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
    final fondo = TemaController.instance.fondo.id == fondoDefaultId
        ? const Color(0xFFF7F8FA)
        : AppColors.background;

    return Scaffold(
      backgroundColor: fondo,
      appBar: AppBar(
        automaticallyImplyLeading: !widget.embedded,
        backgroundColor: fondo,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        title: Text(
          'Mi perfil',
          style: TextStyle(
            fontFamily: AppTheme.fontSans,
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: _profileInk,
          ),
        ),
        actions: [
          if (_refreshing)
            const Padding(
              padding: EdgeInsets.all(18),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
        ],
      ),
      body: SafeArea(
        top: false,
        bottom: !widget.embedded,
        child: RefreshIndicator(
          color: _profileAccent,
          backgroundColor: _profileSurface,
          onRefresh: _refrescarPerfil,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                children: [
                  _buildPortada(context, usuario),
                  _profileCard(
                    child: Column(
                      children: [
                        _row(
                          context,
                          'Nombre',
                          usuario?.nombreCompleto ?? 'Mi perfil',
                          valueKey: const ValueKey('nombre-perfil'),
                          campo: CampoPerfil.nombre,
                        ),
                        _divider(),
                        _row(
                          context,
                          'Correo',
                          usuario?.email ?? '—',
                          campo: CampoPerfil.correo,
                        ),
                        _divider(),
                        _row(
                          context,
                          'Teléfono',
                          usuario?.telefono ?? '—',
                          campo: CampoPerfil.telefono,
                        ),
                      ],
                    ),
                  ),

                  _sectionTitle(textTheme, 'Ajustes'),
                  _profileCard(
                    child: Column(
                      children: [
                        _actionTile(
                          context,
                          icon: Icons.palette_outlined,
                          label: 'Personalización',
                          detalle: 'Botones, tarjetas y fondo',
                          onTap: () async {
                            await Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => const PersonalizacionScreen(),
                              ),
                            );
                            if (mounted) setState(() {});
                          },
                        ),
                        _divider(),
                        _actionTile(
                          context,
                          icon: Icons.key_outlined,
                          label: 'Cambiar contraseña',
                          detalle: 'Protege el acceso a tu cuenta',
                          onTap: _cambiarPassword,
                        ),
                        _divider(),
                        _actionTile(
                          context,
                          icon: _twoFactorEnabled
                              ? Icons.verified_user_outlined
                              : Icons.gpp_maybe_outlined,
                          label: _twoFactorEnabled
                              ? 'Desactivar doble factor'
                              : 'Activar doble factor',
                          detalle: _twoFactorEnabled
                              ? 'Verificación en dos pasos activada'
                              : 'Añade una capa de seguridad',
                          onTap: _twoFactorEnabled
                              ? _desactivarTwoFactor
                              : _activarTwoFactor,
                        ),
                      ],
                    ),
                  ),

                  _sectionTitle(textTheme, 'Tus libros'),
                  _profileCard(
                    child: Column(
                      children: [
                        _actionTile(
                          context,
                          icon: Icons.shopping_bag_outlined,
                          label: 'Mis compras',
                          detalle: 'Pedidos y seguimiento',
                          onTap: _misCompras,
                        ),
                        _actionTile(
                          context,
                          icon: Icons.favorite_border_rounded,
                          label: 'Mis favoritos',
                          detalle: 'Libros guardados',
                          onTap: _misFavoritos,
                        ),
                        _actionTile(
                          context,
                          icon: Icons.shopping_cart_outlined,
                          label: 'Mi carrito',
                          onTap: () => Navigator.of(context).push<void>(
                            MaterialPageRoute<void>(
                              builder: (_) => const CarritoScreen(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  _sectionTitle(textTheme, 'Ayuda'),
                  _profileCard(
                    child: Column(
                      children: [
                        _actionTile(
                          context,
                          icon: Icons.gavel_outlined,
                          label: 'Términos y Condiciones',
                          onTap: _terminos,
                        ),
                        _actionTile(
                          context,
                          icon: Icons.policy_outlined,
                          label: 'Política de Privacidad',
                          onTap: _privacidad,
                        ),
                        _actionTile(
                          context,
                          icon: Icons.auto_stories_outlined,
                          label: 'Libro de Reclamaciones',
                          onTap: _libroReclamaciones,
                        ),
                      ],
                    ),
                  ),

                  _sectionTitle(textTheme, 'Cuenta'),
                  _profileCard(
                    child: Column(
                      children: [
                        _actionTile(
                          context,
                          icon: Icons.logout_rounded,
                          label: 'Cerrar sesión',
                          onTap: _confirmarCierre,
                        ),
                        _actionTile(
                          context,
                          icon: Icons.delete_outline_rounded,
                          label: 'Eliminar mi cuenta',
                          onTap: _eliminarCuenta,
                          color: AppColors.error,
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

  Widget _buildPortada(BuildContext context, Usuario? usuario) {
    return Padding(
      key: const ValueKey('identidad-perfil'),
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
      child: Column(
        children: [
          SizedBox(
            width: 128,
            height: 128,
            child: Stack(
              children: [
                Center(
                  child: Semantics(
                    label: 'Opciones de foto de perfil',
                    button: true,
                    child: Material(
                      color: Colors.transparent,
                      shape: const CircleBorder(),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: _subiendoFoto ? null : _cambiarFoto,
                        child: _Avatar(usuario: usuario),
                      ),
                    ),
                  ),
                ),
                if (_subiendoFoto)
                  Positioned.fill(
                    child: Center(
                      child: CircularProgressIndicator(
                        color: _profileAccent,
                        semanticsLabel: 'Actualizando foto',
                      ),
                    ),
                  ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: IconButton.filled(
                    tooltip: 'Cambiar foto de perfil',
                    onPressed: _subiendoFoto ? null : _cambiarFoto,
                    style: IconButton.styleFrom(
                      backgroundColor: _profileAccent,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(48, 48),
                    ),
                    icon: const Icon(Icons.photo_camera_rounded, size: 24),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: _subiendoFoto ? null : _cambiarFoto,
            style: TextButton.styleFrom(foregroundColor: _profileAccent),
            child: const Text('Cambiar foto'),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(TextTheme textTheme, String title) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(2, 28, 2, 12),
          child: Text(
            title,
            style: textTheme.bodyMedium?.copyWith(
              color: _profileInk,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  Widget _actionTile(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color? color,
    String? detalle,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
      minLeadingWidth: 24,
      horizontalTitleGap: 12,
      leading: Icon(icon, size: 24, color: color ?? _profileMuted),
      title: Text(
        label,
        style: TextStyle(
          fontFamily: AppTheme.fontSans,
          fontSize: 16,
          color: color ?? _profileInk,
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: detalle == null
          ? null
          : Text(
              detalle,
              style: TextStyle(color: _profileMuted, fontSize: 13, height: 1.4),
            ),
      onTap: onTap,
    );
  }

  Widget _profileCard({required Widget child}) {
    return Material(
      color: _profileSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: _profileBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }

  Widget _row(
    BuildContext context,
    String label,
    String value, {
    Key? valueKey,
    required CampoPerfil campo,
  }) {
    final editar = switch (campo) {
      CampoPerfil.nombre => 'Editar nombre',
      CampoPerfil.correo => 'Editar correo',
      CampoPerfil.telefono => 'Editar teléfono',
    };
    final icon = switch (campo) {
      CampoPerfil.nombre => Icons.person_outline_rounded,
      CampoPerfil.correo => Icons.mail_outline_rounded,
      CampoPerfil.telefono => Icons.call_outlined,
    };
    return InkWell(
      key: ValueKey('editar-${campo.name}'),
      onTap: _usuario == null ? null : () => _editarPerfil(campo),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Icon(icon, size: 24, color: _profileMuted),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: Theme.of(context).textTheme.bodySmall
                        ?.copyWith(color: _profileMuted),
                  ),
                ),
                const SizedBox(width: 14),
                IconButton(
                  tooltip: editar,
                  onPressed: _usuario == null
                      ? null
                      : () => _editarPerfil(campo),
                  icon: Icon(
                    Icons.edit_outlined,
                    size: 20,
                    color: _profileAccent,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              value.trim().isEmpty ? '—' : value,
              key: valueKey,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: _profileInk,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _divider() => const Divider(
    height: 1,
    indent: 18,
    endIndent: 18,
    color: _profileBorder,
  );
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
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 54),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
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

  const _Avatar({this.usuario});

  @override
  Widget build(BuildContext context) {
    final foto = usuario?.fotoPerfil;
    final url = foto == null || foto.trim().isEmpty
        ? ''
        : Constants.buildPerfilUrl(foto);

    return url.isEmpty
        ? _Iniciales(usuario: usuario)
        : ClipOval(
            child: SizedBox(
              width: 128,
              height: 128,
              child: Image.network(
                url,
                key: ValueKey<String>(url),
                fit: BoxFit.cover,
                width: 128,
                height: 128,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return _Iniciales(usuario: usuario);
                },
                errorBuilder: (context, error, stackTrace) =>
                    _Iniciales(usuario: usuario),
              ),
            ),
          );
  }
}

class _FotoPerfilScreen extends StatefulWidget {
  final String url;
  const _FotoPerfilScreen({required this.url});

  @override
  State<_FotoPerfilScreen> createState() => _FotoPerfilScreenState();
}

class _FotoPerfilScreenState extends State<_FotoPerfilScreen> {
  int _intento = 0;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Foto de perfil')),
    body: SafeArea(
      child: Column(
        children: [
          Expanded(
            child: InteractiveViewer(
              minScale: 1,
              maxScale: 5,
              child: SizedBox.expand(
                child: Image.network(
                  widget.url,
                  key: ValueKey(_intento),
                  fit: BoxFit.contain,
                  semanticLabel: 'Foto de perfil ampliada',
                  loadingBuilder: (context, child, progreso) => progreso == null
                      ? child
                      : const Center(child: CircularProgressIndicator()),
                  errorBuilder: (context, error, stackTrace) => Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.broken_image_outlined, size: 48),
                          const SizedBox(height: 12),
                          const Text('No se pudo cargar la foto.'),
                          TextButton.icon(
                            onPressed: () => setState(() => _intento++),
                            icon: const Icon(Icons.refresh_rounded),
                            label: const Text('Reintentar'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Separa dos dedos para ampliar la imagen.'),
          ),
        ],
      ),
    ),
  );
}

class _Iniciales extends StatelessWidget {
  final Usuario? usuario;

  const _Iniciales({this.usuario});

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
      radius: 64,
      backgroundColor: _profileSoft,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: FittedBox(
          child: Text(
            _iniciales(),
            style: TextStyle(
              fontFamily: AppTheme.fontSans,
              fontSize: 48,
              color: _profileMuted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}
