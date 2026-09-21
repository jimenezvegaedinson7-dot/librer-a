$ErrorActionPreference = "Stop"
$adbExe = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$serial = "192.168.1.44:46121"
$appPkg = "com.jimenezvega.libreria"

Write-Output "=== 1) Verificar celular ==="
$st = (& $adbExe -s $serial get-state 2>&1 | Out-String).Trim()
Write-Output ("  estado: " + $st)
if ($st -ne "device") { Write-Output "  NO conectado. Fin."; exit 0 }

$pidApp = (& $adbExe -s $serial shell pidof $appPkg 2>&1 | Out-String).Trim()
Write-Output ("  PID app: " + $pidApp)
if ($pidApp -notmatch "^\d+$") { Write-Output "  la app no esta corriendo. Abrela en TU celular y repite cuando este visible."; exit 0 }

Write-Output ""
Write-Output "  >>>>>> AHORA HAZ ESTO: (tienes 30 s) >>>>>>"
Write-Output "     1) toca el CORAZON (corazon) para que salga el error"
Write-Output "     2) NO toques NADA MAS, deja el error VISIBLE en pantalla"
Write-Output "     3) espera en silencio (YO capturo la pantalla al terminar)"
Start-Sleep -Seconds 30

Write-Output ""
Write-Output "=== 2) Capturo el TEXTO visible en TU CELULAR (tu error exacto) ==="
$dumpOk = $false
$ui = ""
foreach ($try in @(
  { & $adbExe -s $serial shell uiautomator dump /sdcard/ui_dump.xml 2>&1 | Out-Null; & $adbExe -s $serial shell cat /sdcard/ui_dump.xml 2>&1 | Out-String },
  { & $adbExe -s $serial exec-out uiautomator dump /dev/tty 2>&1 | Out-String }
)) {
  $ui = & $try
  if ($ui -and $ui.Length -gt 300) { $dumpOk = $true; break }
}
if ($dumpOk) {
  $textos = ([regex]::Matches($ui, 'text="([^"]{3,120})"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch "^\s*$" } | Select-Object -Unique)
  if ($textos) { $textos | ForEach-Object { Write-Output ("   - " + $_) } }
  else { Write-Output "   (pantalla sin textos - el error pudo haber desaparecido ya)" }
} else {
  Write-Output "   (no pude leer la pantalla)"
}

Write-Output ""
Write-Output "=== 3) El log REAL de tu app (ultimas llamadas HTTP) ==="
$null = (& $adbExe -s $serial logcat --pid=$pidApp -c 2>&1)
Start-Sleep -Seconds 8
$log = (& $adbExe -s $serial logcat --pid=$pidApp -d -v time 2>&1 | Out-String)
$relev = @($log -split "`n" | Where-Object { $_ -match '(?i)favorit|favorite|401|403|404|409|500|503|socket|timeout|exception|error|http|/api/|status|token|json|unauthor' } | Select-Object -First 20)
if ($relev) { $relev | ForEach-Object { Write-Output ("   " + $_.Trim()) } }
else { Write-Output "   (sin llamadas capturadas - toca el corazon con la app visible)" }
