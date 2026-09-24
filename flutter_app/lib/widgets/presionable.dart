import 'package:flutter/material.dart';

import '../utils/app_tokens.dart';

/// Envuelve un elemento táctil y lo reduce levemente al presionarlo.
///
/// Microinteracción de respuesta (escala 0.97, ~140 ms). No captura el toque:
/// el hijo sigue gestionando su propio `onTap`/`InkWell`.
class Presionable extends StatefulWidget {
  final Widget child;
  final double escala;
  final bool habilitado;

  const Presionable({
    super.key,
    required this.child,
    this.escala = 0.97,
    this.habilitado = true,
  });

  @override
  State<Presionable> createState() => _PresionableState();
}

class _PresionableState extends State<Presionable> {
  bool _presionado = false;

  void _cambiar(bool valor) {
    if (!widget.habilitado || _presionado == valor) return;
    setState(() => _presionado = valor);
  }

  @override
  Widget build(BuildContext context) {
    final escala = _presionado && !reducirMovimiento(context)
        ? widget.escala
        : 1.0;
    return Listener(
      onPointerDown: (_) => _cambiar(true),
      onPointerUp: (_) => _cambiar(false),
      onPointerCancel: (_) => _cambiar(false),
      child: AnimatedScale(
        scale: escala,
        duration: const Duration(milliseconds: 140),
        curve: Curva.salida,
        child: widget.child,
      ),
    );
  }
}
