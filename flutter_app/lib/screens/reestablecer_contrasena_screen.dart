import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../widgets/app_logo.dart';
import '../widgets/campo_otp.dart';
import '../widgets/confirmacion_otp.dart';
import '../widgets/error_banner.dart';
import 'login_screen.dart';

/// Recuperar contraseña en DOS pantallas separadas:
///   1. [ReestablecerContrasenaScreen]: solo el código de 6 dígitos, que el
///      servidor valida y canjea por un permiso de un solo uso.
///   2. [NuevaContrasenaScreen]: recién entonces, la nueva contraseña.
/// El permiso solo vive en estas pantallas, nunca en el almacén de sesiones.
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
  final _codigo = TextEditingController();
  String? _error, _info;
  bool _ocupado = false, _codigoOk = false;
  int _segundos = 0, _fallos = 0;
  Timer? _timer;
  ApiService get _api => widget.api ?? ApiService.instance;

  @override
  void dispose() {
    _timer?.cancel();
    _codigo.dispose();
    super.dispose();
  }

  Future<void> _verificar() async {
    if (_ocupado || !_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _ocupado = true;
      _error = null;
      _info = null;
    });
    try {
      final permiso = await _api.verificarReseteo(
        email: widget.email,
        codigo: _codigo.text,
      );
      if (!mounted) return;
      setState(() => _codigoOk = true);
      await mostrarConfirmacionOtp(
        context,
        titulo: 'Código verificado',
        mensaje: 'Ahora crea tu nueva contraseña.',
      );
      if (!mounted) return;
      // Segunda pantalla, aparte: la nueva contraseña.
      unawaited(
        Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(
            builder: (_) => NuevaContrasenaScreen(
              email: widget.email,
              permiso: permiso,
              api: widget.api,
            ),
          ),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _fallos++;
        });
      }
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

  @override
  Widget build(BuildContext context) {
    return _MarcoRecuperacion(
      tituloBarra: 'Verificar código',
      paso: 1,
      titulo: 'Primero verifica tu correo',
      subtitulo: 'Ingresa el código de 6 dígitos enviado a ${widget.email}',
      formKey: _form,
      children: [
        CampoOtp(
          controller: _codigo,
          enabled: !_ocupado,
          onSubmitted: _verificar,
          exito: _codigoOk,
          fallos: _fallos,
        ),
        const SizedBox(height: 10),
        Text(
          '¿No llegó? Revisa también la carpeta de spam.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodySmall,
        ),
        if (_error != null) ...[
          const SizedBox(height: 16),
          ErrorBanner(message: _error!),
        ],
        if (_info != null) ...[
          const SizedBox(height: 16),
          Text(_info!, textAlign: TextAlign.center),
        ],
        const SizedBox(height: 24),
        _BotonPrincipal(
          texto: 'Verificar código',
          ocupado: _ocupado,
          onPressed: _verificar,
        ),
        TextButton(
          onPressed: _ocupado || _segundos > 0 ? null : _reenviar,
          child: Text(
            _segundos > 0
                ? 'Reenviar código en $_segundos s'
                : 'Reenviar código',
          ),
        ),
      ],
    );
  }
}

/// Segunda pantalla: la nueva contraseña, con el permiso ya validado.
class NuevaContrasenaScreen extends StatefulWidget {
  final String email;
  final String permiso;
  final ApiService? api;
  const NuevaContrasenaScreen({
    super.key,
    required this.email,
    required this.permiso,
    this.api,
  });
  @override
  State<NuevaContrasenaScreen> createState() => _NuevaContrasenaScreenState();
}

class _NuevaContrasenaScreenState extends State<NuevaContrasenaScreen> {
  final _form = GlobalKey<FormState>();
  final _password = TextEditingController(),
      _confirmacion = TextEditingController();
  String? _error;
  bool _ocupado = false, _oculta = true, _ocultaConfirmacion = true;
  bool _permisoVencido = false;
  ApiService get _api => widget.api ?? ApiService.instance;

