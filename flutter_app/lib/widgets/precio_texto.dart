import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../utils/app_colors.dart';
import '../utils/formats.dart';
import '../models/libro.dart';
import '../utils/app_tokens.dart';

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
        if (libro.enOferta) ...[
          Wrap(
            spacing: 6,
            runSpacing: 3,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: colorOferta,
                  borderRadius: BorderRadius.circular(Radios.xs),
                ),
                child: Text(
                  libro.porcentajeOferta > 0
                      ? '−${libro.porcentajeOferta}%'
                      : 'Oferta',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: color != null && color!.computeLuminance() > 0.5
                        ? AppColors.tinta
                        : Colors.white,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
              Text(
                'S/ ${Formats.precio(libro.precio)}',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color ?? AppColors.textSecondary,
                  decoration: TextDecoration.lineThrough,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
        ],
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: PrecioTexto(
            monto: libro.precioCompra,
            tamano: tamano,
            color: libro.enOferta ? colorOferta : color,
            subrayado: libro.enOferta,
            peso: peso,
          ),
        ),
      ],
    );
  }
}

/// Precio con el símbolo "S/" del mismo tamaño y peso que el importe, para
/// que se lea como una sola cifra (también en las ofertas).
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
              fontSize: tamano,
              fontWeight: peso,
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
