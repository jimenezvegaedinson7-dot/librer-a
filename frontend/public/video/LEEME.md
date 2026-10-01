# Videos del apartado destacado

La sección de video de la portada (`src/public-site/sections/VideoSection.jsx`)
lee estos archivos desde aquí:

| Archivo | Para qué sirve | Obligatorio |
|---|---|---|
| `anuncio.mp4` | El video que se reproduce | Sí |
| `anuncio-poster.webp` | La miniatura mientras carga | No, pero se ve mejor |

## Cómo cambiar el video

1. Convierte tu video a MP4 (H.264) si no lo está.
2. Deja el archivo aquí con el nombre `anuncio.mp4` (reemplaza el anterior).
3. Si quieres cambiar la miniatura, reemplaza `anuncio-poster.webp`.

Recarga la página y el video nuevo aparece. No hay que tocar código.

## Buenas prácticas para el archivo

- **Resolución:** 1920×1080 (o 1280×720) basta. No subas 4K, pesa de más.
- **Duración:** menos de 2 minutos. La gente abandona después.
- **Peso:** procura que quede por debajo de 8 MB.
- **Formato:** MP4 con H.264 y audio AAC, que es lo que reproduce todos los
  navegadores y el móvil sin problemas.

Si el archivo no existe, la sección no se rompe: muestra una llamada a la acción
en lugar de un reproductor vacío.

## Nota

Estos archivos se suben tal cual al hosting (no se comprimen ni se les cambia
el nombre). Si el video llegara a pesar mucho, conviene alojarlo fuera y
cambiar la constante `VIDEO` en `VideoSection.jsx` por la URL correspondiente.
