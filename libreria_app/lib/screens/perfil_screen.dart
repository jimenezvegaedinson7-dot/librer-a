import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/usuario.dart';
import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../services/storage_service.dart';
import '../utils/app_colors.dart';
import '../utils/avatar_generator.dart';
import '../utils/constants.dart';
import '../widgets/app_page_header.dart';
import 'login_screen.dart';
import 'reservas_screen.dart';
import 'security/cambiar_password_screen.dart';
import 'security/editar_perfil_screen.dart';
import 'security/two_factor_disable_screen.dart';
import 'security/two_factor_setup_screen.dart';

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

  @override
  void initState() {
    super.initState();
    _cargarLocal();
    _refrescarPerfil();
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

  Future<void> _misReservas() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(builder: (_) => const ReservasScreen()),
    );
  }

  /// Muestra el selector de foto: avatar predefinido, galería o cámara.
  Future<void> _cambiarFoto() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
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
                    ?.copyWith(color: AppColors.textSecondary),
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
                    ?.copyWith(color: AppColors.textSecondary),
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
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _refrescarPerfil,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              AppPageHeader(
                eyebrow: 'Cuenta personal',
                title: 'Mi perfil',
                subtitle: 'Datos, seguridad y preferencias de tu cuenta.',
                trailing: _refreshing
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    : null,
              ),
              const SizedBox(height: 24),

              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryDark.withValues(alpha: 0.18),
                      blurRadius: 18,
                      offset: const Offset(0, 7),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: _cambiarFoto,
                      child: SizedBox(
                        width: 92,
                        height: 92,
                        child: Stack(
                          children: [
                            Center(child: _Avatar(usuario: usuario)),
                            Positioned(
                              right: 0,
                              bottom: 0,
                              child: Container(
                                width: 30,
                                height: 30,
                                decoration: BoxDecoration(
                                  color: AppColors.gold,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: AppColors.primary,
                                    width: 2,
                                  ),
                                ),
                                child: const Icon(
                                  Icons.photo_camera_rounded,
                                  size: 15,
                                  color: AppColors.primaryDark,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            usuario?.nombreCompleto ?? 'Cliente',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                            ),
                          ),
                          if (usuario?.email != null) ...[
                            const SizedBox(height: 5),
                            Text(
                              usuario!.email!,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: textTheme.bodySmall?.copyWith(
                                color: Colors.white.withValues(alpha: 0.72),
                              ),
                            ),
                          ],
                          const SizedBox(height: 10),
                          Text(
                            'Toca la foto para actualizarla',
                            style: textTheme.labelSmall?.copyWith(
                              color: AppColors.gold,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Datos
              Card(
                color: AppColors.surface,
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
                    _divider(),
                    _row(
                      context,
                      Icons.badge_outlined,
                      'Rol',
                      _formatRol(usuario?.rol),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Acciones del perfil
              _sectionTitle(textTheme, 'Cuenta'),
              const SizedBox(height: 8),
              Card(
                color: AppColors.surface,
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
                      icon: Icons.event_note_outlined,
                      label: 'Mis reservas',
                      onTap: _misReservas,
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
                      trailing: _twoFactorEnabled
                          ? const Icon(
                              Icons.check_circle_rounded,
                              color: AppColors.success,
                              size: 20,
                            )
                          : null,
                      onTap: _twoFactorEnabled
                          ? _desactivarTwoFactor
                          : _activarTwoFactor,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Cerrar sesión
              SizedBox(
                height: 54,
                child: OutlinedButton.icon(
                  onPressed: _confirmarCierre,
                  icon: Icon(Icons.logout_rounded, color: AppColors.error),
                  label: Text(
                    'Cerrar sesión',
                    style: textTheme.titleMedium?.copyWith(
                      color: AppColors.error,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(TextTheme textTheme, String title) {
    return Text(
      title,
      style: textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.w600,
        color: AppColors.textSecondary,
      ),
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
      leading: Icon(icon, color: AppColors.primary),
      title: Text(label),
      trailing: trailing ?? const Icon(Icons.chevron_right_rounded),
      onTap: onTap,
    );
  }

  String _formatRol(String? rol) {
    if (rol == null || rol.isEmpty) return '—';
    final lower = rol.toLowerCase();
    switch (lower) {
      case 'administrador':
        return 'Administrador';
      case 'cliente':
        return 'Cliente';
      default:
        return rol[0].toUpperCase() + rol.substring(1);
    }
  }

  Widget _row(BuildContext context, IconData icon, String label, String value) {
    return ListTile(
      leading: Icon(icon, color: AppColors.primary),
      title: Text(
        label,
        style: Theme.of(context).textTheme.bodySmall
            ?.copyWith(color: AppColors.textSecondary),
      ),
      subtitle: Text(
        value,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.bodyMedium
            ?.copyWith(fontWeight: FontWeight.w500),
      ),
    );
  }

  Widget _divider() => const Divider(height: 1, indent: 56);
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
        color: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(color: AppColors.divider),
        ),
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
                    color: AppColors.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, size: 19, color: AppColors.primaryDark),
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
                  color: AppColors.textTertiary,
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
  const _Avatar({this.usuario});

  @override
  Widget build(BuildContext context) {
    final foto = usuario?.fotoPerfil;
    final url = foto == null || foto.trim().isEmpty
        ? ''
        : Constants.buildPerfilUrl(foto);

    if (url.isEmpty) {
      return _Iniciales(usuario: usuario);
    }
    return ClipOval(
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
            return _Iniciales(usuario: usuario);
          },
          errorBuilder: (context, error, stackTrace) =>
              _Iniciales(usuario: usuario),
        ),
      ),
    );
  }
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
      radius: 41,
      backgroundColor: AppColors.primaryContainer,
      child: Text(
        _iniciales(),
        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
          color: AppColors.primaryDark,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
