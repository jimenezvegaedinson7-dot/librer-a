import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../utils/app_colors.dart';
import '../utils/formats.dart';

/// Precio con el símbolo "S/" más pequeño que el importe, para que la cifra
/// sea lo primero que se lea (patrón comercial).
class PrecioTexto extends StatelessWidget {
  final num? monto;
  final double tamano;
  final Color? color;
  final FontWeight peso;

  const PrecioTexto({
    super.key,
    required this.monto,
    this.tamano = 17,
    this.color,
    this.peso = FontWeight.w700,
  });

  @override
  Widget build(BuildContext context) {
    final tinta = color ?? AppColors.price;
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: 'S/ ',
            style: GoogleFonts.inter(
              fontSize: tamano * 0.66,
              fontWeight: FontWeight.w600,
              color: tinta,
            ),
          ),
          TextSpan(
            text: Formats.precio(monto?.toDouble()),
            style: GoogleFonts.inter(
              fontSize: tamano,
              fontWeight: peso,
              color: tinta,
              letterSpacing: -0.3,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}
