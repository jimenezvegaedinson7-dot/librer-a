import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../widgets/app_logo.dart';
import '../widgets/error_banner.dart';
import '../widgets/estanteria.dart';
import 'home_screen.dart';
import 'recuperar_contrasena_screen.dart';
import 'registro_screen.dart';
import 'security/two_factor_verify_screen.dart';

/// Pantalla de acceso con identidad editorial de la librería.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  static const _background = Color(0xFFF6F1E9);
  static const _surface = Color(0xFFFFFFFF);
  static const _ink = Color(0xFF1C1814);
  static const _muted = Color(0xFF675E54);
  static const _gold = Color(0xFFB98D3E);
  static const _border = Color(0xFFE7DFD3);

  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscurePassword = true;
  bool _loading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
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
      CarritoService.instance.limpiar();
      ApiService.instance.limpiarEstadoCheckout();

      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute<void>(builder: (_) => const HomeScreen()),
        (route) => false,
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _errorMessage = e.message);
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
                            const SizedBox(height: 24),
                            const Row(
                              children: [
                                Expanded(child: Divider(color: _border)),
                                Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 12),
                                  child: Icon(
                                    Icons.auto_stories_outlined,
                                    color: _gold,
                                    size: 19,
                                  ),
                                ),
                                Expanded(child: Divider(color: _border)),
                              ],
                            ),
                            const SizedBox(height: 28),

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
                              style: const TextStyle(color: _ink),
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
                              style: const TextStyle(color: _ink),
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

                            const SizedBox(height: 28),
                            SizedBox(
                              height: 56,
                              child: _loading
                                  ? const Center(
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
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
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
      hintStyle: const TextStyle(color: _muted),
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
        borderSide: const BorderSide(color: _gold, width: 1.6),
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
