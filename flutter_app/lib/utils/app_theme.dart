import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';
import 'app_tokens.dart';

/// Tema global con la identidad editorial de la librería:
/// Source Serif 4 para titulares (la misma familia del panel administrativo)
/// e Inter para la interfaz y el texto largo. Superficies marfil y pergamino,
/// acentos burdeos y dorado (dinámicos según el tema del perfil).
class AppTheme {
  AppTheme._();

  static const String fontSerif = 'Source Serif 4';
  static const String fontSans = 'Inter';

  /// Estilo serif de marca para titulares puntuales fuera del tema.
  static TextStyle serif({
    double fontSize = 20,
    FontWeight fontWeight = FontWeight.w600,
    Color? color,
    double? height,
    double letterSpacing = -0.2,
    FontStyle? fontStyle,
  }) {
    return GoogleFonts.sourceSerif4(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color ?? AppColors.textPrimary,
      height: height,
      letterSpacing: letterSpacing,
      fontStyle: fontStyle,
    );
  }

  /// Tema claro de la aplicación.
  static ThemeData light() {
    final colorScheme = appColorSchemeLight();

    TextStyle serifTitulo(
      double size,
      double height, {
      FontWeight w = FontWeight.w600,
      double ls = -0.3,
    }) => GoogleFonts.sourceSerif4(
      fontSize: size,
      height: height / size,
      fontWeight: w,
      letterSpacing: ls,
    );

    TextStyle sans(double size, double height, FontWeight w, {double ls = 0}) =>
        GoogleFonts.inter(
          fontSize: size,
          height: height / size,
          fontWeight: w,
          letterSpacing: ls,
        );

    final textTheme =
        TextTheme(
          displayLarge: serifTitulo(34, 40, ls: -0.8),
          displayMedium: serifTitulo(28, 34, ls: -0.6),
          displaySmall: serifTitulo(24, 30, ls: -0.4),
          headlineLarge: serifTitulo(24, 30, ls: -0.4),
          headlineMedium: serifTitulo(21, 27),
          headlineSmall: serifTitulo(18, 24, ls: -0.2),
          titleLarge: serifTitulo(20, 26),
          titleMedium: serifTitulo(16, 21, ls: -0.1),
          titleSmall: sans(14, 20, FontWeight.w600),
          bodyLarge: sans(16, 24, FontWeight.w400),
          bodyMedium: sans(14, 21, FontWeight.w400),
          bodySmall: sans(12.5, 18, FontWeight.w400),
          labelLarge: sans(14.5, 20, FontWeight.w600, ls: 0.1),
          labelMedium: sans(12.5, 16, FontWeight.w600, ls: 0.1),
          labelSmall: sans(11, 14, FontWeight.w600, ls: 0.3),
        ).apply(
          bodyColor: AppColors.textPrimary,
          displayColor: AppColors.textPrimary,
        );

    final bordeCampo = OutlineInputBorder(
      borderRadius: BorderRadius.circular(Radios.sm),
      borderSide: const BorderSide(color: AppColors.divider),
    );

    final transicion = PageTransitionsTheme(
      builders: {
        for (final plataforma in TargetPlatform.values)
          plataforma: const FadeForwardsPageTransitionsBuilder(),
      },
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      fontFamily: AppTheme.fontSans,
      scaffoldBackgroundColor: AppColors.background,
      canvasColor: AppColors.background,
      splashFactory: InkSparkle.splashFactory,
      shadowColor: AppColors.tinta.withValues(alpha: 0.12),
      textTheme: textTheme,
      pageTransitionsTheme: transicion,
      visualDensity: VisualDensity.standard,

      iconTheme: const IconThemeData(color: AppColors.textSecondary, size: 22),

      textSelectionTheme: TextSelectionThemeData(
        cursorColor: AppColors.primary,
        selectionColor: AppColors.primary.withValues(alpha: 0.18),
        selectionHandleColor: AppColors.primary,
      ),

      // ---------------------------------------------------------------------
      // AppBar
      // ---------------------------------------------------------------------
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0.6,
        shadowColor: AppColors.tinta.withValues(alpha: 0.2),
        centerTitle: false,
        titleSpacing: 4,
        systemOverlayStyle: SystemUiOverlayStyle.dark.copyWith(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
        ),
        iconTheme: const IconThemeData(color: AppColors.textPrimary, size: 22),
        titleTextStyle: serifTitulo(
          20,
          26,
        ).copyWith(color: AppColors.textPrimary),
      ),

      // ---------------------------------------------------------------------
      // Botones
      // ---------------------------------------------------------------------
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          disabledBackgroundColor: AppColors.surfaceElevated,
          disabledForegroundColor: AppColors.textTertiary,
          minimumSize: const Size(0, 52),
          padding: const EdgeInsets.symmetric(horizontal: 22),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Radios.sm),
          ),
          textStyle: sans(15, 20, FontWeight.w600, ls: 0.1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          minimumSize: const Size(0, 52),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Radios.sm),
          ),
          textStyle: sans(15, 20, FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          backgroundColor: AppColors.surface,
          minimumSize: const Size(0, 52),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          side: const BorderSide(color: AppColors.dividerStrong),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Radios.sm),
          ),
          textStyle: sans(15, 20, FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Radios.xs),
          ),
          textStyle: sans(14, 20, FontWeight.w600),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: AppColors.textPrimary,
          highlightColor: AppColors.primary.withValues(alpha: 0.08),
        ),
      ),

      // ---------------------------------------------------------------------
      // Campos de texto
      // ---------------------------------------------------------------------
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        hintStyle: sans(
          14.5,
          20,
          FontWeight.w400,
        ).copyWith(color: AppColors.textTertiary),
        labelStyle: sans(
          14.5,
          20,
          FontWeight.w500,
        ).copyWith(color: AppColors.textSecondary),
        floatingLabelStyle: sans(
          13,
          18,
          FontWeight.w600,
        ).copyWith(color: AppColors.primary),
        helperStyle: sans(
          12,
          16,
          FontWeight.w400,
        ).copyWith(color: AppColors.textTertiary),
        errorStyle: sans(
          12,
          16,
          FontWeight.w500,
        ).copyWith(color: AppColors.error),
        prefixIconColor: AppColors.textTertiary,
        suffixIconColor: AppColors.textTertiary,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        border: bordeCampo,
        enabledBorder: bordeCampo,
        disabledBorder: bordeCampo,
        focusedBorder: bordeCampo.copyWith(
          borderSide: BorderSide(color: AppColors.primary, width: 1.6),
        ),
        errorBorder: bordeCampo.copyWith(
          borderSide: const BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: bordeCampo.copyWith(
          borderSide: const BorderSide(color: AppColors.error, width: 1.6),
        ),
      ),

      // ---------------------------------------------------------------------
      // Tarjetas, chips y listas
      // ---------------------------------------------------------------------
      cardTheme: CardThemeData(
        elevation: 0,
        color: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radios.md),
          side: const BorderSide(color: AppColors.divider),
        ),
        margin: EdgeInsets.zero,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surface,
        selectedColor: AppColors.primary,
        disabledColor: AppColors.surfaceElevated,
        checkmarkColor: Colors.white,
        side: const BorderSide(color: AppColors.divider),
        shape: const StadiumBorder(),
        labelStyle: sans(
          13,
          18,
          FontWeight.w600,
        ).copyWith(color: AppColors.textSecondary),
        secondaryLabelStyle: sans(
          13,
          18,
          FontWeight.w600,
        ).copyWith(color: Colors.white),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        showCheckmark: false,
      ),
      listTileTheme: ListTileThemeData(
        iconColor: AppColors.textSecondary,
        titleTextStyle: sans(
          15,
          21,
          FontWeight.w500,
        ).copyWith(color: AppColors.textPrimary),
        subtitleTextStyle: sans(
          13,
          18,
          FontWeight.w400,
        ).copyWith(color: AppColors.textSecondary),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radios.sm),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
        space: 1,
      ),

      // ---------------------------------------------------------------------
      // Navegación, pestañas y controles
      // ---------------------------------------------------------------------
      navigationBarTheme: NavigationBarThemeData(
        height: 68,
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.primaryContainer,
        elevation: 0,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          return IconThemeData(
            color: states.contains(WidgetState.selected)
                ? AppColors.primary
                : AppColors.textTertiary,
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final seleccionado = states.contains(WidgetState.selected);
          return sans(
            11,
            14,
            seleccionado ? FontWeight.w700 : FontWeight.w500,
          ).copyWith(
            color: seleccionado ? AppColors.primary : AppColors.textTertiary,
          );
        }),
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.textSecondary,
        indicatorColor: AppColors.primary,
        dividerColor: AppColors.divider,
        labelStyle: sans(14, 20, FontWeight.w600),
        unselectedLabelStyle: sans(14, 20, FontWeight.w500),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: AppColors.primary,
        linearTrackColor: AppColors.surfaceElevated,
        circularTrackColor: Colors.transparent,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: const WidgetStatePropertyAll(Colors.white),
        trackColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected)
              ? AppColors.primary
              : AppColors.dividerStrong,
        ),
        trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
      ),
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected)
              ? AppColors.primary
              : Colors.transparent,
        ),
        side: const BorderSide(color: AppColors.dividerStrong, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected)
              ? AppColors.primary
              : AppColors.dividerStrong,
        ),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          backgroundColor: AppColors.surface,
          selectedBackgroundColor: AppColors.primary,
          selectedForegroundColor: Colors.white,
          foregroundColor: AppColors.textSecondary,
          side: const BorderSide(color: AppColors.divider),
          textStyle: sans(13.5, 18, FontWeight.w600),
        ),
      ),

      // ---------------------------------------------------------------------
      // Hojas, diálogos y avisos
      // ---------------------------------------------------------------------
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        dragHandleColor: AppColors.dividerStrong,
        dragHandleSize: const Size(40, 4),
        shape: RoundedRectangleBorder(borderRadius: Radios.hoja),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: serifTitulo(
          20,
          26,
        ).copyWith(color: AppColors.textPrimary),
        contentTextStyle: sans(
          14.5,
          22,
          FontWeight.w400,
        ).copyWith(color: AppColors.textSecondary),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radios.xl),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.tinta,
        actionTextColor: AppColors.doradoClaro,
        contentTextStyle: sans(
          14,
          20,
          FontWeight.w500,
        ).copyWith(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radios.sm),
        ),
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: AppColors.tinta,
          borderRadius: BorderRadius.circular(Radios.xs),
        ),
        textStyle: sans(12, 16, FontWeight.w500).copyWith(color: Colors.white),
      ),
      badgeTheme: BadgeThemeData(
        backgroundColor: AppColors.primary,
        textColor: Colors.white,
        textStyle: sans(10, 12, FontWeight.w700),
      ),
    );
  }
}
