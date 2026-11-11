import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/perfil_temas.dart';

Color textoSobre(Color fondo) {
  final blanco = 1.05 / (fondo.computeLuminance() + 0.05);
  return blanco >= 4.5 ? Colors.white : const Color(0xFF17181C);
}

class VistaPreviaTemaApp extends StatefulWidget {
  final PerfilTema tema;

  /// Color de tarjeta actual, independiente del fondo de pantallas.
  final Color tarjeta;
  const VistaPreviaTemaApp({
    super.key,
    required this.tema,
    required this.tarjeta,
  });

  @override
  State<VistaPreviaTemaApp> createState() => _VistaPreviaTemaAppState();
}

class _VistaPreviaTemaAppState extends State<VistaPreviaTemaApp> {
  bool _probado = false;
  bool _favorito = false;
  bool _detalles = false;

  @override
  Widget build(BuildContext context) {
    final tema = widget.tema;
    final principal = tema.colorPrincipal;
    final tinta = Color.lerp(principal, Colors.black, 0.7)!;
    double contraste(Color fondo) {
      final a = tema.textColor.computeLuminance(), b = fondo.computeLuminance();
      return ((a > b ? a : b) + 0.05) / ((a > b ? b : a) + 0.05);
    }

    final proteger = contraste(tema.inicio) < 4.5 || contraste(tema.fin) < 4.5;
    return AnimatedContainer(
      key: const ValueKey('vista-previa-colores'),
      duration: reducirMovimiento(context) ? Duration.zero : Duracion.rapida,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: widget.tarjeta,
        border: Border.all(color: AppColors.divider),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            key: const ValueKey('degradado-previo'),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(gradient: tema.gradiente),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Container(
                padding: proteger
                    ? const EdgeInsets.symmetric(horizontal: 10, vertical: 6)
                    : EdgeInsets.zero,
                decoration: BoxDecoration(
                  color: !proteger
                      ? Colors.transparent
                      : tema.textColor == Colors.white
                      ? Colors.black.withValues(alpha: 0.72)
                      : Colors.white.withValues(alpha: 0.94),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  tema.nombre,
                  style: TextStyle(
                    color: tema.textColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Títulos, iconos y botones',
                  style: TextStyle(color: tinta, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Text(
                  'Así se verá el color de tu aplicación.',
                  style: TextStyle(
                    color: Color.lerp(tinta, widget.tarjeta, 0.18),
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  key: const ValueKey('boton-previa-tema'),
                  style: FilledButton.styleFrom(
                    backgroundColor: principal,
                    foregroundColor: textoSobre(principal),
                  ),
                  onPressed: () => setState(() => _probado = !_probado),
                  icon: Icon(
                    _probado ? Icons.check_rounded : Icons.touch_app_outlined,
                  ),
                  label: Text(
                    _probado ? 'Así responde tu botón' : 'Probar botón',
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    IconButton(
                      key: const ValueKey('favorito-previa'),
                      tooltip: _favorito
                          ? 'Quitar favorito de ejemplo'
                          : 'Probar favorito',
                      color: principal,
                      icon: Icon(
                        _favorito
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                      ),
                      onPressed: () => setState(() => _favorito = !_favorito),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(foregroundColor: tinta),
                      onPressed: () => setState(() => _detalles = !_detalles),
                      child: Text(
                        _detalles ? 'Ocultar detalles' : 'Ver detalles',
                      ),
                    ),
                  ],
                ),
                if (_detalles)
                  Text(
                    'Esta tarjeta es una demostración. No modifica tus favoritos ni realiza compras.',
                    style: TextStyle(color: tinta),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class SelectorTemasApp extends StatelessWidget {
  final PerfilTema seleccionado;
  final ValueChanged<String>? onSeleccionar;
  final VoidCallback? onCombinar;
  const SelectorTemasApp({
    super.key,
    required this.seleccionado,
    required this.onSeleccionar,
    required this.onCombinar,
  });

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      for (final (titulo, vidrio) in const [
        ('Clásicos', false),
        ('Vidrio', true),
      ]) ...[
        Text(titulo, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, c) {
            final columnas =
                (c.maxWidth /
                        (MediaQuery.textScalerOf(context).scale(12) > 18
                            ? 116
                            : 92))
                    .floor()
                    .clamp(2, 6);
            final ancho = (c.maxWidth - 12 * (columnas - 1)) / columnas;
            return Wrap(
              spacing: 12,
              runSpacing: 16,
              children: [
                for (final tema in perfilTemas.where((t) => t.vidrio == vidrio))
                  SizedBox(
                    width: ancho,
                    child: Semantics(
                      button: true,
                      selected: seleccionado.id == tema.id,
                      label: 'Tema ${tema.nombre}',
                      child: InkWell(
                        key: ValueKey('tema-${tema.id}'),
                        onTap: onSeleccionar == null
                            ? null
                            : () => onSeleccionar!(tema.id),
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Column(
                            children: [
                              Container(
                                width: 52,
                                height: 52,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: tema.gradiente,
                                  border: Border.all(
                                    color: seleccionado.id == tema.id
                                        ? AppColors.textPrimary
                                        : AppColors.dividerStrong,
                                    width: seleccionado.id == tema.id ? 3 : 1,
                                  ),
                                ),
                                child: seleccionado.id == tema.id
                                    ? Icon(
                                        Icons.check_rounded,
                                        color: tema.textColor,
                                      )
                                    : null,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                tema.nombre,
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
        ),
        const SizedBox(height: 24),
      ],
      OutlinedButton.icon(
        onPressed: onCombinar,
        icon: const Icon(Icons.palette_outlined),
        label: const Text('Combinar dos colores'),
      ),
      if (seleccionado.id.startsWith('custom_'))
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(
            'Combinación personalizada seleccionada.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
    ],
  );
}

class EditorTemaApp extends StatefulWidget {
  final PerfilTema inicial;
  const EditorTemaApp({super.key, required this.inicial});

  @override
  State<EditorTemaApp> createState() => _EditorTemaAppState();
}

class _EditorTemaAppState extends State<EditorTemaApp> {
  late Color _inicio = widget.inicial.inicio;
  late Color _fin = widget.inicial.fin;

  @override
  Widget build(BuildContext context) {
    final colores = <Color>{
      const Color(0xFF17181C),
      const Color(0xFF6B7280),
      Colors.white,
      for (final tema in perfilTemas) ...[tema.inicio, tema.fin],
    };
    Widget paleta(
      String titulo,
      String clave,
      Color seleccion,
      ValueChanged<Color> cambiar,
    ) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(titulo, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 10),
        Wrap(
          key: ValueKey(clave),
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final color in colores)
              Semantics(
                button: true,
                selected: seleccion == color,
                label:
                    'Color ${color.toARGB32().toRadixString(16).substring(2).toUpperCase()}',
                child: InkWell(
                  onTap: () => cambiar(color),
                  customBorder: const CircleBorder(),
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: color,
                      border: Border.all(
                        color: AppColors.dividerStrong,
                        width: seleccion == color ? 3 : 1,
                      ),
                    ),
                    child: seleccion == color
                        ? Icon(Icons.check_rounded, color: textoSobre(color))
                        : null,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Combina tus colores',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            const Text(
              'Elige los dos extremos de tu degradado. Podrás revisarlo antes de guardar.',
            ),
            const SizedBox(height: 16),
            Container(
              height: 64,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: LinearGradient(colors: [_inicio, _fin]),
              ),
            ),
            const SizedBox(height: 20),
            paleta(
              'Color inicial',
              'paleta-inicio',
              _inicio,
              (color) => setState(() => _inicio = color),
            ),
            const SizedBox(height: 20),
            paleta(
              'Color final',
              'paleta-fin',
              _fin,
              (color) => setState(() => _fin = color),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () =>
                  Navigator.of(context)
                      .pop(perfilTemaIdPersonalizado(_inicio, fin: _fin)),
              child: const Text('Usar combinación'),
            ),
          ],
        ),
      ),
    );
  }
}
