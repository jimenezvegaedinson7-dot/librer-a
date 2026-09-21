$ErrorActionPreference="Continue"
$flutterExe="C:\src\flutter_windows_3.47.2-stable\flutter\bin\flutter.bat"
$dir="C:\libreria\flutter_app"
Set-Location $dir
$log="C:\libreria\_build_log.txt"

"=== version flutter ==="
$v=(& $flutterExe --version 2>&1 | Out-String)
(@($v -split "`n") | Where-Object { $_ -match "Flutter" } | Select-Object -First 3) | ForEach-Object { "  " + $_.Trim() }

"=== config actual (web / wasm) ==="
$c=(& $flutterExe config --list 2>&1 | Out-String)
@($c -split "`n") | Where-Object { $_ -match "web|wasm" } | ForEach-Object { "  " + $_.Trim() }

"=== build web --release (1 vez, full log en _build_log.txt) ==="
$full=(& $flutterExe build web --release 2>&1 | Out-String)
Set-Content -Path $log -Value $full -Encoding UTF8
$hasError = $full -match "(?i)\b(error|exception|failed|non.?zero|return code)\b|cmdlet|remoteeexception|notrecognized|cannot run"
if($hasError){
  ">>> FALLO. Contexto del error (lineas con pista + 1 de contexto):"
  $lines=@($full -split "`n")
  for($i=0;$i -lt $lines.Count;$i++){
    if($lines[$i] -match "(?i)error|exception|failed|wasm|dry|notrecognized|cannot|codd|invalid|No se|no se|Target|flutter.bat"){
      $desde=[Math]::Max(0,$i-1); $hasta=[Math]::Min($lines.Count-1,$i+2)
      for($j=$desde;$j -le $hasta;$j++){ "   L$($j+1): " + $lines[$j].Trim() }
      "   ---"
    }
  }
}else{
  ">>> OK. index.html:"
  $fi="C:\libreria\flutter_app\build\web\index.html"
  if(Test-Path $fi){ "  " + (Get-Item $fi).LastWriteTime.ToString("dd/MM HH:mm:ss") + "  " + [math]::Round((Get-Item $fi).Length/1KB,0) + " KB" }
}