import 'package:flutter/material.dart';

import '../models/zona_delivery.dart';
import '../models/orden_pago.dart';
import '../services/api_service.dart';
import '../services/carrito_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import '../utils/formats.dart';
import '../widgets/aparecer.dart';
import '../widgets/app_page_header.dart';
import '../widgets/empty_view.dart';
import '../widgets/loading_view.dart';
import '../widgets/precio_texto.dart';
import '../widgets/presionable.dart';
import '../widgets/confirmacion_otp.dart';
import 'pago_en_app_screen.dart';

enum _TipoEntrega { domicilio, tienda }

/// Pantalla "Entrega y pago".
///
/// Se abre desde "Mi carrito" al presionar "Realizar pedido". Permite elegir
/// el tipo de entrega (delivery en Pallasca o recojo gratuito en Pallasca), ingresar los
/// datos de envío cuando corresponde y revisar el resumen (subtotal, envío,
/// total). Al confirmar con [COMPRAR Y PAGAR] se crea la orden en PayU
/// (WebCheckout) y se abre el checkout DENTRO de la app
/// ([PagoEnAppScreen]); al volver, el estado se confirma con la API.
class EntregaYPagoScreen extends StatefulWidget {
  const EntregaYPagoScreen({super.key});

  @override
  State<EntregaYPagoScreen> createState() => _EntregaYPagoScreenState();
}

class _EntregaYPagoScreenState extends State<EntregaYPagoScreen> {
  final _direccionController = TextEditingController();
  final _documentoController = TextEditingController();
  final _referenciaController = TextEditingController();
  _TipoEntrega _tipoEntrega = _TipoEntrega.tienda;
  String _tipoDocumento = 'DNI';
  bool _procesando = false;
  bool _cargandoZonas = false;
  String? _errorZonas;
  bool _exito = false;
  String? _orderId;
  String? _checkoutUrl;
  double? _total;
  EstadoOrden? _estadoPago;
  bool _restaurando = true;
  bool _importeConfirmado = false;
  int? _totalMostradoCentimos;

  List<ZonaDelivery> _zonas = [];
  int? _idZona;

  /// El cliente confirma que su dirección está dentro de Pallasca (solo se
  /// reparte ahí). Una dirección escrita no se puede verificar en el
  /// teléfono; sin esta confirmación el pedido a domicilio no continúa.
  bool _dentroDePallasca = false;

  /// Con una sola tarifa configurada no hay nada que elegir: se aplica sola.
  bool get _tarifaUnica => _zonas.length == 1;

  @override
  void initState() {
    super.initState();
    _cargarZonas();
    _restaurarIntento();
  }

  Future<void> _restaurarIntento() async {
    try {
      final intento = await ApiService.instance.intentoPendiente();
      if (intento == null) return;
      final orden = await ApiService.instance.recuperarIntentoPendiente();
      if (orden != null && mounted) {
        await _mostrarOrden(orden, esperado: intento.totalMostradoCentimos);
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No se pudo recuperar el intento. Reintenta para resolver la misma compra.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _restaurando = false);
    }
  }

  Future<void> _mostrarOrden(
    OrdenPago orden, {
    required int esperado,
    bool abrir = false,
  }) async {
    if (!mounted) return;
    final estado = EstadoOrden(
      status: orden.status,
      estadoVenta: orden.estadoVenta,
      requiereRevision: orden.requiereRevision,
    );
    setState(() {
      _exito = true;
      _orderId = orden.orderId;
      _estadoPago = estado;
      _checkoutUrl = estado.pagada || estado.cancelada
          ? null
          : orden.checkoutUrl;
      _total = orden.total;
      _importeConfirmado =
          orden.total != null && (orden.total! * 100).round() == esperado;
      _procesando = false;
    });
    if (abrir && !estado.pagada && !estado.cancelada) await _reabrirCheckout();
  }

  @override
  void dispose() {
    _direccionController.dispose();
    _documentoController.dispose();
    _referenciaController.dispose();
    super.dispose();
  }

