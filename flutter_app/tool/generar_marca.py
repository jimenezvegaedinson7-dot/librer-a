"""Genera assets e iconos usando la silueta oficial actual. Requiere Pillow."""
from pathlib import Path
from PIL import Image, ImageOps

APP = Path(__file__).resolve().parents[1]
source = Image.open(APP.parent / 'frontend/public/logo-principal.png').convert('RGBA')
mark = Image.new('RGBA', source.size, '#004d43')
mark.putalpha(source.getchannel('A'))
mark = mark.crop(mark.getbbox())
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
