import 'package:flutter/material.dart';

import '../../models/usuario.dart';
import '../../services/api_service.dart';
import '../../widgets/aparecer.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/formulario_cuenta.dart';

/// Pantalla para editar los datos del perfil del cliente.
///
/// Envía `PUT /usuarios/perfil` y, al guardarse, hace `pop(true)` para que el
/// Perfil se refresque y guarde los datos actualizados.
class EditarPerfilScreen extends StatefulWidget {
  final Usuario usuario;

  const EditarPerfilScreen({super.key, required this.usuario});

  @override
  State<EditarPerfilScreen> createState() => _EditarPerfilScreenState();
}

class _EditarPerfilScreenState extends State<EditarPerfilScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nombreController;
  late final TextEditingController _apellidoController;
  late final TextEditingController _emailController;
  late final TextEditingController _telefonoController;

  bool _loading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _nombreController = TextEditingController(
      text: widget.usuario.nombre ?? '',
    );
    _apellidoController = TextEditingController(
      text: widget.usuario.apellido ?? '',
    );
    _emailController = TextEditingController(text: widget.usuario.email ?? '');
    _telefonoController = TextEditingController(
      text: widget.usuario.telefono ?? '',
    );
  }

  @override
  void dispose() {
    _nombreController.dispose();
    _apellidoController.dispose();
    _emailController.dispose();
    _telefonoController.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    FocusScope.of(context).unfocus();
    setState(() => _errorMessage = null);

    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiService.instance.actualizarPerfil(
        nombre: _nombreController.text.trim(),
        apellido: _apellidoController.text.trim(),
        email: _emailController.text.trim(),
        telefono: _telefonoController.text.trim().isEmpty
            ? null
            : _telefonoController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Perfil actualizado correctamente.')),
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

  /// Iniciales para el medallón (se actualizan al escribir).
  String get _iniciales {
    final n = _nombreController.text.trim();
    final a = _apellidoController.text.trim();
    final letras = '${n.isEmpty ? '' : n[0]}${a.isEmpty ? '' : a[0]}';
    return letras.isEmpty ? '?' : letras.toUpperCase();
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
                // Vista previa en vivo del nombre mientras se escribe.
                ListenableBuilder(
                  listenable: Listenable.merge([
                    _nombreController,
                    _apellidoController,
                  ]),
                  builder: (context, _) {
                    final nombre =
                        '${_nombreController.text.trim()} '
                                '${_apellidoController.text.trim()}'
                            .trim();
                    return CabeceraFormulario(
                      medallon: Iniciales(_iniciales),
                      antetitulo: 'Tu cuenta',
                      titulo: nombre.isEmpty ? 'Editar perfil' : nombre,
                      descripcion:
                          'Mantén tus datos al día para tus compras y avisos.',
                    );
                  },
                ),
                const SizedBox(height: 28),
                SeccionFormulario(
                  titulo: 'Datos personales',
                  icono: Icons.badge_outlined,
                  children: [
                    TextFormField(
                      controller: _nombreController,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
                      decoration: _inputDecoration(
                        label: 'Nombre',
                        icon: Icons.person_outline_rounded,
                      ),
                      validator: (value) {
                        if ((value ?? '').trim().isEmpty) {
                          return 'Ingresa tu nombre';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _apellidoController,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
                      decoration: _inputDecoration(
                        label: 'Apellido',
                        icon: Icons.person_outline_rounded,
                      ),
                      validator: (value) {
                        if ((value ?? '').trim().isEmpty) {
                          return 'Ingresa tu apellido';
                        }
                        return null;
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                SeccionFormulario(
                  titulo: 'Contacto',
                  icono: Icons.contact_mail_outlined,
                  indice: 2,
                  children: [
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      autocorrect: false,
                      decoration: _inputDecoration(
                        label: 'Correo electrónico',
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
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _telefonoController,
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _guardar(),
                      decoration: _inputDecoration(
                        label: 'Teléfono (opcional)',
                        icon: Icons.phone_outlined,
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
                            onPressed: _guardar,
                            icon: const Icon(Icons.check_rounded, size: 20),
                            label: const Text('Guardar cambios'),
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

  InputDecoration _inputDecoration({
    required String label,
    required IconData icon,
  }) {
    return InputDecoration(labelText: label, prefixIcon: Icon(icon));
  }
}
