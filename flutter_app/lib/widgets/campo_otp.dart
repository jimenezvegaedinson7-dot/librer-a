import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Una única entrada permite pegar y autocompletar los seis dígitos. Las
/// casillas visibles reparten el ancho disponible y centran cada número.
class CampoOtp extends StatefulWidget {
  final TextEditingController controller;
  final bool enabled;
  final VoidCallback? onSubmitted;
  const CampoOtp({
    super.key,
    required this.controller,
    this.enabled = true,
    this.onSubmitted,
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
                  child: Row(
                    children: List.generate(
                      6,
                      (i) => Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(right: i == 5 ? 0 : 8),
                          child: AnimatedContainer(
                            duration: MediaQuery.disableAnimationsOf(context)
                                ? Duration.zero
                                : const Duration(milliseconds: 160),
                            key: ValueKey('otp-casilla-$i'),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: colors.surface,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: campo.hasError
                                    ? colors.error
                                    : _focus.hasFocus && i == actual
                                    ? colors.primary
                                    : colors.outline,
                                width: _focus.hasFocus && i == actual ? 2 : 1,
                              ),
                            ),
                            child: Text(
                              i < texto.length ? texto[i] : '',
                              style: Theme.of(context).textTheme.headlineSmall
                                  ?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    height: 1,
                                  ),
                            ),
                          ),
                        ),
                      ),
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
