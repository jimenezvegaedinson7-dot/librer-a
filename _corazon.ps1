$ErrorActionPreference = "Continue"
$adbExe = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$pkg = "com.jimenezvega.libreria"

"=== 1) EL CELULAR (tomo el serial real de adb, no adivino) ==="
$devs = (& $adbExe devices 2>&1 | Out-String)
$serial = ""
$serials = @()
foreach ($linea in ($devs -split "`n")) {
  if ($linea -match "^\S+\s+device$") { $serials += $linea.Trim().Split()[0] }
}
if ($serials.Count -eq 0) { "  NO hay celular. Abre la app en tu cel y dime LISTO."; exit 0 }
$serial = $serials[0]
"  serial: $serial"

$pid = (& $adbExe -s $serial shell pidof $pkg 2>&1 | Out-String).Trim()
"  PID app: $pid"
if ($pid -notmatch "^\d+$") { "  >>> La app NO esta visible. ABRELA en tu celular (dejala en pantalla). Dime LISTO."; exit 0 }

"=== 2) VACIO el log SOLO de tu app ==="
$null = (& $adbExe -s $serial shell logcat --pid=$pid -c 2>&1)

"=== 3) CAPTURA ==="
"  >>>>>>>>>> TIENES 30 SEGUNDOS <<<<<<<<<<"
"  >>>>>>>>>> TOCA EL CORAZON (corazon/favorito) EN TU CELULAR <<<<<<<<<<"
"  (hazlo AUNQUE ya lo tocaste antes: se necesita en esta ventana)"
Start-Sleep -Seconds 30
$log = (& $adbExe -s $serial shell logcat --pid=$pid -d -v time 2>&1 | Out-String)

"=== 4) Lo que TU app dijo (filtrado) ==="
$lineas = @($log -split "`n" | Where-Object { $_ -match '(?i)favorit|error|exception|401|4\d\d|5\d\d|2\d\d|socket|timeout|http|status|token|json|/api/|render|localhost|sesion|unauthor|refused|unable|parse' } | Select-Object -First 20)
if ($lineas.Count -gt 0) { $lineas | ForEach-Object { "  " + $_.Trim() } }
else { "  (sin llamadas en 30 s -> la app no hizo la peticion: no estaba en foco o no tocaste)" }

"=== 5) VEREDICTO ==="
$hay401  = [bool]($log -match '(?i)401|unauthoriz|no autentic|invalid token|token.*invalid|sesion.*no val|401')
$hayRed  = [bool]($log -match '(?i)socketexception|timeout|timed out|refused|unable to resolve|connection reset|close.*before|failed to connect|connect.*fail')
$hay2xx  = [bool]($log -match '(?i)"?20\d"?|ok \(20\d\)|\[200\]|status.?20\d| 200 ')
$hayJson = [bool]($log -match '(?i)typeerror|format exception|json.*parse|_typeerror|not a subtype|expected a')
"  401/sesion : $hay401"
"  RED        : $hayRed"
"  exito 2xx  : $hay2xx"
"  JSON/type  : $hayJson"

if ($hay2xx) { "  >>> 2xx: TU CELULAR SI agrego el favorito al backend. El error que VES no es de 'agregar': es de OTRA pantalla (la lista). Cierra la app, reabrela y revisa la LISTA de favoritos." }
elseif ($hay401) { "  >>> 401: Render rechaza el token de TU CELULAR. AUN estando 'logueada', el token que guardo TU celular es viejo o de otra instalacion. SOLUCION: en la app -> menu (3 lineas) -> Cerrar sesion -> vuelve a entrar con correo y clave -> toca el corazon. (Ese token nuevo SI lo acepta.)" }
elseif ($hayRed) { "  >>> RED: TU celular no alcanzo Render en esos 30 s. Backend vivo verificado desde PC. Es la red/wifi de TU CELULAR (proxy, datos, firewall), no el codigo." }
elseif ($hayJson) { "  >>> JSON: el backend respondio algo que no era la lista esperada (respuesta de error/proxy). Revisar que no haya un proxy que intercepte." }
else { "  >>> Sin llamada capturada. Repite con la app VISIBLE y tocando el corazon en la ventana." }
