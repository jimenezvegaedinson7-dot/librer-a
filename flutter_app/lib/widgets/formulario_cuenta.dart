import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import '../utils/app_tokens.dart';
import 'aparecer.dart';

/// Cabecera de los formularios de la cuenta (Editar perfil, Cambiar
/// contraseña): medallón burdeos con anillo dorado, antetítulo, título serif
/// y una descripción breve.
class CabeceraFormulario extends StatelessWidget {
  final Widget medallon;
  final String antetitulo;
  final String titulo;
  final String descripcion;

  const CabeceraFormulario({
    super.key,
    required this.medallon,
    required this.antetitulo,
    required this.titulo,
    required this.descripcion,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Aparecer(
      desplazamiento: 18,
      child: Column(
        children: [
          Container(
            width: 104,
            height: 104,
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.dorado.withValues(alpha: 0.55),
                width: 1.5,
              ),
            ),
            child: DecoratedBox(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryDark.withValues(alpha: 0.35),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Center(child: medallon),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            antetitulo.toUpperCase(),
            style: textTheme.labelSmall?.copyWith(
              color: AppColors.gold,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.6,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            titulo,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: textTheme.headlineMedium,
          ),
          const SizedBox(height: 6),
          Text(
            descripcion,
            textAlign: TextAlign.center,
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Iniciales en serif para el medallón del perfil.
class Iniciales extends StatelessWidget {
  final String texto;

  const Iniciales(this.texto, {super.key});

  @override
  Widget build(BuildContext context) {
    return Text(
      texto,
      style: AppTheme.serif(
        fontSize: 34,
        color: Colors.white,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}

/// Bloque de un formulario: título de sección pequeño y los campos dentro
/// de una superficie blanca suave.
class SeccionFormulario extends StatelessWidget {
  final String titulo;
  final IconData icono;
  final List<Widget> children;
  final int indice;

  const SeccionFormulario({
    super.key,
    required this.titulo,
    required this.icono,
    required this.children,
    this.indice = 1,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Aparecer(
      indice: indice,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icono, size: 16, color: AppColors.gold),
              const SizedBox(width: 8),
              Text(
                titulo.toUpperCase(),
                style: textTheme.labelSmall?.copyWith(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.fromLTRB(14, 16, 14, 16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(Radios.lg),
              border: Border.all(color: AppColors.divider),
              boxShadow: Sombra.tarjeta,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: children,
            ),
          ),
        ],
      ),
    );
  }
}
