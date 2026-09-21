$ErrorActionPreference = "SilentlyContinue"
$adbExe = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$serial = "192.168.1.44:46121"
$appPkg = "com.jimenezvega.libreria"

"=== 1) Celular conectado ==="
$st = (& $adbExe -s $serial get-state 2>&1 | Out-String).Trim()
"  estado: " + $st
if ($st -ne "device") { "  NO conectado. Fin."; exit 0 }

"=== 2) Aviso y espera 1 s (para que TENGAS el error visible al leer) ==="
"  >>> DEJA EL ERROR VISIBLE EN PANTALLA. Leo en 8 s..."
Start-Sleep -Seconds 8

"=== 3) LEO EL TEXTO de TU pantalla (uiautomator, con fallback) ==="
$xml = ""
foreach ($cmdv in @(
  { & $adbExe -s $serial shell uiautomator dump /sdcard/uiA.xml 2>&1 | Out-Null; & $adbExe -s $serial shell cat /sdcard/uiA.xml 2>&1 },
  { & $adbExe -s $serial exec-out uiautomator dump /dev/tty 2>&1 }
)) {
  $xml = (& $cmdv | Out-String)
  if ($xml.Length -gt 500) { break }
}
$txts = @()
if ($xml.Length -gt 500) {
  $txts = [regex]::Matches($xml, 'text="([^"]{2,80})"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch '^\s*$' } | Select-Object -Unique
}
if ($txts.Count -gt 0) {
  "  Textos visibles AHORA en TU celular:"
  $txts | ForEach-Object { "    - " + $_ }
} else {
  "  (sin textos: pantalla en blanco / bloqueada / error ya cerrado)"
}

"=== 4) LOG de tu app (las llamadas reales, por PID) ==="
$pidApp = (& $adbExe -s $serial shell pidof $appPkg 2>&1 | Out-String).Trim()
"  PID app: " + $pidApp
if ($pidApp -match '^\d+$') {
  $log = (& $adbExe -s $serial logcat --pid=$pidApp -d -v time 2>&1 | Out-String)
  $rel = @($log -split "`n" | Where-Object { $_ -match '(?i)favorit|/api/|401|403|404|409|500|503|timeout|socket|http|token|sesion|error|exception|status|json' } | Select-Object -First 18)
  if ($rel.Count -gt 0) { $rel | ForEach-Object { "    " + $_.Trim() } }
  else { "    (sin llamadas relevantes capturadas)" }
}

"=== 5) Veredicto ==="
$h401 = [bool]($log -match '401|unauthoriz')
$hRed = [bool]($log -match '(?i)socketexception|timed out|timeout|refused|unable to resolve|failed to connect')
$h2xx = [bool]($log -match '"200"|200 OK|status.?200|2\d\d')
"  - 401/sesion : " + $h401
"  - RED/host   : " + $hRed
"  - exito 2xx  : " + $h2xx
if ($h2xx) { "  >>> 2xx: TU CELULAR SI agrego el favorito. El problema esta en OTRA parte (lista), no en agregar." }
elseif ($h401) { "  >>> 401: Render rechaza el token de TU celular. Aunque diga 'logueada', el token que tiene NO es valido. Solucion real: cierra sesion DENTRO de la app, vuelve a entrar con correo+clave, y re-toca. (No es bug.)" }
else { "  >>> Sin evidencia clara. Necesito ver el texto EXACTO del error en la captura." }
