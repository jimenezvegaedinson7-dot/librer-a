import 'package:flutter/material.dart';

import '../services/tema_controller.dart';
import '../utils/app_colors.dart';
import '../utils/perfil_fondos.dart';

/// Pantalla "Fondo y tarjetas": elige el color de fondo de las pantallas y
/// el de las tarjetas, con una vista previa antes de aplicarlo. Nada cambia
/// en la app hasta pulsar "Aplicar"; "Volver" sale sin cambios.
class FondosScreen extends StatefulWidget {
  const FondosScreen({super.key});

  @override
  State<FondosScreen> createState() => _FondosScreenState();
}

class _FondosScreenState extends State<FondosScreen> {
  late FondoApp _seleccion = TemaController.instance.fondo;

  bool get _cambio => _seleccion.id != TemaController.instance.fondo.id;

  Future<void> _aplicar() async {
    await TemaController.instance.aplicarFondo(_seleccion.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Fondo «${_seleccion.nombre}» aplicado.')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Volver',
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('Fondo y tarjetas'),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                children: [
                  Text('Vista previa', style: textTheme.titleMedium),
                  const SizedBox(height: 10),
                  _VistaPrevia(fondo: _seleccion),
                  const SizedBox(height: 22),
                  Text('Elige una combinación', style: textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Text(
                    'Fondo de las pantallas y color de las tarjetas.',
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 14),
                  for (final (titulo, conColor) in const [
                    ('Suaves', false),
                    ('Con color', true),
                  ]) ...[
                    Row(
                      children: [
                        Icon(
                          conColor
                              ? Icons.palette_outlined
                              : Icons.light_mode_outlined,
                          size: 18,
                          color: AppColors.gold,
                        ),
                        const SizedBox(width: 6),
                        Text(titulo, style: textTheme.labelLarge),
                      ],
                    ),
                    const SizedBox(height: 10),
                    GridView.count(
                      crossAxisCount: 4,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 10,
                      childAspectRatio: 0.7,
                      children: [
                        for (final fondo in fondosApp.where(
                          (f) => f.conColor == conColor,
                        ))
                          _OpcionFondo(
                            fondo: fondo,
                            seleccionado: fondo.id == _seleccion.id,
                            onTap: () => setState(() => _seleccion = fondo),
                          ),
                      ],
                    ),
                    const SizedBox(height: 18),
                  ],
                ],
              ),
            ),
            // Acciones fijas abajo: aplicar o volver sin cambios.
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: AppColors.divider)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 50),
                      ),
                      child: const Text('Volver'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _cambio ? _aplicar : null,
                      icon: const Icon(Icons.check_rounded, size: 20),
                      label: const Text('Aplicar'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 50),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Maqueta de una pantalla de la app pintada con el fondo elegido.
class _VistaPrevia extends StatelessWidget {
  final FondoApp fondo;
  const _VistaPrevia({required this.fondo});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    Widget tarjeta({required double alto, required double ancho}) => Container(
      height: alto,
      width: ancho,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: fondo.tarjeta,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.divider.withValues(alpha: 0.7)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 8,
            width: ancho * 0.55,
            decoration: BoxDecoration(
              color: AppColors.textPrimary.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(height: 6),
          Container(
            height: 6,
            width: ancho * 0.4,
            decoration: BoxDecoration(
              color: AppColors.textSecondary.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const Spacer(),
          Container(
            height: 18,
            width: 58,
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(9),
            ),
          ),
        ],
      ),
    );

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: fondo.fondo,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.dividerStrong),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Mis reservas',
            style: textTheme.titleLarge?.copyWith(color: AppColors.textPrimary),
          ),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, c) {
              final ancho = (c.maxWidth - 12) / 2;
              return Column(
                children: [
                  Row(
                    children: [
                      tarjeta(alto: 96, ancho: ancho),
                      const SizedBox(width: 12),
                      tarjeta(alto: 96, ancho: ancho),
                    ],
                  ),
                  const SizedBox(height: 12),
                  tarjeta(alto: 70, ancho: c.maxWidth),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

/// Muestra de una combinación: el fondo con una tarjeta encima y su nombre.
class _OpcionFondo extends StatelessWidget {
  final FondoApp fondo;
  final bool seleccionado;
  final VoidCallback onTap;

  const _OpcionFondo({
    required this.fondo,
    required this.seleccionado,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: seleccionado,
      label: 'Fondo ${fondo.nombre}',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Column(
          children: [
            Expanded(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: double.infinity,
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: fondo.fondo,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: seleccionado ? AppColors.primary : AppColors.divider,
                    width: seleccionado ? 2.5 : 1,
                  ),
                ),
                child: Stack(
                  children: [
                    Align(
                      alignment: Alignment.bottomCenter,
                      child: Container(
                        height: 34,
                        padding: const EdgeInsets.all(6),
                        alignment: Alignment.bottomLeft,
                        decoration: BoxDecoration(
                          color: fondo.tarjeta,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: AppColors.divider.withValues(alpha: 0.7),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        // Un toque del color del tema elegido.
                        child: Container(
                          height: 6,
                          width: 22,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                    ),
                    if (seleccionado)
                      Align(
                        alignment: Alignment.topRight,
                        child: Icon(
                          Icons.check_circle_rounded,
                          size: 20,
                          color: AppColors.primary,
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              fondo.nombre,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelMedium,
            ),
          ],
        ),
      ),
    );
  }
}
