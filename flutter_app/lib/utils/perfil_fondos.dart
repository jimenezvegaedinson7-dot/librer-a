import 'package:flutter/material.dart';

/// Combinación de fondo de pantallas y color de tarjetas.
///
/// Todos son claros: los textos de la app son oscuros y deben leerse bien.
class FondoApp {
  final String id;
  final String nombre;
  final Color fondo;
  final Color tarjeta;

  const FondoApp({
    required this.id,
    required this.nombre,
    required this.fondo,
    required this.tarjeta,
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
];

/// Resuelve un fondo por su id; si no existe, el marfil.
FondoApp fondoPorId(String id) =>
    fondosApp.firstWhere((f) => f.id == id, orElse: () => fondosApp.first);
