import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../services/storage_service.dart';
import '../utils/app_colors.dart';
import '../widgets/app_logo.dart';
import '../widgets/comprobador_actualizacion.dart';
import '../widgets/error_banner.dart';
import '../widgets/estanteria.dart';
import 'home_screen.dart';
import 'recuperar_contrasena_screen.dart';
import 'registro_screen.dart';
import 'security/two_factor_verify_screen.dart';
import 'verificacion_email_screen.dart';

/// Pantalla de acceso con identidad editorial de la librería.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Siguen al tema y al fondo elegidos (ver AppColors).
  static Color get _background => AppColors.background;
  static Color get _surface => AppColors.surface;
  static Color get _ink => AppColors.textPrimary;
  static Color get _muted => AppColors.textSecondary;
  static Color get _gold => AppColors.gold;
  static const _border = Color(0xFFE7DFD3);

  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    // Aviso de nueva versión del APK (una vez por arranque de la app).
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => ComprobadorActualizacion.comprobar(context),
    );
    _cargarVerificacionPendiente();
  }

  /// Correo registrado que aún no verificó su código (si lo hay).
  String? _verificacionPendiente;

  Future<void> _cargarVerificacionPendiente() async {
    final email = await StorageService.instance.obtenerVerificacionPendiente();
    if (mounted && email != null) {
      setState(() => _verificacionPendiente = email);
    }
  }

  bool _loading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_loading) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _errorMessage = null;
    });

    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _loading = true);
    try {
      final resultado = await ApiService.instance.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      if (!mounted) return;

      // Si el cliente tiene 2FA activo, pedimos el código OTP.
      if (resultado.requiere2fa) {
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => TwoFactorVerifyScreen(
              twoFactorToken: resultado.twoFactorToken!,
            ),
          ),
        );
        return;
      }

      // El carrito pertenece a la sesión anterior: al autenticar con otra
      // cuenta (o la misma después de un logout), se empieza con el carrito
      // vacío para no mezclar datos entre usuarios.
      CarritoService.instance.vaciarSesion();
      ApiService.instance.limpiarEstadoCheckout();
      await StorageService.instance.limpiarVerificacionPendiente();
      if (!mounted) return;

      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute<void>(builder: (_) => const HomeScreen()),
        (route) => false,
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _errorMessage = e.message);
      if (mounted && e.requiereVerificacion) {
        final email = _emailController.text.trim();
        await StorageService.instance.guardarVerificacionPendiente(email);
        if (mounted) setState(() => _verificacionPendiente = email);
        await _openVerificar();
      }
    } catch (_) {
      if (mounted) {
        setState(() => _errorMessage = 'Ocurrió un error. Inténtalo de nuevo.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openRegistro() async {
    final emailRegistrado = await Navigator.of(context).push<String>(
      MaterialPageRoute<String>(builder: (_) => const RegistroScreen()),
    );
    // Precarga el correo recién registrado si se devuelve desde el registro.
    if (emailRegistrado != null && emailRegistrado.isNotEmpty) {
      _emailController.text = emailRegistrado;
    }
  }

  Future<void> _openRecuperar() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => const RecuperarContrasenaScreen(),
      ),
    );
  }

  Future<void> _openVerificar() async {
    var email = _emailController.text.trim();
    if (email.isEmpty) email = _verificacionPendiente ?? '';
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      setState(
        () => _errorMessage = 'Ingresa tu correo para retomar la verificación.',
      );
      return;
    }
    final verificado = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => VerificacionEmailScreen(email: email),
      ),
    );
    if (mounted && verificado == true) {
      setState(() {
        _errorMessage = null;
        _verificacionPendiente = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: _background,
      body: FondoEstanteria(
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(28, 28, 28, 24),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: (constraints.maxHeight - 52).clamp(
                      0,
                      double.infinity,
                    ),
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Center(
                              child: AppLogo(width: 170, height: 126),
                            ),
                            const SizedBox(height: 22),
                            Text(
                              'Bienvenido',
                              textAlign: TextAlign.center,
                              style: textTheme.headlineLarge?.copyWith(
                                color: _ink,
                                fontSize: 36,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Ingresa a tu cuenta para continuar.',
                              textAlign: TextAlign.center,
                              style: textTheme.bodyMedium?.copyWith(
                                color: _muted,
                                height: 1.45,
                              ),
                            ),
                            const SizedBox(height: 32),

                            Text(
                              'Correo electrónico',
                              style: textTheme.titleSmall?.copyWith(
                                color: _ink,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              autocorrect: false,
                              cursorColor: _gold,
                              style: TextStyle(color: _ink),
                              inputFormatters: [
                                FilteringTextInputFormatter.deny(RegExp(r'\s')),
                              ],
                              decoration: _inputDecoration(
                                hint: 'nombre@correo.com',
                                icon: Icons.alternate_email_rounded,
                              ),
                              validator: (value) {
                                final v = value?.trim() ?? '';
                                if (v.isEmpty) return 'Ingresa tu correo';
                                final emailRegex = RegExp(
                                  r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
                                );
                                if (!emailRegex.hasMatch(v)) {
                                  return 'Ingresa un correo válido';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 18),

                            Text(
                              'Contraseña',
                              style: textTheme.titleSmall?.copyWith(
                                color: _ink,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              textInputAction: TextInputAction.done,
                              cursorColor: _gold,
                              style: TextStyle(color: _ink),
                              onFieldSubmitted: (_) => _login(),
                              decoration:
                                  _inputDecoration(
                                    hint: 'Ingresa tu contraseña',
                                    icon: Icons.lock_outline_rounded,
                                  ).copyWith(
                                    suffixIcon: IconButton(
                                      color: _muted,
                                      icon: Icon(
                                        _obscurePassword
                                            ? Icons.visibility_off_outlined
                                            : Icons.visibility_outlined,
                                      ),
                                      onPressed: () {
                                        setState(
                                          () => _obscurePassword =
                                              !_obscurePassword,
                                        );
                                      },
                                    ),
                                  ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Ingresa tu contraseña';
                                }
                                return null;
                              },
                            ),

                            const SizedBox(height: 6),
                            Align(
                              alignment: Alignment.center,
                              child: TextButton(
                                onPressed: _loading ? null : _openRecuperar,
                                style: TextButton.styleFrom(
                                  foregroundColor: AppColors.primary,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  minimumSize: const Size(0, 36),
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                  textStyle: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                  ),
                                ),
                                child: const Text('¿Olvidaste tu contraseña?'),
                              ),
                            ),

                            if (_errorMessage != null) ...[
                              const SizedBox(height: 16),
                              ErrorBanner(message: _errorMessage!),
                            ],
                            // Solo si la cuenta se registró y falta su código.
                            if (_verificacionPendiente != null)
                              TextButton(
                                onPressed: _loading ? null : _openVerificar,
                                child: const Text(
                                  'Verificar mi correo o reenviar código',
                                ),
                              ),

                            const SizedBox(height: 28),
                            SizedBox(
                              height: 56,
                              child: _loading
                                  ? Center(
                                      child: CircularProgressIndicator(
                                        color: _gold,
                                      ),
                                    )
                                  : FilledButton(
                                      onPressed: _login,
                                      style: FilledButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                        ),
                                        textStyle: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.2,
                                        ),
                                      ),
                                      child: const Text('Iniciar sesión'),
                                    ),
                            ),
                            const SizedBox(height: 18),
                            // En pantallas angostas o con letra grande el
                            // botón pasa a la línea siguiente (sin desborde).
                            Wrap(
                              alignment: WrapAlignment.center,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Text(
                                  '¿Aún no tienes una cuenta?',
                                  style: textTheme.bodyMedium?.copyWith(
                                    color: _muted,
                                  ),
                                ),
                                TextButton(
                                  onPressed: _loading ? null : _openRegistro,
                                  style: TextButton.styleFrom(
                                    foregroundColor: AppColors.primary,
                                    padding: const EdgeInsets.only(left: 6),
                                    textStyle: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  child: const Text('Crear cuenta'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({
    required String hint,
    required IconData icon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: _muted),
      prefixIcon: Icon(icon, color: _gold, size: 21),
      filled: true,
      fillColor: _surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 17),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: _border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: _border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: _gold, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFB42318)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFB42318), width: 1.6),
      ),
    );
  }
}
