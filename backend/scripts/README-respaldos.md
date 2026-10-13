# Respaldos de PostgreSQL

## Funcionamiento

- La base pagada de Render es la principal. Render proporciona recuperación continua a un punto anterior (PITR); en un workspace Hobby la ventana es de hasta tres días desde que está disponible.
- `respaldarPostgresWindows.ps1` registra la tarea **Libreria-Respaldo-PostgreSQL** para las **03:00, hora de Perú**, y al iniciar sesión. Windows recupera ejecuciones pendientes y reintenta fallos hasta tres veces, cada 30 minutos.
- La tarea local requiere este equipo encendido, acceso a Internet y la sesión del usuario configurado. Una misma copia verificada del día evita repetir el export al iniciar sesión.
- Las copias se guardan en `backups/postgresql/`, fuera de Git, en formato PostgreSQL `custom` (`.dump`). Cada una tiene un manifiesto `.dump.json` con fecha, tamaño, SHA-256 y conteos por tabla.
- Se conservan las últimas **7 copias diarias** y una copia de cada una de las últimas **4 semanas**. La selección puede coincidir: no se crean duplicados solo para completar una cifra.
- La retención se aplica únicamente después de crear y verificar una nueva copia; no toca respaldos manuales, archivos parciales ni copias sin un manifiesto propio válido.
- `pg_restore` lee y descomprime todo el archivo antes de marcarlo verificado. La copia inicial se probó además restaurándola en PostgreSQL local desechable y comparando sus tablas.
- El export y los conteos usan el mismo snapshot de solo lectura. No se modifican datos en la base principal.

## Crear una copia ahora

Desde PowerShell:

```powershell
& "C:\libreria\backend\scripts\respaldarPostgresWindows.ps1"
```

## Consultar la tarea

```powershell
Get-ScheduledTaskInfo -TaskName "Libreria-Respaldo-PostgreSQL"
```

`LastTaskResult = 0` indica ejecución correcta. El historial local está en `backups/postgresql/respaldos.log`.

## Configurar en este equipo

Requiere Node, las herramientas `pg_dump`/`pg_restore` de la versión mayor de PostgreSQL utilizada, dependencias del backend y `RENDER_API_KEY` en el entorno de la configuración inicial.

```powershell
& "C:\libreria\backend\scripts\respaldarPostgresWindows.ps1" -Configurar
```

La conexión se guarda en `.conexion.dpapi`, protegida por Windows para el usuario que configuró la tarea. La ejecución diaria no necesita la clave de la API de Render. No se versionan credenciales ni archivos de datos.

Después de trasladar la base y actualizar `DATABASE_URL` en el servicio, refrescar la conexión protegida:

```powershell
& "C:\libreria\backend\scripts\respaldarPostgresWindows.ps1" -Configurar -ActualizarConexion
```

## Restaurar o trasladar

1. Elegir un `.dump` y su manifiesto verificado.
2. Crear la base de destino vacía y configurar las variables de conexión `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` y `PGSSLMODE` en el entorno de la sesión de restauración.
3. Restaurar con las herramientas de PostgreSQL, sin incluir credenciales en la línea de comandos:

```powershell
pg_restore --no-owner --no-privileges --exit-on-error --dbname "BASE_DESTINO_VACIA" "ARCHIVO.dump"
```

4. Comparar los conteos con el manifiesto y comprobar catálogo, cuentas, ventas, pagos y comprobantes antes de conectar la API a la nueva base.
5. Conservar los valores existentes de `JWT_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`, `PAYU_*`, `SMTP_*` y `CLOUDINARY_*` del servicio: no están dentro del dump. La conexión protegida local es para ejecutar respaldos, no un export de todas las variables del backend.

Copiar un `.dump` permite trasladarlo a otro equipo; la credencial DPAPI debe configurarse de nuevo con el usuario de ese equipo.
