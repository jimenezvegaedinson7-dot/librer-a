import 'package:flutter/material.dart';

import '../models/venta.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';
import '../utils/app_colors.dart';
import '../utils/formats.dart';
import '../widgets/error_banner.dart';

/// Libro de Reclamaciones dentro de la app (Ley 29571, D.S. 011-2011-PCM).
///
/// Mismo formulario y mismo endpoint público que la web
/// (`/libro-de-reclamaciones`), pero con los datos de la cuenta ya puestos:
/// nombre, correo, teléfono y, de las compras, documento y domicilio. El
/// cliente puede corregir todo antes de enviar. Al elegir una compra se
/// completan el bien y el monto.
class LibroReclamacionesScreen extends StatefulWidget {
  final ApiService? api;

  /// Origen de las compras propias (por defecto `obtenerMisVentas`).
  final Future<List<Venta>> Function()? cargarCompras;
  const LibroReclamacionesScreen({super.key, this.api, this.cargarCompras});

  @override
  State<LibroReclamacionesScreen> createState() =>
      _LibroReclamacionesScreenState();
}

class _LibroReclamacionesScreenState extends State<LibroReclamacionesScreen> {
  final _form = GlobalKey<FormState>();
  final _nombre = TextEditingController(),
      _documento = TextEditingController(),
      _domicilio = TextEditingController(),
      _telefono = TextEditingController(),
      _email = TextEditingController(),
      _apoderado = TextEditingController(),
      _bien = TextEditingController(),
      _monto = TextEditingController(),
      _detalle = TextEditingController(),
      _pedido = TextEditingController();

  String _tipoDocumento = 'DNI', _bienTipo = 'producto', _tipo = 'reclamo';
  bool _esMenor = false, _acepta = false, _enviando = false, _cargando = true;
  List<Venta> _compras = const [];
  int? _idVenta;
  String? _error;
  ({String numero, String mensaje, String? fechaLimite})? _registrada;

  ApiService get _api => widget.api ?? ApiService.instance;

  @override
  void initState() {
    super.initState();
    _autocompletar();
  }

