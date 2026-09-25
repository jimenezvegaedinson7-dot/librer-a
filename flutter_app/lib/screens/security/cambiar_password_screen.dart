import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../utils/app_colors.dart';
import '../../utils/app_tokens.dart';
import '../../widgets/aparecer.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/formulario_cuenta.dart';

/// Pantalla para cambiar la contraseña del cliente.
///
/// Envía `PUT /usuarios/password`. No se guarda ninguna contraseña.
class CambiarPasswordScreen extends StatefulWidget {
  const CambiarPasswordScreen({super.key});

  @override
  State<CambiarPasswordScreen> createState() => _CambiarPasswordScreenState();
}

class _CambiarPasswordScreenState extends State<CambiarPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _actualController = TextEditingController();
  final _nuevaController = TextEditingController();
  final _confirmarController = TextEditingController();

  bool _obscureActual = true;
  bool _obscureNueva = true;
  bool _obscureConfirmar = true;
  bool _loading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _actualController.dispose();
    _nuevaController.dispose();
    _confirmarController.dispose();
    super.dispose();
  }

  Future<void> _cambiar() async {
    FocusScope.of(context).unfocus();
    setState(() => _errorMessage = null);

    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiService.instance.cambiarPassword(
        passwordActual: _actualController.text,
        passwordNueva: _nuevaController.text,
        confirmarPassword: _confirmarController.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Contraseña actualizada correctamente.')),
      );
      Navigator.of(context).pop(true);
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
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const CabeceraFormulario(
                  medallon: Icon(
                    Icons.lock_person_outlined,
                    size: 42,
                    color: Colors.white,
                  ),
                  antetitulo: 'Seguridad',
                  titulo: 'Cambiar contraseña',
                  descripcion:
                      'Usa una contraseña que no utilices en otros sitios.',
                ),
                const SizedBox(height: 28),
                SeccionFormulario(
                  titulo: 'Contraseña actual',
                  icono: Icons.key_outlined,
                  children: [
                    _field(
                      controller: _actualController,
                      label: 'Contraseña actual',
                      obscure: _obscureActual,
                      onToggle: () =>
                          setState(() => _obscureActual = !_obscureActual),
                      validator: (value) {
                        if ((value ?? '').isEmpty) {
                          return 'Ingresa tu contraseña actual';
                        }
                        return null;
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                SeccionFormulario(
                  titulo: 'Nueva contraseña',
                  icono: Icons.shield_outlined,
                  indice: 2,
                  children: [
                    _field(
                      controller: _nuevaController,
                      label: 'Nueva contraseña',
                      obscure: _obscureNueva,
                      onToggle: () =>
                          setState(() => _obscureNueva = !_obscureNueva),
                      validator: (value) {
                        if ((value ?? '').isEmpty) {
                          return 'Ingresa la nueva contraseña';
                        }
                        if (value!.length < 8) {
                          return 'Debe tener al menos 8 caracteres';
                        }
                        if (!RegExp(r'[A-Za-z]').hasMatch(value) ||
                            !RegExp(r'\d').hasMatch(value)) {
                          return 'Debe incluir al menos una letra y un número';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    _field(
                      controller: _confirmarController,
                      label: 'Confirmar nueva contraseña',
                      obscure: _obscureConfirmar,
                      onToggle: () => setState(
                        () => _obscureConfirmar = !_obscureConfirmar,
                      ),
                      onSubmitted: _cambiar,
                      validator: (value) {
                        if ((value ?? '').isEmpty) {
                          return 'Confirma la nueva contraseña';
                        }
                        if (value != _nuevaController.text) {
                          return 'Las contraseñas no coinciden';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    // Requisitos y seguridad, en vivo mientras se escribe.
                    ListenableBuilder(
                      listenable: Listenable.merge([
                        _nuevaController,
                        _confirmarController,
                      ]),
                      builder: (context, _) => _Requisitos(
                        nueva: _nuevaController.text,
                        confirmar: _confirmarController.text,
                      ),
                    ),
                  ],
                ),

                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  ErrorBanner(message: _errorMessage!),
                ],

                const SizedBox(height: 28),

                Aparecer(
                  indice: 3,
                  child: SizedBox(
                    height: 54,
                    child: _loading
                        ? const Center(child: CircularProgressIndicator())
                        : FilledButton.icon(
                            onPressed: _cambiar,
                            icon: const Icon(
                              Icons.lock_reset_rounded,
                              size: 20,
                            ),
                            label: const Text('Actualizar contraseña'),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required bool obscure,
    required VoidCallback onToggle,
    VoidCallback? onSubmitted,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      textInputAction: onSubmitted == null
          ? TextInputAction.next
          : TextInputAction.done,
      onFieldSubmitted: onSubmitted == null ? null : (_) => onSubmitted(),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.lock_outline_rounded),
        suffixIcon: IconButton(
          icon: Icon(
            obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
          ),
          onPressed: onToggle,
        ),
      ),
      validator: validator,
    );
  }
}

/// Requisitos de la nueva contraseña (los mismos que valida el formulario)
/// y una barra de seguridad orientativa.
class _Requisitos extends StatelessWidget {
  final String nueva;
  final String confirmar;

  const _Requisitos({required this.nueva, required this.confirmar});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final largo = nueva.length >= 8;
    final letraYNumero =
        RegExp(r'[A-Za-z]').hasMatch(nueva) && RegExp(r'\d').hasMatch(nueva);
    final coinciden = nueva.isNotEmpty && nueva == confirmar;

    // Seguridad orientativa: de 0 a 4 puntos.
    var puntos = 0;
    if (largo) puntos++;
    if (letraYNumero) puntos++;
    if (nueva.length >= 12) puntos++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(nueva) ||
        (RegExp(r'[A-Z]').hasMatch(nueva) &&
            RegExp(r'[a-z]').hasMatch(nueva))) {
      puntos++;
    }
    final (etiqueta, color) = switch (puntos) {
      0 || 1 => ('Débil', AppColors.error),
      2 => ('Aceptable', AppColors.warning),
      3 => ('Buena', AppColors.success),
      _ => ('Muy segura', AppColors.success),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (nueva.isNotEmpty) ...[
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(end: puntos / 4),
                    duration: Duracion.base,
                    curve: Curva.salida,
                    builder: (context, v, _) => LinearProgressIndicator(
                      value: v,
                      minHeight: 6,
                      color: color,
                      backgroundColor: AppColors.divider,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                etiqueta,
                style: textTheme.labelSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        _Requisito(cumple: largo, texto: 'Al menos 8 caracteres'),
        _Requisito(cumple: letraYNumero, texto: 'Una letra y un número'),
        _Requisito(cumple: coinciden, texto: 'Ambas contraseñas coinciden'),
      ],
    );
  }
}

class _Requisito extends StatelessWidget {
  final bool cumple;
  final String texto;

  const _Requisito({required this.cumple, required this.texto});

  @override
  Widget build(BuildContext context) {
    final color = cumple ? AppColors.success : AppColors.textTertiary;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          AnimatedSwitcher(
            duration: Duracion.rapida,
            transitionBuilder: (child, anim) =>
                ScaleTransition(scale: anim, child: child),
            child: Icon(
              cumple
                  ? Icons.check_circle_rounded
                  : Icons.radio_button_unchecked_rounded,
              key: ValueKey(cumple),
              size: 18,
              color: color,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            texto,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: cumple ? AppColors.textPrimary : AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
