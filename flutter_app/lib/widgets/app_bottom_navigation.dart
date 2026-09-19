import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import 'carrito_badge.dart';

/// Índices de las pestañas de la navegación principal.
///
/// Coincide con la barra inferior aprobada en Stitch:
/// Inicio · Catálogo · Carrito · Reservas · Perfil.
enum AppTab { inicio, libros, carrito, reservas, perfil }

/// Navegación principal con identidad editorial de la librería.
///
/// Barra inferior blanca con sombra superior, indicador dorado sobre la
/// pestaña activa y badge granate en Carrito (según los diseños de Stitch).
class AppBottomNavigation extends StatelessWidget {
  final AppTab currentTab;
  final ValueChanged<AppTab> onTabSelected;

  const AppBottomNavigation({
    super.key,
    required this.currentTab,
    required this.onTabSelected,
  });

  static const List<({AppTab tab, IconData icon, String label})> _tabs = [
    (tab: AppTab.inicio, icon: Icons.home_outlined, label: 'Inicio'),
    (tab: AppTab.libros, icon: Icons.library_books_outlined, label: 'Catálogo'),
    (tab: AppTab.carrito, icon: Icons.shopping_cart_outlined, label: 'Carrito'),
    (
      tab: AppTab.reservas,
      icon: Icons.bookmark_outline_rounded,
      label: 'Reservas',
    ),
    (tab: AppTab.perfil, icon: Icons.person_outline_rounded, label: 'Perfil'),
  ];

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryDark.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              for (final t in _tabs)
                Expanded(
                  child: _NavItem(
                    icon: t.icon,
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
  final String label;
  final bool selected;
  final bool carrito;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.carrito,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.primary : AppColors.textSecondary;

    return InkWell(
      onTap: onTap,
      customBorder: const RoundedRectangleBorder(),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Indicador dorado superior sobre la pestaña activa.
          Container(
            width: 20,
            height: 3,
            margin: const EdgeInsets.only(bottom: 4),
            decoration: BoxDecoration(
              color: selected ? AppColors.gold : Colors.transparent,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          SizedBox(
            width: 28,
            height: 24,
            child: carrito
                ? CarritoBadge(child: Icon(icon, size: 22, color: color))
                : Icon(icon, size: 22, color: color),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
              fontSize: 10,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
