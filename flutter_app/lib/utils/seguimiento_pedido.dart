import '../models/venta.dart';

enum TonoSeguimiento { espera, proceso, listo, cancelado }

class PasoSeguimiento {
  final String clave, etiqueta;
  final bool hecho, actual;
  const PasoSeguimiento(
    this.clave,
    this.etiqueta, {
    this.hecho = false,
    this.actual = false,
  });
}

/// Solo estado_entrega determina avances. 'preparando' es un alias histórico
/// del tramo Por preparar; el estado comercial no inventa una entrega.
class SeguimientoPedido {
  final String titulo, mensaje;
  final List<PasoSeguimiento> pasos;
  final TonoSeguimiento tono;
  const SeguimientoPedido({
    required this.titulo,
    required this.mensaje,
    this.pasos = const [],
    this.tono = TonoSeguimiento.proceso,
  });
  static const _pasos = {
    'tienda': [
      ('pendiente', 'Por preparar'),
      ('listo_recojo', 'Listo para recoger'),
      ('entregado', 'Entregado'),
    ],
    'domicilio': [
      ('pendiente', 'Por preparar'),
      ('en_camino', 'En camino'),
      ('entregado', 'Entregado'),
    ],
  };
  factory SeguimientoPedido.de(Venta venta) {
    final comercial = (venta.estado ?? '').toLowerCase().trim();
    final tipo = (venta.tipoEntrega ?? '').toLowerCase().trim();
    final registrado = venta.estadoEntrega?.toLowerCase().trim();
    final estado = registrado == 'preparando' ? 'pendiente' : registrado;
    if (estado == 'cancelado' || comercial == 'cancelada') {
      return const SeguimientoPedido(
        titulo: 'Pedido cancelado',
        mensaje: 'La entrega se detuvo. El estado del pago y una posible devolución se consultan por separado.',
        tono: TonoSeguimiento.cancelado,
      );
    }
    final flujo = _pasos[tipo];
    final indiceRegistrado =
        flujo?.indexWhere((paso) => paso.$1 == estado) ?? -1;
    if (flujo == null || indiceRegistrado < 0) {
      return const SeguimientoPedido(
        titulo: 'Estado de entrega no disponible',
        mensaje: 'No hay un estado logístico compatible registrado. No se supone una entrega ni un avance.',
        tono: TonoSeguimiento.espera,
      );
    }
    final indice = estado == 'pendiente' && !venta.pagada
        ? -1
        : indiceRegistrado;
    final pasos = [
      for (var i = 0; i < flujo.length; i++)
        PasoSeguimiento(
          flujo[i].$1,
          flujo[i].$2,
          hecho: i < indice || indice == flujo.length - 1,
          actual: i == indice,
        ),
    ];
    final etiqueta = flujo[indiceRegistrado].$2;
    if (venta.requiereRevision ||
        venta.estadoReembolso == 'pendiente_verificacion') {
      return SeguimientoPedido(
        titulo: estado == 'entregado' ? 'Entregado' : 'Entrega detenida',
        mensaje:
            'Último estado registrado: $etiqueta. ${venta.requiereRevision ? 'El pago requiere revisión.' : 'Hay una devolución pendiente de verificación.'}',
        pasos: pasos,
        tono: TonoSeguimiento.espera,
      );
    }
    if (comercial == 'reembolsada') {
      return SeguimientoPedido(
        titulo: estado == 'entregado' ? 'Entregado' : 'Entrega detenida',
        mensaje:
            'Último estado registrado: $etiqueta. Reembolso registrado para esta compra.',
        pasos: pasos,
        tono: estado == 'entregado'
            ? TonoSeguimiento.listo
            : TonoSeguimiento.espera,
      );
    }
    if (!venta.pagada) {
      return SeguimientoPedido(
        titulo: 'Esperando pago',
        mensaje: 'La preparación empieza cuando se confirme el pago. El pago no confirma la entrega.',
        pasos: pasos,
        tono: TonoSeguimiento.espera,
      );
    }
    final mensaje = estado == 'pendiente'
        ? 'Tu pago está confirmado. El pedido todavía no está listo ni ha salido.'
        : estado == 'listo_recojo'
        ? 'Acércate a la tienda con tu número de pedido #${venta.idVenta ?? '—'} y tu DNI.'
        : estado == 'en_camino'
        ? 'El pedido salió con el repartidor hacia tu dirección.'
        : tipo == 'tienda'
        ? 'La entrega de tus libros en tienda fue confirmada.'
        : 'La entrega de tus libros a domicilio fue confirmada.';
    return SeguimientoPedido(
      titulo: etiqueta,
      mensaje: mensaje,
      pasos: pasos,
      tono: estado == 'entregado'
          ? TonoSeguimiento.listo
          : TonoSeguimiento.proceso,
    );
  }
}
