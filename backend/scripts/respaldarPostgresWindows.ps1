param([switch]$Configurar, [switch]$Automatico, [switch]$ActualizarConexion)
$ErrorActionPreference = 'Stop'
$raiz = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$carpeta = Join-Path $raiz 'backups\postgresql'
$credencial = Join-Path $carpeta '.conexion.dpapi'
$programa = Join-Path $PSScriptRoot 'respaldarPostgres.js'
$tarea = 'Libreria-Respaldo-PostgreSQL'
Add-Type -AssemblyName System.Security

if ($Configurar) {
    if (-not (Test-Path -LiteralPath (Join-Path $raiz 'backups'))) { throw 'No existe la carpeta de respaldos prevista.' }
    [System.IO.Directory]::CreateDirectory($carpeta) | Out-Null
    if ($ActualizarConexion -or -not (Test-Path -LiteralPath $credencial)) {
        if (-not $env:RENDER_API_KEY) { throw 'Falta RENDER_API_KEY para configurar la conexión protegida.' }
        $entradas = Invoke-RestMethod -Uri 'https://api.render.com/v1/services/srv-dajivanqj5pc73dqfb4g/env-vars?limit=100' -Headers @{Authorization = "Bearer $env:RENDER_API_KEY"}
        $conexion = ($entradas | Where-Object { $_.envVar.key -eq 'DATABASE_URL' }).envVar.value
        if (-not $conexion) { throw 'El servicio no proporcionó DATABASE_URL.' }
        $datos = @{Version = 1; Conexion = $conexion; Node = (Get-Command node).Source; PgDump = (Get-Command pg_dump).Source; PgRestore = (Get-Command pg_restore).Source}
        $bytes = [System.Text.Encoding]::UTF8.GetBytes(($datos | ConvertTo-Json -Compress))
        $protegida = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
        $temporal = "$credencial.$([Guid]::NewGuid().ToString('N')).tmp"
        [System.IO.File]::WriteAllBytes($temporal, $protegida)
        if (Test-Path -LiteralPath $credencial) { [System.IO.File]::Replace($temporal, $credencial, $null) }
        else { [System.IO.File]::Move($temporal, $credencial) }
        [Array]::Clear($bytes, 0, $bytes.Length)
        $conexion = $null
        $datos = $null
    }
    $existente = Get-ScheduledTask -TaskName $tarea -ErrorAction SilentlyContinue
    if ($existente -and -not ($existente.Actions.Arguments -like "*$PSCommandPath*")) { throw 'Existe una tarea con ese nombre y otra configuración; no se reemplaza.' }
    $usuario = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $accion = New-ScheduledTaskAction -Execute (Join-Path $PSHOME 'powershell.exe') -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Automatico" -WorkingDirectory $raiz
    $disparadores = @((New-ScheduledTaskTrigger -Daily -At '03:00'), (New-ScheduledTaskTrigger -AtLogOn -User $usuario))
    $opciones = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 30) -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
    $principal = New-ScheduledTaskPrincipal -UserId $usuario -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName $tarea -Action $accion -Trigger $disparadores -Settings $opciones -Principal $principal -Description 'Respaldo PostgreSQL de Librería del Saber: diario, al iniciar sesión y con recuperación de ejecuciones pendientes.' -Force | Out-Null
    'Respaldo programado a las 03:00 y al iniciar sesión, con recuperación de tareas pendientes.'
    exit 0
}

if (-not (Test-Path -LiteralPath $credencial)) { throw 'Primero configura el respaldo con -Configurar.' }
$protegida = [System.IO.File]::ReadAllBytes($credencial)
$bytes = [System.Security.Cryptography.ProtectedData]::Unprotect($protegida, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
$datos = [System.Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
[Array]::Clear($bytes, 0, $bytes.Length)
if ($datos.Version -ne 1) { throw 'Versión de credencial no compatible.' }
$anterior = $env:LIBRERIA_BACKUP_DATABASE_URL
$antesDump = $env:LIBRERIA_PG_DUMP
$antesRestore = $env:LIBRERIA_PG_RESTORE
try {
    $env:LIBRERIA_BACKUP_DATABASE_URL = $datos.Conexion
    $env:LIBRERIA_PG_DUMP = $datos.PgDump
    $env:LIBRERIA_PG_RESTORE = $datos.PgRestore
    $argumentos = @($programa)
    if ($Automatico) { $argumentos += '--si-corresponde' }
    $preferencia = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $salida = & $datos.Node @argumentos 2>&1
    $codigo = $LASTEXITCODE
    $ErrorActionPreference = $preferencia
    $linea = "[$([DateTime]::Now.ToString('s'))] exit=$codigo $($salida -join ' ')`r`n"
    [System.IO.File]::AppendAllText((Join-Path $carpeta 'respaldos.log'), $linea)
    $salida
    exit $codigo
} finally {
    $env:LIBRERIA_BACKUP_DATABASE_URL = $anterior
    $env:LIBRERIA_PG_DUMP = $antesDump
    $env:LIBRERIA_PG_RESTORE = $antesRestore
    $datos = $null
}
