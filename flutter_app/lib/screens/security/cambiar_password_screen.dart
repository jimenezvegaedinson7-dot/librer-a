import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../widgets/error_banner.dart';

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
      appBar: AppBar(title: const Text('Cambiar contraseña')),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
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
                const SizedBox(height: 16),
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
                const SizedBox(height: 16),
                _field(
                  controller: _confirmarController,
                  label: 'Confirmar nueva contraseña',
                  obscure: _obscureConfirmar,
                  onToggle: () =>
                      setState(() => _obscureConfirmar = !_obscureConfirmar),
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

                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  ErrorBanner(message: _errorMessage!),
                ],

                const SizedBox(height: 28),

                SizedBox(
                  height: 54,
                  child: _loading
                      ? const Center(child: CircularProgressIndicator())
                      : FilledButton(
                          onPressed: _cambiar,
                          child: const Text('Actualizar contraseña'),
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
