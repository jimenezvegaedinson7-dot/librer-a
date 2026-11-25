import 'package:flutter/material.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

WidgetBuilder? constructorLogin;

bool _navegandoALogin = false;

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
