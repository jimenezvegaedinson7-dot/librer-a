$ErrorActionPreference="SilentlyContinue"
"=== busco flutter.bat (xorque C:\flutter no existe) ==="
$found=@()
$cands=@("$env:LOCALAPPDATA\flutter\bin\flutter.bat","C:\flutter\bin\flutter.bat","C:\src\flutter\bin\flutter.bat","C:\flutter_windows\flutter\bin\flutter.bat","$env:USERPROFILE\flutter\bin\flutter.bat","$env:USERPROFILE\flutter\bin\flutter.bat")
foreach($c in $cands){ if(Test-Path $c){ $found+=$c } }
foreach($c in $cands){ if(Test-Path $c){ "ENCONTRADO: " + $c } }
if($found.Count -eq 0){
  "  no en rutas tipicas. Escaneo rapido C:\ (max 5):"
  $g=Get-ChildItem -Path C:\ -Filter flutter.bat -Recurse -Depth 4 -ErrorAction SilentlyContinue | Select-Object -First 5
  foreach($f in $g){ "  GLOB: " + $f.FullName }
}
"=== flutter en PATH? ==="
$cmd=(Get-Command flutter -ErrorAction SilentlyContinue)
if($cmd){ "  SI -> " + $cmd.Source } else { "  no en PATH" }
"=== backend local sigue vivo en 3000? ==="
"  " + [bool](Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)