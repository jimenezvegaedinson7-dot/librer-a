$ErrorActionPreference = "Stop"
$adbExe = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$serial = "192.168.1.44:46121"
$pkgApp = "com.jimenezvega.libreria"

Write-Output "=== 1) Celular conectado? ==="
$estado = (& $adbExe -s $serial get-state 2>&1 | Out-String).Trim()
Write-Output ("  " + $estado)
if ($estado -ne "device") { Write-Output "  NO hay celular. Fin."; exit 1 }

Write-Output "=== 2) PID de TU app (solo para leer su log) ==="
$pidApp = (& $adbExe -s $serial shell pidof $pkgApp 2>&1 | Out-String).Trim()
Write-Output ("  PID = " + $pidApp)
if ($pidApp -notmatch "^\d+$") {
  Write-Output "  app NO en primer plano. Abre la app en TU celular y dejala visible. Fin (sin tocar codigo)."
  exit 1
}

Write-Output "=== 3) Limpio el log SOLO de TU app ==="
$null = & $adbExe -s $serial logcat --pid=$pidApp -c 2>&1

Write-Output "=== 4) CAPTURA ACTIVA: 30 s ==="
Write-Output "  >>> DESDE QUE LEAS ESTO: TOCA EL CORAZON (corazon) 1 vez y NO toques nada mas."
Write-Output "      Espero 30 s leyendo SOLO tu app..."
Start-Sleep -Seconds 30
$log = & $adbExe -s $serial logcat --pid=$pidApp -d -t 400 -v time 2>&1 | Out-String

Write-Output "=== 5) Lineas con la peticion (http/error/status) ==="
$lin = $log -split "`n" | Where-Object { $_ -match '(?i)favorit|/api/|favoritos|401|403|404|500|503|socket|timeout|exception|error|status|token|http|json|sesion|agregar' } | Select-Object -First 25
if ($lin) { $lin | ForEach-Object { Write-Output ("   " + $_.Trim()) } }
else { Write-Output "   (nada capture de favoritos en 30 s -> prueba blanca: la app no llamo al backend mientras tanto)" }

Write-Output "=== 6) VEREDICTO AUTOMATICO ==="
$t = $log
$e401 = [bool]($t -match '(?i)401|unauthoriz|sin sesion|no autentic|not logged|401')
$eRed = [bool]($t -match '(?i)socketexception|timeout|timed out|connection refused|unable to resolve|connection reset|connect timed|host unreach|network.*unreach|connection closed')
$e2xx = [bool]($t -match '(?i)200 OK|"200"|status.?200|status.?201| ok\(200\)| 200 ')
Write-Output ("  401  = " + $e401)
Write-Output ("  RED  = " + $eRed)
Write-Output ("  2xx  = " + $e2xx)

if ($e401) {
  Write-Output "  >>> 401: el backend responde 'no autorizado'. Estando TU logueada, eso significa que"
  Write-Output "      el token que TU celular guarda NO lo acepta Render -> la sesion quedo 'vieja'"
  Write-Output "      en memoria. SOLUCION real: en la app -> menu -> CERRAR SESION -> volver a"
  Write-Output "      entrar (te pedira correo y clave) -> AHORA si toca el corazon."
}
elseif ($eRed) {
  Write-Output "  >>> RED: el WIFI del celular NO llega a Render. La app no tiene culpa;"
  Write-Output "      el backend esta vivo (lo verifique). Es internet/wifi de TU celular."
}
elseif ($e2xx) {
  Write-Output "  >>> EXITO (2xx): el backend SI acepto el favorito desde TU celular."
  Write-Output "      Entonces el problema es la pestaña de LISTA (refresco), no agregar."
}
else {
  Write-Output "  >>> Sin peticion capturada: seguramente el celular tenia pantalla dormida o la app"
  Write-Output "      paso a segundo plano. Repite con la app VISIBLE y tocando el corazon."
}
