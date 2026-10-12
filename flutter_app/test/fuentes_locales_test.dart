import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:libreria_app/utils/app_theme.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('la tipografía de la app está empaquetada y no necesita HTTP', () async {
    for (final nombre in [
      'Inter-Regular',
      'Inter-Medium',
      'Inter-SemiBold',
      'Inter-Bold',
      'Inter-ExtraBold',
      'SourceSerif4-Regular',
      'SourceSerif4-Medium',
      'SourceSerif4-SemiBold',
      'SourceSerif4-Bold',
      'SourceSerif4-MediumItalic',
    ]) {
      final bytes = await rootBundle.load('assets/fonts/$nombre.ttf');
      expect(bytes.lengthInBytes, greaterThan(1000));
      expect(bytes.getUint32(0), anyOf(0x00010000, 0x4f54544f));
    }
    expect(
      AppTheme.light().textTheme.bodyMedium?.fontFamily,
      AppTheme.fontSans,
    );
    expect(
      AppTheme.serif(
        fontStyle: FontStyle.italic,
        fontWeight: FontWeight.w500,
      ).fontFamily,
      AppTheme.fontSerif,
    );
    for (final familia in ['Inter', 'SourceSerif4']) {
      expect(
        await rootBundle.loadString('assets/fonts/OFL-$familia.txt'),
        contains('SIL OPEN FONT LICENSE'),
      );
    }
  });
}
