# Actualizaciones de la app por APK (sin Google Play)

## 1. Firma de release

Todas las versiones se firman con **la misma clave**. Android solo instala una
actualización encima de la app si la firma coincide; con otra clave el usuario
tendría que desinstalar (y perdería sus datos locales).

- Clave y contraseñas: `%USERPROFILE%\.libreria-firma\` (fuera de Git)
  - `libreria-release.jks`: la clave (alias `libreria`, RSA 4096, válida hasta 2126)
  - `key.properties`: contraseñas y ruta de la clave
- Huella SHA-256 del certificado:
  `47:D9:99:CE:DD:53:CC:58:4E:44:4C:AD:15:43:40:9F:0E:16:DE:CB:00:48:92:3F:0B:D5:18:EE:A9:D5:4A:29`
- `android/app/build.gradle.kts` busca `key.properties` en `android/` o en esa
  carpeta. Si no la encuentra, **el build de release se detiene** (nunca firma
  con la clave de depuración).

**Respaldo:** guarda la carpeta `.libreria-firma` completa en al menos dos
lugares seguros y separados (por ejemplo, un USB cifrado y un gestor de
contraseñas o nube privada). Si se pierde, ninguna versión futura podrá
instalarse encima de la actual.

## 2. Versionado

En `pubspec.yaml`: `version: X.Y.Z+N`

- `X.Y.Z` = versionName (la que ve el usuario).
- `N` = versionCode. **Debe aumentar en cada publicación** (1, 2, 3...).

Ejemplo: `1.0.0+1` → `1.0.1+2` → `1.0.2+3`.

Publica siempre el APK universal (`flutter build apk --release`); no uses
`--split-per-abi`, porque cambia el versionCode de cada archivo.

## 3. Cómo funciona el actualizador

1. Al abrir la app (en Login o Inicio, una vez por arranque) se consulta
   `GET /api/app/version`.
2. Si su `versionCode` es mayor que el instalado, aparece
   "Nueva versión disponible" con [Más tarde] y [Actualizar ahora]
   (si `obligatoria` es `true`, no se puede cerrar).
3. Al actualizar, la app:
   - solo acepta URLs `https://github.com/jimenezvegaedinson7-dot/librer-a/releases/download/...`;
   - descarga mostrando el progreso;
   - comprueba el **SHA-256** publicado;
   - comprueba que el APK sea el mismo paquete, con la **misma firma** y un
     versionCode mayor;
   - abre el **instalador oficial de Android**, que pide confirmación.
4. La primera vez Android pide permitir "Instalar apps desconocidas" para
   Librería; la app ofrece el botón "Abrir ajustes".

La sesión, el carrito y los datos locales se conservan al actualizar.

## 4. Publicar una versión nueva

1. Sube la versión en `flutter_app/pubspec.yaml` (por ejemplo `1.0.1+2`).
2. Compila: `flutter build apk --release` (desde `flutter_app/`).
3. Prepara la publicación (desde `backend/`):

   ```
   npm run publicar-app -- --notas "Mejoras y correcciones"
   ```

   Añade `--obligatoria` si todos deben actualizar. El script calcula el
   SHA-256, verifica que el versionCode sea mayor, deja el archivo
   `libreria-X.Y.Z.apk` listo y actualiza `backend/src/config/app-version.json`.
4. En GitHub → Releases → *Draft a new release*: tag `vX.Y.Z`, adjunta
   `libreria-X.Y.Z.apk` con ese nombre exacto y publica.
5. Haz commit y push de `app-version.json`. Cuando Render despliegue, las apps
   instaladas mostrarán el aviso.

Orden importante: primero el Release en GitHub (paso 4) y después el push del
JSON (paso 5), para que la URL ya exista cuando las apps la consulten.
