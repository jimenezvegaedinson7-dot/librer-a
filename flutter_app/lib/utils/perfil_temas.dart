import 'package:flutter/material.dart';

/// Tema de personalización visual del perfil.
///
/// Puede ser un color sólido ([inicio] == [fin]) o un degradado aplicado al
/// encabezado, con un color de texto calculado automáticamente según el brillo
/// de la combinación elegida.
class PerfilTema {
  final String id;
  final String nombre;
  final Color inicio;
  final Color fin;

  const PerfilTema({
    required this.id,
    required this.nombre,
    required this.inicio,
    required this.fin,
  });

  bool get esGradiente => inicio != fin;

  /// Degradado diagonal del tema.
  LinearGradient get gradiente => LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: esGradiente ? [inicio, fin] : [inicio, inicio],
  );

  /// Color de texto legible sobre [gradiente] (oscuro si el tema es claro).
  Color get textColor {
    final luminancia = (inicio.computeLuminance() + fin.computeLuminance()) /
        2;
    return luminancia > 0.5 ? const Color(0xFF17181C) : Colors.white;
  }

  /// Color principal de la app (botones, selección, iconos activos).
  ///
  /// Usa el extremo más oscuro del tema; si ambos son claros devuelve el
  /// grafito neutro para mantener botones legibles.
  Color get colorPrincipal {
    final base = inicio.computeLuminance() <= fin.computeLuminance()
        ? inicio
        : fin;
    return base.computeLuminance() > 0.55 ? const Color(0xFF202227) : base;
  }

  /// Versión oscurecida del [colorPrincipal] (sombras y acentos profundos).
  Color get colorOscuro => _oscurecer(colorPrincipal, 0.22);

  /// Acento decorativo de la app (dorado, badges, precios, carriles).
  ///
  /// Para temas claros se conserva el dorado de marca.
  Color get colorAcento {
    final luminancia = (inicio.computeLuminance() + fin.computeLuminance()) /
        2;
    return luminancia > 0.85 ? const Color(0xFFD3A331) : inicio;
  }

  /// Acento oscurecido para textos sobre superficies claras (precios).
  Color get colorAcentoOscuro => _oscurecer(colorAcento, 0.28);

  /// Contenedor claro del color principal (perfiles de iconos, chips).
  Color get contenedorPrincipal =>
      Color.alphaBlend(colorPrincipal.withValues(alpha: 0.12), Colors.white);

  /// Contenedor claro del acento (insignias y pestañas suaves).
  Color get contenedorAcento =>
      Color.alphaBlend(colorAcento.withValues(alpha: 0.18), Colors.white);
}

/// Oscurece un color mezclándolo con negro.
Color _oscurecer(Color color, double proporcion) =>
    Color.alphaBlend(Colors.black.withValues(alpha: proporcion), color);

/// Prefijo del id de los temas personalizados: `custom_AABBCC_DDEEFF`.
const _customPrefixo = 'custom_';

/// Id del tema por defecto (superficie blanca).
const String perfilTemaDefaultId = 'default';

