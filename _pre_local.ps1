$ErrorActionPreference="Continue"
$envFlag=-not(Test-Path "C:\libreria\backend\.env")
"backend\.env existe? " + $envFlag
"  (el .env.example no cuenta; Render usa SUS variables, no este archivo)"

$dbg=""
if(Test-Path "C:\libreria\backend\.env"){
  foreach($l in @(Get-Content "C:\libreria\backend\.env")){
    if($l -match "^\s*(DATABASE_URL|PGHOST|DB_HOST|DB_NAME|DB_USER|DB_PASSWORD)\s*="){ $dbg += $l.Split("=")[0] + "=SETEADA`n" }
  }
  "claves de BD en .env local:"
  "  " + (($dbg -split "`n" | Where-Object { $_ }).Trim() -join "`n  ")
}

"=== puerto 3000 libre? ==="
$p=(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
if($p){ "  OCUPADO (pid " + ($p.OwningProcess -join ",") + ")" } else { "  LIBRE -> puedo levantar el backend local aqui" }

"=== Node en el PATH del PC? ==="
$n=(Get-Command node -ErrorAction SilentlyContinue).Source
"  node: " + [bool]$n + (if($n){ " -> " + $n } else { "" })