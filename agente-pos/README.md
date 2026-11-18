# Agente POS

Agente universal de impresión para comanderas térmicas en Windows. Un solo
ejecutable portable, **sin dependencias**, que imprime sin diálogos en cualquier
impresora que hable ESC/POS (POS-80, Xprinter, Epson, Unnion, Bematech, etc.) y
**se repara solo** cuando el sistema deja de imprimir.

> Proyecto independiente del agente de impresión de Chefsy
> ([`agente-impresion/`](../agente-impresion/)). Pueden coexistir en la misma
> máquina (Chefsy usa el puerto 9187; Agente POS usa el 9191).

## Por qué existe

Los locales pierden horas (y ventas) por:

- El servicio **Cola de impresión (Spooler)** detenido o puesto en "manual"
  por alguna herramienta de "optimización" → error *"El servidor RPC no está
  disponible"*.
- Impresora mal elegida, no predeterminada, o con la cola atascada.
- Drivers que abren diálogos por cada ticket, o apps que imprimen vía
  navegador con ventanas de confirmación.

Agente POS ataca todo eso: imprime directo al spooler con datatype `RAW`
(sin diálogos), detecta el estado del sistema, y **sana** el servicio de
impresión pidiendo permiso de administrador solo cuando hace falta.

## Qué hace

- 🖨 **Impresión RAW sin diálogos**: recibe bytes ESC/POS por HTTP local y los
  manda al spooler. Funciona con cualquier comandera cuyo driver soporte RAW
  (la gran mayoría de las térmicas).
- 🌐 **Impresoras de red (LAN)**: escanea la red local buscando el puerto 9100
  y les imprime ESC/POS por TCP directo, **sin instalar driver ni pasar por el
  spooler**. Ideal para comanderas de red que Windows no reconoce.
- 🩺 **Auto-sanado**: si una impresión falla porque el spooler está caído
  (error 1722 *RPC no disponible*), el agente se relanza a sí mismo con
  elevación UAC, restaura el servicio a *automático*, lo inicia y sale.
  Máximo un intento cada 3 minutos (configurable).