/// Paleta de temas predefinidos: colores sólidos y degradados.
const List<PerfilTema> perfilTemas = [
  PerfilTema(
    id: 'default',
    nombre: 'Blanco',
    inicio: Color(0xFFFFFFFF),
    fin: Color(0xFFFFFFFF),
  ),
  PerfilTema(
    id: 'grafito',
    nombre: 'Grafito',
    inicio: Color(0xFF202227),
    fin: Color(0xFF3A3E46),
  ),
  PerfilTema(
    id: 'noche',
    nombre: 'Noche',
    inicio: Color(0xFF111827),
    fin: Color(0xFF1F2937),
  ),
  PerfilTema(
    id: 'azul_oscuro',
    nombre: 'Azul profundo',
    inicio: Color(0xFF1E3A8A),
    fin: Color(0xFF4338CA),
  ),
  PerfilTema(
    id: 'indigo',
    nombre: 'Índigo',
    inicio: Color(0xFF4F46E5),
    fin: Color(0xFF7C3AED),
  ),
  PerfilTema(
    id: 'violeta',
    nombre: 'Violeta',
    inicio: Color(0xFF7C3AED),
    fin: Color(0xFFA855F7),
  ),
  PerfilTema(
    id: 'malva',
    nombre: 'Malva',
    inicio: Color(0xFFC026D3),
    fin: Color(0xFFEC4899),
  ),
  PerfilTema(
    id: 'rosa',
    nombre: 'Rosa',
    inicio: Color(0xFFBE185D),
    fin: Color(0xFFEC4899),
  ),
  PerfilTema(
    id: 'vino',
    nombre: 'Vino',
    inicio: Color(0xFF881337),
    fin: Color(0xFFBE185D),
  ),
  PerfilTema(
    id: 'rojo',
    nombre: 'Rojo',
    inicio: Color(0xFFDC2626),
    fin: Color(0xFFEA580C),
  ),
  PerfilTema(
    id: 'naranja',
    nombre: 'Naranja',
    inicio: Color(0xFFEA580C),
    fin: Color(0xFFF97316),
  ),
  PerfilTema(
    id: 'cobre',
    nombre: 'Cobre',
    inicio: Color(0xFFB45309),
    fin: Color(0xFFD97706),
  ),
  PerfilTema(
    id: 'dorado',
    nombre: 'Dorado',
    inicio: Color(0xFFB98218),
    fin: Color(0xFFE6B93C),
  ),
  PerfilTema(
    id: 'arena',
    nombre: 'Arena',
    inicio: Color(0xFF96630E),
    fin: Color(0xFFD3A331),
  ),
  PerfilTema(
    id: 'esmeralda',
    nombre: 'Esmeralda',
    inicio: Color(0xFF065F46),
    fin: Color(0xFF10B981),
  ),
  PerfilTema(
    id: 'hoja',
    nombre: 'Hoja',
    inicio: Color(0xFF15803D),
    fin: Color(0xFF22C55E),
  ),
  PerfilTema(
    id: 'teal',
    nombre: 'Teal',
    inicio: Color(0xFF115E59),
    fin: Color(0xFF14B8A6),
  ),
  PerfilTema(
    id: 'mar',
    nombre: 'Mar',
    inicio: Color(0xFF0E7490),
    fin: Color(0xFF22D3EE),
  ),
  PerfilTema(
    id: 'cielo',
    nombre: 'Cielo',
    inicio: Color(0xFF0369A1),
    fin: Color(0xFF38BDF8),
  ),
  PerfilTema(
    id: 'pizarra',
    nombre: 'Pizarra',
    inicio: Color(0xFF475569),
    fin: Color(0xFF94A3B8),
  ),
  PerfilTema(
    id: 'tinta',
    nombre: 'Tinta',
    inicio: Color(0xFF0F172A),
    fin: Color(0xFF0F172A),
  ),
  PerfilTema(
    id: 'acero',
    nombre: 'Acero',
    inicio: Color(0xFF334155),
    fin: Color(0xFF94A3B8),
  ),
  PerfilTema(
    id: 'plata',
    nombre: 'Plata',
    inicio: Color(0xFF6B7280),
    fin: Color(0xFFD1D5DB),
  ),
  PerfilTema(
    id: 'marino',
    nombre: 'Marino',
    inicio: Color(0xFF1E3A8A),
    fin: Color(0xFF0EA5E9),
  ),
  PerfilTema(
    id: 'celeste',
    nombre: 'Celeste',
    inicio: Color(0xFF0284C7),
    fin: Color(0xFF7DD3FC),
  ),
  PerfilTema(
    id: 'aguacate',
    nombre: 'Aguacate',
    inicio: Color(0xFF4D7C0F),
    fin: Color(0xFF84CC16),
  ),
  PerfilTema(
    id: 'oliva',
    nombre: 'Oliva',
    inicio: Color(0xFF3F6212),
    fin: Color(0xFF65A30D),
  ),
  PerfilTema(
    id: 'cafe',
    nombre: 'Café',
    inicio: Color(0xFF451A03),
    fin: Color(0xFF92400E),
  ),
  PerfilTema(
    id: 'caramelo',
    nombre: 'Caramelo',
    inicio: Color(0xFF9A3412),
    fin: Color(0xFFFB923C),
  ),
  PerfilTema(
    id: 'ciruela',
    nombre: 'Ciruela',
    inicio: Color(0xFF581C87),
    fin: Color(0xFFA21CAF),
  ),
  PerfilTema(
    id: 'fucsia',
    nombre: 'Fucsia',
    inicio: Color(0xFFA21CAF),
    fin: Color(0xFFD946EF),
  ),
  PerfilTema(
    id: 'cereza',
    nombre: 'Cereza',
    inicio: Color(0xFFB91C1C),
    fin: Color(0xFFF87171),
  ),
  PerfilTema(
    id: 'botella',
    nombre: 'Botella',
    inicio: Color(0xFF064E3B),
    fin: Color(0xFF34D399),
  ),
  PerfilTema(
    id: 'lavanda',
    nombre: 'Lavanda',
    inicio: Color(0xFF7C3AED),
    fin: Color(0xFFC4B5FD),
  ),
];

/// Resuelve un tema por su id.
///
/// Soporta los predefinidos de [perfilTemas] y los personalizados con el
/// formato `custom_AABBCC_DDEEFF` (degradado) o `custom_AABBCC` (color puro).
/// Si el id es inválido devuelve el tema por defecto.
PerfilTema perfilTemaPorId(String id) {
  if (id.startsWith(_customPrefixo)) {
    final cuerpo = id.substring(_customPrefixo.length);
    final partes = cuerpo.split('_');
    if (partes.isNotEmpty && partes.length <= 2) {
      final ini = _parseColor(partes[0]);
      if (ini != null) {
        final fin = partes.length == 2 ? _parseColor(partes[1]) : null;
        return PerfilTema(
          id: id,
          nombre: 'Personalizado',
          inicio: ini,
          fin: fin ?? ini,
        );
      }
    }
  }
  return perfilTemas.firstWhere(
    (tema) => tema.id == id,
    orElse: () => perfilTemas.first,
  );
}

/// Codifica un tema como cadena persistente (id de [PerfilTema]).
String perfilTemaToId(PerfilTema tema) {
  return tema.id;
}

/// Id persistente para un color/degradado personalizado.
String perfilTemaIdPersonalizado(Color inicio, {Color? fin}) {
  return '$_customPrefixo${_colorHex(inicio)}'
      '${fin != null && fin != inicio ? '_${_colorHex(fin)}' : ''}';
}

Color? _parseColor(String hex) {
  if (hex.length != 6) return null;
  final valor = int.tryParse(hex, radix: 16);
  if (valor == null) return null;
  return Color(0xFF000000 | valor);
}

String _colorHex(Color color) {
  return color
      .toARGB32()
      .toRadixString(16)
      .padLeft(8, '0')
      .substring(2)
      .toUpperCase();
}