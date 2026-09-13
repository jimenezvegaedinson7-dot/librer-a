import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../services/api_service.dart';
import '../../utils/app_colors.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/error_view.dart';
import '../../widgets/loading_view.dart';

/// Pantalla para activar el doble factor (Google Authenticator).
///
/// Al abrirse llama a `POST /auth/2fa/setup` para obtener el secreto y el QR
/// (data URL base64). El usuario escanea el QR en Google Authenticator e
/// introduce el código de 6 dígitos para confirmar (`/auth/2fa/confirm`).
///
/// Nunca se guarda el secreto ni el código en almacenamiento permanente.
class TwoFactorSetupScreen extends StatefulWidget {
  const TwoFactorSetupScreen({super.key});

  @override
  State<TwoFactorSetupScreen> createState() => _TwoFactorSetupScreenState();
}

class _TwoFactorSetupScreenState extends State<TwoFactorSetupScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _setup;

  final _otpController = TextEditingController();
  bool _confirming = false;
  bool _confirmed = false;
  String? _confirmError;

  @override
  void initState() {
    super.initState();
    _cargarSetup();
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _cargarSetup() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final setup = await ApiService.instance.setupTwoFactor();
      if (mounted) setState(() => _setup = setup);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'No se pudo iniciar la configuración.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _confirmar() async {
    FocusScope.of(context).unfocus();
    setState(() => _confirmError = null);
    final codigo = _otpController.text.trim();
    if (codigo.length != 6) {
      setState(() => _confirmError = 'El código debe tener 6 dígitos');
      return;
    }

    setState(() => _confirming = true);
    try {
      await ApiService.instance.confirmarTwoFactor(codigo: codigo);
      if (!mounted) return;
      setState(() {
        _confirmed = true;
        _confirming = false;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _confirmError = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _confirmError = 'Ocurrió un error. Inténtalo de nuevo.');
      }
    } finally {
      if (mounted && !_confirmed) setState(() => _confirming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(title: const Text('Doble factor')),
      body: SafeArea(top: false, child: _buildBody(context)),
    );
  }

  Widget _buildBody(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    if (_confirmed) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.verified_rounded,
                size: 72,
                color: AppColors.success,
              ),
              const SizedBox(height: 20),
              Text(
                'Activado correctamente',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'A partir de ahora necesitarás un código de Google '
                'Authenticator para iniciar sesión.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium
                    ?.copyWith(color: AppColors.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Listo'),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_loading) {
      return const LoadingView(message: 'Preparando tu configuración...');
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _cargarSetup);
    }

    final setup = _setup!;
    final qrDataUrl = setup['qr']?.toString() ?? '';
    final secret = setup['secret']?.toString() ?? '';

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Activar verificación en dos pasos',
            style: Theme.of(context).textTheme.titleLarge
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Text(
            'Escanea el código QR con la aplicación Google Authenticator '
            'y luego ingresa el código de 6 dígitos para confirmar.',
            style: Theme.of(context).textTheme.bodyMedium
                ?.copyWith(color: colorScheme.onSurfaceVariant, height: 1.4),
          ),
          const SizedBox(height: 28),

          // QR
          Center(child: _QrImage(dataUrl: qrDataUrl)),
          const SizedBox(height: 20),

          // Secreto manual
          if (secret.isNotEmpty) ...[
            Card(
              color: AppColors.surface,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Si no puedes escanear el QR, ingresa esta clave en '
                      'Google Authenticator (cuenta: '
                      '${setup['email'] ?? ''}):',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: SelectableText(
                            secret,
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(
                                  fontFamily: 'monospace',
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy_rounded),
                          tooltip: 'Copiar',
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: secret));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Clave copiada')),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Campo confirmación
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
            style: Theme.of(context).textTheme.headlineSmall
                ?.copyWith(letterSpacing: 8, fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              labelText: 'Código de 6 dígitos',
              prefixIcon: const Icon(Icons.pin_rounded),
            ),
            onFieldSubmitted: (_) => _confirmar(),
          ),

          if (_confirmError != null) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: _confirmError!),
          ],

          const SizedBox(height: 24),

          // Botón activar
          SizedBox(
            height: 54,
            child: _confirming
                ? const Center(child: CircularProgressIndicator())
                : FilledButton(
                    onPressed: _confirmar,
                    child: const Text('Activar doble factor'),
                  ),
          ),
        ],
      ),
    );
  }
}

/// Muestra el QR a partir de un data URL base64 (`data:image/png;base64,...`).
class _QrImage extends StatelessWidget {
  final String dataUrl;
  const _QrImage({required this.dataUrl});

  @override
  Widget build(BuildContext context) {
    if (dataUrl.isEmpty) {
      return Container(
        width: 220,
        height: 220,
        color: AppColors.surfaceElevated,
        child: const Icon(
          Icons.qr_code_2_rounded,
          size: 96,
          color: AppColors.textTertiary,
        ),
      );
    }

    final idx = dataUrl.indexOf(',');
    Uint8List? bytes;
    if (idx >= 0) {
      final base64 = dataUrl.substring(idx + 1);
      try {
        bytes = base64Decode(base64);
      } catch (_) {
        bytes = null;
      }
    }

    if (bytes == null || bytes.isEmpty) {
      return Container(
        width: 220,
        height: 220,
        color: AppColors.surfaceElevated,
        child: const Icon(
          Icons.qr_code_2_rounded,
          size: 96,
          color: AppColors.textTertiary,
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.divider),
      ),
      child: Image.memory(bytes, width: 200, height: 200, fit: BoxFit.contain),
    );
  }
}
