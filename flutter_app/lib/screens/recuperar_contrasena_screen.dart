import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../widgets/app_logo.dart';
import '../widgets/error_banner.dart';
import '../widgets/estanteria.dart';
import 'reestablecer_contrasena_screen.dart';

/// Primer paso para recuperar la contraseña.
///
/// Pide el correo de la cuenta. El backend envía un código de 6 dígitos por
/// email (con una respuesta genérica para no revelar si el correo existe).
/// Al confirmar, navega a [ReestablecerContrasenaScreen] para ingresar el
/// código y definir la nueva contraseña.
class RecuperarContrasenaScreen extends StatefulWidget {
  const RecuperarContrasenaScreen({super.key});

  @override
  State<RecuperarContrasenaScreen> createState() =>
      _RecuperarContrasenaScreenState();
}

class _RecuperarContrasenaScreenState extends State<RecuperarContrasenaScreen> {
  static const _background = Color(0xFFF6F1E9);
  static const _surface = Color(0xFFFFFFFF);
  static const _ink = Color(0xFF1C1814);
  static const _muted = Color(0xFF675E54);
  static const _gold = Color(0xFFB98D3E);
  static const _border = Color(0xFFE7DFD3);

  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

  bool _loading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    FocusScope.of(context).unfocus();
    setState(() => _errorMessage = null);

    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiService.instance.solicitarReseteo(
        email: _emailController.text.trim(),
      );
      if (!mounted) return;

      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) =>
              ReestablecerContrasenaScreen(email: _emailController.text.trim()),
        ),
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

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: _background,
      appBar: AppBar(
        backgroundColor: _background,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: _ink),
        title: Text(
          'Recuperar contraseña',
          style: textTheme.titleMedium?.copyWith(
            color: _ink,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: FondoEstanteria(
        child: SafeArea(
          top: false,
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(28, 12, 28, 24),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: (constraints.maxHeight - 36).clamp(
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
                            const Center(child: AppLogo(width: 88, height: 88)),
                            const SizedBox(height: 20),
                            Text(
                              'Recupera tu acceso',
                              textAlign: TextAlign.center,
                              style: textTheme.headlineMedium?.copyWith(
                                color: _ink,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.4,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Ingresa el correo de tu cuenta. Si está '
                              'registrado, enviaremos un código de 6 dígitos '
                              'para restablecer tu contraseña.',
                              textAlign: TextAlign.center,
                              style: textTheme.bodyMedium?.copyWith(
                                color: _muted,
                                height: 1.45,
                              ),
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
                              textInputAction: TextInputAction.done,
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
                              onFieldSubmitted: (_) => _enviar(),
                            ),

                            if (_errorMessage != null) ...[
                              const SizedBox(height: 16),
                              ErrorBanner(message: _errorMessage!),
                            ],

                            const SizedBox(height: 24),
                            SizedBox(
                              height: 54,
                              child: _loading
                                  ? const Center(
                                      child: CircularProgressIndicator(
                                        color: _gold,
                                      ),
                                    )
                                  : FilledButton(
                                      onPressed: _enviar,
                                      style: FilledButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            10,
                                          ),
                                        ),
                                        textStyle: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.2,
                                        ),
                                      ),
                                      child: const Text('Enviar código'),
                                    ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'El código llega en unos minutos. Revisa también '
                              'la bandeja de no deseados.',
                              textAlign: TextAlign.center,
                              style: textTheme.bodySmall?.copyWith(
                                color: _muted,
                                height: 1.4,
                              ),
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
