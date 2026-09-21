$ErrorActionPreference="Continue"
$flutterExe="C:\src\flutter_windows_3.47.2-stable\flutter\bin\flutter.bat"
$dir="C:\libreria\flutter_app"
"flutter.bat existe? " + (Test-Path $flutterExe)
if(-not(Test-Path $flutterExe)){ ">>> NO existe esa ruta. No compilo. Dime."; exit 0 }
Set-Location $dir
"=== build web (UNA vez, espero hasta 4 min) ==="
$b=(& $flutterExe build web --release 2>&1 | Out-String)
if($b -match "(?i)error|exception|failed|Cannot run"){
  ">>> FALLO. Lineas clave:"
  @($b -split "`n") | Where-Object { $_ -match "(?i)error|exception|failed|Cannot|path|Target" } | Select-Object -First 12 | ForEach-Object { "    " + $_.Trim() }
}else{
  ">>> OK. index.html generado:"
  $fi="C:\libreria\flutter_app\build\web\index.html"
  if(Test-Path $fi){ "    " + (Get-Item $fi).LastWriteTime.ToString("dd/MM HH:mm:ss") + "  " + [math]::Round((Get-Item $fi).Length/1KB,0) + " KB" }
}