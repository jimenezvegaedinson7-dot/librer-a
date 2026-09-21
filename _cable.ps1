$ErrorActionPreference = "SilentlyContinue"
$adbExe = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$apk = "C:\libreria\flutter_app\build\app\outputs\flutter-apk\app-debug.apk"

"=== 1) Busco el celular (USB primero, luego miro pares) ==="
$null = (& $adbExe kill-server 2>&1)
$null = (& $adbExe start-server 2>&1)
$serial = ""
$contar = 0
foreach ($linea in @((& $adbExe devices 2>&1 | Out-String) -split "`n")) {
  if ($linea -match "^\s*(\S+)\s+device\s*$") {
    $s = $Matches[1]
    $contar++
    if ($s -notmatch "^\d+\.\d+\.\d+\.\d+:\d+$") { $serial = $s }  # USB gana; si no, dejamos el primero
  }
}
if ($contar -eq 0) {
  "  >>> No veo NINGUN celular. Conecta el CABLE USB y dime CABLE."
  exit 0
}
if (-not $serial) { $serial = ($adbExe devices 2>&1 | Out-String).Split("`n")[1].Split()[0] }
"  usando serial: " + $serial

"=== 2) APK listo? ==="
$apkInfo = Get-Item $apk
"  " + $apkInfo.LastWriteTime.ToString("HH:mm:ss") + "  " + [math]::Round($apkInfo.Length / 1MB, 1) + " MB"

"=== 3) PUSH por CABLE (confiable) ==="
$r1 = (& $adbExe -s $serial push -w $apk /sdcard/Download/lib.apk 2>&1 | Out-String).Trim()
$r1

"=== 4) INSTALO ==="
$r2 = (& $adbExe -s $serial shell pm install -r -t /sdcard/Download/lib.apk 2>&1 | Out-String).Trim()
$r2

if ($r2 -match "Success") {
  "  >>> INSTALADO CON CABLE. Abro la app:"
  $null = (& $adbExe -s $serial shell am force-stop com.jimenezvega.libreria 2>&1)
  $null = (& $adbExe -s $serial shell monkey -p com.jimenezvega.libreria -c android.intent.category.LAUNCHER 1 2>&1)
  "      abierta. Toca el corazon y dime que pasa."
} else {
  "  >>> No instalo. Respuesta: $r2"
}
$null = (& $adbExe -s $serial shell rm /sdcard/Download/lib.apk 2>&1)