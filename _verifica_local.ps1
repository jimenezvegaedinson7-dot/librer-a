$ErrorActionPreference="Continue"
$html="C:\libreria\flutter_app\build\web\index.html"
"=== el build web YA esta generado? ==="
if(Test-Path $html){
  "  SI -> " + (Get-Item $html).LastWriteTime.ToString("dd/MM HH:mm:ss") + "  " + [math]::Round((Get-Item $html).Length/1KB,0) + " KB"
}else{
  "  AUN NO (hay que compilar)."
}
"=== hay servidor web en 8080? ==="
$l=Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if($l){ "  SI (pid " + ($l.OwningProcess -join ',') + ")" } else { "  NO" }
"=== constants: selector (debe decir false = local) ==="
$c="C:\libreria\flutter_app\lib\utils\constants.dart"
$v=@(Get-Content $c | Where-Object { $_ -match "_usarApiProduccion" } | Select-Object -First 1)
"  " + ($v -replace "static const bool","" ).Trim()
"=== prueba REAL desde localhost:8080 -> backend local 3000 (1 GET libros) ==="
if(Test-Path $html){
  $r=Invoke-WebRequest -Uri "http://localhost:3000/api/libros?limite=2" -UseBasicParsing -TimeoutSec 20 -ErrorAction SilentlyContinue
  if($r){ "  backend local responde -> HTTP " + [int]$r.StatusCode + " (sin CORS porque ya no llamas a Render, todo local)" } else { "  sin respuesta (revisar)" }
}else{
  "  (sin build no pruebo; primero hay que compilar)"
}