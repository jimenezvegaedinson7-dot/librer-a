import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../widgets/app_logo.dart';
import '../widgets/error_banner.dart';
import 'login_screen.dart';

/// Pantalla de verificación de cuenta por email.
///
/// Se muestra justo después de registrarse. El backend envió un código de
/// 6 dígitos al [email] del usuario; aquí se ingresa para activar la cuenta.
/// Al verificarse correctamente, devuelve `true` (Navigator.pop) y el flujo de
/// registro cierra, llevando al usuario a iniciar sesión.
class VerificacionEmailScreen extends StatefulWidget {
  final String email;

  const VerificacionEmailScreen({super.key, required this.email});

  @override
  State<VerificacionEmailScreen> createState() =>
      _VerificacionEmailScreenState();
}

class _VerificacionEmailScreenState extends State<VerificacionEmailScreen> {
  final _formKey = GlobalKey<FormState>();
  final _otpController = TextEditingController();

  bool _loading = false;
  bool _reenviando = false;
  String? _errorMessage;
  String? _infoMessage;
  int _segundosReintento = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _otpController.dispose();
    super.dispose();
  }

  void _iniciarCuentaRegresiva() {
    _timer?.cancel();
    setState(() => _segundosReintento = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_segundosReintento <= 1) {
        timer.cancel();
        setState(() => _segundosReintento = 0);
      } else {
        setState(() => _segundosReintento -= 1);
      }
    });
  }

  Future<void> _verificar() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _errorMessage = null;
      _infoMessage = null;
    });

    if (!_formKey.currentState!.validate()) {
      return;
    }

    final codigo = _otpController.text.trim();

    setState(() => _loading = true);
    try {
      await ApiService.instance.verificarEmail(
        email: widget.email,
        codigo: codigo,
      );
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('¡Cuenta verificada! Ya puedes iniciar sesión.'),
        ),
      );
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _errorMessage = e.message);
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Ocurrió un error. Inténtalo de nuevo.';
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _reenviar() async {
    if (_reenviando || _segundosReintento > 0) return;
    setState(() {
      _reenviando = true;
      _errorMessage = null;
      _infoMessage = null;
    });
    try {
      await ApiService.instance.reenviarCodigo(email: widget.email);
      if (!mounted) return;
      setState(() {
        _infoMessage = 'Se envió un nuevo código a tu correo.';
      });
      _iniciarCuentaRegresiva();
    } on ApiException catch (e) {
      if (mounted) setState(() => _errorMessage = e.message);
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'No se pudo reenviar el código. Inténtalo de nuevo.';
        });
      }
    } finally {
      if (mounted) setState(() => _reenviando = false);
    }
  }

  void _volverAlLogin() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        title: const Text('Verificar cuenta'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        top: false,
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: (constraints.maxHeight - 48).clamp(
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
                        'Verifica tu correo',
                        textAlign: TextAlign.center,
                        style: textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Enviamos un código de 6 dígitos a:\n${widget.email}',
                        textAlign: TextAlign.center,
                        style: textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 28),

                      // Campo OTP (6 dígitos, numérico)
                      TextFormField(
                        controller: _otpController,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        autofocus: true,
                        autocorrect: false,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(6),
                        ],
                        style: textTheme.headlineSmall?.copyWith(
                          letterSpacing: 8,
                          fontWeight: FontWeight.w600,
                        ),
                        decoration: _inputDecoration(
                          label: 'Código de 6 dígitos',
                          icon: Icons.mark_email_read_outlined,
                        ),
                        validator: (value) {
                          final v = value?.trim() ?? '';
                          if (v.length != 6) {
                            return 'El código debe tener 6 dígitos';
                          }
                          return null;
                        },
                        onFieldSubmitted: (_) => _verificar(),
                      ),

                      // Mensaje de error
                      if (_errorMessage != null) ...[
                        const SizedBox(height: 16),
                        ErrorBanner(message: _errorMessage!),
                      ],

                      // Mensaje informativo (código reenviado)
                      if (_infoMessage != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: colorScheme.primaryContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.info_outline_rounded,
                                color: colorScheme.onPrimaryContainer,
                                size: 20,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _infoMessage!,
                                  style: textTheme.bodySmall?.copyWith(
                                    color: colorScheme.onPrimaryContainer,
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
                                  'Verificar y continuar',
                                  style: textTheme.labelLarge?.copyWith(
                                    color: colorScheme.onPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                      ),

                      const SizedBox(height: 12),

                      // Reenviar código
                      TextButton(
                        onPressed: _loading
                            ? null
                            : (_segundosReintento > 0 ? null : _reenviar),
                        child: _reenviando
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(
                                _segundosReintento > 0
                                    ? 'Reenviar código en $_segundosReintento s'
                                    : '¿No recibiste el código? Reenviar',
                              ),
                      ),

                      const SizedBox(height: 8),

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
    );
  }

  InputDecoration _inputDecoration({
    required String label,
    required IconData icon,
  }) {
    return InputDecoration(labelText: label, prefixIcon: Icon(icon));
  }
}
