import '../models/venta.dart';

/// Tono visual del seguimiento.
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

/// Lo que el cliente ve de su pedido: un título, una frase y los pasos de
/// su tipo de entrega. Mismos textos que la web
/// (frontend/src/lib/utils/seguimientoPedido.js) y que los correos; el
/// panel avanza estos mismos pasos (features/pedidos/estadosPedido.js).
///
///   Recojo:   Recibido → Preparando → Listo → Recogido
///   Delivery: Recibido → Preparando → En camino → Entregado
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
      ('pendiente', 'Recibido'),
      ('preparando', 'Preparando'),
      ('listo_recojo', 'Listo'),
      ('entregado', 'Recogido'),
    ],
    'domicilio': [
      ('pendiente', 'Recibido'),
      ('preparando', 'Preparando'),
      ('en_camino', 'En camino'),
      ('entregado', 'Entregado'),
    ],
  };

  static const _recibido = (
    'Pedido recibido',
    'Confirmamos tu pago. Pronto empezaremos a preparar tus libros.',
  );

  static (String, String)? _texto(
    String tipo,
    String estado,
    int? id,
  ) => switch ((tipo, estado)) {
    (_, 'pendiente') => _recibido,
    ('tienda', 'preparando') => (
      'Preparando tu pedido',
      'Estamos separando tus libros en la tienda.',
    ),
    ('tienda', 'listo_recojo') => (
      'Listo para recoger',
      'Acércate a la tienda con tu número de pedido #${id ?? '—'} y tu DNI.',
    ),
    ('tienda', 'entregado') => (
      'Pedido recogido',
      'Recogiste tu pedido. ¡Gracias por tu compra!',
    ),
    ('domicilio', 'preparando') => (
      'Preparando tu pedido',
      'Estamos empaquetando tus libros para enviarlos.',
    ),
    ('domicilio', 'en_camino') => (
      'Tu pedido va en camino',
      'Salió hacia tu dirección. Mantén tu teléfono a mano para coordinar la entrega.',
    ),
    ('domicilio', 'entregado') => (
      'Pedido entregado',
      'Tu pedido llegó a tu dirección. ¡Gracias por tu compra!',
    ),
    _ => null,
  };

  factory SeguimientoPedido.de(Venta venta) {
    final comercial = (venta.estado ?? '').toLowerCase().trim();
    final tipo = (venta.tipoEntrega ?? '').toLowerCase().trim();
    // Ventas antiguas sin estado de entrega: "entregada" implica entregado.
    final estado =
        (venta.estadoEntrega ??
                (comercial == 'entregada' ? 'entregado' : 'pendiente'))
            .toLowerCase()
            .trim();
    final flujo = _pasos[tipo];
    List<PasoSeguimiento> pasos(int indice) => [
      for (var i = 0; i < (flujo?.length ?? 0); i++)
        PasoSeguimiento(
          flujo![i].$1,
          flujo[i].$2,
          hecho: i <= indice,
          actual: i == indice,
        ),
    ];

    if (comercial == 'reembolsada') {
      return const SeguimientoPedido(
        titulo: 'Compra reembolsada',
        mensaje: 'Devolvimos el dinero de esta compra.',
        tono: TonoSeguimiento.cancelado,
      );
    }
    if (estado == 'cancelado' || comercial == 'cancelada') {
      return const SeguimientoPedido(
        titulo: 'Pedido cancelado',
        mensaje: 'Este pedido no continuará. Si ya pagaste, te contactaremos para la devolución.',
        tono: TonoSeguimiento.cancelado,
      );
    }
    if (comercial == 'pendiente') {
      return SeguimientoPedido(
        titulo: 'Esperando pago',
        mensaje: 'La preparación empieza cuando se confirme tu pago.',
        pasos: pasos(-1),
        tono: TonoSeguimiento.espera,
      );
    }
    final texto = _texto(tipo, estado, venta.idVenta);
    if (flujo == null || texto == null) {
      return const SeguimientoPedido(titulo: 'En proceso', mensaje: '');
    }
    return SeguimientoPedido(
      titulo: texto.$1,
      mensaje: texto.$2,
      pasos: pasos(flujo.indexWhere((p) => p.$1 == estado)),
      tono: estado == 'entregado'
          ? TonoSeguimiento.listo
          : TonoSeguimiento.proceso,
    );
  }
}