- 🌐 **Panel web propio** en `http://127.0.0.1:9191/panel` (construido con
  React + **shadcn/ui**, ver [Panel](#panel-react--shadcnui)):
  - Estado de impresora, puerto, driver, cola y spooler.
  - Elección de impresora desde la lista real de Windows (+ definir
    predeterminada de Windows).
  - Impresión de página de prueba con la tipografía actual.
  - Editor de **tipografía** (fuente A/B, ancho, alto, interletrado,
    interlineado, espacio entre items) para comanda y ticket.
  - Diagnóstico auto-explicativo con sugerencias.
  - Snippets listos (curl / Node / Python) para conectar **cualquier sistema
    POS**.
- 📌 **Ícono en bandeja**: clic (o doble clic) abre el panel; también prueba de
  impresión, sanar, iniciar con Windows y salir.
- 🔁 **Auto-actualización** opcional: si `origen_actualizacion` apunta a un
  servidor con `version.json` + binario, se actualiza verificando SHA-256.
  En la versión universal viene **desactivada** por defecto.
- 🔒 **Seguridad**: escucha solo en `127.0.0.1`, token obligatorio de 32 bytes
  (header `X-Pos-Token`), CORS con reflejo de origen para webs locales, y el
  panel solo incrusta el token en navegación local (un sitio externo no puede
  leerlo por fetch).

## Instalación

Desde la carpeta `agente-pos/` del repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\Instalar-AgentePOS.ps1
```

Opciones:

```powershell
.\Instalar-AgentePOS.ps1 -Puerto 9192 -Impresora "POS-80-Series (2)"
```

El instalador compila con el `csc.exe` que ya trae Windows (no requiere SDK),
deja el agente en `%LOCALAPPDATA%\AgentePOS`, crea el acceso directo de inicio
de sesión, genera el token y muestra el panel.

Desinstalación: `.\Desinstalar-AgentePOS.ps1`.

### Portable (pendrive)

```powershell
powershell -ExecutionPolicy Bypass -File .\publicar.ps1
```

Genera `dist/AgentePOS.exe` + `dist/version.json` (manifiesto con SHA-256).
Doble clic y listo: configura solo, queda en la bandeja.

## Panel (React + shadcn/ui)

La UI del panel es una app React en `agente-pos/panel/` que usa **exclusivamente
componentes shadcn/ui** (regla de oro documentada en [`AGENTS.md`](AGENTS.md)).
Se compila a **un solo HTML** (plugin `vite-plugin-singlefile`) y se embebe en
el ejecutable:

```bash
cd agente-pos/panel
npm install        # solo la primera vez (build-time, no runtime)
npm run build      # vite build + regenera src/PanelHtml.cs
```

Después recompilá el agente (`publicar.ps1` o el instalador). El archivo
`src/PanelHtml.cs` es **generado**: no se edita a mano.

Desarrollo con hot-reload: `npm run dev` (Vite en un puerto libre; la API del
agente sigue respondiendo en 9191).

## Conectar un sistema POS (API universal)

Cualquier sistema puede imprimir apuntando a `http://127.0.0.1:9191/print`
con los bytes crudos del ticket y el token. El token está en
`%LOCALAPPDATA%\AgentePOS\config.ini` y en el panel.

```bash
curl -X POST http://127.0.0.1:9191/print \
  -H "X-Pos-Token: TU_TOKEN" \
  --data-binary @ticket.bin
```

```javascript
import fs from "fs";

await fetch("http://127.0.0.1:9191/print", {
  method: "POST",
  headers: { "X-Pos-Token": "TU_TOKEN", "Content-Type": "application/octet-stream" },
  body: fs.readFileSync("ticket.bin")
});
```

```python
import requests

requests.post(
    "http://127.0.0.1:9191/print",
    headers={"X-Pos-Token": "TU_TOKEN"},
    data=open("ticket.bin", "rb").read(),
)
```

Para elegir impresora puntual: header `X-Pos-Printer: NOMBRE EXACTO`.

Para una comandera de red (TCP 9100), el mismo header acepta la dirección:

```bash
curl -X POST http://127.0.0.1:9191/print \
  -H "X-Pos-Token: TU_TOKEN" \
  -H "X-Pos-Printer: LAN://192.168.1.50:9100" \
  --data-binary @ticket.bin
```

## Endpoints

| Método | Ruta               | Descripción                                    |
|--------|--------------------|------------------------------------------------|
| GET    | `/panel`           | Panel web (sin token; local únicamente)        |
| GET    | `/health`          | Estado completo (impresora, spooler, errores)  |
| POST   | `/print`           | Imprimir bytes crudos (ESC/POS)                |
| GET    | `/diagnostico`     | Chequeos con sugerencias                       |
| GET    | `/config`          | Tipografía guardada                            |
| POST   | `/config`          | Guardar tipografía                             |
| POST   | `/update`          | Auto-actualización (si hay origen configurado) |
| GET    | `/api/estado`      | Resumen para el panel                          |
| GET    | `/api/impresoras`  | Lista real de impresoras de Windows            |
| POST   | `/api/impresora`   | Elegir impresora del agente                    |
| POST   | `/api/predeterminada` | Definir predeterminada de Windows           |
| POST   | `/api/prueba`      | Imprimir página de prueba                      |
| POST   | `/api/sanar`       | Reparar servicio de impresión (UAC)            |
| GET    | `/api/spooler`     | Estado del servicio Cola de impresión          |
| GET    | `/api/lan-scan`    | Descubrir impresoras de red (puerto 9100)      |
| POST   | `/api/ajustes`     | Ajustes (`autoSanar`)                          |

Todas (excepto `/panel` y `OPTIONS`) exigen el header `X-Pos-Token`.

## Estructura

```
agente-pos/
├── src/                        Fuente C# puro (.NET Framework 4, sin dependencias)
│   ├── Program.cs              Estado global, punto de entrada, bandeja (NotifyIcon)
│   ├── ServidorHttp.cs         Servidor HTTP crudo + enrutado + CORS
│   ├── ApiPos.cs               API universal (health, print, diagnostico, config, prueba)
│   ├── ApiPanel.cs             Endpoints del panel (/api/*)
│   ├── RawPrinter.cs           winspool.drv (RAW) + estado del servicio Spooler
│   ├── ImpresoraRed.cs         TCP 9100 directo + descubrimiento de red (LAN)
│   ├── Sanador.cs              Reparación con elevación UAC (--sanar)
│   ├── Tipografia.cs           Tipografía por documento (comanda/ticket)
│   ├── Actualizacion.cs        Auto-actualización con SHA-256
│   └── PanelHtml.cs            Panel web EMBEBIDO — generado, no editar
├── panel/                      Panel React + shadcn/ui (build → src/PanelHtml.cs)
│   ├── src/components/ui/      Catálogo shadcn/ui (única fuente de componentes)
│   ├── src/App.tsx             Aplicación del panel
│   └── generar-panel.mjs       Regenera src/PanelHtml.cs desde dist/index.html
├── Instalar-AgentePOS.ps1      Instalador (compila con csc del sistema)
├── Desinstalar-AgentePOS.ps1   Desinstalador
├── publicar.ps1                Paquete de distribución (dist/)
├── AGENTS.md                   Reglas del proyecto (regla de oro: solo shadcn/ui)
└── README.md
```

## Compilación manual

```powershell
csc /nologo /target:winexe /optimize+ `
  /r:System.dll /r:System.Core.dll /r:System.Web.Extensions.dll `
  /r:System.Windows.Forms.dll /r:System.Drawing.dll `
  /out:AgentePOS.exe (Get-ChildItem src\*.cs | % FullName)
```

## Configuración (`config.ini`)

```ini
puerto=9191
token=...
impresora=POS-80-Series (2)     ; vacío = predeterminada de Windows
                                ; o LAN://192.168.1.50:9100 para red
origen_actualizacion=            ; vacío = auto-actualización desactivada
auto_sanar=1                     ; reparación automática del spooler
```

## Log

`%LOCALAPPDATA%\AgentePOS\agent.log` (rota a los 256 KB).

## Roadmap

- ~~**v2.1 — Impresoras de red (LAN)**~~: descubrimiento del puerto 9100 y
  envío TCP directo, sin instalar nada en Windows. **Completada.**
- **v2.2 — USB directo (WinUSB)**: impresión por USB sin driver (estilo Zadig)
  como fallback cuando el driver del local está roto.

El estado real y el plan detallado viven en [`CONTEXTO-IA.md`](CONTEXTO-IA.md)
— documento que se actualiza al final de cada trabajo.

## Notas técnicas

- El proceso corre sin permisos especiales; solo la instancia `--sanar`
  (relanzada con `runas`) pide elevación para `sc config` / `net start`.
- `OpenPrinter`/`WritePrinter` con datatype `RAW` funciona en cualquier
  driver de impresora que no transforme el stream (caso estándar en térmicas).
- Si el driver del local imprime con otro datatype (raro), el panel lo muestra
  y el diagnóstico lo detecta.
