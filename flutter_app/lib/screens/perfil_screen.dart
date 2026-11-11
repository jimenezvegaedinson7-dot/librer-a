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
import '../utils/app_tokens.dart';
import '../utils/avatar_generator.dart';
import '../utils/constants.dart';
import '../utils/perfil_fondos.dart';
import '../utils/perfil_temas.dart';
import '../widgets/aparecer.dart';
import 'personalizacion_screen.dart';
import '../widgets/estado_chip.dart';
import '../widgets/estanteria.dart';
import '../widgets/presionable.dart';
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
const _profileBorder = Color(0xFFE7DFD3);
Color get _profileSurface => AppColors.surface;
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
  bool _subiendoFoto = false;
  bool _perfilServidorRecibido = false;
  int _revisionPerfil = 0;
  int _refrescoActivoRevision = 0;
  String _temaId = perfilTemaDefaultId;

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
    super.dispose();
  }

  /// Mantiene el tema local sincronizado con el controlador global.
  void _syncTema() {
    if (mounted) {
      setState(() => _temaId = TemaController.instance.id);
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

  Future<void> _editarPerfil() async {
    final usuario = _usuario;
    if (usuario == null) return;
    // Una lectura iniciada antes de editar no debe restaurar los datos viejos.
    _revisionPerfil++;
    final guardado = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => EditarPerfilScreen(usuario: usuario),
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

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mi perfil'),
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
        bottom: false,
        child: RefreshIndicator(
          color: AppColors.primary,
          backgroundColor: _profileSurface,
          onRefresh: _refrescarPerfil,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 720),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
                children: [
                  Aparecer(child: _buildPortada(context, usuario)),

                  const SizedBox(height: 16),

                  // Accesos rápidos
                  Aparecer(
                    indice: 1,
                    child: Row(
                      children: [
                        Expanded(
                          child: _AccesoRapido(
                            icon: Icons.shopping_bag_outlined,
                            label: 'Mis compras',
                            onTap: _misCompras,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _AccesoRapido(
                            icon: Icons.favorite_outline_rounded,
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
                          Icons.mail_outline_rounded,
                          'Correo',
                          usuario?.email ?? '—',
                        ),
                        _divider(),
                        _row(
                          context,
                          Icons.call_outlined,
                          'Teléfono',
                          usuario?.telefono ?? '—',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  _sectionTitle(
                    textTheme,
                    'Apariencia',
                    detalle: 'Botones, tarjetas y fondo: cada preferencia se guarda por separado.',
                  ),
                  const SizedBox(height: 10),
                  _profileCard(
                    child: Column(
                      children: [
                        _actionTile(
                          context,
                          icon: Icons.palette_outlined,
                          label: 'Personalización',
                          detalle:
                              '${_tema.nombre} · ${TemaController.instance.fondo.nombre} · ${TemaController.instance.tarjeta.nombre}',
                          trailing: _MuestraApariencia(
                            fondo: TemaController.instance.fondo,
                            tarjeta: TemaController.instance.tarjeta,
                            tema: _tema,
                          ),
                          onTap: () async {
                            await Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => const PersonalizacionScreen(),
                              ),
                            );
                            if (mounted) setState(() {});
                          },
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Seguridad y cuenta
                  _sectionTitle(textTheme, 'Cuenta y seguridad'),
                  const SizedBox(height: 10),
                  _profileCard(
                    child: Column(
                      children: [
                        _actionTile(
                          context,
                          icon: Icons.manage_accounts_outlined,
                          label: 'Editar perfil',
                          onTap: _editarPerfil,
                        ),
                        _divider(),
                        _actionTile(
                          context,
                          icon: Icons.key_outlined,
                          label: 'Cambiar contraseña',
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
                          icon: Icons.gavel_outlined,
                          label: 'Términos y Condiciones',
                          onTap: _terminos,
                        ),
                        _divider(),
                        _actionTile(
                          context,
                          icon: Icons.policy_outlined,
                          label: 'Política de Privacidad',
                          onTap: _privacidad,
                        ),
                        _divider(),
                        _actionTile(
                          context,
                          icon: Icons.auto_stories_outlined,
                          label: 'Libro de Reclamaciones',
                          onTap: _libroReclamaciones,
                        ),
                        _divider(),
                        _actionTile(
                          context,
                          icon: Icons.no_accounts_outlined,
                          label: 'Eliminar mi cuenta',
                          onTap: _eliminarCuenta,
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
        ),
      ),
    );
  }

  /// Cabecera de AccountView: foto, identidad y degradado editorial.
  Widget _buildPortada(BuildContext context, Usuario? usuario) {
    final textTheme = Theme.of(context).textTheme;
    final tinta = _tema.textColor;
    final foto = Semantics(
      button: true,
      label: 'Opciones de foto de perfil',
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: _subiendoFoto ? null : _cambiarFoto,
          child: SizedBox(
            width: 92,
            height: 92,
            child: Stack(
              children: [
                Center(
                  child: _Avatar(usuario: usuario, anillo: Colors.white),
                ),
                if (_subiendoFoto)
                  const Positioned.fill(
                    child: Center(
                      child: CircularProgressIndicator(color: Colors.white),
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
                      border: Border.all(color: Colors.white, width: 2),
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
    );
    Widget identidad = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          usuario?.nombreCompleto ?? 'Mi perfil',
          key: const ValueKey('nombre-perfil'),
          style: AppTheme.serif(fontSize: 22, color: tinta, height: 1.2),
        ),
        const SizedBox(height: 6),
        Text(
          usuario?.email ?? '',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: textTheme.bodyMedium?.copyWith(
            color: tinta.withValues(alpha: 0.9),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          usuario?.fotoPerfil?.trim().isNotEmpty == true
              ? 'Toca la foto para verla o cambiarla'
              : 'Toca la foto para actualizarla',
          style: textTheme.labelSmall?.copyWith(
            color: tinta.withValues(alpha: 0.9),
          ),
        ),
      ],
    );
    // Una combinación propia puede mezclar blanco y negro: un solo color de
    // texto no alcanza contraste en ambos extremos. Proteger solo la identidad.
    double contraste(Color fondo) {
      final a = tinta.computeLuminance(), b = fondo.computeLuminance();
      return ((a > b ? a : b) + 0.05) / ((a > b ? b : a) + 0.05);
    }

    if (contraste(_tema.inicio) < 4.5 || contraste(_tema.fin) < 4.5) {
      identidad = Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: tinta == Colors.white
              ? Colors.black.withValues(alpha: 0.72)
              : Colors.white.withValues(alpha: 0.94),
          borderRadius: BorderRadius.circular(10),
        ),
        child: identidad,
      );
    }
    return AnimatedContainer(
      key: const ValueKey('identidad-perfil'),
      duration: reducirMovimiento(context)
          ? Duration.zero
          : const Duration(milliseconds: 350),
      decoration: BoxDecoration(
        gradient: _tema.gradiente,
        borderRadius: BorderRadius.circular(18),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: IgnorePointer(
              child: EstanteriaAnimada(
                tinta: tinta,
                acento: AppColors.doradoClaro,
                opacidad: tinta == Colors.white ? 0.05 : 0.035,
                altoBalda: 64,
                semilla: 5,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: LayoutBuilder(
              builder: (context, c) {
                if (c.maxWidth < 230 ||
                    (c.maxWidth < 300 &&
                        MediaQuery.textScalerOf(context).scale(14) > 19)) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [foto, const SizedBox(height: 16), identidad],
                  );
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    foto,
                    const SizedBox(width: 18),
                    Expanded(child: identidad),
                  ],
                );
              },
            ),
          ),
        ],
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
    String? detalle,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 14),
      leading: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: _profileSoft,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.12)),
        ),
        child: Icon(icon, size: 20, color: AppColors.primary),
      ),
      title: Text(
        label,
        style: TextStyle(color: _profileInk, fontWeight: FontWeight.w600),
      ),
      subtitle: detalle == null
          ? null
          : Text(
              detalle,
              style: TextStyle(color: _profileMuted, fontSize: 12.5),
            ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ?trailing,
          const SizedBox(width: 4),
          Icon(Icons.chevron_right_rounded, color: _profileMuted),
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
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _profileBorder),
      ),
      child: Material(color: Colors.transparent, child: child),
    );
  }

  Widget _row(BuildContext context, IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Icon(icon, size: 22, color: AppColors.gold),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.bodySmall
                      ?.copyWith(color: _profileMuted),
                ),
                const SizedBox(height: 2),
                Text(
                  value.trim().isEmpty ? '—' : value,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                    color: _profileInk,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _divider() =>
      const Divider(height: 1, indent: 64, color: _profileBorder);
}

/// Acceso rápido del perfil (compras y favoritos).
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
                  width: 48,
                  height: 48,
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
                  maxLines: 3,
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

/// Apariencia en miniatura: fondo, tarjeta y acento de botones.
class _MuestraApariencia extends StatelessWidget {
  final FondoApp fondo;
  final TarjetaApp tarjeta;
  final PerfilTema tema;
  const _MuestraApariencia({
    required this.fondo,
    required this.tarjeta,
    required this.tema,
  });

  @override
  Widget build(BuildContext context) => Container(
    width: 34,
    height: 30,
    padding: const EdgeInsets.all(5),
    decoration: BoxDecoration(
      color: fondo.fondo,
      borderRadius: BorderRadius.circular(7),
      border: Border.all(color: AppColors.dividerStrong),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: tarjeta.color,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        ),
        const SizedBox(height: 3),
        Container(
          height: 5,
          decoration: BoxDecoration(
            color: tema.colorPrincipal,
            borderRadius: BorderRadius.circular(999),
          ),
        ),
      ],
    ),
  );
}
