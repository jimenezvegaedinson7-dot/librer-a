import 'package:flutter/material.dart';

import '../services/tema_controller.dart';
import '../utils/app_colors.dart';
import '../utils/perfil_fondos.dart';
import '../utils/app_tokens.dart';

/// Adaptación de BackgroundsView (Swift): selección local, vista previa y
/// tarjetas adaptables. La preferencia global cambia únicamente al aplicar.
class FondosScreen extends StatefulWidget {
  const FondosScreen({super.key});
  @override
  State<FondosScreen> createState() => _FondosScreenState();
}

class _FondosScreenState extends State<FondosScreen> {
  late FondoApp _seleccion = TemaController.instance.fondo;
  bool _guardando = false;
  bool get _cambio => _seleccion.id != TemaController.instance.fondo.id;

  Future<void> _aplicar() async {
    if (!_cambio || _guardando) return;
    setState(() => _guardando = true);
    await TemaController.instance.aplicarFondo(_seleccion.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Fondo «${_seleccion.nombre}» aplicado.')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: _seleccion.fondo,
      appBar: AppBar(
        title: const Text('Fondo y tarjetas'),
        backgroundColor: _seleccion.fondo,
      ),
      body: SafeArea(
        top: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                    children: [
                      Text('Vista previa', style: texto.titleMedium),
                      const SizedBox(height: 12),
                      _VistaPrevia(fondo: _seleccion),
                      const SizedBox(height: 24),
                      Text('Elige una combinación', style: texto.titleMedium),
                      const SizedBox(height: 4),
                      Text(
                        'Prueba el fondo y las tarjetas. Se guardarán al pulsar Aplicar.',
                        style: texto.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 20),
                      for (final (titulo, conColor) in const [
                        ('Suaves', false),
                        ('Con color', true),
                      ]) ...[
                        Text(titulo, style: texto.titleSmall),
                        const SizedBox(height: 12),
                        LayoutBuilder(
                          builder: (context, c) {
                            final columnas = (c.maxWidth / 116).floor().clamp(
                              2,
                              6,
                            );
                            final ancho =
                                (c.maxWidth - 12 * (columnas - 1)) / columnas;
                            return Wrap(
                              spacing: 12,
                              runSpacing: 16,
                              children: [
                                for (final fondo in fondosApp.where(
                                  (f) => f.conColor == conColor,
                                ))
                                  SizedBox(
                                    width: ancho,
                                    child: _OpcionFondo(
                                      fondo: fondo,
                                      seleccionado: fondo.id == _seleccion.id,
                                      onTap: _guardando
                                          ? null
                                          : () => setState(
                                              () => _seleccion = fondo,
                                            ),
                                    ),
                                  ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 24),
                      ],
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    border: Border(top: BorderSide(color: AppColors.divider)),
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _cambio && !_guardando ? _aplicar : null,
                      icon: _guardando
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.check_rounded, size: 20),
                      label: Text(
                        _cambio
                            ? 'Aplicar «${_seleccion.nombre}»'
                            : 'Este es tu fondo actual',
                        textAlign: TextAlign.center,
                      ),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(0, 52),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _VistaPrevia extends StatelessWidget {
  final FondoApp fondo;
  const _VistaPrevia({required this.fondo});
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: AnimatedContainer(
      key: const ValueKey('vista-previa-fondo'),
      duration: reducirMovimiento(context)
          ? Duration.zero
          : const Duration(milliseconds: 250),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: fondo.fondo,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        children: [
          for (var i = 0; i < 2; i++)
            Padding(
              padding: EdgeInsets.only(bottom: i == 0 ? 10 : 0),
              child: Container(
                key: ValueKey('tarjeta-previa-$i'),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: fondo.tarjeta,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.divider),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 34,
                      height: 48,
                      decoration: BoxDecoration(
                        gradient: TemaController.instance.tema.gradiente,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          FractionallySizedBox(
                            widthFactor: i == 0 ? 0.75 : 0.55,
                            child: Container(
                              height: 8,
                              decoration: BoxDecoration(
                                color: AppColors.textPrimary.withValues(
                                  alpha: 0.75,
                                ),
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ),
                          const SizedBox(height: 7),
                          FractionallySizedBox(
                            widthFactor: 0.4,
                            child: Container(
                              height: 6,
                              decoration: BoxDecoration(
                                color: AppColors.textSecondary.withValues(
                                  alpha: 0.5,
                                ),
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

class _OpcionFondo extends StatelessWidget {
  final FondoApp fondo;
  final bool seleccionado;
  final VoidCallback? onTap;
  const _OpcionFondo({
    required this.fondo,
    required this.seleccionado,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: seleccionado,
    label: 'Fondo ${fondo.nombre}',
    child: InkWell(
      key: ValueKey('fondo-${fondo.id}'),
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Column(
          children: [
            AnimatedContainer(
              duration: reducirMovimiento(context)
                  ? Duration.zero
                  : const Duration(milliseconds: 200),
              height: 70,
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: fondo.fondo,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: seleccionado ? AppColors.primary : AppColors.divider,
                  width: seleccionado ? 2.5 : 1,
                ),
              ),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: fondo.tarjeta,
                        borderRadius: BorderRadius.circular(6),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (seleccionado)
                    Positioned(
                      right: -8,
                      top: -8,
                      child: DecoratedBox(
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.check_circle_rounded,
                          size: 22,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              fondo.nombre,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                fontWeight: seleccionado ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
