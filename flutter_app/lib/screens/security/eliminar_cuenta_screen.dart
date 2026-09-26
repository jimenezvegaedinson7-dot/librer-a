import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../utils/app_colors.dart';
import '../../widgets/aparecer.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/formulario_cuenta.dart';

/// Eliminar mi cuenta (derecho de cancelación, Ley 29733).
///
/// El backend anonimiza los datos personales, cancela las reservas activas
/// y conserva las compras solo por obligación tributaria. Devuelve `true`
/// al cerrar si la cuenta se eliminó.
class EliminarCuentaScreen extends StatefulWidget {
  const EliminarCuentaScreen({super.key});

  @override
  State<EliminarCuentaScreen> createState() => _EliminarCuentaScreenState();
}

class _EliminarCuentaScreenState extends State<EliminarCuentaScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmacionController = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmacionController.dispose();
    super.dispose();
  }

  Future<void> _eliminar() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _loading = true;
      _errorMessage = null;
    });
    try {
      await ApiService.instance.eliminarCuenta(
        password: _passwordController.text,
      );
      if (!mounted) return;
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

  Widget _punto(IconData icono, String texto) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icono, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              texto,
              style: const TextStyle(
                color: AppColors.textPrimary,
                height: 1.4,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
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
                    Icons.person_remove_outlined,
                    size: 42,
                    color: Colors.white,
                  ),
                  antetitulo: 'Tu cuenta',
                  titulo: 'Eliminar mi cuenta',
                  descripcion: 'Esta acción no se puede deshacer.',
                ),
                const SizedBox(height: 28),
                SeccionFormulario(
                  titulo: 'Qué pasará',
                  icono: Icons.info_outline_rounded,
                  children: [
                    _punto(
                      Icons.person_off_outlined,
                      'Se borran tu nombre, correo, teléfono y foto. Ya no podrás iniciar sesión.',
                    ),
                    _punto(
                      Icons.bookmark_remove_outlined,
                      'Se cancelan tus reservas activas y se borran tus favoritos.',
                    ),
                    _punto(
                      Icons.receipt_long_outlined,
                      'Tus compras y comprobantes se conservan solo porque la ley tributaria lo exige.',
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                SeccionFormulario(
                  titulo: 'Confirmación',
                  icono: Icons.key_outlined,
                  indice: 2,
                  children: [
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscure,
                      autofillHints: const [AutofillHints.password],
                      decoration: InputDecoration(
                        labelText: 'Contraseña',
                        prefixIcon: const Icon(Icons.lock_outline_rounded),
                        suffixIcon: IconButton(
                          tooltip: _obscure
                              ? 'Mostrar contraseña'
                              : 'Ocultar contraseña',
                          icon: Icon(
                            _obscure
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      validator: (value) => (value ?? '').isEmpty
                          ? 'Ingresa tu contraseña'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _confirmacionController,
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(
                        labelText: 'Escribe ELIMINAR para confirmar',
                        prefixIcon: Icon(Icons.warning_amber_rounded),
                      ),
                      onFieldSubmitted: (_) => _eliminar(),
                      validator: (value) =>
                          (value ?? '').trim().toUpperCase() == 'ELIMINAR'
                          ? null
                          : 'Escribe ELIMINAR para confirmar',
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
                            onPressed: _eliminar,
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.error,
                            ),
                            icon: const Icon(
                              Icons.delete_forever_outlined,
                              size: 20,
                            ),
                            label: const Text('Eliminar mi cuenta'),
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
}
