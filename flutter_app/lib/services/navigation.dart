import 'package:flutter/material.dart';

/// Clave global del [Navigator] para navegar sin contexto de widget.
///
/// La usa el interceptor HTTP de [ApiService] cuando la sesión expira con
/// 401 y se necesita redirigir al Login desde un servicio (sin BuildContext).
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

/// Construye la pantalla de Login. La registra `main.dart` al arrancar, así
/// la capa de servicios no importa pantallas (evita el ciclo de imports
/// servicios → pantallas → servicios).
WidgetBuilder? constructorLogin;

bool _navegandoALogin = false;

/// Reemplaza la pila de navegación con la pantalla de Login.
///
/// Evita lanzar navegación duplicada dentro del mismo frame (varios 401
/// simultáneos o el Splash compitiendo por la misma transición). Una vez que
/// el interceptor limpia la sesión, las respuestas 401 siguientes ya no
/// encuentran token y no vuelven a navegar.
void irALogin() {
  final navigator = navigatorKey.currentState;
  final login = constructorLogin;
  if (navigator == null || login == null || _navegandoALogin) return;
  _navegandoALogin = true;
  navigator.pushAndRemoveUntil(
    MaterialPageRoute<void>(builder: login),
    (route) => false,
  );
  WidgetsBinding.instance.addPostFrameCallback((_) {
    _navegandoALogin = false;
  });
}
