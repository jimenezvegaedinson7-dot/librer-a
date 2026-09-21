$ErrorActionPreference="Continue"
$flutterExe="$env:LOCALAPPDATA\flutter\bin\flutter.bat"
if(-not(Test-Path $flutterExe)){ $flutterExe="C:\flutter\bin\flutter.bat" }
$dir="C:\libreria\flutter_app"
Set-Location $dir
"=== build web (UNA vez) ==="
$b=(& $flutterExe build web --release 2>&1 | Out-String)
if($b -match "(?i)error|exception|failed"){
  "  >>> FALLO. Lineas clave:"
  @($b -split "`n") | Where-Object { $_ -match "(?i)error|exception|failed|web|Cannot|Unhandled|Target" } | Select-Object -First 12 | ForEach-Object { "    " + $_.Trim() }
} else {
  "  >>> OK build."
  $fi="C:\libreria\flutter_app\build\web\index.html"
  if(Test-Path $fi){ "  index.html: " + (Get-Item $fi).LastWriteTime.ToString("HH:mm:ss") + " " + [math]::Round((Get-Item $fi).Length/1KB,0) + " KB" }
}