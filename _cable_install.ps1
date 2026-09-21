$ErrorActionPreference="SilentlyContinue"
$adbExe="$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$pkg="com.jimenezvega.libreria"

"=== 1) cel por CABLE? (2 intentos) ==="
$serial=""
for($i=0;$i -lt 2;$i++){
  $null=(& $adbExe kill-server 2>&1); $null=(& $adbExe start-server 2>&1)
  $txt=(& $adbExe devices 2>&1 | Out-String)
  foreach($l in @($txt -split "`n")){
    if($l -match "^\S+\s+device\s*$"){
      $s=($l.Trim() -split "\s+")[0]
      if($s -notmatch ":" -and $s -notmatch "emulator"){ $serial=$s }
    }
  }
}
if(-not $serial){ "  NO veo cel por cable. Conectalo y dime CABLE."; exit 0 }
"  celular USB: $serial"

$apktxt=(& $adbExe -s $serial shell getprop ro.product.model 2>&1 | Out-String).Trim()
"  modelo: $apktxt"

$apk="C:\libreria\flutter_app\build\app\outputs\flutter-apk\app-debug.apk"
$f=Get-Item $apk
"  apk: " + $f.LastWriteTime.ToString("HH:mm:ss") + "  " + [math]::Round($f.Length/1MB,1) + " MB"

"=== 2) push por CABLE (sincrono, confiable) ==="
$r1=(& $adbExe -s $serial push -w $apk /sdcard/Download/libc.apk 2>&1 | Out-String).Trim()
"  " + $r1

$szCel=(& $adbExe -s $serial shell stat -c %s /sdcard/Download/libc.apk 2>&1 | Out-String).Trim()
"  tamanio verificado en el cel: " + $szCel
if([string]$szCel -ne [string]$f.Length){ "  ojo: no coincide. reintento push"; $r1=(& $adbExe -s $serial push $apk /sdcard/Download/libc.apk 2>&1 | Out-String).Trim() }

"=== 3) instalo desde el cel ==="
$r2=(& $adbExe -s $serial shell pm install -r -t /sdcard/Download/libc.apk 2>&1 | Out-String).Trim()
"  " + $r2
$null=(& $adbExe -s $serial shell rm /sdcard/Download/libc.apk 2>&1)

"=== 4) abro la app ==="
if($r2 -match "Success"){
  $null=(& $adbExe -s $serial shell am force-stop $pkg 2>&1)
  $null=(& $adbExe -s $serial shell monkey -p $pkg -c android.intent.category.LAUNCHER 1 2>&1)
  "  INSTALADO. App abierta. Toca el corazon y dime."
} else { "  NO llego a instalar: " + $r2 }