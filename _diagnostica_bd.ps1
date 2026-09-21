$ErrorActionPreference="Continue"
$b="C:\libreria\backend"
$logs=@("$b\_local_error.log","$b\_local_salida.log","C:\libreria\_local_backend.log","C:\libreria\_local_backend.log.err")
foreach($log in $logs){
  if(Test-Path $log){
    "=== " + $log + " ==="
    $ln=@(Get-Content $log -ErrorAction SilentlyContinue)
    $clave=@($ln | Where-Object { $_ -match "(?i)(pg|postgres|ECONNREFUSED|refused|password|authent|could not|does not exist|database|relation|connect|SASL|timeout|errores|error)" })
    if($clave.Count -gt 0){ $clave | Select-Object -Last 15 | ForEach-Object { "  " + $_.Trim() } }
    else{ "  (sin errores de BD en este log - " + $ln.Count + " lineas)" }
  }
}
"=== backend\.env real (claves BD presentes?) ==="
$envf="$b\.env"
if(Test-Path $envf){
  @(Get-Content $envf) | Where-Object { $_ -match "^\s*(DATABASE_URL|PGHOST|PGPORT|PGDATABASE|PGUSER|PGPASSWORD|DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASSWORD)\s*=" } | ForEach-Object { "  " + (($_ -split "=")[0]).Trim() + " setear" }
}else{ "  (no existe backend\.env)" }
"=== hay servidor web sirviendo 8080? ==="
"  " + [bool](Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)
"=== este HTML que sirvo usa la clave que ya cambie? (selector en constants) ==="
"  " + (@(Get-Content "C:\libreria\flutter_app\lib\utils\constants.dart" | Where-Object { $_ -match "_usarApiProduccion" } | Select-Object -First 1)).Trim()