  Future<void> _cargarZonas() async {
    setState(() {
      _cargandoZonas = true;
      _errorZonas = null;
    });
    try {
      final zonas = await ApiService.instance.obtenerZonasDelivery();
      if (!mounted) return;
      setState(() {
        _zonas = zonas;
        _cargandoZonas = false;
        if (!_zonas.any((z) => z.idZona == _idZona)) _idZona = null;
        if (_zonas.length == 1) _idZona = _zonas.first.idZona;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _cargandoZonas = false;
        _errorZonas = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _cargandoZonas = false;
        _errorZonas = 'No se pudieron cargar las zonas de delivery.';
      });
    }
  }

  /// Crea la orden en PayU (WebCheckout) y abre el checkout en el navegador.
  ///
  /// Reutiliza la lógica existente: el carrito SOLO se limpia cuando el pago
  /// se confirma (ver [_verificarPago]). Si el usuario vuelve sin pagar, el
  /// carrito y la orden pendiente se conservan para poder continuar.
  Future<void> _realizarCompra() async {
    if (_procesando || _restaurando) return;
    final carrito = CarritoService.instance;
    final totalVisto =
        _totalMostradoCentimos ??
        (carrito.total * 100 + _costoEnvio() * 100).round();
    setState(() => _procesando = true);
    try {
      // Resolver un resultado incierto ANTES de validar el carrito actual.
      // La orden anterior puede haber descontado ya todas sus unidades.
      final intento = await ApiService.instance.intentoPendiente();
      if (!mounted) return;
      if (intento != null) {
        final orden = await ApiService.instance.recuperarIntentoPendiente();
        if (orden != null) {
          await _mostrarOrden(
            orden,
            esperado: intento.totalMostradoCentimos,
            abrir: true,
          );
        }
        return;
      }
      final error = _validarEntrega();
      if (error != null) throw ApiException(error);
      // Se renuevan las promociones antes de confirmar; el servidor sigue
      // determinando y guardando el importe definitivo del pedido.
      final catalogo = await ApiService.instance.obtenerLibros();
      if (!mounted) return;
      carrito.actualizarCatalogo(catalogo);
      if (_tipoEntrega == _TipoEntrega.domicilio) {
        final zonas = await ApiService.instance.obtenerZonasDelivery();
        if (!mounted) return;
        setState(() {
          _zonas = zonas;
          if (!zonas.any((z) => z.idZona == _idZona)) _idZona = null;
          if (zonas.length == 1) _idZona = zonas.first.idZona;
        });
        final errorZona = _validarEntrega();
        if (errorZona != null) throw ApiException(errorZona);
      }
      final porId = {for (final libro in catalogo) libro.idLibro: libro};
      if (carrito.vacio) throw const ApiException('El carrito está vacío.');
      for (final item in carrito.items) {
        final fresco = porId[item.libro.idLibro];
        if (fresco == null ||
            !fresco.esActivo ||
            (fresco.stock ?? 0) < item.cantidad) {
          throw ApiException(
            'Revisa el carrito: ${item.libro.titulo} ya no tiene las unidades solicitadas.',
          );
        }
      }
      final totalFresco =
          (carrito.total * 100).round() + (_costoEnvio() * 100).round();
      if (totalFresco != totalVisto) {
        setState(() => _procesando = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Actualizamos los precios o el envío. Revisa el total y vuelve a confirmar la compra.',
            ),
          ),
        );
        return;
      }
      final detalles = [
        for (final item in carrito.items)
          {'id_libro': item.libro.idLibro, 'cantidad': item.cantidad},
      ];
      final esDomicilio = _tipoEntrega == _TipoEntrega.domicilio;