  @override
  void dispose() {
    _password.dispose();
    _confirmacion.dispose();
    super.dispose();
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

  Future<void> _guardar() async {
    if (_ocupado || !_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _ocupado = true;
      _error = null;
    });
    try {
      await _api.reestablecerContrasena(
        email: widget.email,
        resetToken: widget.permiso,
        password: _password.text,
      );
      if (!mounted) return;
      await mostrarConfirmacionOtp(
        context,
        titulo: 'Contraseña restablecida',
        mensaje: 'Contraseña restablecida con éxito. Inicia sesión.',
      );
      if (!mounted) return;
      final mensajero = ScaffoldMessenger.maybeOf(context);
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute<void>(builder: (_) => const LoginScreen()),
        (_) => false,
      );
      // El aviso también queda visible en el inicio de sesión.
      mensajero?.showSnackBar(
        const SnackBar(
          content: Text('Contraseña restablecida con éxito. Inicia sesión.'),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _permisoVencido = e.message.contains('ha expirado');
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

  /// El permiso venció: se pide un código nuevo en la primera pantalla.
  Future<void> _pedirOtroCodigo() async {
    try {
      await _api.solicitarReseteo(email: widget.email);
    } catch (_) {
      // La primera pantalla permite reenviar si este envío falla.
    }
    if (!mounted) return;
    unawaited(
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => ReestablecerContrasenaScreen(
            email: widget.email,
            api: widget.api,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _MarcoRecuperacion(
      tituloBarra: 'Nueva contraseña',
      paso: 2,
      titulo: 'Crea tu nueva contraseña',
      subtitulo: 'Código confirmado para ${widget.email}',
      formKey: _form,
      children: [
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
              icon: Icon(_oculta ? Icons.visibility_off : Icons.visibility),
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
              onPressed: () =>
                  setState(() => _ocultaConfirmacion = !_ocultaConfirmacion),
              icon: Icon(
                _ocultaConfirmacion ? Icons.visibility_off : Icons.visibility,
              ),
            ),
          ),
          validator: (v) => v == _password.text && (v ?? '').isNotEmpty
              ? null
              : 'Las contraseñas no coinciden',
          onFieldSubmitted: (_) => _guardar(),
        ),
        const SizedBox(height: 8),
        const Text('Al menos 8 caracteres, con una letra y un número.'),
        if (_error != null) ...[
          const SizedBox(height: 16),
          ErrorBanner(message: _error!),
        ],
        const SizedBox(height: 24),
        if (_permisoVencido)
          _BotonPrincipal(
            texto: 'Pedir un código nuevo',
            ocupado: _ocupado,
            onPressed: _pedirOtroCodigo,
          )
        else
          _BotonPrincipal(
            texto: 'Guardar nueva contraseña',
            ocupado: _ocupado,
            onPressed: _guardar,
          ),
      ],
    );
  }
}

/// Estructura común de las dos pantallas: logo, pasos, título y formulario.
class _MarcoRecuperacion extends StatelessWidget {
  final String tituloBarra, titulo, subtitulo;
  final int paso;
  final GlobalKey<FormState> formKey;
  final List<Widget> children;
  const _MarcoRecuperacion({
    required this.tituloBarra,
    required this.paso,
    required this.titulo,
    required this.subtitulo,
    required this.formKey,
    required this.children,
  });

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tituloBarra)),
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Center(child: AppLogo(width: 72, height: 72)),
                  const SizedBox(height: 20),
                  _PasosRecuperacion(paso: paso),
                  const SizedBox(height: 20),
                  Text(
                    titulo,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 12),
                  Text(subtitulo, textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  ...children,
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class _BotonPrincipal extends StatelessWidget {
  final String texto;
  final bool ocupado;
  final VoidCallback onPressed;
  const _BotonPrincipal({
    required this.texto,
    required this.ocupado,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) => FilledButton(
    onPressed: ocupado ? null : onPressed,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: ocupado
          ? const SizedBox.square(
              dimension: 22,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Text(texto),
    ),
  );
}

/// "Paso 1 de 2 · Código" → "Paso 2 de 2 · Contraseña": primero se
/// confirma el código y recién después se pide la contraseña.
class _PasosRecuperacion extends StatelessWidget {
  final int paso;
  const _PasosRecuperacion({required this.paso});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final duracion = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 320);
    Widget etapa(int numero, String texto) {
      final hecha = paso > numero;
      final actual = paso == numero;
      return Expanded(
        child: Column(
          children: [
            AnimatedContainer(
              duration: duracion,
              height: 4,
              decoration: BoxDecoration(
                color: hecha || actual ? colors.primary : colors.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  hecha ? Icons.check_circle : Icons.circle_outlined,
                  size: 16,
                  color: hecha || actual ? colors.primary : colors.outline,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    texto,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      fontWeight: actual ? FontWeight.w700 : FontWeight.w500,
                      color: hecha || actual
                          ? colors.onSurface
                          : colors.outline,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return Semantics(
      label: 'Paso $paso de 2',
      child: Row(
        children: [
          etapa(1, 'Código'),
          const SizedBox(width: 12),
          etapa(2, 'Contraseña'),
        ],
      ),
    );
  }
}
