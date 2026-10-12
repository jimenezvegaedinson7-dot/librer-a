"""Fuentes estáticas de la misma versión usada por google_fonts 8.2.1.
Solo se ejecuta al preparar assets; la app nunca descarga fuentes en runtime.
"""
import hashlib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen

DESTINO = Path(__file__).resolve().parents[1] / 'assets/fonts'
FUENTES = [
    ('Inter-Regular.ttf', '15b294b67f2f8bbc04d990023ef4aec66502b87dc9040d84abe5f896ccb693de', 324796),
    ('Inter-Medium.ttf', '36a36ff7ac46dc2aeceac3a80a87a67e7b844b8fc936699259aac8fba9bcf734', 325280),
    ('Inter-SemiBold.ttf', '334bb2c51aeba5f566abac8d03a7e75ab3234d6926b52e92a85dc704129258b5', 326024),
    ('Inter-Bold.ttf', '76121a34a606cc8a0e1ef5a47d2b9ba9678c41f5c852d63eb28f62069373bfad', 326444),
    ('Inter-ExtraBold.ttf', '6af943899936fd3fd15a5889db4a384cec311c9bfe33d74bcfd3e0ae56f1b1d1', 327300),
    ('SourceSerif4-Regular.ttf', '444d1df62a9693f8ff54dcb9fca4da2d4da7ccbce5c39c91644d0d983cf4cd0d', 194440),
    ('SourceSerif4-Medium.ttf', '0bf8089ceff9125fe74e101b322c936bd3c66ed336f8f02cddcd978759153db8', 194692),
    ('SourceSerif4-SemiBold.ttf', '532158a64c3ff8cf4c71ea05ac5bdd9d3a067287061634f513aab275af942db1', 194776),
    ('SourceSerif4-Bold.ttf', 'bb37bf8029423d8045d0f4d39730f68297ef7167d9510f0eca7d7c6c111bc40b', 194736),
    ('SourceSerif4-MediumItalic.ttf', '5dd489c34d83c6a7114064d60854fe22a1abdf61014361552b1f1a4af76d49e6', 183692),
]


def descargar(fuente):
    nombre, digest, tamano = fuente
    destino = DESTINO / nombre
    if destino.exists():
        contenido = destino.read_bytes()
        if len(contenido) == tamano and hashlib.sha256(contenido).hexdigest() == digest:
            return nombre
    with urlopen(f'https://fonts.gstatic.com/s/a/{digest}.ttf', timeout=45) as r:
        contenido = r.read()
    if len(contenido) != tamano or hashlib.sha256(contenido).hexdigest() != digest:
        raise ValueError(f'Fuente no verificada: {nombre}')
    destino.write_bytes(contenido)
    return nombre


if __name__ == '__main__':
    DESTINO.mkdir(exist_ok=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        for nombre in pool.map(descargar, FUENTES):
            print(f'Verificada: {nombre}')
    for carpeta, nombre in [('inter', 'Inter'), ('sourceserif4', 'SourceSerif4')]:
        with urlopen(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{carpeta}/OFL.txt', timeout=30) as r:
            contenido = r.read()
        if b'SIL OPEN FONT LICENSE' not in contenido:
            raise ValueError(f'Licencia no reconocida: {nombre}')
        (DESTINO / f'OFL-{nombre}.txt').write_bytes(contenido)
