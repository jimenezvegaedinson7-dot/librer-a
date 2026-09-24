import 'package:flutter/material.dart';

import '../models/version_app.dart';
import '../services/actualizacion_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';

enum _Etapa { aviso, descargando, verificando, instalador, error }

/// Muestra el aviso de nueva versión. Si es obligatoria no se puede cerrar.
Future<void> mostrarDialogoActualizacion(
  BuildContext context,
  VersionApp version,
) {
  return showDialog<void>(
    context: context,
    barrierDismissible: !version.obligatoria,
    builder: (_) => _DialogoActualizacion(version: version),
  );
}

class _DialogoActualizacion extends StatefulWidget {
  final VersionApp version;

  const _DialogoActualizacion({required this.version});

  @override
  State<_DialogoActualizacion> createState() => _DialogoActualizacionState();
}

class _DialogoActualizacionState extends State<_DialogoActualizacion> {
  _Etapa _etapa = _Etapa.aviso;
  double? _progreso;
  String _error = '';
  bool _faltaPermiso = false;

  bool get _ocupado =>
      _etapa == _Etapa.descargando || _etapa == _Etapa.verificando;

  Future<void> _actualizar() async {
    setState(() {
      _etapa = _Etapa.descargando;
      _progreso = 0;
      _faltaPermiso = false;
    });
    try {
      await ActualizacionService.instance.descargarEInstalar(
        widget.version,
        onProgreso: (p) {
          if (mounted) setState(() => _progreso = p);
        },
        onVerificando: () {
          if (mounted) setState(() => _etapa = _Etapa.verificando);
        },
      );
      if (mounted) setState(() => _etapa = _Etapa.instalador);
    } on ActualizacionException catch (e) {
      if (!mounted) return;
      setState(() {
        _etapa = _Etapa.error;
        _error = e.mensaje;
        _faltaPermiso = e.faltaPermiso;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _etapa = _Etapa.error;
        _error = 'No se pudo completar la actualización.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final v = widget.version;

    return PopScope(
      canPop: !v.obligatoria && !_ocupado,
      child: AlertDialog(
        titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
        contentPadding: const EdgeInsets.fromLTRB(24, 14, 24, 8),
        title: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(Radios.sm),
              ),
              child: Icon(
                Icons.system_update_alt_rounded,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(child: Text('Nueva versión disponible')),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Versión ${v.version}',
              style: textTheme.titleSmall?.copyWith(color: AppColors.gold),
            ),
            if (v.notas.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                v.notas,
                style: textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
            if (v.obligatoria && _etapa == _Etapa.aviso) ...[
              const SizedBox(height: 10),
              Text(
                'Esta actualización es necesaria para seguir usando la app.',
                style: textTheme.bodySmall?.copyWith(
                  color: AppColors.textSecondary,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
            AnimatedSize(
              duration: Duracion.base,
              child: _detalleEtapa(textTheme),
            ),
          ],
        ),
        actionsPadding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
        actions: _acciones(),
      ),
    );
  }

  Widget _detalleEtapa(TextTheme textTheme) {
    switch (_etapa) {
      case _Etapa.aviso:
        return const SizedBox.shrink();
      case _Etapa.descargando:
      case _Etapa.verificando:
        final verificando = _etapa == _Etapa.verificando;
        final pct = _progreso == null ? null : (_progreso! * 100).round();
        return Padding(
          padding: const EdgeInsets.only(top: 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: verificando ? null : _progreso,
                  minHeight: 8,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                verificando
                    ? 'Verificando el archivo...'
                    : pct == null
                    ? 'Descargando...'
                    : 'Descargando... $pct %',
                style: textTheme.bodySmall?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        );
      case _Etapa.instalador:
        return Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Text(
            'Confirma la instalación en la ventana de Android. '
            'Tus datos y tu sesión se conservan.',
            style: textTheme.bodySmall?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        );
      case _Etapa.error:
        return Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.error_outline, size: 18, color: AppColors.error),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _error,
                  style: textTheme.bodySmall?.copyWith(color: AppColors.error),
                ),
              ),
            ],
          ),
        );
    }
  }

  List<Widget> _acciones() {
    final masTarde = TextButton(
      onPressed: () => Navigator.of(context).pop(),
      child: const Text('Más tarde'),
    );
    final puedeCerrar = !widget.version.obligatoria;

    switch (_etapa) {
      case _Etapa.aviso:
        return [
          if (puedeCerrar) masTarde,
          FilledButton(
            onPressed: _actualizar,
            child: const Text('Actualizar ahora'),
          ),
        ];
      case _Etapa.descargando:
      case _Etapa.verificando:
        return const [];
      case _Etapa.instalador:
        return [
          if (puedeCerrar) masTarde,
          FilledButton(
            onPressed: _actualizar,
            child: const Text('Abrir instalador otra vez'),
          ),
        ];
      case _Etapa.error:
        return [
          if (puedeCerrar) masTarde,
          if (_faltaPermiso)
            OutlinedButton(
              onPressed: ActualizacionService.instance.abrirPermisoInstalacion,
              child: const Text('Abrir ajustes'),
            ),
          FilledButton(onPressed: _actualizar, child: const Text('Reintentar')),
        ];
    }
  }
}
