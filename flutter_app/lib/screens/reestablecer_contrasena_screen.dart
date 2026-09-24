import 'dart:async';

import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../widgets/app_logo.dart';
import '../widgets/error_banner.dart';
import '../widgets/estanteria.dart';
import 'login_screen.dart';

/// Segundo paso para recuperar la contraseña.
///
/// Recibe el [email] del paso anterior y pide el código de 6 dígitos enviado
/// por correo junto con la nueva contraseña (y su confirmación). Al validarse
/// en el backend, la contraseña queda actualizada y se devuelve al login.
class ReestablecerContrasenaScreen extends StatefulWidget {
  final String email;

  const ReestablecerContrasenaScreen({super.key, required this.email});

  @override
  State<ReestablecerContrasenaScreen> createState() =>
      _ReestablecerContrasenaScreenState();
}

class _ReestablecerContrasenaScreenState
    extends State<ReestablecerContrasenaScreen> {
  static const _background = Color(0xFFF6F1E9);
  static const _surface = Color(0xFFFFFFFF);
  static const _ink = Color(0xFF1C1814);
  static const _muted = Color(0xFF675E54);
  static const _gold = Color(0xFFB98D3E);
  static const _border = Color(0xFFE7DFD3);

  final _formKey = GlobalKey<FormState>();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirm = true;
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
    _passwordController.dispose();
    _confirmController.dispose();
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

  Future<void> _restablecer() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _errorMessage = null;
      _infoMessage = null;
    });

    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiService.instance.reestablecerContrasena(
        email: widget.email,
        codigo: _otpController.text.trim(),
        password: _passwordController.text,
      );
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Contraseña actualizada. Ya puedes iniciar sesión.'),
        ),
      );
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
        (route) => false,
      );
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
      await ApiService.instance.solicitarReseteo(email: widget.email);
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

  String? _validarPassword(String? value) {
    final v = value ?? '';
    if (v.length < 8) {
      return 'Mínimo 8 caracteres';
    }
    if (!RegExp(r'[a-zA-Z]').hasMatch(v)) {
      return 'Debe contener al menos una letra';
    }
    if (!RegExp(r'\d').hasMatch(v)) {
      return 'Debe contener al menos un número';
    }
    return null;
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
          'Nueva contraseña',
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
                            const Center(child: AppLogo(width: 84, height: 84)),
                            const SizedBox(height: 18),
                            Text(
                              'Crea una nueva contraseña',
                              textAlign: TextAlign.center,
                              style: textTheme.headlineMedium?.copyWith(
                                color: _ink,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.4,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Ingresa el código que enviamos a:\n${widget.email}',
                              textAlign: TextAlign.center,
                              style: textTheme.bodyMedium?.copyWith(
                                color: _muted,
                                height: 1.45,
                              ),
                            ),
                            const SizedBox(height: 26),

                            // Campo OTP (6 dígitos, numérico)
                            TextFormField(
                              controller: _otpController,
                              keyboardType: TextInputType.number,
                              textInputAction: TextInputAction.next,
                              autofocus: true,
                              autocorrect: false,
                              cursorColor: _gold,
                              style: const TextStyle(
                                color: _ink,
                                fontSize: 22,
                                letterSpacing: 8,
                                fontWeight: FontWeight.w600,
                              ),
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(6),
                              ],
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
                            ),
                            const SizedBox(height: 18),

                            // Nueva contraseña
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              textInputAction: TextInputAction.next,
                              autocorrect: false,
                              cursorColor: _gold,
                              style: const TextStyle(color: _ink),
                              decoration:
                                  _inputDecoration(
                                    label: 'Nueva contraseña',
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
                              validator: _validarPassword,
                            ),
                            const SizedBox(height: 18),

                            // Confirmar contraseña
                            TextFormField(
                              controller: _confirmController,
                              obscureText: _obscureConfirm,
                              textInputAction: TextInputAction.done,
                              autocorrect: false,
                              cursorColor: _gold,
                              style: const TextStyle(color: _ink),
                              onFieldSubmitted: (_) => _restablecer(),
                              decoration:
                                  _inputDecoration(
                                    label: 'Confirmar contraseña',
                                    icon: Icons.lock_reset_rounded,
                                  ).copyWith(
                                    suffixIcon: IconButton(
                                      color: _muted,
                                      icon: Icon(
                                        _obscureConfirm
                                            ? Icons.visibility_off_outlined
                                            : Icons.visibility_outlined,
                                      ),
                                      onPressed: () {
                                        setState(
                                          () => _obscureConfirm =
                                              !_obscureConfirm,
                                        );
                                      },
                                    ),
                                  ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Confirma tu contraseña';
                                }
                                if (value != _passwordController.text) {
                                  return 'Las contraseñas no coinciden';
                                }
                                return null;
                              },
                            ),

                            if (_errorMessage != null) ...[
                              const SizedBox(height: 16),
                              ErrorBanner(message: _errorMessage!),
                            ],

                            if (_infoMessage != null) ...[
                              const SizedBox(height: 16),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE6F2EA),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.info_outline_rounded,
                                      color: Color(0xFF1F7A45),
                                      size: 20,
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        _infoMessage!,
                                        style: textTheme.bodySmall?.copyWith(
                                          color: const Color(0xFF1F7A45),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
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
                                      onPressed: _restablecer,
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
                                      child: const Text(
                                        'Guardar nueva contraseña',
                                      ),
                                    ),
                            ),
                            const SizedBox(height: 12),

                            // Reenviar código
                            TextButton(
                              onPressed: _loading
                                  ? null
                                  : (_segundosReintento > 0 ? null : _reenviar),
                              style: TextButton.styleFrom(
                                foregroundColor: AppColors.primary,
                                textStyle: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              child: _reenviando
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        color: _gold,
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : Text(
                                      _segundosReintento > 0
                                          ? 'Reenviar código en '
                                                '$_segundosReintento s'
                                          : '¿No recibiste el código? Reenviar',
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
    required String label,
    required IconData icon,
  }) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: _muted),
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
