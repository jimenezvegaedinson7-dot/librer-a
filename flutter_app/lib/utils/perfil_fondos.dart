import 'package:flutter/material.dart';

/// Combinación de fondo de pantallas y color de tarjetas.
///
/// Todos son claros: los textos de la app son oscuros y deben leerse bien.
class FondoApp {
  final String id;
  final String nombre;
  final Color fondo;
  final Color tarjeta;

  /// Grupo en la pantalla "Fondo y tarjetas": suaves o con color.
  final bool conColor;

  const FondoApp({
    required this.id,
    required this.nombre,
    required this.fondo,
    required this.tarjeta,
    this.conColor = false,
  });
}

/// Fondo por defecto: el marfil de la librería con tarjetas blancas.
const String fondoDefaultId = 'marfil';

const List<FondoApp> fondosApp = [
  FondoApp(
    id: 'marfil',
    nombre: 'Marfil',
    fondo: Color(0xFFF6F1E9),
    tarjeta: Color(0xFFFFFFFF),
  ),
  FondoApp(
    id: 'blanco',
    nombre: 'Blanco',
    fondo: Color(0xFFF7F7F8),
    tarjeta: Color(0xFFFFFFFF),
  ),
  FondoApp(
    id: 'perla',
    nombre: 'Gris perla',
    fondo: Color(0xFFEDEEF0),
    tarjeta: Color(0xFFFAFAFB),
  ),
  FondoApp(
    id: 'arena',
    nombre: 'Arena',
    fondo: Color(0xFFEFE6D6),
    tarjeta: Color(0xFFFBF7EF),
  ),
  FondoApp(
    id: 'pergamino',
    nombre: 'Pergamino',
    fondo: Color(0xFFF1E8D8),
    tarjeta: Color(0xFFFFFCF6),
  ),
  FondoApp(
    id: 'niebla',
    nombre: 'Niebla azul',
    fondo: Color(0xFFE9EEF5),
    tarjeta: Color(0xFFFFFFFF),
  ),
  FondoApp(
    id: 'cielo',
    nombre: 'Cielo',
    fondo: Color(0xFFE3F0FA),
    tarjeta: Color(0xFFF8FBFE),
  ),
  FondoApp(
    id: 'menta',
    nombre: 'Menta',
    fondo: Color(0xFFE6F3EC),
    tarjeta: Color(0xFFFAFDFB),
  ),
  FondoApp(
    id: 'salvia',
    nombre: 'Salvia',
    fondo: Color(0xFFE8ECE2),
    tarjeta: Color(0xFFFBFCF8),
  ),
  FondoApp(
    id: 'rosa',
    nombre: 'Rosa empolvado',
    fondo: Color(0xFFF6E9EA),
    tarjeta: Color(0xFFFFFAFA),
  ),
  FondoApp(
    id: 'durazno',
    nombre: 'Durazno',
    fondo: Color(0xFFF9EAE0),
    tarjeta: Color(0xFFFFFBF8),
  ),
  FondoApp(
    id: 'lavanda',
    nombre: 'Lavanda',
    fondo: Color(0xFFEEEAF6),
    tarjeta: Color(0xFFFCFBFE),
  ),
  // Con color: tonos más vivos, siempre claros para que el texto se lea.
  FondoApp(
    id: 'mostaza',
    nombre: 'Mostaza',
    fondo: Color(0xFFF7ECC9),
    tarjeta: Color(0xFFFFFBEE),
    conColor: true,
  ),
  FondoApp(
    id: 'miel',
    nombre: 'Miel',
    fondo: Color(0xFFFBE7B5),
    tarjeta: Color(0xFFFFF8E6),
    conColor: true,
  ),
  FondoApp(
    id: 'melocoton',
    nombre: 'Melocotón',
    fondo: Color(0xFFFDE3CC),
    tarjeta: Color(0xFFFFF7F0),
    conColor: true,
  ),
  FondoApp(
    id: 'coral',
    nombre: 'Coral',
    fondo: Color(0xFFFCDCD3),
    tarjeta: Color(0xFFFFF5F2),
    conColor: true,
  ),
  FondoApp(
    id: 'frambuesa',
    nombre: 'Frambuesa',
    fondo: Color(0xFFF9D5E1),
    tarjeta: Color(0xFFFFF4F8),
    conColor: true,
  ),
  FondoApp(
    id: 'orquidea',
    nombre: 'Orquídea',
    fondo: Color(0xFFEEDAF5),
    tarjeta: Color(0xFFFBF5FE),
    conColor: true,
  ),
  FondoApp(
    id: 'lila',
    nombre: 'Lila',
    fondo: Color(0xFFE3DDF9),
    tarjeta: Color(0xFFF8F6FF),
    conColor: true,
  ),
  FondoApp(
    id: 'azul_hielo',
    nombre: 'Azul hielo',
    fondo: Color(0xFFD9E8FA),
    tarjeta: Color(0xFFF5F9FF),
    conColor: true,
  ),
  FondoApp(
    id: 'aguamarina',
    nombre: 'Aguamarina',
    fondo: Color(0xFFCFEFF5),
    tarjeta: Color(0xFFF2FBFD),
    conColor: true,
  ),
  FondoApp(
    id: 'turquesa',
    nombre: 'Turquesa',
    fondo: Color(0xFFD2F0EE),
    tarjeta: Color(0xFFF3FCFB),
    conColor: true,
  ),
  FondoApp(
    id: 'jade',
    nombre: 'Jade',
    fondo: Color(0xFFD4EEDF),
    tarjeta: Color(0xFFF3FBF6),
    conColor: true,
  ),
  FondoApp(
    id: 'lima',
    nombre: 'Lima',
    fondo: Color(0xFFE6F2CF),
    tarjeta: Color(0xFFF9FDF1),
    conColor: true,
  ),
  FondoApp(
    id: 'oliva',
    nombre: 'Oliva',
    fondo: Color(0xFFE7E6CF),
    tarjeta: Color(0xFFFAFAF1),
    conColor: true,
  ),
  FondoApp(
    id: 'arcilla',
    nombre: 'Arcilla',
    fondo: Color(0xFFF0DCCD),
    tarjeta: Color(0xFFFCF5F0),
    conColor: true,
  ),
  FondoApp(
    id: 'champan',
    nombre: 'Champán',
    fondo: Color(0xFFF3EADB),
    tarjeta: Color(0xFFFFFCF7),
    conColor: true,
  ),
  FondoApp(
    id: 'grafito',
    nombre: 'Grafito claro',
    fondo: Color(0xFFE2E4E8),
    tarjeta: Color(0xFFF6F7F9),
    conColor: true,
  ),
];

/// Resuelve un fondo por su id; si no existe, el marfil.
FondoApp fondoPorId(String id) =>
    fondosApp.firstWhere((f) => f.id == id, orElse: () => fondosApp.first);
