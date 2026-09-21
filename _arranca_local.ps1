$ErrorActionPreference="SilentlyContinue"
$nodeCmd=(Get-Command node -ErrorAction SilentlyContinue).Source
if(-not $nodeCmd){ $nodeCmd="$env:ProgramFiles\nodejs\node.exe" }
$door="C:\libreria\backend"

"node: " + $nodeCmd + " (" + (Test-Path $nodeCmd) + ")"
"existe server.js? " + (Test-Path "$door\server.js")
"existe .env? " + (Test-Path "$door\.env")
"puerto 3000 en uso? " + [bool](Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)

"=== levanto backend LOCAL (1 sola vez, espero 8 s) ==="
$out="$door\_local_salida.log"
$err="$door\_local_error.log"
$p=Start-Process -FilePath $nodeCmd -ArgumentList "server.js" -WorkingDirectory $door -WindowStyle Hidden -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
Start-Sleep -Seconds 8

$vivo=[bool](Get-Process -Id $p.Id -ErrorAction SilentlyContinue)
"  proceso vivo? " + $vivo + " (PID " + $p.Id + ")"
"  puerto 3000 escuchando? " + [bool](Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)

if($vivo){
  $r=Invoke-WebRequest -Uri "http://localhost:3000/api/libros?limite=1" -UseBasicParsing -TimeoutSec 15 -ErrorAction SilentlyContinue
  "  GET /api/libros local -> HTTP " + [int]$r.StatusCode + "  <<<<<< BACKEND LOCAL OK <<<<<<"
}else{
  "  >>> No levanto. Te muestro el error EXACTO (stderr, ultimas 15 lineas):"
  if(Test-Path $err){ Get-Content $err -Tail 15 | ForEach-Object { "    " + $_ } }
  else{ "    (sin archivo de error)" }
  if(Test-Path $out){ "  --- stdout (ultimas 8): ---"; Get-Content $out -Tail 8 | ForEach-Object { "    " + $_ } }
  "  >>> FIN. No reintento. Dime LISTO solo si quieres que REVISE el .env (no que lo cambie)."
}