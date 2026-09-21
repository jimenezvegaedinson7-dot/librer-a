$ErrorActionPreference="SilentlyContinue"
$server="C:\libreria\backend\src\server.js"
$src=Get-Content $server -Raw
"=== CORS en server.js ==="
$ini=$src.IndexOf("cors")
if($ini -ge 0){
  $seg=$src.Substring([Math]::Max(0,$ini-120),[Math]::Min(700,$src.Length-[Math]::Max(0,$ini-120)))
  $seg
} else { "  (sin cors en server.js)" }
$envFile="C:\libreria\backend\.env"
if(Test-Path $envFile){
  "=== CORS en .env (claves, NO valores sensibles) ==="
  Get-Content $envFile | ForEach-Object { if($_ -match "(?i)cors|origin|frontend"){ "  " + $_ } }
}