import 'package:flutter/material.dart';

import '../../models/usuario.dart';
import '../../services/api_service.dart';
import '../../utils/app_colors.dart';
import '../../utils/app_theme.dart';
import '../../widgets/error_banner.dart';

enum CampoPerfil { nombre, correo, telefono }

class EditarPerfilScreen extends StatefulWidget {
  final Usuario usuario;
  final CampoPerfil campo;

  const EditarPerfilScreen({
    super.key,
    required this.usuario,
    required this.campo,
  });

  @override
  State<EditarPerfilScreen> createState() => _EditarPerfilScreenState();
}

class _EditarPerfilScreenState extends State<EditarPerfilScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _valor;
  late final TextEditingController _apellido;
  bool _guardando = false;
  String? _error;

  String get _titulo => switch (widget.campo) {
    CampoPerfil.nombre => 'Editar nombre',
    CampoPerfil.correo => 'Editar correo',
    CampoPerfil.telefono => 'Editar teléfono',
  };

  String get _inicial => switch (widget.campo) {
    CampoPerfil.nombre => widget.usuario.nombre ?? '',
    CampoPerfil.correo => widget.usuario.email ?? '',
    CampoPerfil.telefono => widget.usuario.telefono ?? '',
  };

  bool get _cambio =>
      _valor.text.trim() != _inicial.trim() ||
      (widget.campo == CampoPerfil.nombre &&
          _apellido.text.trim() != (widget.usuario.apellido ?? '').trim());

  @override
  void initState() {
    super.initState();
    _valor = TextEditingController(text: _inicial);
    _apellido = TextEditingController(text: widget.usuario.apellido ?? '');
  }

  @override
  void dispose() {
    _valor.dispose();
    _apellido.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    if (_guardando || !_cambio) return;
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _error = null;
      _guardando = true;
    });
    try {
      switch (widget.campo) {
        case CampoPerfil.nombre:
          await ApiService.instance.actualizarPerfil(
            nombre: _valor.text.trim(),
            apellido: _apellido.text.trim(),
          );
        case CampoPerfil.correo:
          await ApiService.instance.actualizarPerfil(email: _valor.text.trim());
        case CampoPerfil.telefono:
          await ApiService.instance.actualizarPerfil(
            telefono: _valor.text.trim().isEmpty ? null : _valor.text.trim(),
            actualizarTelefono: true,
          );
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'No pudimos guardar el cambio. Intenta nuevamente.',
        );
      }
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    final esNombre = widget.campo == CampoPerfil.nombre;
    final esCorreo = widget.campo == CampoPerfil.correo;
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        title: Text(
          _titulo,
          style: TextStyle(
            fontFamily: AppTheme.fontSans,
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      switch (widget.campo) {
                        CampoPerfil.nombre =>
                          'Actualiza tu nombre y apellidos.',
                        CampoPerfil.correo => 'Actualiza el correo que utilizas para acceder a tu cuenta.',
                        CampoPerfil.telefono => 'Actualiza tu número de contacto. Este dato es opcional.',
                      },
                      style: texto.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 28),
                    TextFormField(
                      key: ValueKey('campo-${widget.campo.name}'),
                      controller: _valor,
                      enabled: !_guardando,
                      maxLength: esNombre
                          ? 80
                          : esCorreo
                          ? 254
                          : 20,
                      keyboardType: esNombre
                          ? TextInputType.name
                          : esCorreo
                          ? TextInputType.emailAddress
                          : TextInputType.phone,
                      textCapitalization: esNombre
                          ? TextCapitalization.words
                          : TextCapitalization.none,
                      autocorrect: esNombre,
                      textInputAction: esNombre
                          ? TextInputAction.next
                          : TextInputAction.done,
                      autofillHints: [
                        esNombre
                            ? AutofillHints.givenName
                            : esCorreo
                            ? AutofillHints.email
                            : AutofillHints.telephoneNumber,
                      ],
                      decoration: InputDecoration(
                        labelText: esNombre
                            ? 'Nombre'
                            : esCorreo
                            ? 'Correo electrónico'
                            : 'Teléfono (opcional)',
                        counterText: '',
                      ),
                      validator: (value) {
                        final valor = (value ?? '').trim();
                        if (esNombre && valor.isEmpty) {
                          return 'Ingresa tu nombre';
                        }
                        if (esCorreo) {
                          if (valor.isEmpty) return 'Ingresa tu correo';
                          if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                              .hasMatch(valor)) {
                            return 'Ingresa un correo válido';
                          }
                        }
                        return null;
                      },
                      onFieldSubmitted: esNombre ? null : (_) => _guardar(),
                    ),
                    if (esNombre) ...[
                      const SizedBox(height: 20),
                      TextFormField(
                        key: const ValueKey('campo-apellido'),
                        controller: _apellido,
                        enabled: !_guardando,
                        maxLength: 80,
                        textCapitalization: TextCapitalization.words,
                        keyboardType: TextInputType.name,
                        autofillHints: const [AutofillHints.familyName],
                        textInputAction: TextInputAction.done,
                        decoration: const InputDecoration(
                          labelText: 'Apellidos',
                          counterText: '',
                        ),
                        validator: (value) => (value ?? '').trim().isEmpty
                            ? 'Ingresa tus apellidos'
                            : null,
                        onFieldSubmitted: (_) => _guardar(),
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 20),
                      ErrorBanner(message: _error!),
                    ],
                    const SizedBox(height: 32),
                    ListenableBuilder(
                      listenable: Listenable.merge([_valor, _apellido]),
                      builder: (_, _) => FilledButton(
                        onPressed: _guardando || !_cambio ? null : _guardar,
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 52),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 14,
                          ),
                        ),
                        child: Text(
                          _guardando ? 'Guardando…' : 'Guardar cambios',
                        ),
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
