import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/app_logo.dart';
import '../../widgets/campo_otp.dart';
import '../../widgets/confirmacion_otp.dart';
import '../home_screen.dart';
import '../login_screen.dart';

/// Pantalla de verificación en dos pasos (Google Authenticator).
///
/// Se muestra después del login cuando el backend responde con
/// `requires_2fa`. Recibe el [twoFactorToken] temporal (solo en memoria)
/// necesario para `POST /auth/2fa/verify-login`.
class TwoFactorVerifyScreen extends StatefulWidget {
  final String twoFactorToken;
  final IntentoAutenticacion? intento;
  final ApiService? api;

  const TwoFactorVerifyScreen({
    super.key,
    required this.twoFactorToken,
    this.intento,
    this.api,
  });

  @override
  State<TwoFactorVerifyScreen> createState() => _TwoFactorVerifyScreenState();
}

class _TwoFactorVerifyScreenState extends State<TwoFactorVerifyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _otpController = TextEditingController();

  bool _loading = false;
  String? _errorMessage;
  late final IntentoAutenticacion _intento;
  ApiService get _api => widget.api ?? ApiService.instance;

  @override
  void initState() {
    super.initState();
    _intento = widget.intento ?? StorageService.instance.iniciarAutenticacion();
  }

  void _invalidarIntento() =>
      StorageService.instance.invalidarAutenticacion(_intento);

  @override
  void dispose() {
    _invalidarIntento();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _verificar() async {
    if (_loading) return;
    FocusScope.of(context).unfocus();
    setState(() => _errorMessage = null);

    if (!_formKey.currentState!.validate()) {
      return;
    }

    final codigo = _otpController.text.trim();

    setState(() => _loading = true);
    try {
      await _api.verificarLogin2FA(
        twoFactorToken: widget.twoFactorToken,
        codigo: codigo,
        intento: _intento,
      );
      if (!mounted) return;
      await mostrarConfirmacionOtp(
        context,
        titulo: 'Acceso verificado',
        mensaje: 'Tu cuenta está lista para continuar.',
      );
      if (!mounted) return;
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

  void _volverAlLogin() {
    _invalidarIntento();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => LoginScreen(api: _api)),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return PopScope(
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) _invalidarIntento();
      },
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 28,
                  vertical: 32,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: (constraints.maxHeight - 64).clamp(
                      0,
                      double.infinity,
                    ),
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Center(child: AppLogo(width: 88, height: 88)),
                        const SizedBox(height: 24),
                        Text(
                          'Verificación en dos pasos',
                          textAlign: TextAlign.center,
                          style: textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Introduce el código de 6 dígitos de tu aplicación '
                          'de autenticación (Google Authenticator) para '
                          'completar el inicio de sesión.',
                          textAlign: TextAlign.center,
                          style: textTheme.bodyMedium?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Campo OTP (6 dígitos, numérico)
                        CampoOtp(
                          controller: _otpController,
                          enabled: !_loading,
                          onSubmitted: _verificar,
                        ),

                        // Mensaje de error
                        if (_errorMessage != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: colorScheme.errorContainer,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.error_outline_rounded,
                                  color: colorScheme.onErrorContainer,
                                  size: 20,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    _errorMessage!,
                                    style: textTheme.bodySmall?.copyWith(
                                      color: colorScheme.onErrorContainer,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 28),

                        // Botón verificar
                        SizedBox(
                          height: 54,
                          child: _loading
                              ? const Center(child: CircularProgressIndicator())
                              : FilledButton(
                                  onPressed: _verificar,
                                  child: Text(
                                    'Verificar',
                                    style: textTheme.labelLarge?.copyWith(
                                      color: colorScheme.onPrimary,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                        ),
                        const SizedBox(height: 16),

                        // Volver al login
                        TextButton(
                          onPressed: _loading ? null : _volverAlLogin,
                          child: const Text('Volver al inicio de sesión'),
                        ),
                      ],
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
}
