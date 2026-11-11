import 'package:flutter/material.dart';

import '../services/tema_controller.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/perfil_fondos.dart';
import '../utils/perfil_temas.dart';
import '../widgets/apariencia_colores.dart';

/// Centro de personalización: dos apartados independientes.
///
/// - Colores de botones y tarjetas (acentos, iconos y superficie de tarjetas).
/// - Colores de fondo (solo el fondo de las pantallas).
///
/// Cada apartado guarda su propia preferencia, por lo que cambiar uno nunca
/// modifica el otro. Las preferencias sobreviven al cierre de sesión y a las
/// actualizaciones de la app.
class PersonalizacionScreen extends StatelessWidget {
  const PersonalizacionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    final tema = TemaController.instance.tema;
    final tarjeta = TemaController.instance.tarjeta;
    final fondo = TemaController.instance.fondo;
    return Scaffold(
      appBar: AppBar(title: const Text('Personalización')),
      body: SafeArea(
        top: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
              children: [
                Text('Tu aplicación, a tu estilo', style: texto.headlineSmall),
                const SizedBox(height: 8),
                Text(
                  'Elige tus colores. Se guardan en este dispositivo, '
                  'incluso cuando cierras sesión.',
                  style: texto.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                _Apartado(
                  key: const ValueKey('personalizacion-botones'),
                  icono: Icons.tune_rounded,
                  titulo: 'Colores de botones y tarjetas',
                  detalle: '${tema.nombre} · ${tarjeta.nombre}',
                  muestra: _MuestraBotonesTarjetas(
                    tema: tema,
                    tarjeta: tarjeta.color,
                  ),
                  onTap: () => Navigator.of(context).push<void>(
                    MaterialPageRoute<void>(
                      builder: (_) => const ColoresBotonesTarjetasScreen(),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                _Apartado(
                  key: const ValueKey('personalizacion-fondo'),
                  icono: Icons.wallpaper_rounded,
                  titulo: 'Colores de fondo',
                  detalle: fondo.nombre,
                  muestra: _MuestraFondo(
                    fondo: fondo.fondo,
                    tarjeta: tarjeta.color,
                  ),
                  onTap: () => Navigator.of(context).push<void>(
                    MaterialPageRoute<void>(
                      builder: (_) => const ColoresFondoScreen(),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                _NotaIndependencia(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Apartado extends StatelessWidget {
  final IconData icono;
  final String titulo;
  final String detalle;
  final Widget muestra;
  final VoidCallback onTap;

  const _Apartado({
    super.key,
    required this.icono,
    required this.titulo,
    required this.detalle,
    required this.muestra,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    return Material(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AppColors.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth < 300 ||
                  MediaQuery.textScalerOf(context).scale(14) > 21) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        muestra,
                        const Spacer(),
                        Icon(icono, color: AppColors.primary),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      titulo,
                      style: texto.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            detalle,
                            style: texto.bodySmall?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded),
                      ],
                    ),
                  ],
                );
              }
              return Row(
                children: [
                  muestra,
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(icono, size: 18, color: AppColors.primary),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                titulo,
                                style: texto.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          detalle,
                          style: texto.bodySmall?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.chevron_right_rounded),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _MuestraBotonesTarjetas extends StatelessWidget {
  final PerfilTema tema;
  final Color tarjeta;
  const _MuestraBotonesTarjetas({required this.tema, required this.tarjeta});

  @override
  Widget build(BuildContext context) => Container(
    width: 64,
    height: 64,
    padding: const EdgeInsets.all(8),
    decoration: BoxDecoration(
      color: tarjeta,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.dividerStrong),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: tema.gradiente,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Container(
          height: 9,
          decoration: BoxDecoration(
            color: tema.colorPrincipal,
            borderRadius: BorderRadius.circular(999),
          ),
        ),
      ],
    ),
  );
}

class _MuestraFondo extends StatelessWidget {
  final Color fondo;
  final Color tarjeta;
  const _MuestraFondo({required this.fondo, required this.tarjeta});

  @override
  Widget build(BuildContext context) => Container(
    width: 64,
    height: 64,
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: fondo,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.dividerStrong),
    ),
    child: DecoratedBox(
      decoration: BoxDecoration(
        color: tarjeta,
        borderRadius: BorderRadius.circular(5),
      ),
    ),
  );
}

class _NotaIndependencia extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline_rounded, size: 20, color: AppColors.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Cada apartado se guarda por separado y tiene su propia '
              'opción de restauración.',
              style: texto.bodySmall?.copyWith(color: AppColors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

/// Apartado A: colores de botones, iconos y tarjetas.
class ColoresBotonesTarjetasScreen extends StatefulWidget {
  const ColoresBotonesTarjetasScreen({super.key});

  @override
  State<ColoresBotonesTarjetasScreen> createState() =>
      _ColoresBotonesTarjetasScreenState();
}

class _ColoresBotonesTarjetasScreenState
    extends State<ColoresBotonesTarjetasScreen> {
  late PerfilTema _tema = TemaController.instance.tema;
  late TarjetaApp _tarjeta = TemaController.instance.tarjeta;
  bool _guardando = false;

  bool get _cambio =>
      _tema.id != TemaController.instance.id ||
      _tarjeta.id != TemaController.instance.tarjeta.id;

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

  void _restaurar() {
    setState(() {
      _tema = perfilTemaPorId(perfilTemaDefaultId);
      _tarjeta = tarjetaPorId(tarjetaDefaultId);
    });
  }

  Future<void> _guardar() async {
    if (!_cambio || _guardando) return;
    setState(() => _guardando = true);
    try {
      await TemaController.instance.aplicarBotones(_tema.id);
      await TemaController.instance.aplicarTarjeta(_tarjeta.id);
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      setState(() => _guardando = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No pudimos guardar los colores. Intenta nuevamente.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Botones y tarjetas')),
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
                        'Botones, iconos y tarjetas',
                        style: texto.headlineSmall,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Prueba los colores antes de guardarlos. '
                        'El fondo de las páginas se elige por separado.',
                        style: texto.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text('Vista previa', style: texto.titleMedium),
                      const SizedBox(height: 12),
                      VistaPreviaTemaApp(tema: _tema, tarjeta: _tarjeta.color),
                      const SizedBox(height: 28),
                      Text(
                        'Color de botones e iconos',
                        style: texto.titleMedium,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Se aplica a botones, iconos activos, precios y '
                        'decoraciones.',
                        style: texto.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
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
                      Text('Color de las tarjetas', style: texto.titleMedium),
                      const SizedBox(height: 6),
                      Text(
                        'Elige el tono de las tarjetas donde se muestra el '
                        'contenido.',
                        style: texto.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _SelectorTarjetas(
                        seleccionada: _tarjeta,
                        onSeleccionar: _guardando
                            ? null
                            : (id) =>
                                  setState(() => _tarjeta = tarjetaPorId(id)),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
                _BarraAcciones(
                  guardando: _guardando,
                  puedeGuardar: _cambio,
                  keyRestaurar: const ValueKey('restaurar-botones'),
                  keyGuardar: const ValueKey('guardar-botones-tarjetas'),
                  onRestaurar: _restaurar,
                  onGuardar: _guardar,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Apartado B: solo el fondo de las páginas.
class ColoresFondoScreen extends StatefulWidget {
  const ColoresFondoScreen({super.key});

  @override
  State<ColoresFondoScreen> createState() => _ColoresFondoScreenState();
}

class _ColoresFondoScreenState extends State<ColoresFondoScreen> {
  late FondoApp _fondo = TemaController.instance.fondo;
  bool _guardando = false;

  bool get _cambio => _fondo.id != TemaController.instance.fondo.id;

  void _restaurar() {
    setState(() => _fondo = fondoPorId(fondoDefaultId));
  }

  Future<void> _guardar() async {
    if (!_cambio || _guardando) return;
    setState(() => _guardando = true);
    try {
      await TemaController.instance.aplicarFondo(_fondo.id);
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      setState(() => _guardando = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No pudimos guardar el fondo. Intenta nuevamente.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final texto = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Colores de fondo')),
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
                      Text('Fondo de las páginas', style: texto.headlineSmall),
                      const SizedBox(height: 8),
                      Text(
                        'Elige un fondo para las páginas. '
                        'Los botones y las tarjetas conservan sus colores.',
                        style: texto.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text('Vista previa', style: texto.titleMedium),
                      const SizedBox(height: 12),
                      _VistaPreviaFondo(fondo: _fondo),
                      const SizedBox(height: 28),
                      Text('Elige el fondo', style: texto.titleMedium),
                      const SizedBox(height: 16),
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
                                      seleccionado: fondo.id == _fondo.id,
                                      onTap: _guardando
                                          ? null
                                          : () =>
                                                setState(() => _fondo = fondo),
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
                _BarraAcciones(
                  guardando: _guardando,
                  puedeGuardar: _cambio,
                  keyRestaurar: const ValueKey('restaurar-fondo'),
                  keyGuardar: const ValueKey('guardar-fondo'),
                  onRestaurar: _restaurar,
                  onGuardar: _guardar,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SelectorTarjetas extends StatelessWidget {
  final TarjetaApp seleccionada;
  final ValueChanged<String>? onSeleccionar;
  const _SelectorTarjetas({
    required this.seleccionada,
    required this.onSeleccionar,
  });

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, c) {
      final columnas =
          (c.maxWidth /
                  (MediaQuery.textScalerOf(context).scale(12) > 18 ? 116 : 92))
              .floor()
              .clamp(2, 6);
      final ancho = (c.maxWidth - 12 * (columnas - 1)) / columnas;
      return Wrap(
        spacing: 12,
        runSpacing: 16,
        children: [
          for (final tarjeta in [
            if (seleccionada.id.startsWith('legado_')) seleccionada,
            ...tarjetasApp,
          ])
            SizedBox(
              width: ancho,
              child: Semantics(
                button: true,
                selected: seleccionada.id == tarjeta.id,
                label: 'Tarjeta ${tarjeta.nombre}',
                child: InkWell(
                  key: ValueKey('tarjeta-${tarjeta.id}'),
                  onTap: onSeleccionar == null
                      ? null
                      : () => onSeleccionar!(tarjeta.id),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: tarjeta.color,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: seleccionada.id == tarjeta.id
                                  ? AppColors.textPrimary
                                  : AppColors.dividerStrong,
                              width: seleccionada.id == tarjeta.id ? 3 : 1,
                            ),
                          ),
                          child: seleccionada.id == tarjeta.id
                              ? Icon(
                                  Icons.check_rounded,
                                  color: AppColors.textPrimary,
                                )
                              : null,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          tarjeta.nombre,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.labelMedium,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      );
    },
  );
}

class _VistaPreviaFondo extends StatefulWidget {
  final FondoApp fondo;
  const _VistaPreviaFondo({required this.fondo});

  @override
  State<_VistaPreviaFondo> createState() => _VistaPreviaFondoState();
}

class _VistaPreviaFondoState extends State<_VistaPreviaFondo> {
  bool _detalles = false;

  @override
  Widget build(BuildContext context) {
    final fondo = widget.fondo;
    final tema = TemaController.instance.tema;
    final tarjeta = TemaController.instance.tarjeta;
    final texto = Theme.of(context).textTheme;
    return AnimatedContainer(
      key: const ValueKey('vista-previa-fondo'),
      duration: reducirMovimiento(context)
          ? Duration.zero
          : const Duration(milliseconds: 250),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: fondo.fondo,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Ejemplo · ${fondo.nombre}',
            style: texto.labelLarge?.copyWith(color: AppColors.textPrimary),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: tarjeta.color,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.divider),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tarjeta de ejemplo',
                  style: texto.titleSmall?.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Su color se elige en “Botones y tarjetas”.',
                  style: texto.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: tema.colorPrincipal,
                    foregroundColor: textoSobre(tema.colorPrincipal),
                    minimumSize: const Size(0, 42),
                  ),
                  key: const ValueKey('probar-fondo'),
                  onPressed: () => setState(() => _detalles = !_detalles),
                  icon: Icon(
                    _detalles
                        ? Icons.expand_less_rounded
                        : Icons.touch_app_outlined,
                    size: 18,
                  ),
                  label: Text(
                    _detalles ? 'Ocultar detalles' : 'Probar tarjeta',
                  ),
                ),
                if (_detalles) ...[
                  const SizedBox(height: 8),
                  const Text(
                    'Esta es una vista previa interactiva. El fondo solo se guarda al pulsar Guardar cambios.',
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BarraAcciones extends StatelessWidget {
  final bool guardando;
  final bool puedeGuardar;
  final Key keyRestaurar;
  final Key keyGuardar;
  final VoidCallback onRestaurar;
  final VoidCallback onGuardar;

  const _BarraAcciones({
    required this.guardando,
    required this.puedeGuardar,
    required this.keyRestaurar,
    required this.keyGuardar,
    required this.onRestaurar,
    required this.onGuardar,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
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
            key: keyRestaurar,
            onPressed: guardando ? null : onRestaurar,
            icon: const Icon(Icons.restart_alt_rounded),
            label: const Text('Restaurar predeterminado'),
          ),
          const SizedBox(height: 4),
          FilledButton.icon(
            key: keyGuardar,
            onPressed: puedeGuardar && !guardando ? onGuardar : null,
            icon: guardando
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check_rounded, size: 20),
            label: Text(
              puedeGuardar ? 'Guardar cambios' : 'Sin cambios por guardar',
              textAlign: TextAlign.center,
            ),
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 52),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
                        color: TemaController.instance.tarjeta.color,
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
