$ErrorActionPreference = "Continue"
$adbExe = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$serial = "192.168.1.44:46121"
$pkg = "com.jimenezvega.libreria"

Write-Output "=== 1) celular presente? ==="
$st = (& $adbExe -s $serial get-state 2>&1 | Out-String).Trim()
Write-Output ("  estado: " + $st)
if ($st -ne "device") { Write-Output "  NO celular. Fin."; exit 0 }

Write-Output "=== 2) PID de tu app (debe estar ABIERTA y EN PRIMER PLANO) ==="
$pid = (& $adbExe -s $serial shell pidof $pkg 2>&1 | Out-String).Trim()
Write-Output ("  pidof: " + $pid)
if ($pid -notmatch "^\d+$") {
  Write-Output "  >>> la app NO esta corriendo. Abrela en TU CELULAR, dejala visible."
  Write-Output "      Luego dime LISTO y repito."
  exit 0
}

Write-Output "=== 3) AVISO: TIENES 25 SEGUNDOS ==="
Write-Output "  >>>>>> TOCA EL CORAZON (el que te da el error) Y DEJALO EN PANTALLA. <<<<<<"
$null = (& $adbExe -s $serial logcat --pid=$pid -c 2>&1)

Start-Sleep -Seconds 25

Write-Output "=== 4) Leo el log SOLO de tu app ==="
$log = (& $adbExe -s $serial logcat --pid=$pid -d -v time 2>&1 | Out-String)

Write-Output "=== 5) El TEXTO de TU pantalla ahora ==="
$null = (& $adbExe -s $serial shell uiautomator dump /sdcard/ui.xml 2>&1)
$ui = (& $adbExe -s $serial shell cat /sdcard/ui.xml 2>&1 | Out-String)
$textos = [regex]::Matches($ui, 'text="([^"]{2,80})"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -match "\S" } | Select-Object -Unique | Select-Object -First 15
if ($textos) { "  Textos visibles:"; $textos | ForEach-Object { Write-Output ("    - " + $_) } }
else { Write-Output "  (sin textos legibles - pantalla no coopera)" }

Write-Output "=== 6) Clasificacion del ERROR REAL (por el log de TU celular) ==="
$e401 = [bool]($log -match '(?i)401|unauthoriz|no autorizado|sin sesion|not logged|invalid token|token.*invalid|sesion.*no valida')
$eRed = [bool]($log -match '(?i)socketexception|timed out|timeout|connection refused|connection reset|unable to resolve|failed to connect|connection closed|host.*unreach')
$e2xx = [bool]($log -match '(?i)200|201|status.?2\d\d| 2\d\d |ok\(2\d\d\)')
$eJSON = [bool]($log -match '(?i)json.*(?:parse|error|exception)|format.*exception|no such method|type.*not a subtype|Expected a|_TypeError')
$eOtro = [bool]($log -match '(?i)exception|error') -and -not ($e401 -or $eRed -or $e2xx -or $eJSON)
Write-Output ("  401/token : " + $e401)
Write-Output ("  RED       : " + $eRed)
Write-Output ("  2xx exito : " + $e2xx)
Write-Output ("  JSON/type : " + $eJSON)
Write-Output ("  otra      : " + $eOtro)

if ($e2xx) { Write-Output "  >>> 2xx: TU CELULAR SI mando el favorito y el backend lo acepto." }
elseif ($e401) { Write-Output "  >>> 401: Render rechaza el token de TU CELULAR. La sesion en TU CELULAR no es valida para Render." }
elseif ($eRed) { Write-Output "  >>> RED: TU CELULAR no alcanzo el backend en esos 25 s (wifi)." }
elseif ($eJSON) { Write-Output "  >>> JSON: el backend respondio algo que no era la lista esperada." }
else { Write-Output "  >>> Sin llamada en 25 s: no tocaste el corazon con la app ABIERTA y VISIBLE, o el error no genera peticion." }
