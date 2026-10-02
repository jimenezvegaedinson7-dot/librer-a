import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../utils/app_colors.dart';
import '../utils/formats.dart';
import '../models/libro.dart';

/// Mantiene la tipografía del precio existente; agrega la referencia anterior
/// únicamente cuando hay una rebaja real.
class PrecioLibro extends StatelessWidget {
  final Libro libro;
  final double tamano;
  final Color? color;
  final FontWeight peso;
  const PrecioLibro({
    super.key,
    required this.libro,
    this.tamano = 17,
    this.color,
    this.peso = FontWeight.w700,
  });

  @override
  Widget build(BuildContext context) {
    final colorOferta = color != null && color!.computeLuminance() > 0.5
        ? AppColors.ofertaSobreOscuro
        : AppColors.oferta;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (libro.enOferta)
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: 'S/ ${Formats.precio(libro.precio)}',
                  style: const TextStyle(
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
                TextSpan(
                  text: ' · −${libro.porcentajeOferta}%',
                  style: TextStyle(
                    color: colorOferta,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall
                ?.copyWith(color: color ?? AppColors.textSecondary),
          ),
        PrecioTexto(
          monto: libro.precioCompra,
          tamano: tamano,
          color: libro.enOferta ? colorOferta : color,
          subrayado: libro.enOferta,
          peso: peso,
        ),
      ],
    );
  }
}

/// Precio con el símbolo "S/" más pequeño que el importe, para que la cifra
/// sea lo primero que se lea (patrón comercial).
class PrecioTexto extends StatelessWidget {
  final num? monto;
  final double tamano;
  final Color? color;
  final FontWeight peso;
  final bool subrayado;

  const PrecioTexto({
    super.key,
    required this.monto,
    this.tamano = 17,
    this.color,
    this.peso = FontWeight.w700,
    this.subrayado = false,
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
              decoration: subrayado
                  ? TextDecoration.underline
                  : TextDecoration.none,
            ),
          ),
          TextSpan(
            text: Formats.precio(monto?.toDouble()),
            style: GoogleFonts.inter(
              fontSize: tamano,
              fontWeight: peso,
              color: tinta,
              decoration: subrayado
                  ? TextDecoration.underline
                  : TextDecoration.none,
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