  @override
  void dispose() {
    for (final c in [
      _nombre,
      _documento,
      _domicilio,
      _telefono,
      _email,
      _apoderado,
      _bien,
      _monto,
      _detalle,
      _pedido,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  /// Rellena lo que la cuenta ya tiene. Nada se envía sin que el cliente
  /// lo revise; un campo ya escrito no se pisa.
  Future<void> _autocompletar() async {
    try {
      final u = await StorageService.instance.obtenerUsuario();
      if (u != null && mounted) {
        _poner(
          _nombre,
          [u.nombre, u.apellido].whereType<String>().join(' ').trim(),
        );
        _poner(_email, u.email);
        _poner(_telefono, u.telefono);
      }
    } catch (_) {}
    try {
      final ventas = await (widget.cargarCompras ?? _api.obtenerMisVentas)();
      final propias =
          ventas
              .where(
                (v) =>
                    ['pagada', 'entregada'].contains(v.estado?.toLowerCase()),
              )
              .toList()
            ..sort((a, b) => (b.idVenta ?? 0).compareTo(a.idVenta ?? 0));
      if (!mounted) return;
      final ultima = propias.firstOrNull;
      _poner(_documento, ultima?.clienteDocumento);
      final tipoDoc = ultima?.clienteTipoDocumento?.toUpperCase();
      if (tipoDoc != null &&
          const ['DNI', 'CE', 'PASAPORTE', 'RUC'].contains(tipoDoc)) {
        _tipoDocumento = tipoDoc;
      }
      final conDireccion = propias.where(
        (v) => v.tipoEntrega == 'domicilio' && (v.direccion ?? '').isNotEmpty,
      );
      final direccion = conDireccion.firstOrNull;
      if (direccion != null) {
        _poner(
          _domicilio,
          [
            direccion.direccion,
            direccion.ubicacionEntrega,
          ].whereType<String>().where((s) => s.isNotEmpty).join(', '),
        );
      }
      setState(() => _compras = propias);
    } catch (_) {
      // Sin compras disponibles: el formulario sigue funcionando.
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  void _poner(TextEditingController c, String? valor) {
    if (c.text.trim().isEmpty && (valor ?? '').trim().isNotEmpty) {
      c.text = valor!.trim();
    }
  }

  void _elegirCompra(int? id) {
    setState(() => _idVenta = id);
    final compra = _compras.where((v) => v.idVenta == id).firstOrNull;
    if (compra == null) return;
    final titulos = compra.detalle
        .map((d) => d.titulo)
        .whereType<String>()
        .where((t) => t.isNotEmpty)
        .join(', ');
    if (titulos.isNotEmpty) {
      _bien.text = titulos.length > 250
          ? '${titulos.substring(0, 247)}...'
          : titulos;
    }
    if (compra.total != null) _monto.text = compra.total!.toStringAsFixed(2);
  }

  Future<void> _enviar() async {
    setState(() => _error = null);
    if (!_form.currentState!.validate()) return;
    if (!_acepta) {
      setState(
        () => _error =
            'Confirma que los datos son verdaderos para registrar la hoja.',
      );
      return;
    }
    setState(() => _enviando = true);
    try {
      final resultado = await _api.registrarReclamacion({
        'tipo': _tipo,
        'consumidor_nombre': _nombre.text.trim(),
        'consumidor_tipo_documento': _tipoDocumento,
        'consumidor_documento': _documento.text.trim(),
        'consumidor_domicilio': _domicilio.text.trim(),
        'consumidor_telefono': _telefono.text.trim(),
        'consumidor_email': _email.text.trim(),
        'es_menor': _esMenor,
        'apoderado_nombre': _esMenor ? _apoderado.text.trim() : '',
        'bien_tipo': _bienTipo,
        'bien_descripcion': _bien.text.trim(),
        if (_monto.text.trim().isNotEmpty)
          'monto_reclamado': _monto.text.trim(),
        'id_venta': ?_idVenta,
        'detalle': _detalle.text.trim(),
        'pedido': _pedido.text.trim(),
      });
      if (mounted) setState(() => _registrada = resultado);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'No se pudo registrar la hoja. Inténtalo de nuevo.',
        );
      }
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  String? _requerido(String? v, String mensaje, {int minimo = 1}) =>
      (v ?? '').trim().length < minimo ? mensaje : null;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Libro de Reclamaciones')),
      body: SafeArea(
        child: _registrada != null ? _hecho(_registrada!) : _formulario(),
      ),
    );
  }

  Widget _hecho(({String numero, String mensaje, String? fechaLimite}) r) {
    final limite = r.fechaLimite;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.verified_outlined, size: 56, color: AppColors.primary),
            const SizedBox(height: 12),
            Text(
              r.numero.isEmpty ? 'Hoja registrada' : 'Hoja N.° ${r.numero}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(r.mensaje, textAlign: TextAlign.center),
            if (limite != null) ...[
              const SizedBox(height: 8),
              Text(
                'Te responderemos en un plazo no mayor a 15 días hábiles '
                '(a más tardar el ${Formats.fecha('${limite}T12:00:00')}).',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Volver al perfil'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _formulario() {
    final denso = const InputDecoration().copyWith(isDense: true);
    InputDecoration deco(String label, {String? hint}) =>
        denso.copyWith(labelText: label, hintText: hint);
    return Form(
      key: _form,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Text(
            'Hoja de reclamación virtual · Librería del Saber',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
          ),
          if (!_cargando &&
              (_nombre.text.isNotEmpty || _email.text.isNotEmpty)) ...[
            const SizedBox(height: 8),
            _Aviso(
              'Completamos los datos de tu cuenta y tus compras. Puedes corregirlos antes de enviar.',
            ),
          ],
          _Seccion(numero: 1, titulo: 'Identificación del consumidor'),
          TextFormField(
            controller: _nombre,
            decoration: deco('Nombre completo'),
            textCapitalization: TextCapitalization.words,
            validator: (v) =>
                _requerido(v, 'Ingresa tu nombre completo', minimo: 3),
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: _tipoDocumento,
                  isDense: true,
                  decoration: deco('Documento'),
                  items: const [
                    DropdownMenuItem(value: 'DNI', child: Text('DNI')),
                    DropdownMenuItem(value: 'CE', child: Text('C. ext.')),
                    DropdownMenuItem(value: 'PASAPORTE', child: Text('Pasap.')),
                    DropdownMenuItem(value: 'RUC', child: Text('RUC')),
                  ],
                  onChanged: (v) => setState(() => _tipoDocumento = v ?? 'DNI'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 3,
                child: TextFormField(
                  controller: _documento,
                  decoration: deco('Número'),
                  keyboardType:
                      _tipoDocumento == 'DNI' || _tipoDocumento == 'RUC'
                      ? TextInputType.number
                      : TextInputType.text,
                  validator: (v) {
                    final t = (v ?? '').trim();
                    if (_tipoDocumento == 'DNI' &&
                        !RegExp(r'^\d{8}$').hasMatch(t)) {
                      return 'El DNI tiene 8 dígitos';
                    }
                    if (_tipoDocumento == 'RUC' &&
                        !RegExp(r'^\d{11}$').hasMatch(t)) {
                      return 'El RUC tiene 11 dígitos';
                    }
                    return t.length < 5 ? 'Documento no válido' : null;
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextFormField(
            controller: _domicilio,
            decoration: deco('Domicilio'),
            validator: (v) => _requerido(v, 'Ingresa tu domicilio', minimo: 5),
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextFormField(
                  controller: _telefono,
                  decoration: deco('Teléfono'),
                  keyboardType: TextInputType.phone,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: TextFormField(
                  controller: _email,
                  decoration: deco('Correo electrónico'),
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) =>
                      RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                          .hasMatch((v ?? '').trim())
                      ? null
                      : 'Correo no válido',
                ),
              ),
            ],
          ),
          CheckboxListTile(
            value: _esMenor,
            onChanged: (v) => setState(() => _esMenor = v ?? false),
            title: const Text(
              'Soy menor de edad',
              style: TextStyle(fontSize: 14),
            ),
            dense: true,
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
          ),
          if (_esMenor)
            TextFormField(
              controller: _apoderado,
              decoration: deco('Nombre del padre, madre o apoderado'),
              validator: (v) =>
                  _requerido(v, 'Indica el nombre del apoderado', minimo: 3),
            ),
          _Seccion(numero: 2, titulo: 'Identificación del bien contratado'),
          if (_compras.isNotEmpty) ...[
            DropdownButtonFormField<int?>(
              initialValue: _idVenta,
              isExpanded: true,
              isDense: true,
              decoration: deco('Compra relacionada'),
              items: [
                const DropdownMenuItem<int?>(
                  value: null,
                  child: Text('Ninguna / otra'),
                ),
                for (final v in _compras)
                  DropdownMenuItem<int?>(
                    value: v.idVenta,
                    child: Text(
                      'N.° ${v.idVenta} · S/ ${Formats.precio(v.total)}',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
              onChanged: _elegirCompra,
            ),
            const SizedBox(height: 10),
          ],
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: _bienTipo,
                  isDense: true,
                  decoration: deco('Tipo'),
                  items: const [
                    DropdownMenuItem(
                      value: 'producto',
                      child: Text('Producto'),
                    ),
                    DropdownMenuItem(
                      value: 'servicio',
                      child: Text('Servicio'),
                    ),
                  ],
                  onChanged: (v) => setState(() => _bienTipo = v ?? 'producto'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 3,
                child: TextFormField(
                  controller: _monto,
                  decoration: deco('Monto (S/)'),
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextFormField(
            controller: _bien,
            decoration: deco(
              'Descripción',
              hint: 'Ej. Libro «Cien años de soledad»',
            ),
            validator: (v) =>
                _requerido(v, 'Describe el producto o servicio', minimo: 3),
          ),
          _Seccion(numero: 3, titulo: 'Detalle de la reclamación'),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'reclamo', label: Text('Reclamo')),
              ButtonSegment(value: 'queja', label: Text('Queja')),
            ],
            selected: {_tipo},
            onSelectionChanged: (s) => setState(() => _tipo = s.first),
          ),
          const SizedBox(height: 4),
          Text(
            _tipo == 'reclamo'
                ? 'Disconformidad con los productos o servicios.'
                : 'Malestar o descontento con la atención al público.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
          ),
          const SizedBox(height: 10),
          TextFormField(
            controller: _detalle,
            decoration: deco('Detalle'),
            minLines: 3,
            maxLines: 6,
            maxLength: 3000,
            validator: (v) => _requerido(
              v,
              'Describe el detalle (al menos 10 caracteres)',
              minimo: 10,
            ),
          ),
          TextFormField(
            controller: _pedido,
            decoration: deco('Pedido (¿qué solicitas?)'),
            minLines: 2,
            maxLines: 4,
            maxLength: 2000,
            validator: (v) => _requerido(v, 'Indica qué solicitas', minimo: 5),
          ),
          Text(
            'La formulación del reclamo no impide acudir a otras vías de solución '
            'ni es requisito previo para denunciar ante el INDECOPI. Responderemos '
            'en un plazo no mayor a 15 días hábiles y recibirás una copia en tu correo.',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11.5,
              height: 1.35,
            ),
          ),
          CheckboxListTile(
            value: _acepta,
            onChanged: (v) => setState(() {
              _acepta = v ?? false;
              _error = null;
            }),
            title: const Text(
              'Declaro que los datos son verdaderos y acepto que se usen para atender esta hoja.',
              style: TextStyle(fontSize: 13),
            ),
            dense: true,
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
          ),
          if (_error != null) ...[
            const SizedBox(height: 4),
            ErrorBanner(message: _error!),
          ],
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _enviando ? null : _enviar,
            icon: _enviando
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send_rounded, size: 18),
            label: Text(_enviando ? 'Enviando...' : 'Registrar hoja'),
          ),
        ],
      ),
    );
  }
}

class _Seccion extends StatelessWidget {
  final int numero;
  final String titulo;
  const _Seccion({required this.numero, required this.titulo});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 18, bottom: 10),
    child: Row(
      children: [
        CircleAvatar(
          radius: 11,
          backgroundColor: AppColors.primary,
          child: Text(
            '$numero',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            titulo,
            style: Theme.of(context).textTheme.titleSmall
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
      ],
    ),
  );
}

class _Aviso extends StatelessWidget {
  final String texto;
  const _Aviso(this.texto);

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
    decoration: BoxDecoration(
      color: AppColors.primaryContainer,
      borderRadius: BorderRadius.circular(8),
    ),
    child: Row(
      children: [
        Icon(Icons.auto_awesome_outlined, size: 16, color: AppColors.primary),
        const SizedBox(width: 8),
        Expanded(child: Text(texto, style: const TextStyle(fontSize: 12.5))),
      ],
    ),
  );
}
