function Write-Out($m) { Write-Output $m }

$proj = "C:\libreria\flutter_app"
$adbExe = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$serial = "192.168.1.44:46121"

Write-Out "=== 1) Revisar el FUENTE (debe apuntar produccion/Render) ==="
$c = Get-Content "$proj\lib\utils\constants.dart" -Raw
$prod = [bool]($c -match '_usarApiProduccion = true')
$celLocal = [bool]($c -match '_celularHost = ')
$celValor = [regex]::Match($c, '_celularHost = .([^'']+)').Groups[1].Value
Write-Out ("  _usarApiProduccion = true : " + $prod + "   (debe ser True)")
Write-Out ("  _celularHost             : " + $celValor + "   (da igual, no se usa en prod)")
if (-not $prod) { Write-Out "  ABORTO: el fuen