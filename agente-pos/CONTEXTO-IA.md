# CONTEXTO PARA IA — Agente POS

> ⚠ **REGLA DEL DOCUMENTO — actualización obligatoria**
> Este archivo es la fuente de verdad del estado del proyecto. Al terminar
> CADA trabajo o prompt (nueva feature, fix, refactor, cambio de reglas),
> debe actualizarse: versión, estado actual, gotchas nuevos si los hay,
> roadmap y estructura. Un handoff desactualizado es peor que ninguno.
> Léelo completo antes de tocar código.

Documento de traspaso: explica qué es el proyecto, qué reglas NO romper, en
qué estado está y por dónde continuar. Última actualización: v2.1.0
(2026-11-18).

## 1. Qué es

**Agente POS** es un agente universal de impresión para comanderas térmicas
en Windows. Un solo ejecutable portable, **C# puro (.NET Framework 4, cero
dependencias runtime)**, que imprime bytes ESC/POS en cualquier comandera
(POS-80, Xprinter, Epson, Unnion, Bematech...) vía el spooler de Windows con
datatype `RAW`, sin diálogos, y que **se repara solo** cuando el sistema deja
de imprimir (spooler detenido, tipo de inicio en "manual" por optimizadores,
etc.).

- Repo: `github.com/lautarocastillou-cmd/chefsy`, carpeta `agente-pos/`
  (rama `main`; v2.1.0).
- Es un proyecto **independiente** del agente de impresión de Chefsy
  (`agente-impresion/`). **No tocar nada de Chefsy** (`agente-impresion/`,
  `public/agente/`). Coexisten en la misma máquina: Agente POS escucha en
  `127.0.0.1:9191`, Chefsy en 9187; token y mutex distintos.
- Motivación de negocio: el dueño ofrece impresión a locales gastronómicos;
  los dolores reales son el servicio de Cola de impresión detenido (error
  1722 "El servidor RPC no está disponible"), impresoras mal configuradas y
  drivers que abren diálogos por cada ticket.
- Etapa: **desarrollo temprano**. Prioridad de features core antes de
  considerar distribución pública.

## 2. Estado actual (v2.1.0, commiteado y pusheado)

- Impresión RAW sin diálogos, con resolución de impresora (configurada →
  header `X-Pos-Printer` → predeterminada de Windows).
- **Impresoras de red LAN (v2.1)**: `ImpresoraRed` habla TCP al puerto 9100
  con ESC/POS crudo, sin driver ni spooler. Dirección canónica
  `LAN://192.168.1.50:9100` (en `config.ini` o en `X-Pos-Printer`).
  Descubrimiento con `GET /api/lan-scan` (escaneo de la subred local, tope
  /24) y sección propia en el panel con alta manual de direcciones.
- **Auto-sanado**: si una impresión falla con código Win32 1722/1068/1062, el
  agente se relanza a sí mismo con elevación UAC en modo `--sanar`, que hace
  `sc config Spooler start= auto` + `net start Spooler` y sale. Limitado a un
  intento cada 3 minutos (`Sanador.DeberiaSanar`), configurable con
  `auto_sanar` en config.ini.
- **Panel web embebido** servido en `/panel`: estado, lista de impresoras
  reales de Windows (elegir + definir predeterminada), impresión de prueba,
  editor de tipografía (comanda/ticket), diagnóstico con sugerencias,
  snippets de API, ajustes. Construido con **React + shadcn/ui**.
- **Ícono en bandeja** (NotifyIcon): clic simple o doble clic abre el panel
  (con fallback `explorer.exe`), menú con prueba/sanar/"Iniciar con Windows"
  (clave Run de HKCU)/salir.
- **API universal** con token (header `X-Pos-Token`): `/print`, `/health`,
  `/diagnostico`, `/config` (tipografía), `/api/*` del panel. CORS con
  reflejo de origen (pensado para webs locales del POS).
- **Guardia de seguridad**: el token solo se incrusta en el HTML del panel
  cuando no hay cabecera `Origin` o el Origin es el propio agente. Un sitio
  externo que hace fetch a `127.0.0.1:9191/panel` recibe la página SIN token
  → sus llamadas quedan en 401. NO romper esto.
- Auto-actualización **diseñada pero desactivada**: `/update` + manifiesto
  `version.json` (con SHA-256) existen; `origen_actualizacion` viene vacío en
  la versión universal. No priorizar: hay features core primero.

## 3. Estructura (dónde está cada cosa)

