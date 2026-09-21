$ErrorActionPreference="Continue"
$f="C:\src\flutter_windows_3.47.2-stable\flutter\bin\flutter.bat"
"flutter.bat existe? " + $(if(Test-Path $f){"SI"}else{"NO"})
if(Test-Path $f){
  "--- version (1 vez, espero) ---"
  $v=(& $f --version 2>&1 | Out-String)
  @($v -split "`n") | Where-Object { $_ -match "Flutter" } | Select-Object -First 3 | ForEach-Object { "  " + $_.Trim() }
}
"--- constants.dart: selector actual ---"
$c="C:\libreria\flutter_app\lib\utils\constants.dart"
if(Test-Path $c){ @(Get-Content $c) | Where-Object { $_ -match "_usarApiProduccion" } | Select-Object -First 5 | ForEach-Object { "  " + $_.Trim() } }
"--- backend local sigue vivo en 3000? ---"
"  " + "True"*[bool](Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) + ""