# Cerebro Graphify de Librería del Saber

## Abrir el mapa

Haz doble clic en **`MAPA-CEREBRO.html`** para explorar el proyecto por carpetas, archivos y símbolos. Usa **Expandir todo**, **Contraer todo** y **Restablecer vista**.

Abre **`graph.html`** para ver las conexiones entre nodos. Busca, por ejemplo, `ApiService`, `Modal`, `PedidosPage` o un endpoint `/api/ventas`; selecciona un resultado para inspeccionar su origen y sus vecinos.

Los dos visores funcionan **sin servidor y sin conexión a Internet**. Si los mueves a otra carpeta, conserva también la subcarpeta **`assets/`**, donde están las bibliotecas del visor.

## Qué contiene

- API Express: rutas, controladores, modelos, servicios y utilidades.
- Panel administrativo: pantallas y componentes compartidos.
- Tienda web: catálogo, cuenta, carrito y compras.
- App Flutter: archivos, clases, imports y conexiones a la API.
- Endpoints compartidos y tablas declaradas en el esquema local.
- Cadena de imports de estilos del frontend.

**Es una captura del código local**, incluidos cambios todavía sin commit. No representa una inspección de los datos de producción. No se incluyeron `.env`, credenciales, registros de usuarios, compras reales, dependencias instaladas, builds ni medios.

JavaScript se analiza con el extractor AST de Graphify. Flutter y las conexiones entre plataformas se complementan con el índice estático del proyecto. El grafo principal excluye enlaces `INFERRED` y `AMBIGUOUS`: una coincidencia de nombres no debe aparecer como dependencia confirmada. Una ruta en el grafo muestra relaciones de código, no prueba que esas llamadas se hayan ejecutado en ese orden.

## Archivos

| Archivo | Uso |
|---|---|
| `MAPA-CEREBRO.html` | Mapa jerárquico interactivo |
| `graph.html` | Grafo interactivo de relaciones |
| `graph.json` | Conocimiento estructurado para consultas de agentes |
| `GRAPH_REPORT.md` | Resumen, comunidades, nodos centrales y conexiones |
| `manifest-proyecto.json` | Fecha, recuentos y hashes de las fuentes analizadas |
| `cost.json` | Coste de extracción; la generación local no utilizó un LLM |

## Actualizar después de cambiar código

Desde la raíz `C:\libreria`, en PowerShell:

```powershell
$python = (Get-Content "graphify-out/.graphify_python" -Raw).Trim()
$graphify = Join-Path (Split-Path $python) "graphify.exe"
$env:GRAPHIFY_NO_AUTO_REFRESH = '1'

node docs/architecture/tools/actualizar-mapa.mjs
& $python docs/architecture/tools/generar-grafo-graphify.py --detectar
& $python docs/architecture/tools/generar-grafo-graphify.py
& $graphify export html
& $graphify tree --output "graphify-out/MAPA-CEREBRO.html" --label "Librería del Saber · Mapa del proyecto"
& $python docs/architecture/tools/preparar-visores-graphify.py
& $python docs/architecture/tools/verificar-grafo-graphify.py
```

La extracción y las consultas son locales. El paso de empaquetado descarga las bibliotecas públicas de los visores; después de empaquetarlas, abrir los mapas no requiere conexión. Si se elimina el entorno Python registrado en `.graphify_python`, instala `graphifyy` en otro entorno y actualiza esa ruta.

## Actualización automática

El grafo se actualiza solo. `docs/architecture/tools/vigilar-grafo.mjs` vigila `backend/src`, `backend/database`, `frontend/src` y `flutter_app/lib`. Cuando cambia un archivo de código, espera 15 s sin cambios y regenera todo (mapa de arquitectura, `graph.json`, `GRAPH_REPORT.md` y los dos visores) con `actualizar-grafo.mjs`. Tarda unos 15 s, funciona sin conexión y da igual quién edite: Claude Code, OpenCode o el editor.

- Arranca oculto al entrar a Windows: `shell:startup` → `libreria-vigilante-grafo.vbs`. Para desactivarlo, borra ese archivo.
- Actualizar una vez a mano: `node docs/architecture/tools/actualizar-grafo.mjs`
- Historial y errores: `graphify-out/actualizacion.log`
- Entorno de Python fijo: `%LOCALAPPDATA%\libreria-graphify\env` (registrado en `.graphify_python`).

## Consultar el cerebro

```powershell
& $graphify query "ApiService" --budget 1500
& $graphify path "mis_compras_screen.dart" "Tabla ventas"
& $graphify explain "Modal()"
& $graphify god-nodes --top 10
```

El grafo se comparte como conocimiento consultable entre agentes; no sincroniza automáticamente sus conversaciones o tareas.