```
agente-pos/
├── src/                        Fuente C# (compila con csc.exe del sistema)
│   ├── Program.cs              Estado global (Estado), Main, Bandeja (NotifyIcon)
│   │                           Modo especial: AgentePOS.exe --sanar
│   ├── ServidorHttp.cs         TcpListener 127.0.0.1, parser HTTP, enrutado,
│   │                           helpers de respuesta, CORS, EscapeJson
│   ├── ApiPos.cs               /health, /diagnostico, /config, /print,
│   │                           ConstruirPrueba() (página de prueba ESC/POS)
│   ├── ApiPanel.cs             /api/estado, /api/impresoras, /api/impresora,
│   │                           /api/predeterminada, /api/prueba, /api/sanar,
│   │                           /api/spooler, /api/ajustes
│   ├── RawPrinter.cs           winspool.drv (OpenPrinter/WritePrinter RAW),
│   │                           EnumPrinters, GetPrinter, SetDefaultPrinter,
│   │                           estado del servicio Spooler via advapi32
│   ├── ImpresoraRed.cs         TCP 9100 (envío ESC/POS) + escaneo de subred
│   ├── Sanador.cs              elevación UAC (--sanar) + rate-limit
│   ├── Tipografia.cs           modelo comanda/ticket + persistencia JSON
│   ├── Actualizacion.cs        /update: manifiesto + SHA-256 + reemplazo
│   └── PanelHtml.cs            ⚠ GENERADO. No editar a mano.
├── panel/                      App React del panel (build-time only)
│   ├── src/components/ui/      Catálogo shadcn/ui (única fuente de componentes)
│   ├── src/App.tsx             Toda la UI del panel
│   ├── src/globals.css         Tokens shadcn (tema oscuro, acento naranja)
│   ├── index.html              Marcadores __TOKEN__ / __PUERTO__ (inyección al servir)
│   └── generar-panel.mjs       dist/index.html → src/PanelHtml.cs
├── Instalar-AgentePOS.ps1      Instala en %LOCALAPPDATA%\AgentePOS (compila)
├── Desinstalar-AgentePOS.ps1
├── publicar.ps1                Compila a dist/ + version.json (SHA-256)
├── README.md
├── AGENTS.md                   ⚠ REGLA DE ORO de UI. Respetar.
└── CONTEXTO-IA.md              Este documento (actualizar tras cada trabajo)
```

## 4. Reglas de oro (NO negociables)

1. **UI: solo componentes shadcn/ui** (`panel/src/components/ui/`). Si falta
   uno, agregarlo al catálogo y usarlo. Prohibido CSS vanilla para
   componentes nuevos, librerías de UI alternativas, íconos que no sean
   `lucide-react`, toasts que no sean `sonner`. Estilo = tokens de
   `globals.css`, no CSS ad-hoc.
2. **`src/PanelHtml.cs` es generado** por `panel/generar-panel.mjs`. Cualquier
   cambio de UI va en `panel/src/` y se regenera con `npm run build` (dentro
   de `panel/`) y luego recompila el exe.
3. **C# 5 nada más** (csc.exe in-box de .NET 4.0.30319): sin string
   interpolación `$"..."`, sin `?.`, sin `nameof`, sin inicializadores de
   auto-propiedad. Estilo del código existente.
4. **Zero dependencias runtime**: solo `System.dll`, `System.Core.dll`,
   `System.Web.Extensions.dll` (JavaScriptSerializer), `System.Windows.Forms.dll`,
   `System.Drawing.dll`. Nada de NuGet, nada de .NET moderno.
5. **Seguridad del token**: loopback only, token obligatorio, guardia de
   Origin en `/panel`. Toda respuesta con `Cache-Control: no-store`,
   `X-Robots-Tag: noindex`.
6. **No tocar el agente de Chefsy** ni su flujo de publicación.
7. La elevación de permisos SOLO via `Sanador` (modo `--sanar`). El proceso
   normal nunca requiere admin.
8. **Actualizar `CONTEXTO-IA.md` al final de cada trabajo o prompt** (ver
   regla del documento, arriba).

## 5. Flujo de build y verificación

```bash
# Panel (requiere Node, solo build):
cd agente-pos/panel && npm install   # primera vez
npm run build                        # vite build + regenera src/PanelHtml.cs

# Agente (compila con el csc que trae Windows):
powershell -ExecutionPolicy Bypass -File agente-pos/publicar.ps1
# -> dist/AgentePOS.exe + dist/version.json (SHA-256)
```

Compilación manual (lo que hace publicar.ps1):

```powershell
csc /nologo /target:winexe /optimize+ `
  /r:System.dll /r:System.Core.dll /r:System.Web.Extensions.dll `
  /r:System.Windows.Forms.dll /r:System.Drawing.dll `
  /out:AgentePOS.exe (Get-ChildItem src\*.cs | % FullName)
```

Prueba de humo segura (NO imprime papel, NO dispara UAC):

```powershell
$sandbox = "$env:TEMP\agente-test"; mkdir $sandbox
Copy-Item dist\AgentePOS.exe $sandbox
Set-Content "$sandbox\config.ini" "puerto=9198`ntoken=tokenprueba123"
Start-Process "$sandbox\AgentePOS.exe" -WorkingDirectory $sandbox
# esperar 4s, luego:
#   GET /health y /api/estado con header X-Pos-Token: tokenprueba123
#   GET /panel -> HTML con token (navegación local) y root de React
#   GET /panel con header Origin: http://evil.com -> SIN token
#   /api/* sin token -> 401
#   GET /api/lan-scan -> 200 con hallazgos (puede tardar unos segundos)
# Matar el proceso y borrar el sandbox.
```

⚠ En pruebas: NO llamar `/api/prueba` ni `/print` (imprime papel real) ni
`/api/sanar` (dispara UAC) salvo que sea intencional.

## 6. Gotchas conocidos

- El HTML embebido en C# es un string verbatim: **cada `"` se duplica `""`**.
  `generar-panel.mjs` lo maneja; si se edita a mano, respetarlo (y recordar
  que una `"` suelta cierra el string y genera cascada de errores raros).
