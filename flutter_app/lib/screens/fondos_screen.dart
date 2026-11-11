import 'package:flutter/material.dart';

import '../services/tema_controller.dart';
import '../utils/app_colors.dart';
import '../utils/perfil_fondos.dart';
import '../utils/app_tokens.dart';
import '../utils/perfil_temas.dart';
import '../widgets/apariencia_colores.dart';

/// Adaptación de BackgroundsView (Swift): selección local, vista previa y
/// tarjetas adaptables. La preferencia global cambia únicamente al aplicar.
class FondosScreen extends StatefulWidget {
  const FondosScreen({super.key});
  @override
  State<FondosScreen> createState() => _FondosScreenState();
}

class _FondosScreenState extends State<FondosScreen> {
  late FondoApp _seleccion = TemaController.instance.fondo;
  late PerfilTema _tema = TemaController.instance.tema;
  bool _guardando = false;
  bool get _cambio =>
      _seleccion.id != TemaController.instance.fondo.id ||
      _tema.id != TemaController.instance.id;

  Future<void> _combinar() async {
    final id = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      builder: (_) => EditorTemaApp(inicial: _tema),
    );
    if (id != null && mounted) setState(() => _tema = perfilTemaPorId(id));
  }

  void _verPrevia() {
    final fondo = _seleccion;
    final tema = _tema;
    Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          backgroundColor: fondo.fondo,
          appBar: AppBar(
            title: const Text('Vista previa'),
            backgroundColor: fondo.fondo,
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    fondo.nombre,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Prueba las tarjetas y los favoritos. Esta vista no modifica tu cuenta ni guarda la combinación.',
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Colores de la aplicación',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  VistaPreviaTemaApp(tema: tema, fondo: fondo),
                  const SizedBox(height: 24),
                  Text(
                    'Fondos y tarjetas',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  _VistaPrevia(fondo: fondo, tema: tema),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _aplicar() async {
    if (!_cambio || _guardando) return;
    setState(() => _guardando = true);
    await TemaController.instance.aplicarApariencia(
      temaId: _tema.id,
      fondoId: _seleccion.id,
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Colores, fondo y tarjetas actualizados.')),
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
                      Text(
                        'Tu aplicación, a tu estilo',
                        style: texto.headlineSmall,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Revisa las dos vistas previas. Los cambios se guardan juntos al pulsar Aplicar.',
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Colores de la aplicación',
                        style: texto.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      VistaPreviaTemaApp(tema: _tema, fondo: _seleccion),
                      const SizedBox(height: 24),
                      Text('Fondos y tarjetas', style: texto.titleMedium),
                      const SizedBox(height: 12),
                      _VistaPrevia(fondo: _seleccion, tema: _tema),
                      const SizedBox(height: 28),
                      Text('Personaliza tus colores', style: texto.titleMedium),
                      const SizedBox(height: 6),
                      const Text(
                        'Elige el tono de los botones, los iconos y la cabecera.',
                      ),
                      const SizedBox(height: 16),
                      SelectorTemasApp(
                        seleccionado: _tema,
                        onSeleccionar: _guardando
                            ? null
                            : (id) =>
                                  setState(() => _tema = perfilTemaPorId(id)),
                        onCombinar: _guardando ? null : _combinar,
                      ),
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextButton.icon(
                        onPressed: _guardando ? null : _verPrevia,
                        icon: const Icon(Icons.visibility_outlined),
                        label: const Text('Ver vista previa'),
                      ),
                      FilledButton.icon(
                        onPressed: _cambio && !_guardando ? _aplicar : null,
                        icon: _guardando
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.check_rounded, size: 20),
                        label: Text(
                          _cambio
                              ? 'Aplicar apariencia'
                              : 'Esta es tu apariencia actual',
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
                    ],
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

class _VistaPrevia extends StatefulWidget {
  final FondoApp fondo;
  final PerfilTema tema;
  const _VistaPrevia({required this.fondo, required this.tema});
  @override
  State<_VistaPrevia> createState() => _VistaPreviaState();
}

class _VistaPreviaState extends State<_VistaPrevia> {
  final Set<int> _favoritos = {};
  final Set<int> _abiertas = {};

  @override
  Widget build(BuildContext context) {
    final fondo = widget.fondo;
    return AnimatedContainer(
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
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Ejemplo interactivo · ${fondo.nombre}',
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: 8),
          const Text(
            'Toca una tarjeta para ver los detalles o prueba el corazón.',
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < 2; i++)
            Padding(
              padding: EdgeInsets.only(bottom: i == 0 ? 10 : 0),
              child: Material(
                color: fondo.tarjeta,
                borderRadius: BorderRadius.circular(14),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => setState(() {
                    if (!_abiertas.add(i)) _abiertas.remove(i);
                  }),
                  child: Container(
                    key: ValueKey('tarjeta-previa-$i'),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: fondo.tarjeta,
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
                              width: 34,
                              height: 48,
                              decoration: BoxDecoration(
                                gradient: widget.tema.gradiente,
                                borderRadius: BorderRadius.circular(6),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    i == 0
                                        ? 'Tu próxima lectura'
                                        : 'Más para descubrir',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleSmall,
                                  ),
                                  const SizedBox(height: 7),
                                  Text(
                                    'Tarjeta de ejemplo',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              tooltip: _favoritos.contains(i)
                                  ? 'Quitar favorito de ejemplo ${i + 1}'
                                  : 'Probar favorito ${i + 1}',
                              isSelected: _favoritos.contains(i),
                              icon: const Icon(Icons.favorite_border_rounded),
                              selectedIcon: const Icon(Icons.favorite_rounded),
                              color: widget.tema.colorPrincipal,
                              onPressed: () => setState(() {
                                if (!_favoritos.add(i)) _favoritos.remove(i);
                              }),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                _abiertas.contains(i)
                                    ? 'Ocultar detalles'
                                    : 'Ver detalles',
                                style: TextStyle(
                                  color: Color.lerp(
                                    widget.tema.colorPrincipal,
                                    Colors.black,
                                    0.35,
                                  ),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            Icon(
                              _abiertas.contains(i)
                                  ? Icons.expand_less_rounded
                                  : Icons.expand_more_rounded,
                            ),
                          ],
                        ),
                        if (_abiertas.contains(i)) ...[
                          const SizedBox(height: 10),
                          const Text(
                            'Así se verá el contenido con el fondo y el color de tarjeta que elegiste. Es una demostración: no realiza compras ni cambia tus favoritos.',
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
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
