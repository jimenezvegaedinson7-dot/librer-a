$ErrorActionPreference="SilentlyContinue"
$ErrorActionPreference="Continue"
$flutterExe="$env:LOCALAPPDATA\flutter\bin\flutter.bat"
if(-not (Test-Path $flutterExe)){ $flutterExe="C:\flutter\bin\flutter.bat" }
"flutter: " + (Test-Path $flutterExe)
$dir="C:\libreria\flutter_app"

"=== 1) pre-requisitos (web en el canal y Render vivo) ==="
$chan=(& $flutterExe config 2>&1 | Out-String)
"  web-enable: " + [bool]($chan -match "enable-web")
"=== 2) primero: TU PC alcanza Render? (esto separa backend de app) ==="
$uri="https://libreria-api-v9h0.onrender.com/api/libros?limite=1"
try {
  $resp=Invoke-WebRequest -Uri $uri -Method Get -UseBasicParsing -TimeoutSec 25 -ErrorAction Stop
  "  GET libros -> HTTP " + [int]$resp.StatusCode + " (OK: Render alcanzable desde TU PC)"
} catch {
  "  >>> FALLO desde TU PC: " + $_.Exception.Message
  "  >>> (Si TU PC tampoco llega, el problema es de RED/PC, no de la app. Dime: usas VPN/proxy? Render bloqueo por pais?)"
}

"=== 3) build web (UNA sola vez, lento la primera; NO tocar) ==="
$null=Set-Location -Path $dir
$r=(& $flutterExe build web 2>&1 | Out-String)
"=== RESULTADO build web ==="
if($r -match "(?im)error|exception|fail"){ "  >>> Hubo error. Muestro las lineas:"; @($r -split "`n") | Where-Object { $_ -match "(?i)error|exception|fail|Expected|import|undefined|web" } | Select-Object -First 12 | ForEach-Object { "  " + $_.Trim() } ; $r }
else { "  Build completado. Verifico index.html:"; $idx="C:\libreria\flutter_app\build\web\index.html"; if(Test-Path $idx){ "  OK: " + (Get-Item $idx).LastWriteTime.ToString("HH:mm:ss") + " " + [math]::Round((Get-Item $idx).Length/1KB,0) + " KB" } else { "  (sin index.html pese a build)" } }