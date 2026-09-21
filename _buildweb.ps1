$ErrorActionPreference="SilentlyContinue"
$ErrorActionPreference="Continue"
$flutterExe = "$env:LOCALAPPDATA\flutter\bin\flutter.bat"
if (-not (Test-Path $flutterExe)) { $flutterExe = "C:\flutter\bin\flutter.bat" }
if (-not (Test-Path $flutterExe)) { $flutterExe = "C:\src\flutter_windows_3.47.2-stable\flutter\bin\flutter.bat" }

Set-Location "C:\libreria\flutter_app"

"flutter: " + (Test-Path $flutterExe)
"desde  : " + (Get-Location).Path

"=== habilita web ==="
$g = (& $flutterExe config --enable-web 2>&1 | Out-String)
$g

"=== 1) Render responde desde el PC? ==="
try {
  $resp = Invoke-WebRequest -Uri "https://libreria-api-v9h0.onrender.com/api/libros?limite=1" -UseBasicParsing -TimeoutSec 25 -ErrorAction Stop
  "  GET libros -> HTTP " + [int]$resp.StatusCode + " (Render OK desde PC)"
} catch {
  "  >>> FALLO desde PC: " + $_.Exception.Message
  "  (si tu PC tampoco llega -> problema de RED del PC/VPN, no de la app)"
}

"=== 2) BUILD WEB (UN solo intento; puede tardar 2-4 min, espero quieto) ==="
$b = (& $flutterExe build web 2>&1 | Out-String)
if ($b -match "(?i)error|exception|failed|Could not") {
  "  >>> BUILD CON ERROR: muestro lineas clave:"
  @($b -split "`n") | Where-Object { $_ -match "(?i)error|exception|failed|target|web|import|dart" } | Select-Object -First 15 | ForEach-Object { "    " + $_.Trim() }
} else {
  "  >>> build completado."
  $idx = "C:\libreria\flutter_app\build\web\index.html"
  if (Test-Path $idx) {
    "  index.html OK: " + (Get-Item $idx).LastWriteTime.ToString("HH:mm:ss")
  } else {
    "  (no hay index.html aun)"
  }
}