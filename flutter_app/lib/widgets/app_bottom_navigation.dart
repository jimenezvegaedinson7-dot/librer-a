import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import '../utils/app_tokens.dart';
import 'carrito_badge.dart';

/// Índices de las pestañas de la navegación principal.
///
/// Inicio · Catálogo · Carrito · Reservas · Perfil.
enum AppTab { inicio, libros, carrito, reservas, perfil }

/// Navegación principal con identidad editorial de la librería.
///
/// Barra blanca cálida con sombra superior. La pestaña activa muestra una
/// píldora burdeos suave detrás del icono (animada) y el icono relleno; el
/// carrito conserva su insignia de unidades.
class AppBottomNavigation extends StatelessWidget {
  final AppTab currentTab;
  final ValueChanged<AppTab> onTabSelected;

  const AppBottomNavigation({
    super.key,
    required this.currentTab,
    required this.onTabSelected,
  });

  static const List<
    ({AppTab tab, IconData icon, IconData activo, String label})
  >
  _tabs = [
    (
      tab: AppTab.inicio,
      icon: Icons.home_outlined,
      activo: Icons.home_rounded,
      label: 'Inicio',
    ),
    (
      tab: AppTab.libros,
      icon: Icons.auto_stories_outlined,
      activo: Icons.auto_stories_rounded,
      label: 'Catálogo',
    ),
    (
      tab: AppTab.carrito,
      icon: Icons.shopping_cart_outlined,
      activo: Icons.shopping_cart_rounded,
      label: 'Carrito',
    ),
    (
      tab: AppTab.reservas,
      icon: Icons.bookmark_outline_rounded,
      activo: Icons.bookmark_rounded,
      label: 'Reservas',
    ),
    (
      tab: AppTab.perfil,
      icon: Icons.person_outline_rounded,
      activo: Icons.person_rounded,
      label: 'Perfil',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(top: BorderSide(color: AppColors.divider)),
        boxShadow: Sombra.barra,
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 66,
          child: Row(
            children: [
              for (final t in _tabs)
                Expanded(
                  child: _NavItem(
                    icon: t.icon,
                    iconActivo: t.activo,
                    label: t.label,
                    selected: currentTab == t.tab,
                    carrito: t.tab == AppTab.carrito,
                    onTap: () => onTabSelected(t.tab),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData iconActivo;
  final String label;
  final bool selected;
  final bool carrito;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.iconActivo,
    required this.label,
    required this.selected,
    required this.carrito,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.primary : AppColors.textTertiary;
    final icono = AnimatedSwitcher(
      duration: Duracion.rapida,
      transitionBuilder: (child, anim) =>
          ScaleTransition(scale: anim, child: child),
      child: Icon(
        selected ? iconActivo : icon,
        key: ValueKey(selected),
        size: 22,
        color: color,
      ),
    );

    return Semantics(
      selected: selected,
      button: true,
      child: InkWell(
        onTap: onTap,
        customBorder: const RoundedRectangleBorder(),
        splashColor: AppColors.primary.withValues(alpha: 0.06),
        highlightColor: Colors.transparent,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: Duracion.base,
              curve: Curva.salida,
              width: selected ? 52 : 36,
              height: 30,
              decoration: BoxDecoration(
                color: selected
                    ? AppColors.primaryContainer
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(999),
              ),
              alignment: Alignment.center,
              child: carrito ? CarritoBadge(child: icono) : icono,
            ),
            const SizedBox(height: 4),
            AnimatedDefaultTextStyle(
              duration: Duracion.rapida,
              style: Theme.of(context).textTheme.labelSmall!.copyWith(
                color: color,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                fontSize: 10.5,
                letterSpacing: 0.1,
              ),
              child: Text(label),
            ),
          ],
        ),
      ),
    );
  }
}
