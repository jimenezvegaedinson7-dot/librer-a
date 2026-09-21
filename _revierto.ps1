$ErrorActionPreference="Continue"
$sel="C:\libreria\flutter_app\lib\utils\constants.dart"
$txt=Get-Content $sel
"=== selector ACTUAL ==="
@($txt | Where-Object { $_ -match "_usarApiProduccion\s*=" } | Select-Object -First 2) | ForEach-Object { "  " + $_.Trim() }
"=== lo devuelvo a verdadero (produccion)? Hago el reemplazo: ==="
$nuevo=$txt | ForEach-Object { if($_ -match "static const bool _usarApiProduccion"){ "  static const bool _usarApiProduccion = true;   // <<< PRODUCCION (Render)" } else { $_ } }
$nuevo | Set-Content $sel -Encoding UTF8
"  hecho. Nuevo valor: "
@(Get-Content $sel | Where-Object { $_ -match "_usarApiProduccion\s*=" } | Select-Object -First 2) | ForEach-Object { "  " + $_.Trim() }