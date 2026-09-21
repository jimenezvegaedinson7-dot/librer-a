$ErrorActionPreference="SilentlyContinue"
$dirs=(Get-ChildItem "C:\libreria\flutter_app" -Directory | ForEach-Object { $_.Name })
$tieneWeb=[bool]($dirs -contains "web")
"web/ existe? " + $tieneWeb
"carpetas: " + ($dirs -join ", ")
if($tieneWeb){
  $pub=Get-Content "C:\libreria\flutter_app\pubspec.yaml" -Raw
  "dependencias web activadas? " + [bool]($pub -match "(?m)^\s*flutter_web_plugins")
}