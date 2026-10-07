import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../widgets/app_logo.dart';
import '../widgets/campo_otp.dart';
import '../widgets/confirmacion_otp.dart';
import '../widgets/error_banner.dart';
import 'login_screen.dart';

/// Correo → OTP validado por el servidor → nueva contraseña. El permiso de
/// recuperación solo vive en esta pantalla, nunca en el almacén de sesiones.
class ReestablecerContrasenaScreen extends StatefulWidget {
  final String email;
  final ApiService? api;
  const ReestablecerContrasenaScreen({
    super.key,
    required this.email,
    this.api,
  });
  @override
  State<ReestablecerContrasenaScreen> createState() =>
      _ReestablecerContrasenaScreenState();
}

class _ReestablecerContrasenaScreenState
    extends State<ReestablecerContrasenaScreen> {
  final _form = GlobalKey<FormState>();
  final _codigo = TextEditingController(),
      _password = TextEditingController(),
      _confirmacion = TextEditingController();
  String? _permiso, _error, _info;
  bool _ocupado = false, _oculta = true, _ocultaConfirmacion = true;
  int _segundos = 0;
  Timer? _timer;
  ApiService get _api => widget.api ?? ApiService.instance;
  @override
  void dispose() {
    _timer?.cancel();
    _codigo.dispose();
    _password.dispose();
    _confirmacion.dispose();
    super.dispose();
  }

  Future<void> _continuar() async {
    if (_ocupado || !_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _ocupado = true;
      _error = null;
      _info = null;
    });
    try {
      if (_permiso == null) {
        final permiso = await _api.verificarReseteo(
          email: widget.email,
          codigo: _codigo.text,
        );
        if (!mounted) return;
        await mostrarConfirmacionOtp(
          context,
          titulo: 'Código verificado',
          mensaje: 'Ahora crea tu nueva contraseña.',
        );
        if (!mounted) return;
        setState(() {
          _permiso = permiso;
          _codigo.clear();
        });
      } else {
        await _api.reestablecerContrasena(
          email: widget.email,
          resetToken: _permiso,
          password: _password.text,
        );
        if (!mounted) return;
        await mostrarConfirmacionOtp(
          context,
          titulo: 'Contraseña actualizada',
          mensaje: 'Ya puedes iniciar sesión con tu nueva contraseña.',
        );
        if (!mounted) return;
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
          (_) => false,
        );
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        if (_permiso != null && e.message.contains('ha expirado')) {
          _permiso = null;
          _password.clear();
          _confirmacion.clear();
        }
      });
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _error = 'No se pudo completar la solicitud. Inténtalo de nuevo.',
        );
      }
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  Future<void> _reenviar() async {
    if (_ocupado || _segundos > 0) return;
    setState(() {
      _ocupado = true;
      _error = null;
    });
    try {
      await _api.solicitarReseteo(email: widget.email);
      if (!mounted) return;
      _codigo.clear();
      setState(() {
        _info = 'Si el correo está registrado, recibirás un nuevo código.';
        _segundos = 60;
      });
      _timer?.cancel();
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!mounted || _segundos <= 1) {
          timer.cancel();
          if (mounted) setState(() => _segundos = 0);
        } else {
          setState(() => _segundos--);
        }
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'No se pudo reenviar el código. Inténtalo de nuevo.',
        );
      }
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  String? _validarPassword(String? valor) {
    final texto = valor ?? '';
    if (texto.length < 8) return 'Mínimo 8 caracteres';
    if (!RegExp(r'[a-zA-Z]').hasMatch(texto) ||
        !RegExp(r'\d').hasMatch(texto)) {
      return 'Incluye al menos una letra y un número';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final verificada = _permiso != null;
    return Scaffold(
      appBar: AppBar(
        title: Text(verificada ? 'Nueva contraseña' : 'Verificar código'),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(child: AppLogo(width: 84, height: 84)),
                    const SizedBox(height: 24),
                    Text(
                      verificada
                          ? 'Crea tu nueva contraseña'
                          : 'Primero verifica tu correo',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      verificada
                          ? 'Código confirmado para ${widget.email}'
                          : 'Ingresa el código de 6 dígitos enviado a ${widget.email}',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    if (!verificada)
                      CampoOtp(
                        controller: _codigo,
                        enabled: !_ocupado,
                        onSubmitted: _continuar,
                      )
                    else ...[
                      TextFormField(
                        controller: _password,
                        enabled: !_ocupado,
                        obscureText: _oculta,
                        autofillHints: const [AutofillHints.newPassword],
                        textInputAction: TextInputAction.next,
                        decoration: InputDecoration(
                          labelText: 'Nueva contraseña',
                          suffixIcon: IconButton(
                            tooltip: 'Mostrar u ocultar contraseña',
                            onPressed: () => setState(() => _oculta = !_oculta),
                            icon: Icon(
                              _oculta ? Icons.visibility_off : Icons.visibility,
                            ),
                          ),
                        ),
                        validator: _validarPassword,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _confirmacion,
                        enabled: !_ocupado,
                        obscureText: _ocultaConfirmacion,
                        autofillHints: const [AutofillHints.newPassword],
                        textInputAction: TextInputAction.done,
                        decoration: InputDecoration(
                          labelText: 'Confirmar contraseña',
                          suffixIcon: IconButton(
                            tooltip: 'Mostrar u ocultar confirmación',
                            onPressed: () => setState(
                              () => _ocultaConfirmacion = !_ocultaConfirmacion,
                            ),
                            icon: Icon(
                              _ocultaConfirmacion
                                  ? Icons.visibility_off
                                  : Icons.visibility,
                            ),
                          ),
                        ),
                        validator: (v) =>
                            v == _password.text && (v ?? '').isNotEmpty
                            ? null
                            : 'Las contraseñas no coinciden',
                        onFieldSubmitted: (_) => _continuar(),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Al menos 8 caracteres, con una letra y un número.',
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      ErrorBanner(message: _error!),
                    ],
                    if (_info != null) ...[
                      const SizedBox(height: 16),
                      Text(_info!, textAlign: TextAlign.center),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _ocupado ? null : _continuar,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: _ocupado
                            ? const SizedBox.square(
                                dimension: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(
                                verificada
                                    ? 'Guardar nueva contraseña'
                                    : 'Verificar código',
                              ),
                      ),
                    ),
                    if (!verificada)
                      TextButton(
                        onPressed: _ocupado || _segundos > 0 ? null : _reenviar,
                        child: Text(
                          _segundos > 0
                              ? 'Reenviar código en $_segundos s'
                              : 'Reenviar código',
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
