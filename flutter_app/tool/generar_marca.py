"""Copia el logo web oficial y genera los iconos Android. Requiere Pillow."""
from pathlib import Path
from PIL import Image, ImageOps

APP = Path(__file__).resolve().parents[1]
source = Image.open(APP.parent / 'frontend/src/public-site/assets/logo-f-verde.webp').convert('RGBA')
mark = source.crop(source.getbbox())
mark.save(APP / 'assets/images/logo_web.png')
mark.save(APP / 'assets/images/logo_libreria.png')
mark.save(APP / 'assets/logo_suerior/logo_superior.png')

def icon(size, content_size, background):
    canvas = Image.new('RGBA', (size, size), background)
    glyph = ImageOps.contain(mark, (content_size, content_size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(glyph, ((size - glyph.width) // 2, (size - glyph.height) // 2))
    return canvas

icon(1024, 730, '#F6F1E9').save(APP / 'assets/icons/app_icon_legacy.png')
icon(1024, 460, (0, 0, 0, 0)).save(APP / 'assets/icons/app_icon_foreground.png')
icon(1024, 730, '#F6F1E9').save(APP / 'assets/icons/app_icon_android.png')

# Logo nativo mientras arranca el motor Flutter (Android anterior a 12).
for density, scale in [('mdpi', 1), ('hdpi', 1.5), ('xhdpi', 2), ('xxhdpi', 3), ('xxxhdpi', 4)]:
    target = APP / f'android/app/src/main/res/drawable-{density}/logo_web_launch.png'
    icon(round(160 * scale), round(110 * scale), (0, 0, 0, 0)).save(target)
