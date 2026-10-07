import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../utils/app_colors.dart';

/// Una única entrada permite pegar y autocompletar los seis dígitos. Las
/// casillas visibles reparten el ancho disponible y centran cada número.
class CampoOtp extends StatefulWidget {
  final TextEditingController controller;
  final bool enabled;
  final VoidCallback? onSubmitted;

  /// El código fue aceptado: las casillas pasan a verde.
  final bool exito;

  /// Cuenta de intentos rechazados: cada vez que aumenta, las casillas
  /// tiemblan para indicar que el código no era correcto.
  final int fallos;
  const CampoOtp({
    super.key,
    required this.controller,
    this.enabled = true,
    this.onSubmitted,
    this.exito = false,
    this.fallos = 0,
  });
  @override
  State<CampoOtp> createState() => _CampoOtpState();
}

class _CampoOtpState extends State<CampoOtp> {
  final _focus = FocusNode();
  final _field = GlobalKey<FormFieldState<String>>();
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_cambio);
    _focus.addListener(_cambio);
  }

  void _cambio() {
    if (!mounted) return;
    _field.currentState?.didChange(widget.controller.text);
    setState(() {});
  }

  @override
  void dispose() {
    widget.controller.removeListener(_cambio);
    _focus.removeListener(_cambio);
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final altura = math.max(
      56.0,
      MediaQuery.textScalerOf(context).scale(24) * 1.5 + 16,
    );
    final texto = widget.controller.text;
    final actual = widget.controller.selection.extentOffset.clamp(0, 5);
    final sinAnimacion = MediaQuery.disableAnimationsOf(context);
    return FormField<String>(
      key: _field,
      initialValue: texto,
      validator: (_) => RegExp(r'^\d{6}$').hasMatch(widget.controller.text)
          ? null
          : 'Ingresa los 6 dígitos del código',
      builder: (campo) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Código de 6 dígitos'),
          const SizedBox(height: 8),
          SizedBox(
            height: altura,
            child: Stack(
              children: [
                ExcludeSemantics(
                  child: TweenAnimationBuilder<double>(
                    // Cambiar la clave reinicia el temblor en cada fallo.
                    key: ValueKey('otp-temblor-${widget.fallos}'),
                    tween: Tween(begin: widget.fallos == 0 ? 1 : 0, end: 1),
                    duration: sinAnimacion
                        ? Duration.zero
                        : const Duration(milliseconds: 420),
                    builder: (_, v, hijo) => Transform.translate(
                      offset: Offset(
                        math.sin(v * math.pi * 6) * 9 * (1 - v),
                        0,
                      ),
                      child: hijo,
                    ),
                    child: Row(
                      children: List.generate(6, (i) {
                        final lleno = i < texto.length;
                        final activa =
                            _focus.hasFocus && i == actual && !widget.exito;
                        final borde = widget.exito
                            ? AppColors.success
                            : campo.hasError || widget.fallos > 0 && !lleno
                            ? colors.error
                            : activa
                            ? colors.primary
                            : lleno
                            ? colors.primary.withValues(alpha: 0.45)
                            : colors.outlineVariant;
                        return Expanded(
                          child: Padding(
                            padding: EdgeInsets.only(right: i == 5 ? 0 : 8),
                            child: AnimatedContainer(
                              duration: sinAnimacion
                                  ? Duration.zero
                                  : Duration(
                                      milliseconds:
                                          180 + (widget.exito ? i * 40 : 0),
                                    ),
                              curve: Curves.easeOutCubic,
                              key: ValueKey('otp-casilla-$i'),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: widget.exito
                                    ? AppColors.successContainer
                                    : lleno
                                    ? colors.primaryContainer.withValues(
                                        alpha: 0.35,
                                      )
                                    : colors.surfaceContainerHighest.withValues(
                                        alpha: 0.5,
                                      ),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: borde,
                                  width: activa || widget.exito ? 2 : 1.2,
                                ),
                              ),
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  // Cada dígito entra con un pequeño "pop".
                                  AnimatedSwitcher(
                                    duration: sinAnimacion
                                        ? Duration.zero
                                        : const Duration(milliseconds: 180),
                                    transitionBuilder: (hijo, anim) =>
                                        ScaleTransition(
                                          scale: CurvedAnimation(
                                            parent: anim,
                                            curve: Curves.easeOutBack,
                                          ),
                                          child: FadeTransition(
                                            opacity: anim,
                                            child: hijo,
                                          ),
                                        ),
                                    child: Text(
                                      lleno ? texto[i] : '',
                                      key: ValueKey(
                                        'otp-$i-${lleno ? texto[i] : ''}',
                                      ),
                                      style: Theme.of(context)
                                          .textTheme
                                          .headlineSmall
                                          ?.copyWith(
                                            fontWeight: FontWeight.w700,
                                            height: 1,
                                            color: widget.exito
                                                ? AppColors.success
                                                : colors.onSurface,
                                          ),
                                    ),
                                  ),
                                  // La casilla activa muestra una barra, como un cursor.
                                  if (activa && !lleno)
                                    Positioned(
                                      bottom: 12,
                                      child: Container(
                                        width: 18,
                                        height: 2.5,
                                        decoration: BoxDecoration(
                                          color: colors.primary,
                                          borderRadius: BorderRadius.circular(
                                            2,
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),
                Positioned.fill(
                  child: Opacity(
                    opacity: 0,
                    alwaysIncludeSemantics: true,
                    child: TextField(
                      key: const ValueKey('otp-entrada'),
                      controller: widget.controller,
                      focusNode: _focus,
                      enabled: widget.enabled,
                      autofocus: true,
                      keyboardType: TextInputType.number,
                      textInputAction: TextInputAction.done,
                      autofillHints: const [AutofillHints.oneTimeCode],
                      autocorrect: false,
                      enableSuggestions: false,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(6),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'Código de 6 dígitos',
                        border: InputBorder.none,
                        counterText: '',
                      ),
                      onSubmitted: (_) => widget.onSubmitted?.call(),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (campo.hasError)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                campo.errorText!,
                style: TextStyle(color: colors.error),
              ),
            ),
        ],
      ),
    );
  }
}
