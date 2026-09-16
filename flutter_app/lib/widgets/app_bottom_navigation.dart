import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import 'carrito_badge.dart';

/// Índices de las pestañas de la navegación principal.
enum AppTab { inicio, libros, carrito, misCompras, perfil }

/// Navegación principal con identidad editorial de la librería.
class AppBottomNavigation extends StatelessWidget {
  final AppTab currentTab;
  final ValueChanged<AppTab> onTabSelected;

  const AppBottomNavigation({
    super.key,
    required this.currentTab,
    required this.onTabSelected,
  });

  int get _index {
    switch (currentTab) {
      case AppTab.inicio:
        return 0;
      case AppTab.libros:
        return 1;
      case AppTab.carrito:
        return 2;
      case AppTab.misCompras:
        return 3;
      case AppTab.perfil:
        return 4;
    }
  }

  AppTab _tabFromIndex(int index) {
    switch (index) {
      case 0:
        return AppTab.inicio;
      case 1:
        return AppTab.libros;
      case 2:
        return AppTab.carrito;
      case 3:
        return AppTab.misCompras;
      default:
        return AppTab.perfil;
    }
  }

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.divider)),
      ),
      child: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (index) => onTabSelected(_tabFromIndex(index)),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Inicio',
          ),
          const NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book_rounded),
            label: 'Catálogo',
          ),
          NavigationDestination(
            icon: const CarritoBadge(child: Icon(Icons.shopping_bag_outlined)),
            selectedIcon: const CarritoBadge(
              child: Icon(Icons.shopping_bag_rounded),
            ),
            label: 'Carrito',
          ),
          const NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long_rounded),
            label: 'Compras',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}