- `config.ini` se escribe UTF-8 sin BOM y se parsea línea por línea
  (`clave=valor`, `#`/`;` comentarios). Claves: `puerto`, `token`,
  `impresora`, `origen_actualizacion`, `auto_sanar`.
- **LAN**: `impresora` puede ser `LAN://ip:puerto` (puerto opcional, default
  9100). `ImpresoraRed.Parsear` valida IPv4 y puerto; `Formatear` normaliza.
  Las impresoras LAN no pasan por el spooler: no hay error 1722 que sanar ni
  estados de cola/offline que consultar. `/api/lan-scan` es **bloqueante**
  (hasta ~254 hosts con 32 hilos y timeout de 350 ms); si se agranda el
  alcance, moverlo a un hilo con polling desde el panel.
- El escaneo recorre solo interfaces IPv4 `Up` con gateway y recorta
  máscaras mayores a /24 a la /24 propia. Evita VPNs y adaptadores virtuales.
- Log en `%LOCALAPPDATA%\AgentePOS\agent.log`, rota a 256 KB.
- Códigos Win32 ya mapeados en `RawPrinter.MensajeWin32`: 1722 (RPC no
  disponible → spooler detenido), 1068 (dependencia), 1062 (no iniciado),
  1801 (nombre inválido), 5 (acceso denegado). Si agregás otro, mapealo acá
  para que el usuario vea algo útil.
- `Estado.Version` ("2.0.1") lo lee `publicar.ps1` con una regex para el
  manifiesto: mantener el formato `public const string Version = "x.y.z";`.
- PowerShell en esta PC es 5.1: no soporta `&&` entre comandos.
- Historia que motivó el auto-sanado: una herramienta "optimizerDuck" dejó el
  spooler en Manual+detenido tras reiniciar → error 1722. Es EL caso de uso
  principal del sanador.
- Existen ~10 impresoras de prueba en la PC de desarrollo (POS-80-Series,
  Epson L3150, Brother DCP-T300, etc.), útiles para smoke tests.
- La instalación local del dueño puede quedar atrasada: no hay
  auto-actualización activa; para actualizar corrés
  `Instalar-AgentePOS.ps1` de nuevo.

## 7. Roadmap (por dónde continuar)

> En etapa de desarrollo temprano: primero features core para el usuario del
> local. Distribución/canal de actualización queda postergado.

### v2.1 — Impresoras de red LAN (COMPLETADA en v2.1.0)
- ~~Descubrimiento de comanderas en la red local: escaneo TCP del puerto 9100
  por subred.~~
- ~~Envío directo TCP 9100 (ESC/POS raw) sin instalar nada en Windows: clase
  `ImpresoraRed`, endpoint `/api/lan-scan`, sección en el panel y `/print` con
  `X-Pos-Printer: LAN://192.168.1.50:9100`.~~
- Pendiente menor si aparece la necesidad: mDNS/zeroconf, escaneo de puertos
  alternativos y sondeo asíncrono para redes más grandes.

### v2.2 — USB directo (WinUSB, siguiente paso)
- Fallback cuando el driver del local está roto: hablar directo con el
  dispositivo USB vía P/Invoke (`SetupDi*` + `WinUSB.dll`:
  `WinUsb_Initialize`, `WinUsb_WritePipe`). Interface GUID de impresoras:
  `{28D78FAD-5A12-11D1-AE0B-08002B786A3C}` (USBPRINT) o buscar el interfaz
  WinUSB del dispositivo.
- Debe ser un modo explícito del panel ("Modo avanzado"), nunca el
  predeterminado. Verificar con la POS-80 real.

### Backlog / ideas (sin fecha)
- Limpiar cola de impresión atascada desde el panel (API de jobs).
- Soporte multi-impresora (agente con N impresoras y selección por pedido).
- Detección automática de ancho de papel (58mm vs 80mm) para la prueba.
- Backup/restaurar config (migración de PCs).
- Modo servicio de Windows (hoy corre por sesión con acceso directo al inicio).

## 8. Cómo validar que no rompiste nada

1. `npm run build` en `panel/` sin errores → `PanelHtml.cs` regenerado.
2. Compilar con csc sin errores ni warnings nuevos.
3. Smoke test del punto 5 (health, estado, impresoras, panel con/sin Origin,
   401 sin token).
4. Diagnóstico del panel con todos los checks en ok (spooler, impresora).
5. La página de prueba imprime (hacerla a mano con la impresora real).

Contacto/dominio: el proyecto vive junto a Chefsy (chefsy.xyz). El dueño
habla en español rioplatense ("comandera", "sanar"). Commits en español con
prefijo convencional (`feat(agente-pos): ...`).