      // Crea la orden de pago en PayU (backend calcula el total con
      // los precios reales de la BD).
      final orden = await ApiService.instance.crearOrdenPago(
        detalles: detalles,
        tipoEntrega: esDomicilio ? 'domicilio' : 'tienda',
        direccion: esDomicilio ? _direccionController.text.trim() : null,
        idZonaDelivery: esDomicilio ? _idZona : null,
        referencia: esDomicilio ? _referenciaController.text.trim() : null,
        clienteTipoDocumento: _tipoDocumento,
        clienteDocumento: _documentoController.text.trim(),
        totalMostradoCentimos: totalFresco,
      );
      await _mostrarOrden(orden, esperado: totalFresco, abrir: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _procesando = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e, s) {
      debugPrint('ERROR compra: $e\n$s');
      if (!mounted) return;
      setState(() => _procesando = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo completar la compra: $e')),
      );
    } finally {
      if (mounted) setState(() => _procesando = false);
    }
  }

  String? _validarEntrega() {
    // Validar documento
    final doc = _documentoController.text.trim();
    if (doc.isEmpty) {
      return 'Ingresa tu número de documento.';
    }
    if (_tipoDocumento == 'DNI' && !RegExp(r'^\d{8}$').hasMatch(doc)) {
      return 'El DNI debe tener exactamente 8 dígitos.';
    }
    if (_tipoDocumento == 'RUC' && !RegExp(r'^\d{11}$').hasMatch(doc)) {
      return 'El RUC debe tener exactamente 11 dígitos.';
    }
    if (_tipoDocumento == 'CE' && doc.length < 8) {
      return 'El carné de extranjería debe tener al menos 8 caracteres.';
    }

    switch (_tipoEntrega) {
      case _TipoEntrega.domicilio:
        if (!_zonas.any((z) => z.idZona == _idZona)) {
          return 'Selecciona una zona activa de delivery dentro de Pallasca.';
        }
        if (_direccionController.text.trim().length < 5) {
          return 'Escribe tu dirección en Pallasca (calle y número).';
        }
        if (!_dentroDePallasca) {
          return 'Confirma que tu dirección está dentro de Pallasca: solo repartimos ahí.';
        }
        return null;
      case _TipoEntrega.tienda:
        return null;
    }
  }

  /// Consulta el estado real del pago. Al volver de la ventana de PayU
  /// ([trasPago]) reintenta unos segundos: la confirmación de PayU llega
  /// al servidor con un pequeño retraso.
  Future<void> _verificarPago({bool trasPago = false}) async {
    final orderId = _orderId;
    if (orderId == null || orderId.isEmpty) return;

    final yaPagada = _estadoPago?.pagada == true;
    setState(() => _procesando = true);
    try {
      var estado = await ApiService.instance.obtenerOrdenPago(orderId);
      for (
        var intento = 0;
        trasPago && intento < 4 && !estado.pagada && !estado.cancelada;
        intento++
      ) {
        await Future<void>.delayed(const Duration(seconds: 2));
        if (!mounted) return;
        estado = await ApiService.instance.obtenerOrdenPago(orderId);
      }
      if (!mounted) return;
      setState(() {
        _procesando = false;
        _estadoPago = estado;
        if (estado.pagada || estado.cancelada) _checkoutUrl = null;
      });

      if (estado.pagada && !estado.requiereRevision && !yaPagada) {
        await mostrarConfirmacionOtp(
          context,
          titulo: '¡Pago confirmado!',
          mensaje: 'Tu pedido pasa a preparación. Te avisaremos en cada paso.',
        );
        return;
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            estado.pagada
                ? 'El pago fue confirmado. ¡Gracias!'
                : estado.cancelada
                ? 'El pago no fue completado.'
                : 'El pago aún no se confirma. Podrás verificarlo en breve.',
          ),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _procesando = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (!mounted) return;
      setState(() => _procesando = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo verificar el pago.')),
      );
    }
  }

  Future<void> _reabrirCheckout() async {
    if (_procesando ||
        _estadoPago?.pagada == true ||
        _estadoPago?.cancelada == true) {
      return;
    }
    final url = _checkoutUrl;
    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No hay una ventana de pago disponible. Verifica esta orden en Mis compras.',
          ),
        ),
      );
      return;
    }
    if (!_importeConfirmado) {
      final aceptar = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Revisar total definitivo'),
          content: Text(
            'El total confirmado por la tienda es S/ ${Formats.precio(_total)}. '
            'Revisa este importe antes de continuar a PayU.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Revisar después'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Aceptar total'),
            ),
          ],
        ),
      );
      if (aceptar != true || !mounted) return;
      _importeConfirmado = true;
    }
    setState(() => _procesando = true);
    try {
      // Revalidar incluso una URL guardada: pudo pagarse en otro dispositivo.
      if (_orderId != null) {
        final estado = await ApiService.instance.obtenerOrdenPago(_orderId!);
        if (!mounted) return;
        if (estado.pagada || estado.cancelada) {
          setState(() {
            _estadoPago = estado;
            _checkoutUrl = null;
          });
          return;
        }
      }
      await _abrirCheckout(url);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _procesando = false);
    }
  }

  /// Abre el checkout dentro de la app y, al cerrarse, verifica el pago con
  /// el servidor (cerrar la ventana nunca confirma un cobro por sí solo).
  Future<bool> _abrirCheckout(String url) async {
    final resultado = await PagoEnAppScreen.abrir(context, url);
    if (!mounted) return true;
    await _verificarPago(trasPago: resultado == ResultadoPagoEnApp.regreso);
    return true;
  }

  /// Costo de envío según el tipo de entrega seleccionado.
  double _costoEnvio() {
    switch (_tipoEntrega) {
      case _TipoEntrega.domicilio:
        final zona = _zonas.where((z) => z.idZona == _idZona).firstOrNull;
        return zona?.tarifa ?? 0;
      case _TipoEntrega.tienda:
        return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_restaurando) {
      return Scaffold(
        appBar: AppBar(title: const Text('Finalizar pedido')),
        body: const LoadingView(message: 'Comprobando compras pendientes...'),
      );
    }
    if (_exito) {
      return _buildExito(context);
    }

    final carrito = CarritoService.instance;
    if (!_procesando) {
      _totalMostradoCentimos =
          (carrito.total * 100).round() + (_costoEnvio() * 100).round();
    }
    if (carrito.items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Finalizar pedido')),
        body: const EmptyView(
          icon: Icons.shopping_cart_outlined,
          title: 'Tu carrito está vacío',
          message: 'Agrega libros al carrito para continuar.',
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Finalizar pedido')),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
                children: [
                  const AppPageHeader(
                    eyebrow: 'Paso 2 de 3',
                    title: 'Entrega y pago',
                    subtitle:
                        'Elige cómo recibir tu pedido y confirma tus datos.',
                  ),
                  const SizedBox(height: 16),
                  const _Pasos(),
                  const SizedBox(height: 18),
                  Aparecer(
                    child: _Seccion(
                      numero: '1',
                      titulo: 'Tipo de entrega',
                      child: _buildSeccionEntrega(context),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Aparecer(
                    indice: 1,
                    child: _Seccion(
                      numero: '2',
                      titulo: 'Documento de identidad',
                      child: _buildSeccionDocumento(context),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Aparecer(indice: 2, child: _buildResumen(context)),
                ],
              ),
            ),
            _buildBarraPagar(context),
          ],
        ),
      ),
    );
  }

  Widget _buildSeccionEntrega(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _OpcionEntrega(
          seleccionado: _tipoEntrega == _TipoEntrega.domicilio,
          icon: Icons.local_shipping_outlined,
          titulo: 'Delivery',
          detalle: 'Te lo llevamos a tu dirección en Pallasca.',
          // Con una sola tarifa se muestra el precio; si no, "Según zona".
          etiqueta: _tarifaUnica
              ? 'S/ ${Formats.precio(_zonas.first.tarifa)}'
              : 'Según zona',
          onTap: () => setState(() => _tipoEntrega = _TipoEntrega.domicilio),
        ),
        const SizedBox(height: 8),
        _OpcionEntrega(
          seleccionado: _tipoEntrega == _TipoEntrega.tienda,
          icon: Icons.storefront_outlined,
          titulo: 'Recojo en tienda',
          detalle: 'Recoge tu pedido en nuestra tienda de Pallasca.',
          etiqueta: 'Gratis',
          onTap: () => setState(() => _tipoEntrega = _TipoEntrega.tienda),
        ),
        AnimatedSize(
          duration: Duracion.base,
          curve: Curva.salida,
          alignment: Alignment.topCenter,
          child: AnimatedSwitcher(
            duration: Duracion.base,
            child: KeyedSubtree(
              key: ValueKey(_tipoEntrega),
              child: switch (_tipoEntrega) {
                _TipoEntrega.domicilio => Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: _buildEntregaDomicilio(),
                ),
                _TipoEntrega.tienda => const Padding(
                  padding: EdgeInsets.only(top: 12),
                  child: _NotaTienda(),
                ),
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEntregaDomicilio() {
    if (_cargandoZonas) {
      return const LoadingView(message: 'Cargando opciones de envío...');
    }
    // La dirección se pide SIEMPRE que se elige delivery; si la tarifa aún
    // no está disponible se explica, pero el formulario no desaparece.
    final sinTarifa = _errorZonas != null || _zonas.isEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!sinTarifa && !_tarifaUnica) ...[
          const _ZonaReparto(),
          const SizedBox(height: 12),
        ],
        if (sinTarifa)
          _AvisoSinTarifa(
            mensaje: _errorZonas ?? 'El delivery aún no tiene tarifa activa. Puedes dejar tu dirección y elegir recojo gratuito en Pallasca mientras tanto.',
            onReintentar: _errorZonas != null ? _cargarZonas : null,
          )
        else if (!_tarifaUnica)
          DropdownButtonFormField<int>(
            style: Theme.of(context).textTheme.bodyLarge,
            initialValue: _idZona,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Zona de delivery en Pallasca',
              prefixIcon: Icon(Icons.location_on_outlined),
            ),
            items: [
              for (final d in _zonas)
                DropdownMenuItem(
                  value: d.idZona,
                  child: Text(
                    '${d.nombre} · S/ ${Formats.precio(d.tarifa)}',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: _zonas.isEmpty
                ? null
                : (valor) {
                    if (valor != null) {
                      setState(() => _idZona = valor);
                    }
                  },
          ),
        const SizedBox(height: 12),
        TextField(
          controller: _direccionController,
          minLines: 1,
          maxLines: 3,
          maxLength: 255,
          textCapitalization: TextCapitalization.sentences,
          autofillHints: const [AutofillHints.streetAddressLine1],
          decoration: const InputDecoration(
            labelText: 'Tu dirección en Pallasca',
            hintText: 'Calle o jirón, número y barrio',
            prefixIcon: Icon(Icons.home_outlined),
            counterText: '',
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _referenciaController,
          maxLength: 255,
          decoration: const InputDecoration(
            labelText: 'Referencia (opcional)',
            hintText: 'Un punto cercano para ubicarte',
            prefixIcon: Icon(Icons.signpost_outlined),
            counterText: '',
          ),
        ),
        CheckboxListTile(
          value: _dentroDePallasca,
          onChanged: (v) => setState(() => _dentroDePallasca = v ?? false),
          contentPadding: EdgeInsets.zero,
          dense: true,
          controlAffinity: ListTileControlAffinity.leading,
          title: const Text('Mi dirección está dentro de Pallasca'),
          subtitle: const Text('Solo repartimos dentro de la ciudad.'),
        ),
      ],
    );
  }

  Widget _buildSeccionDocumento(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: double.infinity,
          child: SegmentedButton<String>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: 'DNI', label: Text('DNI')),
              ButtonSegment(value: 'RUC', label: Text('RUC')),
              ButtonSegment(value: 'CE', label: Text('Carné ext.')),
            ],
            selected: {_tipoDocumento},
            onSelectionChanged: (valores) {
              final valor = valores.first;
              setState(() {
                _tipoDocumento = valor;
                _documentoController.clear();
              });
            },
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _documentoController,
          keyboardType: TextInputType.number,
          maxLength: _tipoDocumento == 'RUC'
              ? 11
              : _tipoDocumento == 'DNI'
              ? 8
              : 20,
          decoration: InputDecoration(
            labelText: 'Número de documento',
            prefixIcon: const Icon(Icons.badge_outlined),
            hintText: _tipoDocumento == 'DNI'
                ? 'Ej. 12345678'
                : _tipoDocumento == 'RUC'
                ? 'Ej. 20123456789'
                : 'Ej. 12345678',
            counterText: '',
            helperText: _tipoDocumento == 'DNI'
                ? '8 dígitos'
                : _tipoDocumento == 'RUC'
                ? '11 dígitos'
                : 'Al menos 8 caracteres',
          ),
        ),
      ],
    );
  }

  Widget _buildResumen(BuildContext context) {
    final subtotal = CarritoService.instance.total;
    final costoEnvio = _costoEnvio();
    final total = subtotal + costoEnvio;
    final textTheme = Theme.of(context).textTheme;
    final items = CarritoService.instance.items;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.pergamino.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(Radios.md),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Resumen del pedido', style: textTheme.titleMedium),
          const SizedBox(height: 10),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${item.libro.titulo ?? 'Libro'} × ${item.cantidad}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'S/ ${Formats.precio(item.subtotal)}',
                    style: textTheme.bodySmall?.copyWith(
                      color: item.libro.enOferta
                          ? AppColors.oferta
                          : AppColors.textSecondary,
                      decoration: item.libro.enOferta
                          ? TextDecoration.underline
                          : TextDecoration.none,
                    ),
                  ),
                ],
              ),
            ),
          Divider(height: 20, color: AppColors.gold.withValues(alpha: 0.25)),
          _FilaResumen(
            label: 'Subtotal',
            value: 'S/ ${Formats.precio(subtotal)}',
          ),
          const SizedBox(height: 6),
          _FilaResumen(
            label: 'Envío',
            value: _tipoEntrega == _TipoEntrega.tienda
                ? 'Gratis'
                : _idZona == null
                ? 'Selecciona una zona'
                : 'S/ ${Formats.precio(costoEnvio)}',
          ),
          Divider(height: 22, color: AppColors.gold.withValues(alpha: 0.25)),
          Row(
            children: [
              Expanded(child: Text('Total', style: textTheme.titleMedium)),
              AnimatedSwitcher(
                duration: Duracion.rapida,
                child: PrecioTexto(
                  key: ValueKey(total),
                  monto: total,
                  tamano: 21,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBarraPagar(BuildContext context) {
    final total = CarritoService.instance.total + _costoEnvio();
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(top: BorderSide(color: AppColors.divider)),
        boxShadow: Sombra.barra,
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Presionable(
              habilitado: !_procesando,
              child: SizedBox(
                width: double.infinity,
                height: 54,
                child: FilledButton(
                  onPressed:
                      _procesando ||
                          (_tipoEntrega == _TipoEntrega.domicilio &&
                              _idZona == null)
                      ? null
                      : _realizarCompra,
                  child: AnimatedSwitcher(
                    duration: Duracion.rapida,
                    child: _procesando
                        ? SizedBox(
                            key: const ValueKey('cargando'),
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.4,
                              color: AppColors.primary,
                            ),
                          )
                        : Row(
                            key: const ValueKey('pagar'),
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.lock_outline_rounded, size: 18),
                              const SizedBox(width: 8),
                              const Flexible(
                                child: Text(
                                  'Ir al pago seguro',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.16),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text('S/ ${Formats.precio(total)}'),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.verified_user_outlined,
                  size: 14,
                  color: AppColors.textTertiary,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    'Pagarás con PayU sin salir de la app, en una conexión segura.',
                    textAlign: TextAlign.center,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExito(BuildContext context) {
    final terminal =
        _estadoPago?.pagada == true || _estadoPago?.cancelada == true;
    final conCheckout = !terminal;
    final textTheme = Theme.of(context).textTheme;

    if (conCheckout) {
      return Scaffold(
        appBar: AppBar(title: const Text('Compra en proceso')),
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Aparecer(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const _Medallon(
                    icon: Icons.hourglass_top_rounded,
                    color: AppColors.warning,
                    fondo: AppColors.warningContainer,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    '¡Gracias por tu compra!',
                    textAlign: TextAlign.center,
                    style: textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _total != null
                        ? 'Tu orden por S/ ${Formats.precio(_total!)} quedó creada. '
                              'Ahora solo falta pagarla en PayU para confirmarla.'
                        : 'Tu orden quedó creada. Ahora solo falta pagarla '
                              'en PayU para confirmarla.',
                    textAlign: TextAlign.center,
                    style: textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Si la ventana de pago se cerró, puedes volver a abrirla.',
                    textAlign: TextAlign.center,
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                  const SizedBox(height: 26),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: FilledButton(
                      onPressed: _procesando ? null : _verificarPago,
                      child: _procesando
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                              ),
                            )
                          : const Text('Ya pagué, verificar'),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _procesando ? null : _reabrirCheckout,
                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                      label: const Text('Reabrir pago en PayU'),
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextButton(
                    onPressed: () =>
                        Navigator.of(context)
                            .popUntil((route) => route.isFirst),
                    child: const Text('Volver al catálogo'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _estadoPago?.requiereRevision == true
              ? 'Pago en revisión'
              : _estadoPago?.pagada == true
              ? 'Pago confirmado'
              : 'Pago no completado',
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Aparecer(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _Medallon(
                  icon: _estadoPago?.pagada == true
                      ? Icons.check_rounded
                      : Icons.cancel_outlined,
                  color: _estadoPago?.pagada == true
                      ? AppColors.success
                      : AppColors.warning,
                  fondo: _estadoPago?.pagada == true
                      ? AppColors.successContainer
                      : AppColors.warningContainer,
                ),
                const SizedBox(height: 20),
                Text(
                  _estadoPago?.requiereRevision == true
                      ? 'Tu pago necesita revisión'
                      : _estadoPago?.pagada == true
                      ? '¡Pago confirmado!'
                      : 'El pago no se completó',
                  textAlign: TextAlign.center,
                  style: textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  _estadoPago?.requiereRevision == true
                      ? 'El servidor recibió un resultado de pago que requiere revisión de la librería. No vuelvas a pagar esta solicitud; consulta Mis compras.'
                      : _estadoPago?.pagada == true
                      ? 'Tu compra${_total == null ? '' : ' por S/ ${Formats.precio(_total)}'} fue confirmada.'
                      : 'Tus libros se conservan en el carrito. Puedes revisar tu compra e iniciar un nuevo intento.',
                  textAlign: TextAlign.center,
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 26),
                FilledButton(
                  onPressed: () =>
                      Navigator.of(context).popUntil((route) => route.isFirst),
                  child: const Text('Volver al catálogo'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Medallón circular con filete dorado para estados finales.
class _Medallon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color fondo;

  const _Medallon({
    required this.icon,
    required this.color,
    required this.fondo,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.7, end: 1),
      duration: Duracion.lenta,
      curve: Curves.easeOutBack,
      builder: (context, escala, child) =>
          Transform.scale(scale: escala, child: child),
      child: Container(
        width: 96,
        height: 96,
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.gold.withValues(alpha: 0.45)),
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(color: fondo, shape: BoxShape.circle),
          child: Icon(icon, size: 42, color: color),
        ),
      ),
    );
  }
}

/// Pasos del flujo de compra (Carrito ✓ · Entrega · Pago).
class _Pasos extends StatelessWidget {
  const _Pasos();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    Widget paso(
      String numero,
      String texto, {
      required bool hecho,
      required bool actual,
    }) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 26,
            height: 26,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: hecho || actual ? AppColors.primary : AppColors.surface,
              border: Border.all(
                color: hecho || actual
                    ? AppColors.primary
                    : AppColors.dividerStrong,
                width: 1.5,
              ),
            ),
            child: hecho
                ? const Icon(Icons.check_rounded, size: 15, color: Colors.white)
                : Text(
                    numero,
                    style: textTheme.labelMedium?.copyWith(
                      color: actual ? Colors.white : AppColors.textTertiary,
                    ),
                  ),
          ),
          const SizedBox(height: 5),
          Text(
            texto,
            style: textTheme.labelSmall?.copyWith(
              color: hecho || actual
                  ? AppColors.textPrimary
                  : AppColors.textTertiary,
              fontWeight: actual ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
        ],
      );
    }

    Widget linea(bool activa) => Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 18, left: 6, right: 6),
        decoration: BoxDecoration(
          color: activa ? AppColors.gold : AppColors.divider,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radios.md),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          paso('1', 'Carrito', hecho: true, actual: false),
          linea(true),
          paso('2', 'Entrega', hecho: false, actual: true),
          linea(false),
          paso('3', 'Pago', hecho: false, actual: false),
        ],
      ),
    );
  }
}

/// Sección numerada del formulario.
class _Seccion extends StatelessWidget {
  final String numero;
  final String titulo;
  final Widget child;

  const _Seccion({
    required this.numero,
    required this.titulo,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Radios.md),
        border: Border.all(color: AppColors.divider),
        boxShadow: Sombra.tarjeta,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.secondaryContainer,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  numero,
                  style: textTheme.labelMedium?.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(titulo, style: textTheme.titleMedium)),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

/// Fila del resumen del pedido.
class _FilaResumen extends StatelessWidget {
  final String label;
  final String value;

  const _FilaResumen({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
        Text(
          value,
          style: textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

/// Nota informativa del tipo "Recoger en tienda".
class _NotaTienda extends StatelessWidget {
  const _NotaTienda();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.successContainer,
        borderRadius: BorderRadius.circular(Radios.sm),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.storefront_rounded,
            size: 20,
            color: AppColors.success,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Puedes recoger tu pedido en nuestra tienda en Pallasca sin costo de envío.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: AppColors.textPrimary, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

/// Tarjeta seleccionable de tipo de entrega.
class _OpcionEntrega extends StatelessWidget {
  final bool seleccionado;
  final IconData icon;
  final String titulo;
  final String detalle;
  final String etiqueta;
  final VoidCallback onTap;

  const _OpcionEntrega({
    required this.seleccionado,
    required this.icon,
    required this.titulo,
    required this.detalle,
    required this.etiqueta,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Presionable(
      escala: 0.985,
      child: Semantics(
        selected: seleccionado,
        button: true,
        child: AnimatedContainer(
          duration: Duracion.rapida,
          decoration: BoxDecoration(
            color: seleccionado ? AppColors.primaryContainer : AppColors.paper,
            borderRadius: BorderRadius.circular(Radios.sm),
            border: Border.all(
              color: seleccionado ? AppColors.primary : AppColors.divider,
              width: seleccionado ? 1.4 : 1,
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(Radios.sm),
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: seleccionado
                            ? AppColors.primary
                            : AppColors.surface,
                        borderRadius: BorderRadius.circular(Radios.sm),
                        border: Border.all(color: AppColors.divider),
                      ),
                      child: Icon(
                        icon,
                        size: 20,
                        color: seleccionado
                            ? Colors.white
                            : AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Tarifa junto al título: la descripción usa todo
                          // el ancho y no se aprieta en pantallas angostas.
                          Wrap(
                            spacing: 8,
                            runSpacing: 2,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                titulo,
                                style: textTheme.titleSmall?.copyWith(
                                  color: seleccionado
                                      ? AppColors.primary
                                      : AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                etiqueta,
                                style: textTheme.labelSmall?.copyWith(
                                  color: AppColors.textTertiary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 1),
                          Text(
                            detalle,
                            style: textTheme.bodySmall?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    AnimatedSwitcher(
                      duration: Duracion.rapida,
                      child: Icon(
                        seleccionado
                            ? Icons.radio_button_checked_rounded
                            : Icons.radio_button_off_rounded,
                        key: ValueKey(seleccionado),
                        size: 20,
                        color: seleccionado
                            ? AppColors.primary
                            : AppColors.dividerStrong,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Aviso cuando la tarifa de delivery no está disponible.
class _AvisoSinTarifa extends StatelessWidget {
  final String mensaje;
  final VoidCallback? onReintentar;
  const _AvisoSinTarifa({required this.mensaje, this.onReintentar});

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
    decoration: BoxDecoration(
      color: AppColors.warningContainer,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.info_outline, color: AppColors.warning, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(mensaje, style: const TextStyle(fontSize: 13)),
            ),
          ],
        ),
        if (onReintentar != null)
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: onReintentar,
              child: const Text('Reintentar'),
            ),
          ),
      ],
    ),
  );
}

/// Cobertura fija: delivery exclusivo dentro de Pallasca.
class _ZonaReparto extends StatelessWidget {
  const _ZonaReparto();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.paper,
        borderRadius: BorderRadius.circular(Radios.sm),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          Icon(Icons.location_city_outlined, size: 20, color: AppColors.gold),
          const SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: 'Pallasca',
                    style: textTheme.titleSmall?.copyWith(
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const TextSpan(text: '  ·  Elige tu zona de reparto'),
                ],
              ),
              style: textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
