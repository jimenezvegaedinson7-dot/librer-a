import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import 'app_page_header.dart';

/// Sección de un documento legal: título y cuerpo en lenguaje claro.
class LegalSeccion {
  final String titulo;
  final String texto;

  const LegalSeccion({required this.titulo, required this.texto});
}

/// Pantalla base para documentos legales (Términos y Condiciones y Política
/// de Privacidad) con el mismo estilo editorial de la aplicación.
class LegalDocumento extends StatelessWidget {
  final String titulo;
  final String fechaActualizacion;
  final List<LegalSeccion> secciones;

  const LegalDocumento({
    super.key,
    required this.titulo,
    required this.fechaActualizacion,
    required this.secciones,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: Navigator.of(context).canPop() ? AppBar(toolbarHeight: 52) : null,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            AppPageHeader(
              eyebrow: 'Legal',
              title: titulo,
              titleColor: AppColors.textPrimary,
            ),
            const SizedBox(height: 10),
            Text(
              'Última actualización: $fechaActualizacion',
              style: textTheme.bodySmall?.copyWith(
                color: AppColors.textTertiary,
              ),
            ),
            const SizedBox(height: 20),
            for (final seccion in secciones) ...[
              _SeccionLegal(seccion: seccion),
              const SizedBox(height: 14),
            ],
            const SizedBox(height: 8),
            Center(
              child: Text(
                '© 2026 Librería. Todos los derechos reservados.',
                textAlign: TextAlign.center,
                style: textTheme.bodySmall?.copyWith(
                  color: AppColors.textTertiary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SeccionLegal extends StatelessWidget {
  final LegalSeccion seccion;

  const _SeccionLegal({required this.seccion});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 3,
                height: 18,
                margin: const EdgeInsets.only(top: 3),
                decoration: BoxDecoration(
                  color: AppColors.secondary,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  seccion.titulo,
                  style: textTheme.titleMedium?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            seccion.texto,
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }
}
