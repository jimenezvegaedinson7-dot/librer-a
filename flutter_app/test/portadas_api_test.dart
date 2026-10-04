import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/models/libro.dart';
import 'package:libreria_app/utils/constants.dart';

void main() {
  test('la URL absoluta de respaldo de la API llega a la imagen y al caché', () {
    const url =
        'https://librer-a-zeta.vercel.app/portadas/9789700508900-referencia.jpg';
    final libro = Libro.fromJson({
      'id_libro': 85,
      'titulo': 'La ley del amour',
      'isbn': '9789700508900',
      'portada': url,
      'portada_registrada': null,
      'portada_respaldo': url,
      'portada_es_referencia': true,
      'portada_edicion_referencia': {
        'isbn': '9788401385360',
        'edicion': 'Plaza & Janés, 1995',
      },
      'precio': '42.00',
      'precio_final': '42.00',
      'stock': 18,
      'estado': 1,
    });
    expect(Constants.buildPortadaUrl(libro.portada), url);
    expect(
      Constants.buildPortadaUrl(Libro.fromJson(libro.toJson()).portada),
      url,
    );
    expect(libro.isbn, '9789700508900');
    expect(libro.precioCompra, 42);
    expect(libro.stock, 18);
  });
  test('portadas manuales conservan su URL o ruta de uploads', () {
    for (final url in [
      'https://res.cloudinary.com/prueba/image/upload/manual.jpg',
      '/uploads/portadas/manual.jpg',
    ]) {
      final libro = Libro.fromJson({'portada': url, 'estado': 1});
      expect(libro.portada, url);
      expect(
        Constants.buildPortadaUrl(libro.portada),
        url.startsWith('https://') ? url : '${Constants.serverBaseUrl}$url',
      );
    }
    expect(
      Constants.buildPortadaUrl(Libro.fromJson({'portada': null}).portada),
      '',
    );
  });
}
