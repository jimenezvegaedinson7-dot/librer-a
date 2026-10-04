import 'package:flutter/material.dart';
import '../models/libro.dart';
import '../utils/app_colors.dart';

/// La imagen no cambia el ISBN ni la edición del producto ofrecido.
class AvisoPortadaReferencia extends StatelessWidget {
  final Libro libro;
  final bool detallado;
  const AvisoPortadaReferencia({super.key, required this.libro, this.detallado = false});

  @override
  Widget build(BuildContext context) {
    if (!libro.portadaEsReferencia) return const SizedBox.shrink();
    final edicion = libro.portadaEdicionReferencia;
    final datos = [edicion?['edicion'], edicion?['isbn']]
        .where((e) => e != null && e.toString().trim().isNotEmpty).join(' · ');
    final mensaje = 'Portada de referencia de otra edición.'
        '${datos.isEmpty ? '' : ' Imagen: $datos.'} '
        'El ISBN del libro ofrecido es ${libro.isbn ?? 'el indicado en la ficha'}.';
    if (detallado) {
      return Text(mensaje, style: Theme.of(context).textTheme.bodySmall
          ?.copyWith(color: AppColors.textSecondary));
    }
    return Tooltip(message: mensaje, child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(color: AppColors.paper,
          borderRadius: BorderRadius.circular(4)),
      child: const Text('Portada referencial',
          style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
    ));
  }
}
